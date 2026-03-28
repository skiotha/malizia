import { parseDice, rollDice } from "#dice";
import { OptionType, type Command } from "#types";
import { formatRollReply } from "#format/roll";

export const roll: Command = {
  data: {
    name: "roll",
    description: "Roll dice for the Nagara RPG system",
    options: [
      {
        type: OptionType.String,
        name: "expression",
        description: "Dice expression, e.g. 2d6+3 (defaults to 1d20)",
        required: false,
      },
    ],
  },

  async execute(ctx) {
    const expression =
      (ctx.options.get("expression") as string | undefined) ?? "1d20";

    const { groups: dice, check } = parseDice(expression);

    if (dice.length === 0) {
      await ctx.reply(
        `Invalid dice expression: \`${expression}\`. Expected format: \`NdS+M\` (e.g. \`2d6+3\`, \`d20\`)`,
        { ephemeral: true },
      );
      return;
    }

    const results = dice.map(rollDice);

    await ctx.reply(formatRollReply(expression, results, check));
  },
};
