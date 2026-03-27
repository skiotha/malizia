import { describe, it, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { CommandContext } from "#types";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = join(TEST_DIR, "../temp");
const LOOKUP_FILE = join(TEMP_DIR, "abilities.lookup.json");

const sampleAbilities = [
  {
    name: "Fire Bolt",
    tags: ["combat", "fire", "spell"],
    description: "Hurls a bolt of fire.",
  },
  {
    name: "Shield",
    tags: ["defensive", "spell"],
    description: "Creates a magical barrier.",
  },
  {
    name: "Sprint",
    tags: ["movement", "physical"],
    description: "Move quickly.",
  },
];

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

// We import the command AFTER writing the fixture so the lazy cache picks it up.
// We need to reset the module-level cache between tests; the simplest approach
// is to write the file before the first import and rely on the lazy init.
let lookupCommand: Awaited<typeof import("#commands")>["commands"] extends Map<
  string,
  infer V
>
  ? V
  : never;

describe("lookup command", () => {
  before(async () => {
    mkdirSync(TEMP_DIR, { recursive: true });
    writeFileSync(LOOKUP_FILE, JSON.stringify(sampleAbilities), "utf8");

    // Dynamic import so the module reads the freshly written file.
    const { commands } = await import("#commands");
    lookupCommand = commands.get("lookup")!;
  });

  after(() => {
    // Remove the test fixture (keep the directory; it may already exist in the repo)
    try {
      rmSync(LOOKUP_FILE);
    } catch {
      // ignore
    }
  });

  it("returns matches by partial name (case-insensitive)", async () => {
    const ctx = createMockContext({ query: "fire" });
    await lookupCommand.execute(ctx);

    const reply = ctx.reply as unknown as ReturnType<typeof mock.fn>;
    assert.strictEqual(reply.mock.calls.length, 1);
    const text = reply.mock.calls[0].arguments[0] as string;
    assert.match(text, /Fire Bolt/);
    assert.doesNotMatch(text, /Shield/);
  });

  it("returns matches by tag", async () => {
    const ctx = createMockContext({ query: "spell" });
    await lookupCommand.execute(ctx);

    const reply = ctx.reply as unknown as ReturnType<typeof mock.fn>;
    const text = reply.mock.calls[0].arguments[0] as string;
    assert.match(text, /Fire Bolt/);
    assert.match(text, /Shield/);
    assert.doesNotMatch(text, /Sprint/);
  });

  it("is case-insensitive for tags", async () => {
    const ctx = createMockContext({ query: "PHYSICAL" });
    await lookupCommand.execute(ctx);

    const reply = ctx.reply as unknown as ReturnType<typeof mock.fn>;
    const text = reply.mock.calls[0].arguments[0] as string;
    assert.match(text, /Sprint/);
  });

  it("returns no-match message when nothing found", async () => {
    const ctx = createMockContext({ query: "xyzzy" });
    await lookupCommand.execute(ctx);

    const reply = ctx.reply as unknown as ReturnType<typeof mock.fn>;
    const text = reply.mock.calls[0].arguments[0] as string;
    assert.match(text, /No abilities found/i);
    assert.deepStrictEqual(reply.mock.calls[0].arguments[1], {
      ephemeral: true,
    });
  });
});
