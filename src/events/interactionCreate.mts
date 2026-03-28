import type { DiscordRest } from "#rest";
import type { AutocompleteChoice, Interaction, ReplyOptions } from "#types";
import { commands } from "#commands";
import { resolveComponent } from "#components";
import { resolveLocale, t } from "#i18n";

const InteractionType = {
  ApplicationCommand: 2,
  MessageComponent: 3,
  ApplicationCommandAutocomplete: 4,
} as const;
const CallbackType = {
  ChannelMessageWithSource: 4,
  AutocompleteResult: 8,
} as const;
const MessageFlags = { Ephemeral: 64 } as const;

export async function onInteractionCreate(
  data: unknown,
  rest: DiscordRest,
): Promise<void> {
  const interaction = data as Interaction;
  if (!interaction.data) return;

  if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
    return handleAutocomplete(interaction, rest);
  }

  if (interaction.type === InteractionType.MessageComponent) {
    return handleComponent(interaction, rest);
  }

  if (interaction.type !== InteractionType.ApplicationCommand) return;

  const command = commands.get(interaction.data.name);

  if (!command) {
    console.warn(`Unknown command: ${interaction.data.name}`);
    return;
  }

  const options = new Map<string, string | number | boolean>();
  for (const opt of interaction.data.options ?? []) {
    options.set(opt.name, opt.value);
  }

  const reply = async (content: string, opts?: ReplyOptions) => {
    await rest.request(
      "POST",
      `/interactions/${interaction.id}/${interaction.token}/callback`,
      {
        type: CallbackType.ChannelMessageWithSource,
        data: {
          content: content || undefined,
          flags: opts?.ephemeral ? MessageFlags.Ephemeral : 0,
          embeds: opts?.embeds,
          components: opts?.components,
        },
      },
    );
  };

  try {
    const locale = resolveLocale(interaction.guild_locale, interaction.locale);
    await command.execute({ interaction, options, locale, reply });
  } catch (error) {
    console.error(`Error executing /${interaction.data.name}:`, error);
    try {
      const locale = resolveLocale(interaction.guild_locale, interaction.locale);
      await reply(t(locale, "error.command"), {
        ephemeral: true,
      });
    } catch {
      // Interaction may have already been responded to
    }
  }
}

async function handleAutocomplete(
  interaction: Interaction,
  rest: DiscordRest,
): Promise<void> {
  const command = commands.get(interaction.data!.name);
  if (!command?.autocomplete) return;

  const options = new Map<string, string | number | boolean>();
  let focusedOption = "";
  let focusedValue = "";

  for (const opt of interaction.data!.options ?? []) {
    options.set(opt.name, opt.value);
    if (opt.focused) {
      focusedOption = opt.name;
      focusedValue = String(opt.value);
    }
  }

  const respond = async (choices: AutocompleteChoice[]) => {
    await rest.request(
      "POST",
      `/interactions/${interaction.id}/${interaction.token}/callback`,
      {
        type: CallbackType.AutocompleteResult,
        data: { choices },
      },
    );
  };

  try {
    const locale = resolveLocale(interaction.guild_locale, interaction.locale);
    await command.autocomplete({
      interaction,
      options,
      locale,
      focusedOption,
      focusedValue,
      respond,
    });
  } catch (error) {
    console.error(`Error in autocomplete for /${interaction.data!.name}:`, error);
    try {
      await respond([]);
    } catch {
      // Interaction may have already been responded to
    }
  }
}

async function handleComponent(
  interaction: Interaction,
  rest: DiscordRest,
): Promise<void> {
  const customId = interaction.data!.custom_id;
  if (!customId) return;

  const match = resolveComponent(customId);
  if (!match) {
    console.warn(`No handler for component: ${customId}`);
    return;
  }

  const reply = async (content: string, opts?: ReplyOptions) => {
    await rest.request(
      "POST",
      `/interactions/${interaction.id}/${interaction.token}/callback`,
      {
        type: CallbackType.ChannelMessageWithSource,
        data: {
          content: content || undefined,
          flags: opts?.ephemeral ? MessageFlags.Ephemeral : 0,
          embeds: opts?.embeds,
          components: opts?.components,
        },
      },
    );
  };

  try {
    const locale = resolveLocale(interaction.guild_locale, interaction.locale);
    await match.handler({
      interaction,
      customId,
      params: match.params,
      locale,
      reply,
    });
  } catch (error) {
    console.error(`Error handling component ${customId}:`, error);
    try {
      const locale = resolveLocale(interaction.guild_locale, interaction.locale);
      await reply(t(locale, "error.component"), { ephemeral: true });
    } catch {
      // Interaction may have already been responded to
    }
  }
}
