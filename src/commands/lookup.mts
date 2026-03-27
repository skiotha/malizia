import { OptionType, type Command } from "#types";

export const lookup: Command = {
	data: {
		name: "lookup",
		description: "Look up rules or world information",
		options: [
			{
				type: OptionType.String,
				name: "query",
				description: "What to search for",
				required: true,
			},
		],
	},

	async execute(ctx) {
		const query = ctx.options.get("query") as string;
		// TODO: query RPG API for rules/world data
		await ctx.reply(`Searching for: ${query}`);
	},
};
