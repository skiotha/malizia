import { parseDice, rollDice, type RollResult } from "#dice";
import { OptionType, type Command } from "#types";

function formatRoll(result: RollResult): string {
  const parts = result.rolls.map(String);
  if (result.modifier > 0) parts.push(`*${result.modifier}*`);
  else if (result.modifier < 0) parts.push(String(result.modifier));
  return parts.join(" + ");
}

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

    const dice = parseDice(expression);

    if (dice.length === 0) {
      await ctx.reply(
        `Invalid dice expression: \`${expression}\`. Expected format: \`NdS+M\` (e.g. \`2d6+3\`, \`d20\`)`,
        { ephemeral: true },
      );
      return;
    }

    const results = dice.map(rollDice);

    const breakdowns = results.map(formatRoll);
    const totals = results.map((r) => r.total);

    await ctx.reply(
      `Rolling **${expression}:** ${breakdowns.join("; ")}\n**Result:** ${totals.join(", ")}`,
    );
  },
};
