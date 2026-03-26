import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { commands } from "#commands";
import type { CommandContext } from "#types";

const roll = commands.get("roll")!;

function createMockContext(
  options?: Record<string, string | number | boolean>,
): CommandContext {
  const map = new Map<string, string | number | boolean>();
  if (options) {
    for (const [k, v] of Object.entries(options)) map.set(k, v);
  }
  return {
    options: map,
    reply: mock.fn(async () => {}),
  } as unknown as CommandContext;
}

describe("roll command", () => {
  it("uses default 1d20 when no expression is provided", async () => {
    mock.method(Math, "random", () => 0.5);
    const ctx = createMockContext();
    await roll.execute(ctx);

    const reply = ctx.reply as unknown as ReturnType<typeof mock.fn>;
    assert.strictEqual(reply.mock.calls.length, 1);
    assert.match(reply.mock.calls[0].arguments[0] as string, /Rolling: 1d20/);
    mock.restoreAll();
  });

  it("replies with result for a valid expression", async () => {
    mock.method(Math, "random", () => 0);
    const ctx = createMockContext({ expression: "2d6+1" });
    await roll.execute(ctx);

    const reply = ctx.reply as unknown as ReturnType<typeof mock.fn>;
    assert.strictEqual(reply.mock.calls.length, 1);
    assert.match(reply.mock.calls[0].arguments[0] as string, /Rolling: 2d6\+1/);
    assert.match(reply.mock.calls[0].arguments[0] as string, /Result: 3/); // 1+1+1
    mock.restoreAll();
  });

  it("replies with ephemeral error for invalid expression", async () => {
    const ctx = createMockContext({ expression: "not-dice" });
    await roll.execute(ctx);

    const reply = ctx.reply as unknown as ReturnType<typeof mock.fn>;
    assert.strictEqual(reply.mock.calls.length, 1);
    assert.match(
      reply.mock.calls[0].arguments[0] as string,
      /Invalid dice expression/,
    );
    assert.deepStrictEqual(reply.mock.calls[0].arguments[1], {
      ephemeral: true,
    });
  });
});
