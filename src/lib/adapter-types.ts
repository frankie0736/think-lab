/**
 * Centralized type definitions for adapters (SSOT)
 * All adapter-related types should be defined here
 */

// ============================================================
// Anthropic Stream Event Types (Discriminated Union)
// ============================================================

interface AnthropicUsage {
	input_tokens: number;
	output_tokens: number;
}

interface AnthropicContentBlockThinking {
	type: "thinking";
	thinking?: string;
	signature?: string;
}

interface AnthropicContentBlockText {
	type: "text";
	text?: string;
}

interface AnthropicContentBlockToolUse {
	type: "tool_use";
	id?: string;
	name?: string;
}

type AnthropicContentBlock =
	| AnthropicContentBlockThinking
	| AnthropicContentBlockText
	| AnthropicContentBlockToolUse;

export type AnthropicStreamEvent =
	| {
			type: "message_start";
			message: {
				id: string;
				usage?: AnthropicUsage;
			};
	  }
	| {
			type: "content_block_start";
			index: number;
			content_block: AnthropicContentBlock;
	  }
	| {
			type: "content_block_delta";
			index: number;
			delta:
				| { type: "thinking_delta"; thinking: string }
				| { type: "signature_delta"; signature: string }
				| { type: "text_delta"; text: string }
				| { type: "input_json_delta"; partial_json: string };
	  }
	| {
			type: "content_block_stop";
			index: number;
	  }
	| {
			type: "message_delta";
			delta: {
				stop_reason?: string;
			};
	  }
	| {
			type: "message_stop";
			usage?: AnthropicUsage;
	  };

// ============================================================
// Anthropic Message Types
// ============================================================

export interface AnthropicContentBlockMessage {
	type: "text" | "thinking" | "tool_use" | "tool_result" | "redacted_thinking";
	text?: string;
	thinking?: string;
	signature?: string;
	data?: string;
	id?: string;
	name?: string;
	input?: unknown;
	tool_use_id?: string;
	content?: string;
}

export interface AnthropicMessage {
	role: "user" | "assistant";
	content: string | AnthropicContentBlockMessage[];
}

// ============================================================
// Thinking History Types (Shared between adapter and UI)
// ============================================================

/**
 * Thinking history item for multi-turn conversations.
 * This is the SSOT for thinking data structure.
 */
export interface ThinkingHistoryItem {
	thinking: string;
	signature: string;
}

/**
 * Extended thinking chunk with signature for stream events.
 * Used by adapters to emit thinking data.
 */
export interface ThinkingStreamChunk {
	type: "thinking";
	id: string;
	model: string;
	timestamp: number;
	delta?: string;
	content: string;
	signature?: string;
	isComplete?: boolean;
}

// ============================================================
// Adapter Config Types
// ============================================================

export interface AdapterConfig {
	apiKey: string;
	baseURL?: string;
}
