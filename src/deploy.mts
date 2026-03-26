import { DiscordRest } from "#rest";
import { commands } from "#commands";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
	console.error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment.");
	process.exit(1);
}

const rest = new DiscordRest(token);
const body = [...commands.values()].map((command) => command.data);

if (guildId) {
	await rest.request("PUT", `/applications/${clientId}/guilds/${guildId}/commands`, body);
	console.log(`Deployed ${body.length} command(s) to guild ${guildId}.`);
} else {
	await rest.request("PUT", `/applications/${clientId}/commands`, body);
	console.log(`Deployed ${body.length} command(s) globally.`);
}
