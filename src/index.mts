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
