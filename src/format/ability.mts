import type { Embed } from "#types";
import type { Ability, AbilitySummary, AbilityTier } from "#data";

const TIER_LABELS: Record<string, string> = {
  novice: "Novice",
  adept: "Adept",
  master: "Master",
};

const EMBED_COLOR = 0x5865f2; // Discord blurple
const AUTOCOMPLETE_MAX = 100;

function formatTierField(tier: AbilityTier): string {
  const lines = [tier.description];
  for (const effect of tier.effects) {
    lines.push(`- ${effect.description}`);
  }
  const text = lines.join("\n");
  return text.length > 1024 ? text.slice(0, 1021) + "..." : text;
}

export function formatAbilityEmbed(ability: Ability): Embed {
  const fields = [];
  for (const [tier, data] of Object.entries(ability.tiers)) {
    fields.push({
      name: TIER_LABELS[tier] ?? tier,
      value: formatTierField(data),
    });
  }

  return {
    title: ability.name,
    description: ability.description,
    color: EMBED_COLOR,
    fields,
    footer: { text: ability.tags.join(", ") },
  };
}

export function formatAbilityChoice(summary: AbilitySummary): string {
  const tags = summary.tags.join(", ");
  const display = tags ? `${summary.name} [${tags}]` : summary.name;
  return display.length > AUTOCOMPLETE_MAX
    ? display.slice(0, AUTOCOMPLETE_MAX - 3) + "..."
    : display;
}
