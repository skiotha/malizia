import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readMagicFile } from "./magic-data.mts";

describe("localized magic data", () => {
  it("keeps the Russian file aligned with the source while translating tags", async () => {
    const base = await readMagicFile("../temp/magic.lookup.json");
    const localized = await readMagicFile("../temp/magic.ru.json");

    assert.strictEqual(localized.length, base.length);

    for (const [index, entry] of localized.entries()) {
      const source = base[index]!;

      assert.strictEqual(entry.id, source.id);
      assert.strictEqual(entry.name, source.name);
      assert.strictEqual(entry.description, source.description);
      assert.strictEqual(entry.source, source.source);
      assert.deepStrictEqual(entry.tags.length, source.tags.length);

      for (const tag of entry.tags) {
        assert.doesNotMatch(tag, /[A-Za-z]/);
      }

      for (const tierName of ["novice", "adept", "master"] as const) {
        const localizedTier = entry.tiers[tierName];
        const sourceTier = source.tiers[tierName];

        assert.strictEqual(localizedTier.description, sourceTier.description);
        assert.strictEqual(localizedTier.effects.length, sourceTier.effects.length);

        for (const [effectIndex, effect] of localizedTier.effects.entries()) {
          const sourceEffect = sourceTier.effects[effectIndex]!;

          assert.strictEqual(effect.target, sourceEffect.target);
          assert.strictEqual(effect.action, sourceEffect.action);
          assert.strictEqual(effect.value, sourceEffect.value);
          assert.strictEqual(effect.description, sourceEffect.description);
        }
      }
    }
  });

  it("translates all English text fields while preserving mechanics", async () => {
    const base = await readMagicFile("../temp/magic.lookup.json");
    const localized = await readMagicFile("../temp/magic.en.json");

    assert.strictEqual(localized.length, base.length);

    for (const [index, entry] of localized.entries()) {
      const source = base[index]!;

      assert.strictEqual(entry.id, source.id);
      assert.strictEqual(entry.category, source.category);
      assert.deepStrictEqual(entry.tags, source.tags);
      assert.strictEqual(entry.source, source.source);
      assert.doesNotMatch(entry.name, /[А-Яа-яЁё]/);
      assert.doesNotMatch(entry.description, /[А-Яа-яЁё]/);

      for (const tierName of ["novice", "adept", "master"] as const) {
        const localizedTier = entry.tiers[tierName];
        const sourceTier = source.tiers[tierName];

        assert.doesNotMatch(localizedTier.description, /[А-Яа-яЁё]/);
        assert.strictEqual(localizedTier.effects.length, sourceTier.effects.length);

        for (const [effectIndex, effect] of localizedTier.effects.entries()) {
          const sourceEffect = sourceTier.effects[effectIndex]!;

          assert.strictEqual(effect.target, sourceEffect.target);
          assert.strictEqual(effect.action, sourceEffect.action);
          assert.strictEqual(effect.value, sourceEffect.value);
          assert.doesNotMatch(effect.description, /[А-Яа-яЁё]/);
        }
      }
    }
  });
});
