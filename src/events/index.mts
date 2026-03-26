import type { Gateway } from "#gateway";
import type { DiscordRest } from "#rest";
import { onReady } from "./ready.mts";
import { onInteractionCreate } from "./interactionCreate.mts";

export function registerEvents(gateway: Gateway, rest: DiscordRest): void {
  gateway.on("dispatch", (event, data) => {
    switch (event) {
      case "READY":
        onReady(data);
        break;
      case "INTERACTION_CREATE":
        void onInteractionCreate(data, rest);
        break;
    }
  });
}
