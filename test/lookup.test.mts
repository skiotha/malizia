import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { commands } from "#commands";
import type { AutocompleteContext, CommandContext } from "#types";

const lookup = commands.get("lookup")!;

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

function createMockAutocompleteContext(
  focusedValue: string,
): AutocompleteContext {
  return {
    options: new Map(),
    focusedOption: "query",
    focusedValue,
    respond: mock.fn(async () => {}),
  } as unknown as AutocompleteContext;
}

describe("lookup command", () => {
  describe("autocomplete", () => {
    it("returns choices for a partial Russian name", async () => {
      const ctx = createMockAutocompleteContext("Акроб");
      await lookup.autocomplete!(ctx);

      const respond = ctx.respond as unknown as ReturnType<typeof mock.fn>;
      assert.strictEqual(respond.mock.calls.length, 1);
      const choices = respond.mock.calls[0]!.arguments[0] as {
        name: string;
        value: string;
      }[];
      assert.ok(choices.length > 0);
      assert.ok(choices.some((c) => c.value === "acrobatics"));
    });

    it("returns choices for a tag query", async () => {
      const ctx = createMockAutocompleteContext("mobility");
      await lookup.autocomplete!(ctx);

      const respond = ctx.respond as unknown as ReturnType<typeof mock.fn>;
      const choices = respond.mock.calls[0]!.arguments[0] as {
        name: string;
        value: string;
      }[];
      assert.ok(choices.length > 0);
      assert.ok(choices.some((c) => c.value === "acrobatics"));
    });

    it("returns at most 25 choices", async () => {
      const ctx = createMockAutocompleteContext("");
      await lookup.autocomplete!(ctx);

      const respond = ctx.respond as unknown as ReturnType<typeof mock.fn>;
      const choices = respond.mock.calls[0]!.arguments[0] as {
        name: string;
        value: string;
      }[];
      assert.ok(choices.length <= 25);
    });

    it("includes tags in the display name", async () => {
      const ctx = createMockAutocompleteContext("acrobatics");
      await lookup.autocomplete!(ctx);

      const respond = ctx.respond as unknown as ReturnType<typeof mock.fn>;
      const choices = respond.mock.calls[0]!.arguments[0] as {
        name: string;
        value: string;
      }[];
      const acro = choices.find((c) => c.value === "acrobatics");
      assert.ok(acro);
      assert.match(acro.name, /\[.*mobility/);
    });
  });

  describe("execute", () => {
    it("replies with ephemeral embed when ability found by id", async () => {
      const ctx = createMockContext({ query: "acrobatics" });
      await lookup.execute(ctx);

      const reply = ctx.reply as unknown as ReturnType<typeof mock.fn>;
      assert.strictEqual(reply.mock.calls.length, 1);
      const opts = reply.mock.calls[0]!.arguments[1] as any;
      assert.strictEqual(opts.ephemeral, true);
      assert.ok(opts.embeds?.length > 0);
      assert.strictEqual(opts.embeds[0].title, "Акробатика");
      assert.ok(opts.components?.length > 0);
    });

    it("falls back to search when query is not an id", async () => {
      const ctx = createMockContext({ query: "Акроб" });
      await lookup.execute(ctx);

      const reply = ctx.reply as unknown as ReturnType<typeof mock.fn>;
      assert.strictEqual(reply.mock.calls.length, 1);
      const opts = reply.mock.calls[0]!.arguments[1] as any;
      assert.ok(opts.embeds?.length > 0);
    });

    it("replies with not-found for unknown query", async () => {
      const ctx = createMockContext({ query: "zzz_nonexistent_zzz" });
      await lookup.execute(ctx);

      const reply = ctx.reply as unknown as ReturnType<typeof mock.fn>;
      assert.strictEqual(reply.mock.calls.length, 1);
      assert.match(
        reply.mock.calls[0]!.arguments[0] as string,
        /No results found/,
      );
      assert.deepStrictEqual(reply.mock.calls[0]!.arguments[1], {
        ephemeral: true,
      });
    });

    it("embed includes tier fields with effect details", async () => {
      const ctx = createMockContext({ query: "acrobatics" });
      await lookup.execute(ctx);

      const reply = ctx.reply as unknown as ReturnType<typeof mock.fn>;
      const embed = (reply.mock.calls[0]!.arguments[1] as any).embeds[0];
      assert.ok(embed.fields?.length === 3); // novice, adept, master
      // Each tier field value should contain bullet points for effects
      for (const field of embed.fields!) {
        assert.match(
          field.value,
          /^.+\n- .+/s,
          `${field.name} should have description + effects`,
        );
      }
    });

    it("share button custom_id contains ability id", async () => {
      const ctx = createMockContext({ query: "acrobatics" });
      await lookup.execute(ctx);

      const reply = ctx.reply as unknown as ReturnType<typeof mock.fn>;
      const component = (reply.mock.calls[0]!.arguments[1] as any).components[0]
        .components[0];
      assert.strictEqual(component.custom_id, "lookup:share:acrobatics");
    });
  });
});
