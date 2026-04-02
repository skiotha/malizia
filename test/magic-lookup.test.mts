import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

type Tier = {
  description: string;
  effects: Array<{
    target: string;
    action: string;
    value: string | number;
    description: string;
  }>;
};

type MagicEntry = {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  source: string;
  tiers: {
    novice: Tier;
    adept: Tier;
    master: Tier;
  };
};

const EXPECTED_SPELL_COUNT = 49;

async function readMagicLookup(): Promise<MagicEntry[]> {
  const path = new URL("../temp/magic.lookup.json", import.meta.url);

  try {
    const text = await readFile(path, "utf8");

    try {
      return JSON.parse(text) as MagicEntry[];
    } catch (error) {
      throw new Error(`Failed to parse ${path.pathname}: ${(error as Error).message}`);
    }
  } catch (error) {
    throw new Error(`Failed to read ${path.pathname}: ${(error as Error).message}`);
  }
}

describe("magic lookup data", () => {
  it("contains a well-formed entry for each parsed spell", async () => {
    const data = await readMagicLookup();

    assert.strictEqual(data.length, EXPECTED_SPELL_COUNT);
    assert.strictEqual(new Set(data.map((entry) => entry.id)).size, data.length);

    for (const entry of data) {
      assert.ok(entry.id.length > 0);
      assert.match(entry.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.ok(entry.name.length > 0);
      assert.strictEqual(entry.category, "magic");
      assert.ok(entry.description.length > 0);
      assert.ok(entry.tags.length > 0);
      assert.strictEqual(entry.source, "spells.txt");

      for (const tier of [entry.tiers.novice, entry.tiers.adept, entry.tiers.master]) {
        assert.ok(tier.description.length > 0);
        assert.ok(tier.effects.length > 0);

        for (const effect of tier.effects) {
          assert.ok(effect.target.length > 0);
          assert.ok(effect.action.length > 0);
          assert.ok(String(effect.value).length > 0);
          assert.ok(effect.description.length > 0);
        }
      }
    }
  });

  it("includes representative spells from each major school grouping", async () => {
    const data = await readMagicLookup();
    const ids = new Set(data.map((entry) => entry.id));

    assert.ok(ids.has("break-will"));
    assert.ok(ids.has("holy-aura"));
    assert.ok(ids.has("wild-hunt"));
    assert.ok(ids.has("ghost-strike"));
    assert.ok(ids.has("battle-hymn"));
    assert.ok(ids.has("protective-runes"));
  });
});
