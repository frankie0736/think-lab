import type {
	DefaultMessageMetadataByModality,
	StreamChunk,
	TextOptions,
} from "@tanstack/ai";
import { BaseTextAdapter } from "@tanstack/ai/adapters";
import type {
	AdapterConfig,
	AnthropicContentBlockMessage,
	AnthropicMessage,
	AnthropicStreamEvent,
	ThinkingHistoryItem,
	ThinkingStreamChunk,
} from "./adapter-types";
import { createErrorChunk, logAdapterError } from "./adapter-utils";
import {
	buildContentChunk,
	buildDoneChunk,
	buildThinkingChunk,
	buildToolCallChunk,
} from "./adapters/base/chunk-builders";
import {
	ContentAccumulator,
	ToolCallAccumulator,
} from "./adapters/base/stream-processor";
import { extractContent } from "./message-utils";

// Re-export types for backward compatibility (SSOT: types defined in adapter-types.ts)
export type {
	ThinkingHistoryItem,
	ThinkingStreamChunk as ThinkingStreamChunkWithSignature,
} from "./adapter-types";

/**
 * Anthropic-compatible adapter using Messages API (non-beta)
 * Works with Anthropic API and compatible providers like aihubmix
 */
export class AnthropicCompatTextAdapter extends BaseTextAdapter<
	string,
	Record<string, unknown>,
	readonly ["text", "image"],
	DefaultMessageMetadataByModality
> {
	readonly name = "anthropic-compat" as const;
	protected readonly adapterConfig: AdapterConfig;

	constructor(config: AdapterConfig, model: string) {
		super({}, model);
		this.adapterConfig = config;
	}

	async *chatStream(
		options: TextOptions<Record<string, unknown>>
	): AsyncIterable<StreamChunk | ThinkingStreamChunk> {
		const timestamp = Date.now();
		const baseURL = this.adapterConfig.baseURL || "https://api.anthropic.com";
		const url = `${baseURL}/v1/messages`;

		// Get thinking history from modelOptions if provided
		const modelOpts = options.modelOptions as
			| { thinkingHistory?: Record<string, ThinkingHistoryItem> }
			| undefined;
		const thinkingHistory = modelOpts?.thinkingHistory;
		const messages = this.convertMessages(options, thinkingHistory);
		const isThinkingModel = options.model.toLowerCase().includes("think");
		const thinkingBudget = 10_000;

		// Build request body
		// For thinking models, max_tokens must be > budget_tokens
		const body: Record<string, unknown> = {
			model: options.model,
			messages,
			max_tokens: isThinkingModel
				? Math.max(options.maxTokens || 16_000, thinkingBudget + 1000)
				: options.maxTokens || 8192,
			stream: true,
		};

		// Add system prompt
		if (options.systemPrompts?.length) {
			body.system = options.systemPrompts.join("\n");
		}

		// Add thinking config for thinking models
		if (isThinkingModel) {
			body.thinking = {
				type: "enabled",
				budget_tokens: thinkingBudget,
			};
		}

		// Add tools if provided
		if (options.tools?.length) {
			body.tools = options.tools.map((tool) => ({
				name: tool.name,
				description: tool.description,
				input_schema: tool.inputSchema || {
					type: "object",
					properties: {},
					required: [],
				},
			}));
		}

		// Add temperature if specified
		if (options.temperature !== undefined) {
			body.temperature = options.temperature;
		}

		try {
			console.log("[Anthropic] sending request...");
			console.log("[Anthropic] messages:", JSON.stringify(messages, null, 2));
			console.log("[Anthropic] tools:", JSON.stringify(body.tools, null, 2));
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-api-key": this.adapterConfig.apiKey,
					"anthropic-version": "2023-06-01",
				},
				body: JSON.stringify(body),
				signal: options.request?.signal,
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`${response.status} ${errorText}`);
			}

			if (!response.body) {
				throw new Error("No response body");
			}

			console.log("[Anthropic] streaming response...");
			yield* this.processStream(response.body, options.model, timestamp);
			console.log("[Anthropic] stream complete");
		} catch (error) {
			logAdapterError("Anthropic", error);
			yield createErrorChunk(
				error,
				this.generateId(),
				options.model,
				timestamp
			);
		}
	}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: stream processing requires handling many event types
	private async *processStream(
		body: ReadableStream<Uint8Array>,
		model: string,
		timestamp: number
	): AsyncIterable<StreamChunk | ThinkingStreamChunk> {
		const reader = body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";
		let responseId = "";

		// Use shared accumulators (SSOT for stream state management)
		const content = new ContentAccumulator();
		const toolCalls = new ToolCallAccumulator();
		let currentBlockIndex = -1;
		let currentBlockType = "";

		const ctx = () => ({ id: responseId, model, timestamp });

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					break;
				}

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					if (!line.startsWith("data: ")) {
						continue;
					}

					const data = line.slice(6);
					if (data === "[DONE]") {
						continue;
					}

					let event: AnthropicStreamEvent;
					try {
						event = JSON.parse(data);
					} catch {
						continue;
					}

					// Handle different event types using discriminated union
					if (event.type === "message_start") {
						responseId = event.message.id;
						console.log("[Anthropic] message_start, id:", responseId);
					} else if (event.type === "content_block_start") {
						currentBlockIndex = event.index;
						currentBlockType = event.content_block.type;
						console.log(
							"[Anthropic] content_block_start:",
							currentBlockType,
							"index:",
							currentBlockIndex
						);

						if (event.content_block.type === "thinking") {
							content.resetThinking();
						} else if (event.content_block.type === "tool_use") {
							toolCalls.update(currentBlockIndex, {
								id: event.content_block.id,
								name: event.content_block.name,
							});
						}
					} else if (event.type === "content_block_delta") {
						if (event.delta.type === "thinking_delta") {
							const accumulated = content.appendThinking(event.delta.thinking);
							yield buildThinkingChunk(ctx(), accumulated, {
								delta: event.delta.thinking,
							});
						} else if (event.delta.type === "signature_delta") {
							console.log(
								"[Anthropic] signature_delta received, length:",
								event.delta.signature.length
							);
							content.setSignature(event.delta.signature);
						} else if (event.delta.type === "text_delta") {
							const accumulated = content.appendContent(event.delta.text);
							yield buildContentChunk(ctx(), event.delta.text, accumulated);
						} else if (event.delta.type === "input_json_delta") {
							toolCalls.update(currentBlockIndex, {
								arguments: event.delta.partial_json,
							});
						}
					} else if (event.type === "content_block_stop") {
						console.log(
							"[Anthropic] content_block_stop:",
							currentBlockType,
							"hasSignature:",
							!!content.getSignature()
						);
						if (currentBlockType === "thinking" && content.getSignature()) {
							yield buildThinkingChunk(ctx(), content.getThinking(), {
								signature: content.getSignature(),
								isComplete: true,
							});
						} else if (currentBlockType === "tool_use") {
							const toolCall = toolCalls.get(currentBlockIndex);
							if (toolCall) {
								yield buildToolCallChunk(ctx(), currentBlockIndex, toolCall);
							}
						}
					} else if (event.type === "message_stop") {
						yield buildDoneChunk(
							ctx(),
							{
								promptTokens: event.usage?.input_tokens || 0,
								completionTokens: event.usage?.output_tokens || 0,
							},
							toolCalls.hasToolCalls() ? "tool_calls" : "stop"
						);
					}
				}
			}
		} finally {
			reader.releaseLock();
		}
	}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: message conversion has inherent complexity
	private convertMessages(
		options: TextOptions<Record<string, unknown>>,
		thinkingHistory?: Record<string, ThinkingHistoryItem>
	): AnthropicMessage[] {
		const messages: AnthropicMessage[] = [];
		const isThinkingModel = options.model.toLowerCase().includes("think");

		// Convert thinkingHistory to array for sequential matching
		// Since messages don't have stable IDs, match by assistant message order
		const thinkingItems = thinkingHistory ? Object.values(thinkingHistory) : [];
		let thinkingIndex = 0;

		console.log(
			"[Anthropic] thinkingHistory keys:",
			thinkingHistory ? Object.keys(thinkingHistory) : "none"
		);
		console.log("[Anthropic] thinkingItems count:", thinkingItems.length);
		console.log(
			"[Anthropic] assistant messages count:",
			options.messages.filter((m) => m.role === "assistant").length
		);

		for (const msg of options.messages) {
			if (msg.role === "user") {
				messages.push({
					role: "user",
					content: extractContent(msg.content),
				});
			} else if (msg.role === "assistant") {
				// Match thinking by order of assistant messages
				const thinkingItem = thinkingItems[thinkingIndex];
				thinkingIndex++;

				if (msg.toolCalls?.length) {
					const content: AnthropicContentBlockMessage[] = [];
					// For thinking models, include thinking block with signature if available
					// If no thinking was returned (e.g., tool-only responses), skip the thinking block
					if (isThinkingModel && thinkingItem) {
						content.push({
							type: "thinking",
							thinking: thinkingItem.thinking,
							signature: thinkingItem.signature,
						});
					}
					if (msg.content) {
						content.push({
							type: "text",
							text: extractContent(msg.content),
						});
					}
					for (const tc of msg.toolCalls) {
						content.push({
							type: "tool_use",
							id: tc.id,
							name: tc.function.name,
							input:
								typeof tc.function.arguments === "string"
									? JSON.parse(tc.function.arguments)
									: tc.function.arguments,
						});
					}
					messages.push({ role: "assistant", content });
				} else if (isThinkingModel && thinkingItem) {
					// For thinking models without tool calls, include thinking block
					messages.push({
						role: "assistant",
						content: [
							{
								type: "thinking",
								thinking: thinkingItem.thinking,
								signature: thinkingItem.signature,
							},
							{
								type: "text",
								text: extractContent(msg.content),
							},
						],
					});
				} else {
					// No thinking available, send as plain text
					messages.push({
						role: "assistant",
						content: extractContent(msg.content),
					});
				}
			} else if (msg.role === "tool") {
				// Tool results need to be attached to user message in Anthropic format
				const toolResult: AnthropicContentBlockMessage = {
					type: "tool_result",
					tool_use_id: msg.toolCallId || "",
					content:
						typeof msg.content === "string"
							? msg.content
							: JSON.stringify(msg.content),
				};
				// Find last user message or create new one
				const lastMsg = messages.at(-1);
				if (lastMsg?.role === "user" && Array.isArray(lastMsg.content)) {
					(lastMsg.content as AnthropicContentBlockMessage[]).push(toolResult);
				} else {
					messages.push({ role: "user", content: [toolResult] });
				}
			}
		}

		return messages;
	}

	structuredOutput(): Promise<never> {
		return Promise.reject(
			new Error("structuredOutput not implemented for Anthropic compat adapter")
		);
	}
}

/**
 * Creates an Anthropic-compatible adapter using Messages API
 * Works with Anthropic API and compatible providers (aihubmix, etc.)
 */
export function createAnthropicCompatChat(
	model: string,
	apiKey: string,
	config?: { baseURL?: string }
): AnthropicCompatTextAdapter {
	return new AnthropicCompatTextAdapter(
		{
			apiKey,
			baseURL: config?.baseURL,
		},
		model
	);
}
