import type { ComponentContext } from "#types";

type ComponentHandler = (ctx: ComponentContext) => Promise<void>;

const handlers = new Map<string, ComponentHandler>();

export function registerComponent(
  prefix: string,
  handler: ComponentHandler,
): void {
  handlers.set(prefix, handler);
}

export function resolveComponent(
  customId: string,
): { handler: ComponentHandler; params: string[] } | undefined {
  for (const [prefix, handler] of handlers) {
    if (customId === prefix || customId.startsWith(prefix + ":")) {
      const params =
        customId === prefix ? [] : customId.slice(prefix.length + 1).split(":");
      return { handler, params };
    }
  }
  return undefined;
}
