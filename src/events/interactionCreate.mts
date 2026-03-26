import type { DiscordRest } from "#rest";
import type { Interaction } from "#types";
import { commands } from "#commands";

const InteractionType = { ApplicationCommand: 2 } as const;
const CallbackType = { ChannelMessageWithSource: 4 } as const;
const MessageFlags = { Ephemeral: 64 } as const;

export async function onInteractionCreate(
  data: unknown,
  rest: DiscordRest,
): Promise<void> {
  const interaction = data as Interaction;
  if (interaction.type !== InteractionType.ApplicationCommand) return;
  if (!interaction.data) return;

  const command = commands.get(interaction.data.name);

  if (!command) {
    console.warn(`Unknown command: ${interaction.data.name}`);
    return;
  }

  const options = new Map<string, string | number | boolean>();
  for (const opt of interaction.data.options ?? []) {
    options.set(opt.name, opt.value);
  }

  const reply = async (content: string, opts?: { ephemeral?: boolean }) => {
    await rest.request(
      "POST",
      `/interactions/${interaction.id}/${interaction.token}/callback`,
      {
        type: CallbackType.ChannelMessageWithSource,
        data: {
          content,
          flags: opts?.ephemeral ? MessageFlags.Ephemeral : 0,
        },
      },
    );
  };

  try {
    await command.execute({ interaction, options, reply });
  } catch (error) {
    console.error(`Error executing /${interaction.data.name}:`, error);
    try {
      await reply("Something went wrong running that command.", {
        ephemeral: true,
      });
    } catch {
      // Interaction may have already been responded to
    }
  }
}
