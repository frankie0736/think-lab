/**
 * Chunk Builders (SSOT)
 *
 * Unified chunk creation for all adapters.
 * Ensures consistent chunk structure across different providers.
 */

import type { StreamChunk } from "@tanstack/ai";
import type { ThinkingStreamChunk } from "../../adapter-types";

interface ChunkContext {
	id: string;
	model: string;
	timestamp: number;
}

/**
 * Build a content chunk.
 */
export function buildContentChunk(
	ctx: ChunkContext,
	delta: string,
	content: string
): StreamChunk {
	return {
		type: "content",
		id: ctx.id,
		model: ctx.model,
		timestamp: ctx.timestamp,
		delta,
		content,
		role: "assistant",
	};
}

/**
 * Build a thinking chunk.
 */
export function buildThinkingChunk(
	ctx: ChunkContext,
	content: string,
	options?: { delta?: string; signature?: string; isComplete?: boolean }
): ThinkingStreamChunk {
	return {
		type: "thinking",
		id: ctx.id,
		model: ctx.model,
		timestamp: ctx.timestamp,
		content,
		...(options?.delta && { delta: options.delta }),
		...(options?.signature && { signature: options.signature }),
		...(options?.isComplete && { isComplete: options.isComplete }),
	};
}

/**
 * Build a tool call chunk.
 */
export function buildToolCallChunk(
	ctx: ChunkContext,
	index: number,
	toolCall: { id: string; name: string; arguments: string }
): StreamChunk {
	return {
		type: "tool_call",
		id: ctx.id,
		model: ctx.model,
		timestamp: ctx.timestamp,
		index,
		toolCall: {
			id: toolCall.id,
			type: "function",
			function: {
				name: toolCall.name,
				arguments: toolCall.arguments,
			},
		},
	};
}

/**
 * Build a done chunk.
 */
export function buildDoneChunk(
	ctx: ChunkContext,
	usage: { promptTokens: number; completionTokens: number },
	finishReason: "stop" | "tool_calls"
): StreamChunk {
	return {
		type: "done",
		id: ctx.id,
		model: ctx.model,
		timestamp: ctx.timestamp,
		usage: {
			promptTokens: usage.promptTokens,
			completionTokens: usage.completionTokens,
			totalTokens: usage.promptTokens + usage.completionTokens,
		},
		finishReason,
	};
}
