import type { Locale } from "#i18n";

export const OptionType = {
	String: 3,
	Integer: 4,
	Boolean: 5,
} as const;

export interface CommandOption {
	type: number;
	name: string;
	name_localizations?: Record<string, string>;
	description: string;
	description_localizations?: Record<string, string>;
	required?: boolean;
	autocomplete?: boolean;
}

export interface CommandData {
	name: string;
	name_localizations?: Record<string, string>;
	description: string;
	description_localizations?: Record<string, string>;
	options?: CommandOption[];
}

export interface Embed {
	title?: string;
	description?: string;
	color?: number;
	fields?: { name: string; value: string; inline?: boolean }[];
	footer?: { text: string };
}

export interface ActionRow {
	type: 1;
	components: ButtonComponent[];
}

export interface ButtonComponent {
	type: 2;
	style: number;
	label: string;
	custom_id?: string;
	emoji?: { name: string };
}

export const ButtonStyle = {
	Primary: 1,
	Secondary: 2,
} as const;

export interface ReplyOptions {
	ephemeral?: boolean;
	embeds?: Embed[];
	components?: ActionRow[];
}

export interface CommandContext {
	interaction: Interaction;
	options: Map<string, string | number | boolean>;
	locale: Locale;
	reply(content: string, options?: ReplyOptions): Promise<void>;
}

export interface AutocompleteChoice {
	name: string;
	value: string;
}

export interface AutocompleteContext {
	interaction: Interaction;
	options: Map<string, string | number | boolean>;
	locale: Locale;
	focusedOption: string;
	focusedValue: string;
	respond(choices: AutocompleteChoice[]): Promise<void>;
}

export interface Command {
	data: CommandData;
	execute(ctx: CommandContext): Promise<void>;
	autocomplete?(ctx: AutocompleteContext): Promise<void>;
}

export interface Interaction {
	id: string;
	token: string;
	type: number;
	data?: InteractionData;
	guild_id?: string;
	channel_id?: string;
	locale?: string;
	guild_locale?: string;
}

export interface InteractionData {
	id: string;
	name: string;
	options?: InteractionOption[];
	custom_id?: string;
	component_type?: number;
}

export interface ComponentContext {
	interaction: Interaction;
	customId: string;
	params: string[];
	locale: Locale;
	reply(content: string, options?: ReplyOptions): Promise<void>;
}

export interface InteractionOption {
	name: string;
	type: number;
	value: string | number | boolean;
	focused?: boolean;
}
