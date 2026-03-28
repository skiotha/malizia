import { readFile } from "node:fs/promises";

// ── Types ──────────────────────────────────────────────

export interface AbilityEffect {
  target: string;
  action: string;
  value: string;
  description: string;
}

export interface AbilityTier {
  description: string;
  effects: AbilityEffect[];
}

export interface Ability {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  source: string;
  tiers: {
    novice: AbilityTier;
    adept: AbilityTier;
    master: AbilityTier;
  };
}

export interface AbilitySummary {
  id: string;
  name: string;
  tags: string[];
  description: string;
}

// ── Local data cache ───────────────────────────────────

let abilities: Ability[] | undefined;

async function loadAbilities(): Promise<Ability[]> {
  if (abilities) return abilities;

  // const data = await apiGet("/api/abilities");
  // abilities = data as Ability[];
  const raw = await readFile(
    new URL("../data/abilities.lookup.json", import.meta.url),
    "utf-8",
  );
  abilities = JSON.parse(raw) as Ability[];
  return abilities;
}

// ── Search logic ───────────────────────────────────────

function detectSearchMode(query: string): "tags" | "name" | "both" {
  if (query.includes(",")) return "tags";
  if (/\s/.test(query)) return "name";
  if (/^\p{Lu}/u.test(query)) return "name";
  return "both";
}

function matchesName(ability: Ability, query: string): boolean {
  const lower = query.toLowerCase();
  return (
    ability.name.toLowerCase().includes(lower) || ability.id.includes(lower)
  );
}

function matchesTags(ability: Ability, tags: string[]): boolean {
  return tags.every((tag) => ability.tags.includes(tag));
}

function toSummary(ability: Ability): AbilitySummary {
  // TODO: consider truncating description if it's too long for autocomplete display
  // TODO: consider what fields are to keep in the type
  return {
    id: ability.id,
    name: ability.name,
    tags: ability.tags,
    description: ability.description,
  };
}

export async function searchAbilities(
  query: string,
): Promise<AbilitySummary[]> {
  const all = await loadAbilities();
  const trimmed = query.trim();
  if (!trimmed) return all.slice(0, 25).map(toSummary);

  const mode = detectSearchMode(trimmed);

  if (mode === "tags") {
    const tags = trimmed
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    return all.filter((a) => matchesTags(a, tags)).map(toSummary);
  }

  if (mode === "name") {
    return all.filter((a) => matchesName(a, trimmed)).map(toSummary);
  }

  // mode === "both": merge name + tag matches, name first
  const nameMatches = all.filter((a) => matchesName(a, trimmed));
  const tagMatches = all.filter(
    (a) => a.tags.includes(trimmed.toLowerCase()) && !nameMatches.includes(a),
  );
  return [...nameMatches, ...tagMatches].map(toSummary);
}

export async function getAbility(id: string): Promise<Ability | undefined> {
  const all = await loadAbilities();
  return all.find((a) => a.id === id);
}
