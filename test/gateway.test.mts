import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { Gateway } from "#gateway";
import { DISCORD_GATEWAY_URL } from "#constants";

const HELLO = { op: 10, d: { heartbeat_interval: 45_000 }, s: null, t: null };
const RESUME_URL = "wss://resume.example";

function readyPayload(seq = 1) {
  return {
    op: 0,
    d: { session_id: "session-1", resume_gateway_url: RESUME_URL },
    s: seq,
    t: "READY",
  };
}

class FakeWebSocket extends EventTarget {
  url: string;
  readyState: number = WebSocket.CONNECTING;
  sent: { op: number; d: unknown }[] = [];
  closeCalls: (number | undefined)[] = [];

  constructor(url: string) {
    super();
    this.url = url;
  }

  send(data: string): void {
    if (this.readyState !== WebSocket.OPEN) {
      throw new DOMException("Sent before connected.", "InvalidStateError");
    }
    this.sent.push(JSON.parse(data) as { op: number; d: unknown });
  }

  close(code?: number): void {
    this.closeCalls.push(code);
    if (this.readyState !== WebSocket.CLOSED) {
      this.readyState = WebSocket.CLOSING;
    }
  }

  // ——— test drivers ———

  open(): void {
    this.readyState = WebSocket.OPEN;
  }

  receive(payload: object): void {
    this.dispatchEvent(
      new MessageEvent("message", { data: JSON.stringify(payload) }),
    );
  }

  serverClose(code: number): void {
    this.readyState = WebSocket.CLOSED;
    this.dispatchEvent(new CloseEvent("close", { code }));
  }
}

describe("gateway", () => {
  let gateway: Gateway | null = null;
  let sockets: FakeWebSocket[] = [];

  function createGateway(): Gateway {
    sockets = [];
    gateway = new Gateway("test-token", 0, {
      createWebSocket: (url) => {
        const ws = new FakeWebSocket(url);
        sockets.push(ws);
        return ws as unknown as WebSocket;
      },
    });
    return gateway;
  }

  /** Boot the socket at `index` (default: newest) through open + HELLO. */
  function hello(index = sockets.length - 1): FakeWebSocket {
    const ws = sockets[index]!;
    ws.open();
    ws.receive(HELLO);
    return ws;
  }

  beforeEach(() => {
    mock.timers.enable({ apis: ["setTimeout"] });
    // Deterministic jitter: reconnect delay = 500 + cap, first beat = full interval.
    mock.method(Math, "random", () => 1);
  });

  afterEach(() => {
    gateway?.destroy();
    gateway = null;
    mock.timers.reset();
    mock.restoreAll();
  });

  describe("identify and resume", () => {
    it("sends Identify with token and intents on HELLO", () => {
      createGateway().connect();
      const ws = hello();

      assert.strictEqual(ws.sent.length, 1);
      assert.strictEqual(ws.sent[0]!.op, 2);
      const d = ws.sent[0]!.d as { token: string; intents: number };
      assert.strictEqual(d.token, "test-token");
      assert.strictEqual(d.intents, 0);
    });

    it("emits dispatch events", () => {
      const gw = createGateway();
      const events: [string, unknown][] = [];
      gw.on("dispatch", (t, d) => events.push([t, d]));
      gw.connect();
      hello().receive(readyPayload());

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0]![0], "READY");
    });

    it("reconnects to the resume URL and sends Resume after a resumable close", () => {
      createGateway().connect();
      const ws = hello();
      ws.receive(readyPayload(42));

      ws.serverClose(4000);
      assert.strictEqual(sockets.length, 1); // not immediate — backoff applies
      mock.timers.tick(1500);
      assert.strictEqual(sockets.length, 2);
      assert.strictEqual(sockets[1]!.url, RESUME_URL);

      const resumed = hello(1);
      assert.strictEqual(resumed.sent[0]!.op, 6);
      const d = resumed.sent[0]!.d as { session_id: string; seq: number };
      assert.strictEqual(d.session_id, "session-1");
      assert.strictEqual(d.seq, 42);
    });

    it("responds to a server heartbeat request immediately", () => {
      createGateway().connect();
      const ws = hello();
      ws.receive(readyPayload(7));

      ws.receive({ op: 1, d: null, s: null, t: null });

      const last = ws.sent.at(-1)!;
      assert.strictEqual(last.op, 1);
      assert.strictEqual(last.d, 7);
    });
  });

  describe("invalid session", () => {
    it("re-identifies on a single fresh connection after InvalidSession(false)", () => {
      createGateway().connect();
      const ws = hello();
      ws.receive(readyPayload());

      ws.receive({ op: 9, d: false, s: null, t: null });
      assert.deepStrictEqual(ws.closeCalls, [1000]); // clean close, session dead
      assert.strictEqual(sockets.length, 1); // no parallel socket — the old bug

      ws.serverClose(1000);
      mock.timers.tick(1500);
      assert.strictEqual(sockets.length, 2);
      assert.strictEqual(sockets[1]!.url, DISCORD_GATEWAY_URL);
      assert.strictEqual(hello(1).sent[0]!.op, 2); // Identify, not Resume
    });

    it("closes with a resume-intent code after InvalidSession(true)", () => {
      createGateway().connect();
      const ws = hello();
      ws.receive(readyPayload(9));

      ws.receive({ op: 9, d: true, s: null, t: null });
      assert.deepStrictEqual(ws.closeCalls, [4000]);

      ws.serverClose(4000);
      mock.timers.tick(1500);
      assert.strictEqual(sockets[1]!.url, RESUME_URL);
      assert.strictEqual(hello(1).sent[0]!.op, 6); // Resume
    });
  });

  describe("stale sockets", () => {
    it("ignores late messages from a replaced socket (the crash scenario)", () => {
      const gw = createGateway();
      const events: string[] = [];
      gw.on("dispatch", (t) => events.push(t));
      gw.connect();
      const ws = hello();
      ws.receive(readyPayload());

      ws.serverClose(4000);
      mock.timers.tick(1500);
      const next = sockets[1]!; // still CONNECTING

      // Late frames from the old socket used to trigger a Resume on the
      // new, not-yet-open socket: InvalidStateError, process crash.
      assert.doesNotThrow(() => {
        ws.receive(HELLO);
        ws.receive(readyPayload(99));
      });
      assert.strictEqual(next.sent.length, 0);
      assert.deepStrictEqual(events, ["READY"]); // nothing re-emitted
    });

    it("drops outbound payloads when the socket is not open instead of throwing", () => {
      createGateway().connect();
      const ws = sockets[0]!; // CONNECTING — never opened

      assert.doesNotThrow(() => ws.receive(HELLO)); // triggers an Identify attempt
      assert.strictEqual(ws.sent.length, 0);
    });
  });

  describe("zombie detection", () => {
    it("closes and reconnects after a missed heartbeat ack", () => {
      createGateway().connect();
      const ws = hello();
      ws.receive(readyPayload(3));

      mock.timers.tick(45_000); // first beat
      assert.strictEqual(ws.sent.filter((p) => p.op === 1).length, 1);

      mock.timers.tick(45_000); // no ack arrived — next beat detects it
      assert.deepStrictEqual(ws.closeCalls, [4000]);

      mock.timers.tick(1500);
      assert.strictEqual(sockets.length, 2);
      assert.strictEqual(sockets[1]!.url, RESUME_URL); // resume, not re-identify
    });

    it("keeps beating while acks arrive", () => {
      createGateway().connect();
      const ws = hello();

      mock.timers.tick(45_000);
      ws.receive({ op: 11, d: null, s: null, t: null });
      mock.timers.tick(45_000);

      assert.strictEqual(ws.sent.filter((p) => p.op === 1).length, 2);
      assert.strictEqual(ws.closeCalls.length, 0);
    });
  });

  describe("close codes", () => {
    it("exits the process on a fatal close code", () => {
      const exit = mock.method(
        process,
        "exit",
        (() => undefined) as unknown as typeof process.exit,
      );
      createGateway().connect();
      const ws = hello();

      ws.serverClose(4004);

      assert.strictEqual(exit.mock.calls.length, 1);
      assert.strictEqual(exit.mock.calls[0]!.arguments[0], 1);
      mock.timers.tick(120_000);
      assert.strictEqual(sockets.length, 1); // no reconnect attempted
    });

    it("re-identifies from scratch after a non-resumable close code", () => {
      createGateway().connect();
      const ws = hello();
      ws.receive(readyPayload());

      ws.serverClose(4009); // session timed out

      mock.timers.tick(1500);
      assert.strictEqual(sockets[1]!.url, DISCORD_GATEWAY_URL);
      assert.strictEqual(hello(1).sent[0]!.op, 2);
    });
  });

  describe("backoff", () => {
    it("grows exponentially and resets after READY", () => {
      createGateway().connect();

      sockets[0]!.serverClose(1006);
      mock.timers.tick(1499); // 500 floor + 1000 cap
      assert.strictEqual(sockets.length, 1);
      mock.timers.tick(1);
      assert.strictEqual(sockets.length, 2);

      sockets[1]!.serverClose(1006);
      mock.timers.tick(2499); // 500 floor + 2000 cap
      assert.strictEqual(sockets.length, 2);
      mock.timers.tick(1);
      assert.strictEqual(sockets.length, 3);

      hello(2).receive(readyPayload()); // resets attempts
      sockets[2]!.serverClose(1006);
      mock.timers.tick(1500); // back to first-step delay
      assert.strictEqual(sockets.length, 4);
    });

    it("resets after RESUMED", () => {
      createGateway().connect();
      const ws = hello();
      ws.receive(readyPayload());

      ws.serverClose(4000);
      mock.timers.tick(1500); // attempt #1 consumed
      const second = hello(1);
      second.receive({ op: 0, d: null, s: 43, t: "RESUMED" });

      second.serverClose(4000);
      mock.timers.tick(1500); // would be 2500 without the reset
      assert.strictEqual(sockets.length, 3);
    });
  });

  describe("destroy", () => {
    it("cancels a pending reconnect", () => {
      const gw = createGateway();
      gw.connect();
      const ws = hello();
      ws.receive(readyPayload());

      ws.serverClose(4000); // reconnect now pending
      gw.destroy();

      mock.timers.tick(600_000);
      assert.strictEqual(sockets.length, 1);
    });

    it("closes the active socket cleanly", () => {
      const gw = createGateway();
      gw.connect();
      const ws = hello();

      gw.destroy();

      assert.deepStrictEqual(ws.closeCalls, [1000]);
    });
  });
});
