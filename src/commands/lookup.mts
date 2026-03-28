import { OptionType, ButtonStyle, type Command } from "#types";
import { searchAbilities, getAbility } from "#data";
import { registerComponent } from "#components";
import { formatAbilityEmbed, formatAbilityChoice } from "#format/ability";

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
        autocomplete: true,
      },
    ],
  },

  async autocomplete(ctx) {
    const results = await searchAbilities(ctx.focusedValue);
    const choices = results.slice(0, 25).map((a) => ({
      name: formatAbilityChoice(a),
      value: a.id,
    }));
    await ctx.respond(choices);
  },

  async execute(ctx) {
    const query = ctx.options.get("query") as string;

    // Try as ability ID first (user picked from autocomplete)
    let ability = await getAbility(query);

    // Fallback: freeform text search
    if (!ability) {
      const results = await searchAbilities(query);
      if (results.length > 0) {
        ability = await getAbility(results[0]!.id);
      }
    }

    if (!ability) {
      await ctx.reply(`No results found for "${query}".`, { ephemeral: true });
      return;
    }

    await ctx.reply("", {
      ephemeral: true,
      embeds: [formatAbilityEmbed(ability)],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: ButtonStyle.Secondary,
              label: "Share",
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

  const ability = await getAbility(abilityId);
  if (!ability) {
    await ctx.reply("Ability not found.", { ephemeral: true });
    return;
  }

  await ctx.reply("", {
    embeds: [formatAbilityEmbed(ability)],
  });
});
