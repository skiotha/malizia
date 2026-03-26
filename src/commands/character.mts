import { OptionType, type Command } from "#types";

export const character: Command = {
	data: {
		name: "character",
		description: "Look up a character reference",
		options: [
			{
				type: OptionType.String,
				name: "name",
				description: "Character name to look up",
				required: true,
			},
		],
	},

	async execute(ctx) {
		const name = ctx.options.get("name") as string;
		// TODO: query RPG API for character data
		await ctx.reply(`Looking up character: ${name}`);
	},
};
