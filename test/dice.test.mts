import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { parseDice, rollDice } from "#dice";

describe("parseDice", () => {
  it("parses a simple die (d20)", () => {
    const result = parseDice("d20");
    assert.deepStrictEqual(result, [{ count: 1, sides: 20, modifier: 0 }]);
  });

  it("parses count and sides (2d6)", () => {
    const result = parseDice("2d6");
    assert.deepStrictEqual(result, [{ count: 2, sides: 6, modifier: 0 }]);
  });

  it("parses positive modifier (1d8+3)", () => {
    const result = parseDice("1d8+3");
    assert.deepStrictEqual(result, [{ count: 1, sides: 8, modifier: 3 }]);
  });

  it("parses negative modifier (1d10-2)", () => {
    const result = parseDice("1d10-2");
    assert.deepStrictEqual(result, [{ count: 1, sides: 10, modifier: -2 }]);
  });

  it("parses multiple dice groups (2d6+3 1d8)", () => {
    const result = parseDice("2d6+3 1d8");
    assert.deepStrictEqual(result, [
      { count: 2, sides: 6, modifier: 3 },
      { count: 1, sides: 8, modifier: 0 },
    ]);
  });

  it("returns empty array for invalid expression", () => {
    assert.deepStrictEqual(parseDice("hello"), []);
  });

  it("returns empty array for empty string", () => {
    assert.deepStrictEqual(parseDice(""), []);
  });
});

describe("rollDice", () => {
  it("returns a value within expected range for 1d6", () => {
    const group = { count: 1, sides: 6, modifier: 0 };
    for (let i = 0; i < 100; i++) {
      const result = rollDice(group);
      assert.ok(result >= 1 && result <= 6, `Got ${result}, expected 1-6`);
    }
  });

  it("applies positive modifier", () => {
    mock.method(Math, "random", () => 0); // always rolls 1
    const result = rollDice({ count: 1, sides: 6, modifier: 3 });
    assert.strictEqual(result, 4); // 1 + 3
    mock.restoreAll();
  });

  it("applies negative modifier", () => {
    mock.method(Math, "random", () => 0.999); // always rolls max
    const result = rollDice({ count: 1, sides: 6, modifier: -2 });
    assert.strictEqual(result, 4); // 6 - 2
    mock.restoreAll();
  });

  it("sums multiple dice", () => {
    mock.method(Math, "random", () => 0.5); // rolls 4 on a d6
    const result = rollDice({ count: 3, sides: 6, modifier: 0 });
    assert.strictEqual(result, 12); // 4 + 4 + 4
    mock.restoreAll();
  });
});
