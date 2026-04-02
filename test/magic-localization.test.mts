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

async function readMagicFile(path: string): Promise<MagicEntry[]> {
  const fileUrl = new URL(path, import.meta.url);

  try {
    const text = await readFile(fileUrl, "utf8");

    try {
      return JSON.parse(text) as MagicEntry[];
    } catch (error) {
      throw new Error(
        `Failed to parse ${fileUrl.pathname}: ${(error as Error).message}`,
      );
    }
  } catch (error) {
    throw new Error(
      `Failed to read ${fileUrl.pathname}: ${(error as Error).message}`,
    );
  }
}

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
        assert.strictEqual(
          localizedTier.effects[0]!.target,
          sourceTier.effects[0]!.target,
        );
        assert.strictEqual(
          localizedTier.effects[0]!.action,
          sourceTier.effects[0]!.action,
        );
        assert.deepStrictEqual(
          localizedTier.effects[0]!.value,
          sourceTier.effects[0]!.value,
        );
        assert.strictEqual(
          localizedTier.effects[0]!.description,
          sourceTier.effects[0]!.description,
        );
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

        assert.strictEqual(
          localizedTier.effects[0]!.target,
          sourceTier.effects[0]!.target,
        );
        assert.strictEqual(
          localizedTier.effects[0]!.action,
          sourceTier.effects[0]!.action,
        );
        assert.deepStrictEqual(
          localizedTier.effects[0]!.value,
          sourceTier.effects[0]!.value,
        );
        assert.doesNotMatch(localizedTier.description, /[А-Яа-яЁё]/);
        assert.doesNotMatch(localizedTier.effects[0]!.description, /[А-Яа-яЁё]/);
      }
    }
  });
});
