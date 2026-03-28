import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { searchAbilities, getAbility } from "#data";

describe("searchAbilities", () => {
  it("returns up to 25 results for an empty query", async () => {
    const results = await searchAbilities("");
    assert.ok(results.length > 0);
    assert.ok(results.length <= 25);
  });

  it("finds ability by Russian name prefix", async () => {
    const results = await searchAbilities("Акроб");
    assert.ok(results.some((r) => r.id === "acrobatics"));
  });

  it("finds ability by English id", async () => {
    const results = await searchAbilities("acrobatics");
    assert.ok(results.some((r) => r.id === "acrobatics"));
  });

  it("finds ability by tag", async () => {
    const results = await searchAbilities("подвижность");
    assert.ok(results.some((r) => r.id === "acrobatics"));
  });

  it("treats comma-separated input as tag intersection", async () => {
    const results = await searchAbilities("подвижность, защита");
    for (const r of results) {
      assert.ok(
        r.tags.includes("подвижность"),
        `${r.id} should have подвижность tag`,
      );
      assert.ok(r.tags.includes("защита"), `${r.id} should have защита tag`);
    }
  });

  it("treats input with whitespace as name search", async () => {
    const results = await searchAbilities("Дым и");
    assert.ok(results.some((r) => r.id === "smoke-and-mirrors"));
  });

  it("treats uppercase-first-letter input as name search", async () => {
    // Uppercase first letter → name mode, so an English tag like "Mobility" won't match tags
    const results = await searchAbilities("Mobility");
    // Should attempt name match against ability.name and ability.id
    for (const r of results) {
      assert.ok(
        r.name.toLowerCase().includes("mobility") || r.id.includes("mobility"),
        `${r.id} should match by name/id`,
      );
    }
  });

  it("returns empty array for no matches", async () => {
    const results = await searchAbilities("zzz_nonexistent_zzz");
    assert.strictEqual(results.length, 0);
  });
});

describe("getAbility", () => {
  it("returns full ability by id", async () => {
    const ability = await getAbility("acrobatics");
    assert.ok(ability);
    assert.strictEqual(ability.id, "acrobatics");
    assert.ok(ability.tiers.novice);
    assert.ok(ability.tiers.adept);
    assert.ok(ability.tiers.master);
  });

  it("returns undefined for unknown id", async () => {
    const ability = await getAbility("zzz_nonexistent_zzz");
    assert.strictEqual(ability, undefined);
  });
});
