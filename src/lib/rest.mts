import { DISCORD_API_BASE } from "#constants";

export class DiscordRest {
  #token: string;

  constructor(token: string) {
    this.#token = token;
  }

  async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    const response = await fetch(`${DISCORD_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bot ${this.#token}`,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Discord API ${method} ${path}: ${response.status} ${text}`,
      );
    }

    if (response.status === 204) return undefined;
    return response.json();
  }
}
