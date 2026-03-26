export const OptionType = {
	String: 3,
	Integer: 4,
	Boolean: 5,
} as const;

export interface CommandOption {
	type: number;
	name: string;
	description: string;
	required?: boolean;
}

export interface CommandData {
	name: string;
	description: string;
	options?: CommandOption[];
}

export interface CommandContext {
	interaction: Interaction;
	options: Map<string, string | number | boolean>;
	reply(content: string, options?: { ephemeral?: boolean }): Promise<void>;
}

export interface Command {
	data: CommandData;
	execute(ctx: CommandContext): Promise<void>;
}

export interface Interaction {
	id: string;
	token: string;
	type: number;
	data?: InteractionData;
	guild_id?: string;
	channel_id?: string;
}

export interface InteractionData {
	id: string;
	name: string;
	options?: InteractionOption[];
}

export interface InteractionOption {
	name: string;
	type: number;
	value: string | number | boolean;
}
