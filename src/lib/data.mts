import { readFile } from "node:fs/promises";
import type { Locale } from "#i18n";

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
  details?: string;
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

export type LookupEntry = Ability;
export type LookupSummary = AbilitySummary;

// ── Local data cache ───────────────────────────────────

const abilityCache = new Map<Locale, Ability[]>();
const spellCache = new Map<Locale, Ability[]>();

async function loadAbilities(locale: Locale): Promise<Ability[]> {
  const cached = abilityCache.get(locale);
  if (cached) return cached;

  // const data = await apiGet("/api/abilities");
  // abilities = data as Ability[];
  const raw = await readFile(
    new URL(`../data/abilities.${locale}.json`, import.meta.url),
    "utf-8",
  );
  const abilities = JSON.parse(raw) as Ability[];
  abilityCache.set(locale, abilities);
  return abilities;
}

async function loadSpells(locale: Locale): Promise<Ability[]> {
  const cached = spellCache.get(locale);
  if (cached) return cached;

  const raw = await readFile(
    new URL(`../data/spells.${locale}.json`, import.meta.url),
    "utf-8",
  );
  const spells = JSON.parse(raw) as Ability[];
  spellCache.set(locale, spells);
  return spells;
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

function searchEntries(
  entries: Ability[],
  query: string,
): AbilitySummary[] {
  const trimmed = query.trim();
  if (!trimmed) return entries.slice(0, 25).map(toSummary);

  const mode = detectSearchMode(trimmed);

  if (mode === "tags") {
    const tags = trimmed
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    return entries.filter((a) => matchesTags(a, tags)).map(toSummary);
  }

  if (mode === "name") {
    return entries.filter((a) => matchesName(a, trimmed)).map(toSummary);
  }

  // mode === "both": merge name + tag matches, name first
  const nameMatches = entries.filter((a) => matchesName(a, trimmed));
  const tagMatches = entries.filter(
    (a) => a.tags.includes(trimmed.toLowerCase()) && !nameMatches.includes(a),
  );
  return [...nameMatches, ...tagMatches].map(toSummary);
}

export async function searchAbilities(
  query: string,
  locale: Locale,
): Promise<AbilitySummary[]> {
  return searchEntries(await loadAbilities(locale), query);
}

export async function searchLookups(
  query: string,
  locale: Locale,
): Promise<LookupSummary[]> {
  const [abilities, spells] = await Promise.all([
    loadAbilities(locale),
    loadSpells(locale),
  ]);
  return searchEntries([...abilities, ...spells], query);
}

export async function getAbility(
  id: string,
  locale: Locale,
): Promise<Ability | undefined> {
  const all = await loadAbilities(locale);
  return all.find((a) => a.id === id);
}

export async function getLookup(
  id: string,
  locale: Locale,
): Promise<LookupEntry | undefined> {
  const ability = await getAbility(id, locale);
  if (ability) return ability;

  const spells = await loadSpells(locale);
  return spells.find((spell) => spell.id === id);
}
