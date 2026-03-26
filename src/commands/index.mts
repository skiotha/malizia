import type { Command } from "#types";

import { roll } from "./roll.mts";
import { character } from "./character.mts";
import { lookup } from "./lookup.mts";

export const commands = new Map<string, Command>();

for (const command of [roll, character, lookup]) {
  commands.set(command.data.name, command);
}
