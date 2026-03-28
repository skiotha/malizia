import { OptionType, type Command } from "#types";
import { t } from "#i18n";

export const character: Command = {
  data: {
    name: "character",
    name_localizations: { ru: "персонаж" },
    description: "Look up a character reference",
    description_localizations: { ru: "Поиск чарлиста персонажа" },
    options: [
      {
        type: OptionType.String,
        name: "name",
        name_localizations: { ru: "имя" },
        description: "Character name to look up",
        description_localizations: { ru: "Имя персонажа для поиска" },
        required: true,
      },
    ],
  },

  async execute(ctx) {
    const name = ctx.options.get("name") as string;
    // TODO: query RPG API for character data
    await ctx.reply(t(ctx.locale, "character.lookingUp", { name }));
  },
};
