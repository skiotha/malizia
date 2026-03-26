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

interface GatewayPayload {
	op: number;
	d: unknown;
	s: number | null;
	t: string | null;
}

export class Gateway extends EventEmitter<{ dispatch: [event: string, data: unknown] }> {
	#token: string;
	#intents: number;
	#ws: WebSocket | null = null;
	#heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
	#sequence: number | null = null;
	#sessionId: string | null = null;
	#resumeUrl: string | null = null;
	#destroyed = false;

	constructor(token: string, intents: number) {
		super();
		this.#token = token;
		this.#intents = intents;
	}

	connect(): void {
		const url = this.#resumeUrl ?? DISCORD_GATEWAY_URL;
		this.#ws = new WebSocket(url);

		this.#ws.addEventListener("message", (event) => {
			const payload = JSON.parse(String(event.data)) as GatewayPayload;
			this.#handlePayload(payload);
		});

		this.#ws.addEventListener("close", () => {
			this.#stopHeartbeat();
			if (!this.#destroyed) {
				setTimeout(() => this.connect(), 5000);
			}
		});
	}

	#handlePayload(payload: GatewayPayload): void {
		switch (payload.op) {
			case Opcode.Hello: {
				const { heartbeat_interval } = payload.d as { heartbeat_interval: number };
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
					const data = payload.d as { session_id: string; resume_gateway_url: string };
					this.#sessionId = data.session_id;
					this.#resumeUrl = data.resume_gateway_url;
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
				this.#ws?.close();
				break;

			case Opcode.InvalidSession: {
				const resumable = payload.d as boolean;
				if (!resumable) {
					this.#sessionId = null;
					this.#sequence = null;
					this.#resumeUrl = null;
				}
				setTimeout(() => this.connect(), Math.random() * 5000 + 1000);
				break;
			}

			case Opcode.HeartbeatAck:
				break;
		}
	}

	#send(op: number, d: unknown): void {
		this.#ws?.send(JSON.stringify({ op, d }));
	}

	#startHeartbeat(interval: number): void {
		this.#stopHeartbeat();
		const beat = () => {
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

	destroy(): void {
		this.#destroyed = true;
		this.#stopHeartbeat();
		this.#ws?.close();
	}
}
