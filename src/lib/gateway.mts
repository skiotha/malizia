import { EventEmitter } from "node:events";
import { DISCORD_GATEWAY_URL } from "#constants";

const Opcode = {
  Dispatch: 0,
  Heartbeat: 1,
  Identify: 2,
  Resume: 6,
  Reconnect: 7,
  InvalidSession: 9,
  Hello: 10,
  HeartbeatAck: 11,
} as const;

/**
 * Client-initiated close codes. Closing with 1000/1001 tells Discord to
 * invalidate the session; any other code keeps it resumable.
 */
const CloseCode = {
  Normal: 1000,
  Reconnect: 4000,
} as const;

/** Server close codes a reconnect can never fix (bad token, bad intents, ...). */
const FATAL_CLOSE_CODES = new Set([4004, 4010, 4011, 4012, 4013, 4014]);

/** Close codes after which the session is gone and a fresh identify is required. */
const NON_RESUMABLE_CLOSE_CODES = new Set([1000, 1001, 4007, 4009]);

const BACKOFF_BASE_MS = 1000;
const BACKOFF_CAP_MS = 60_000;
const BACKOFF_FLOOR_MS = 500;

interface GatewayPayload {
  op: number;
  d: unknown;
  s: number | null;
  t: string | null;
}

export interface GatewayOptions {
  /** WebSocket factory, injectable for tests. Defaults to the global `WebSocket`. */
  createWebSocket?: (url: string) => WebSocket;
}

export class Gateway extends EventEmitter<{
  dispatch: [event: string, data: unknown];
}> {
  #token: string;
  #intents: number;
  #createWebSocket: (url: string) => WebSocket;
  #ws: WebSocket | null = null;
  #heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  #reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  #reconnectAttempts = 0;
  #awaitingAck = false;
  #sequence: number | null = null;
  #sessionId: string | null = null;
  #resumeUrl: string | null = null;
  #destroyed = false;

  constructor(token: string, intents: number, options: GatewayOptions = {}) {
    super();
    this.#token = token;
    this.#intents = intents;
    this.#createWebSocket =
      options.createWebSocket ?? ((url) => new WebSocket(url));
  }

  connect(): void {
    if (this.#destroyed) return;

    if (this.#reconnectTimer) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }

    // Single-socket invariant: never let two sockets drive this instance.
    const previous = this.#ws;
    if (previous) {
      this.#ws = null;
      if (
        previous.readyState === WebSocket.CONNECTING ||
        previous.readyState === WebSocket.OPEN
      ) {
        previous.close(CloseCode.Normal);
      }
    }

    const url = this.#resumeUrl ?? DISCORD_GATEWAY_URL;
    const ws = this.#createWebSocket(url);
    this.#ws = ws;

    ws.addEventListener("message", (event) => {
      if (this.#ws !== ws) return; // stale socket
      const payload = JSON.parse(String(event.data)) as GatewayPayload;
      this.#handlePayload(payload);
    });

    ws.addEventListener("error", () => {
      if (this.#ws !== ws) return; // stale socket
      console.error("[gateway] websocket error"); // a close event follows
    });

    ws.addEventListener("close", (event) => {
      if (this.#ws !== ws) return; // stale socket
      this.#ws = null;
      this.#stopHeartbeat();
      if (this.#destroyed) return;

      if (FATAL_CLOSE_CODES.has(event.code)) {
        console.error(
          `[gateway] closed with fatal code ${event.code}, not reconnecting`,
        );
        process.exit(1);
      } else {
        if (NON_RESUMABLE_CLOSE_CODES.has(event.code)) {
          this.#sessionId = null;
          this.#sequence = null;
          this.#resumeUrl = null;
        }
        this.#scheduleReconnect(`connection closed (code ${event.code})`);
      }
    });
  }

  #handlePayload(payload: GatewayPayload): void {
    switch (payload.op) {
      case Opcode.Hello: {
        const { heartbeat_interval } = payload.d as {
          heartbeat_interval: number;
        };
        this.#startHeartbeat(heartbeat_interval);

        if (this.#sessionId) {
          this.#send(Opcode.Resume, {
            token: this.#token,
            session_id: this.#sessionId,
            seq: this.#sequence,
          });
        } else {
          this.#send(Opcode.Identify, {
            token: this.#token,
            intents: this.#intents,
            properties: {
              os: process.platform,
              browser: "malizia",
              device: "malizia",
            },
          });
        }
        break;
      }

      case Opcode.Dispatch: {
        this.#sequence = payload.s;

        if (payload.t === "READY") {
          const data = payload.d as {
            session_id: string;
            resume_gateway_url: string;
          };
          this.#sessionId = data.session_id;
          this.#resumeUrl = data.resume_gateway_url;
          this.#reconnectAttempts = 0;
        }

        if (payload.t === "RESUMED") {
          this.#reconnectAttempts = 0;
          console.log("[gateway] session resumed");
        }

        if (payload.t) {
          this.emit("dispatch", payload.t, payload.d);
        }
        break;
      }

      case Opcode.Heartbeat:
        this.#send(Opcode.Heartbeat, this.#sequence);
        break;

      case Opcode.Reconnect:
        // Close with a resume-intent code; the close handler reconnects.
        this.#ws?.close(CloseCode.Reconnect);
        break;

      case Opcode.InvalidSession: {
        const resumable = payload.d as boolean;
        console.warn(`[gateway] session invalidated (resumable: ${resumable})`);
        if (!resumable) {
          this.#sessionId = null;
          this.#sequence = null;
          this.#resumeUrl = null;
        }
        // No parallel connect() here: close and let the close handler
        // schedule the reconnect (this was the source of socket storms).
        this.#ws?.close(resumable ? CloseCode.Reconnect : CloseCode.Normal);
        break;
      }

      case Opcode.HeartbeatAck:
        this.#awaitingAck = false;
        break;
    }
  }

  #send(op: number, d: unknown): void {
    if (this.#ws?.readyState !== WebSocket.OPEN) {
      console.warn(
        `[gateway] dropped outbound payload (op ${op}), socket not open`,
      );
      return;
    }
    this.#ws.send(JSON.stringify({ op, d }));
  }

  #startHeartbeat(interval: number): void {
    this.#stopHeartbeat();
    this.#awaitingAck = false;
    const beat = () => {
      if (this.#awaitingAck) {
        // Zombied connection: the last heartbeat was never acknowledged.
        // Detach the socket immediately instead of waiting for a close
        // handshake that may never complete on a dead link.
        const ws = this.#ws;
        this.#ws = null;
        this.#stopHeartbeat();
        if (
          ws &&
          ws.readyState !== WebSocket.CLOSING &&
          ws.readyState !== WebSocket.CLOSED
        ) {
          ws.close(CloseCode.Reconnect);
        }
        this.#scheduleReconnect("heartbeat not acknowledged");
        return;
      }
      this.#awaitingAck = true;
      this.#send(Opcode.Heartbeat, this.#sequence);
      this.#heartbeatTimer = setTimeout(beat, interval);
    };
    this.#heartbeatTimer = setTimeout(beat, interval * Math.random());
  }

  #stopHeartbeat(): void {
    if (this.#heartbeatTimer) {
      clearTimeout(this.#heartbeatTimer);
      this.#heartbeatTimer = null;
    }
  }

  #scheduleReconnect(reason: string): void {
    if (this.#destroyed) return;
    if (this.#reconnectTimer) {
      clearTimeout(this.#reconnectTimer);
    }
    const cap = Math.min(
      BACKOFF_BASE_MS * 2 ** this.#reconnectAttempts,
      BACKOFF_CAP_MS,
    );
    const delay = Math.round(BACKOFF_FLOOR_MS + Math.random() * cap);
    this.#reconnectAttempts++;
    console.warn(`[gateway] ${reason}, reconnecting in ${delay}ms`);
    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = null;
      this.connect();
    }, delay);
  }

  destroy(): void {
    this.#destroyed = true;
    this.#stopHeartbeat();
    if (this.#reconnectTimer) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }
    const ws = this.#ws;
    this.#ws = null;
    if (
      ws &&
      (ws.readyState === WebSocket.CONNECTING ||
        ws.readyState === WebSocket.OPEN)
    ) {
      ws.close(CloseCode.Normal);
    }
  }
}
