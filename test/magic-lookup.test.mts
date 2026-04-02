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

async function readMagicLookup(): Promise<MagicEntry[]> {
  const text = await readFile(
    new URL("../temp/magic.lookup.json", import.meta.url),
    "utf8",
  );
  return JSON.parse(text) as MagicEntry[];
}

describe("magic lookup data", () => {
  it("contains a well-formed entry for each parsed spell", async () => {
    const data = await readMagicLookup();

    assert.strictEqual(data.length, 49);
    assert.strictEqual(new Set(data.map((entry) => entry.id)).size, data.length);

    for (const entry of data) {
      assert.ok(entry.id.length > 0);
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
