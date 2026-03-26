import { parseDice, rollDice, type RollResult, type Check } from "#dice";
import { OptionType, type Command } from "#types";

function formatRoll(result: RollResult, check?: Check): string {
  const parts = result.rolls.map(String);
  if (result.modifier > 0) parts.push(`*${result.modifier}*`);
  else if (result.modifier < 0) parts.push(String(result.modifier));
  const breakdown = parts.join(" + ");
  if (!check) return breakdown;
  const pass = evaluateCheck(result.total, check);
  return `${pass ? "Success!" : "Failure!"} ${breakdown}`;
}

function evaluateCheck(total: number, check: Check): boolean {
  switch (check.operator) {
    case "<":  return total < check.threshold;
    case "<=": return total <= check.threshold;
    case ">":  return total > check.threshold;
    case ">=": return total >= check.threshold;
  }
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

    const { groups: dice, check } = parseDice(expression);

    if (dice.length === 0) {
      await ctx.reply(
        `Invalid dice expression: \`${expression}\`. Expected format: \`NdS+M\` (e.g. \`2d6+3\`, \`d20\`)`,
        { ephemeral: true },
      );
      return;
    }

    const results = dice.map(rollDice);

    const breakdowns = results.map((r) => formatRoll(r, check));
    const totals = results.map((r) => r.total);

    await ctx.reply(
      `-# **Rolling ${expression}:**\n-# ${breakdowns.join(";\n-# ")}\n**Result:** ${totals.join(", ")}`,
    );
  },
};
