import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { parseDice, rollDice } from "#dice";

describe("parseDice", () => {
  it("parses a simple die (d20)", () => {
    const result = parseDice("d20");
    assert.deepStrictEqual(result, {
      groups: [{ count: 1, sides: 20, modifier: 0 }],
      check: undefined,
    });
  });

  it("parses count and sides (2d6)", () => {
    const result = parseDice("2d6");
    assert.deepStrictEqual(result, {
      groups: [{ count: 2, sides: 6, modifier: 0 }],
      check: undefined,
    });
  });

  it("parses positive modifier (1d8+3)", () => {
    const result = parseDice("1d8+3");
    assert.deepStrictEqual(result, {
      groups: [{ count: 1, sides: 8, modifier: 3 }],
      check: undefined,
    });
  });

  it("parses negative modifier (1d10-2)", () => {
    const result = parseDice("1d10-2");
    assert.deepStrictEqual(result, {
      groups: [{ count: 1, sides: 10, modifier: -2 }],
      check: undefined,
    });
  });

  it("parses multiple dice groups (2d6+3 1d8)", () => {
    const result = parseDice("2d6+3 1d8");
    assert.deepStrictEqual(result, {
      groups: [
        { count: 2, sides: 6, modifier: 3 },
        { count: 1, sides: 8, modifier: 0 },
      ],
      check: undefined,
    });
  });

  it("returns empty groups for invalid expression", () => {
    assert.deepStrictEqual(parseDice("hello"), {
      groups: [],
      check: undefined,
    });
  });

  it("returns empty groups for empty string", () => {
    assert.deepStrictEqual(parseDice(""), { groups: [], check: undefined });
  });

  it("parses < operator with threshold", () => {
    const result = parseDice("2d20 < 15");
    assert.deepStrictEqual(result, {
      groups: [{ count: 2, sides: 20, modifier: 0 }],
      check: { operator: "<", threshold: 15 },
    });
  });

  it("parses <= operator with threshold", () => {
    const result = parseDice("1d20 <= 10");
    assert.deepStrictEqual(result, {
      groups: [{ count: 1, sides: 20, modifier: 0 }],
      check: { operator: "<=", threshold: 10 },
    });
  });

  it("parses > operator with threshold", () => {
    const result = parseDice("1d6+2 > 5");
    assert.deepStrictEqual(result, {
      groups: [{ count: 1, sides: 6, modifier: 2 }],
      check: { operator: ">", threshold: 5 },
    });
  });

  it("parses >= operator with threshold", () => {
    const result = parseDice("3d8 >=12");
    assert.deepStrictEqual(result, {
      groups: [{ count: 3, sides: 8, modifier: 0 }],
      check: { operator: ">=", threshold: 12 },
    });
  });

  it("applies trailing check to multiple groups", () => {
    const result = parseDice("d20 3d8+2 2d10 > 10");
    assert.deepStrictEqual(result, {
      groups: [
        { count: 1, sides: 20, modifier: 0 },
        { count: 3, sides: 8, modifier: 2 },
        { count: 2, sides: 10, modifier: 0 },
      ],
      check: { operator: ">", threshold: 10 },
    });
  });

  it("ignores embedded operators between groups", () => {
    const result = parseDice("d20>5 2d6<4 2d20");
    assert.deepStrictEqual(result, {
      groups: [
        { count: 1, sides: 20, modifier: 0 },
        { count: 2, sides: 6, modifier: 0 },
        { count: 2, sides: 20, modifier: 0 },
      ],
      check: undefined,
    });
  });
});

describe("rollDice", () => {
  it("returns a value within expected range for 1d6", () => {
    const group = { count: 1, sides: 6, modifier: 0 };
    for (let i = 0; i < 100; i++) {
      const result = rollDice(group);
      assert.ok(
        result.total >= 1 && result.total <= 6,
        `Got ${result.total}, expected 1-6`,
      );
      assert.strictEqual(result.rolls.length, 1);
      assert.strictEqual(result.modifier, 0);
    }
  });

  it("applies positive modifier", () => {
    mock.method(Math, "random", () => 0); // always rolls 1
    const result = rollDice({ count: 1, sides: 6, modifier: 3 });
    assert.deepStrictEqual(result, { rolls: [1], modifier: 3, total: 4 }); // 1 + 3
    mock.restoreAll();
  });

  it("applies negative modifier", () => {
    mock.method(Math, "random", () => 0.999); // always rolls max
    const result = rollDice({ count: 1, sides: 6, modifier: -2 });
    assert.deepStrictEqual(result, { rolls: [6], modifier: -2, total: 4 }); // 6 - 2
    mock.restoreAll();
  });

  it("sums multiple dice", () => {
    mock.method(Math, "random", () => 0.5); // rolls 4 on a d6
    const result = rollDice({ count: 3, sides: 6, modifier: 0 });
    assert.deepStrictEqual(result, {
      rolls: [4, 4, 4],
      modifier: 0,
      total: 12,
    }); // 4 + 4 + 4
    mock.restoreAll();
  });
});
