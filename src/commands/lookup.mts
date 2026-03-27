import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OptionType, type Command } from "#types";

const DATA_PATH = join(process.cwd(), "temp", "abilities.lookup.json");

interface AbilityEntry {
	name: string;
	tags: string[];
	description?: string;
	[key: string]: unknown;
}

/** Load abilities once and cache in memory. Returns an empty array if the file
 *  is missing so the bot starts gracefully before the data file is generated. */
function loadAbilities(): AbilityEntry[] {
	try {
		return JSON.parse(readFileSync(DATA_PATH, "utf8")) as AbilityEntry[];
	} catch {
		return [];
	}
}

let _cache: AbilityEntry[] | null = null;

function getAbilities(): AbilityEntry[] {
	if (_cache === null) _cache = loadAbilities();
	return _cache;
}

const MAX_RESULTS = 10;
const MAX_REPLY_LEN = 1900;

export const lookup: Command = {
	data: {
		name: "lookup",
		description: "Search abilities by name or tag",
		options: [
			{
				type: OptionType.String,
				name: "query",
				description: "Partial ability name or tag to search for",
				required: true,
			},
		],
	},

	async execute(ctx) {
		const query = (ctx.options.get("query") as string).toLowerCase().trim();

		const abilities = getAbilities();

		if (abilities.length === 0) {
			await ctx.reply(
				"Ability data is not available yet. Please check back later.",
				{ ephemeral: true },
			);
			return;
		}

		const matches = abilities.filter(
			(a) =>
				a.name.toLowerCase().includes(query) ||
				a.tags.some((t) => t.includes(query)),
		);

		if (matches.length === 0) {
			await ctx.reply(`No abilities found matching **${query}**.`, {
				ephemeral: true,
			});
			return;
		}

		const shown = matches.slice(0, MAX_RESULTS);
		const header =
			matches.length > MAX_RESULTS
				? `Showing ${MAX_RESULTS} of ${matches.length} matches for **${query}**:`
				: `${matches.length} match${matches.length === 1 ? "" : "es"} for **${query}**:`;

		const lines = shown.map((a) => {
			const tags = a.tags.length > 0 ? `\`${a.tags.join(", ")}\`` : "—";
			return `- **${a.name}** — ${tags}`;
		});

		let body = `${header}\n${lines.join("\n")}`;
		if (body.length > MAX_REPLY_LEN) {
			body = body.slice(0, MAX_REPLY_LEN - 3) + "...";
		}

		await ctx.reply(body);
	},
};
