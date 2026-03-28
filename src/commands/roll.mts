import { parseDice, rollDice } from "#dice";
import { OptionType, type Command } from "#types";
import { formatRollReply } from "#format/roll";
import { t } from "#i18n";

export const roll: Command = {
  data: {
    name: "roll",
    name_localizations: { ru: "бросок" },
    description: "Roll dice for the Nagara RPG system",
    description_localizations: { ru: "Бросить кости" },
    options: [
      {
        type: OptionType.String,
        name: "expression",
        name_localizations: { ru: "выражение" },
        description: "Dice expression, e.g. 2d6+3 (defaults to 1d20)",
        description_localizations: {
          ru: "Выражение для броска, напр. 2d6+3 (по умолчанию 1d20)",
        },
        required: false,
      },
    ],
  },

  async execute(ctx) {
    const expression =
      (ctx.options.get("expression") as string | undefined) ?? "1d20";

    const { groups: dice, check } = parseDice(expression);

    if (dice.length === 0) {
      await ctx.reply(t(ctx.locale, "roll.invalid", { expr: expression }), {
        ephemeral: true,
      });
      return;
    }

    const results = dice.map(rollDice);

    await ctx.reply(formatRollReply(expression, results, ctx.locale, check));
  },
};
