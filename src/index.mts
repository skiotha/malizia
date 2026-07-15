import { Gateway } from "#gateway";
import { DiscordRest } from "#rest";
import { registerEvents } from "#events";

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error("Missing DISCORD_TOKEN in environment.");
  process.exit(1);
}

const rest = new DiscordRest(token);
const gateway = new Gateway(token, 0);

registerEvents(gateway, rest);
gateway.connect();

function shutdown(): void {
  console.log("Shutting down.");
  gateway.destroy();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
