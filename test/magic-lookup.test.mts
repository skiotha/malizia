import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readMagicFile } from "./magic-data.mts";

const EXPECTED_SPELL_COUNT = 49;

describe("magic lookup data", () => {
  it("contains a well-formed entry for each parsed spell", async () => {
    const data = await readMagicFile("../temp/magic.lookup.json");

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
    const data = await readMagicFile("../temp/magic.lookup.json");
    const ids = new Set(data.map((entry) => entry.id));

    assert.ok(ids.has("break-will"));
    assert.ok(ids.has("holy-aura"));
    assert.ok(ids.has("wild-hunt"));
    assert.ok(ids.has("ghost-strike"));
    assert.ok(ids.has("battle-hymn"));
    assert.ok(ids.has("protective-runes"));
  });
});
