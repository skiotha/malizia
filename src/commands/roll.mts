import { OptionType, type Command } from "#types";

export const roll: Command = {
  data: {
    name: "roll",
    description: "Roll dice for the Nagara RPG system",
    options: [
      {
        type: OptionType.String,
        name: "expression",
        description: "Dice expression (e.g. 2d6+3)",
        required: true,
      },
    ],
  },

  async execute(ctx) {
    const expression = ctx.options.get("expression") as string;
    // TODO: implement dice parsing and rolling
    await ctx.reply(`Rolling: ${expression}`);
  },
};
