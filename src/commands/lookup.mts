import { OptionType, ButtonStyle, type Command } from "#types";
import { searchAbilities, getAbility } from "#data";
import { registerComponent } from "#components";
import { formatAbilityEmbed, formatAbilityChoice } from "#format/ability";
import { t } from "#i18n";

export const lookup: Command = {
  data: {
    name: "lookup",
    name_localizations: { ru: "справка" },
    description: "Look up rules or information on abilities and magic",
    description_localizations: {
      ru: "Поиск правил или информации по скиллам и магии",
    },
    options: [
      {
        type: OptionType.String,
        name: "query",
        name_localizations: { ru: "запрос" },
        description: "What to search for",
        description_localizations: { ru: "Что искать" },
        required: true,
        autocomplete: true,
      },
    ],
  },

  async autocomplete(ctx) {
    const results = await searchAbilities(ctx.focusedValue, ctx.locale);
    const choices = results.slice(0, 25).map((a) => ({
      name: formatAbilityChoice(a),
      value: a.id,
    }));
    await ctx.respond(choices);
  },

  async execute(ctx) {
    const query = ctx.options.get("query") as string;

    // Try as ability ID first (user picked from autocomplete)
    let ability = await getAbility(query, ctx.locale);

    // Fallback: freeform text search
    if (!ability) {
      const results = await searchAbilities(query, ctx.locale);
      if (results.length > 0) {
        ability = await getAbility(results[0]!.id, ctx.locale);
      }
    }

    if (!ability) {
      await ctx.reply(t(ctx.locale, "lookup.notFound", { query }), {
        ephemeral: true,
      });
      return;
    }

    await ctx.reply("", {
      ephemeral: true,
      embeds: [formatAbilityEmbed(ability, ctx.locale)],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: ButtonStyle.Secondary,
              label: t(ctx.locale, "lookup.share"),
              custom_id: `lookup:share:${ability.id}`,
            },
          ],
        },
      ],
    });
  },
};

registerComponent("lookup:share", async (ctx) => {
  const abilityId = ctx.params[0];
  if (!abilityId) return;

  const ability = await getAbility(abilityId, ctx.locale);
  if (!ability) {
    await ctx.reply(t(ctx.locale, "lookup.abilityNotFound"), {
      ephemeral: true,
    });
    return;
  }

  await ctx.reply("", {
    embeds: [formatAbilityEmbed(ability, ctx.locale)],
  });
});
