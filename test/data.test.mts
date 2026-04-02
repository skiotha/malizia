import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { searchAbilities, getAbility, searchLookups, getLookup } from "#data";

describe("searchAbilities", () => {
  it("returns up to 25 results for an empty query", async () => {
    const results = await searchAbilities("", "en");
    assert.ok(results.length > 0);
    assert.ok(results.length <= 25);
  });

  it("finds ability by English name prefix", async () => {
    const results = await searchAbilities("Acrob", "en");
    assert.ok(results.some((r) => r.id === "acrobatics"));
  });

  it("finds ability by Russian name prefix", async () => {
    const results = await searchAbilities("Акроб", "ru");
    assert.ok(results.some((r) => r.id === "acrobatics"));
  });

  it("finds ability by English id", async () => {
    const results = await searchAbilities("acrobatics", "en");
    assert.ok(results.some((r) => r.id === "acrobatics"));
  });

  it("finds ability by English tag", async () => {
    const results = await searchAbilities("mobility", "en");
    assert.ok(results.some((r) => r.id === "acrobatics"));
  });

  it("finds ability by Russian tag", async () => {
    const results = await searchAbilities("подвижность", "ru");
    assert.ok(results.some((r) => r.id === "acrobatics"));
  });

  it("treats comma-separated input as tag intersection", async () => {
    const results = await searchAbilities("mobility, defense", "en");
    for (const r of results) {
      assert.ok(
        r.tags.includes("mobility"),
        `${r.id} should have mobility tag`,
      );
      assert.ok(r.tags.includes("defense"), `${r.id} should have defense tag`);
    }
  });

  it("treats input with whitespace as name search", async () => {
    const results = await searchAbilities("Smoke and", "en");
    assert.ok(results.some((r) => r.id === "smoke-and-mirrors"));
  });

  it("treats uppercase-first-letter input as name search", async () => {
    const results = await searchAbilities("Mobility", "en");
    for (const r of results) {
      assert.ok(
        r.name.toLowerCase().includes("mobility") || r.id.includes("mobility"),
        `${r.id} should match by name/id`,
      );
    }
  });

  it("returns empty array for no matches", async () => {
    const results = await searchAbilities("zzz_nonexistent_zzz", "en");
    assert.strictEqual(results.length, 0);
  });

  it("returns English names for en locale", async () => {
    const results = await searchAbilities("acrobatics", "en");
    const acro = results.find((r) => r.id === "acrobatics");
    assert.ok(acro);
    assert.strictEqual(acro.name, "Acrobatics");
  });

  it("returns Russian names for ru locale", async () => {
    const results = await searchAbilities("acrobatics", "ru");
    const acro = results.find((r) => r.id === "acrobatics");
    assert.ok(acro);
    assert.strictEqual(acro.name, "Акробатика");
  });
});

describe("getAbility", () => {
  it("returns full ability by id", async () => {
    const ability = await getAbility("acrobatics", "en");
    assert.ok(ability);
    assert.strictEqual(ability.id, "acrobatics");
    assert.ok(ability.tiers.novice);
    assert.ok(ability.tiers.adept);
    assert.ok(ability.tiers.master);
  });

  it("returns undefined for unknown id", async () => {
    const ability = await getAbility("zzz_nonexistent_zzz", "en");
    assert.strictEqual(ability, undefined);
  });

  it("returns English content for en locale", async () => {
    const ability = await getAbility("acrobatics", "en");
    assert.ok(ability);
    assert.strictEqual(ability.name, "Acrobatics");
    assert.ok(ability.tags.includes("mobility"));
  });

  it("returns Russian content for ru locale", async () => {
    const ability = await getAbility("acrobatics", "ru");
    assert.ok(ability);
    assert.strictEqual(ability.name, "Акробатика");
    assert.ok(ability.tags.includes("подвижность"));
  });
});

describe("searchLookups", () => {
  it("finds a spell by Russian name prefix", async () => {
    const results = await searchLookups("Сломить", "ru");
    assert.ok(results.some((r) => r.id === "slomit-volyu"));
  });

  it("finds a spell by Russian tag", async () => {
    const results = await searchLookups("теургия", "ru");
    assert.ok(results.some((r) => r.id === "levitatsiya"));
  });
});

describe("getLookup", () => {
  it("returns a spell by id", async () => {
    const spell = await getLookup("slomit-volyu", "ru");
    assert.ok(spell);
    assert.strictEqual(spell.category, "spell");
    assert.strictEqual(spell.name, "Сломить Волю");
    assert.deepStrictEqual(spell.tags, ["орден", "круг", "колдовство"]);
  });
});
