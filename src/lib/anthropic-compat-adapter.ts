import type {
	ContentPart,
	DefaultMessageMetadataByModality,
	StreamChunk,
	TextOptions,
} from "@tanstack/ai";
import { BaseTextAdapter } from "@tanstack/ai/adapters";

interface AnthropicCompatConfig {
	apiKey: string;
	baseURL?: string;
}

interface AnthropicMessage {
	role: "user" | "assistant";
	content: string | AnthropicContentBlock[];
}

interface AnthropicContentBlock {
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

interface AnthropicStreamEvent {
	type: string;
	index?: number;
	content_block?: {
		type: string;
		thinking?: string;
		signature?: string;
		text?: string;
		id?: string;
		name?: string;
	};
	delta?: {
		type: string;
		text?: string;
		thinking?: string;
		signature?: string;
		partial_json?: string;
	};
	message?: {
		id: string;
		usage?: {
			input_tokens: number;
			output_tokens: number;
		};
	};
	usage?: {
		input_tokens: number;
		output_tokens: number;
	};
}

/**
 * Thinking history item for multi-turn conversations
 */
export interface ThinkingHistoryItem {
	thinking: string;
	signature: string;
}

/**
 * Extended thinking chunk with signature
 */
export interface ThinkingStreamChunkWithSignature {
	type: "thinking";
	id: string;
	model: string;
	timestamp: number;
	delta?: string;
	content: string;
	signature?: string;
	isComplete?: boolean;
}

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
	protected readonly adapterConfig: AnthropicCompatConfig;

	constructor(config: AnthropicCompatConfig, model: string) {
		super({}, model);
		this.adapterConfig = config;
	}

	async *chatStream(
		options: TextOptions<Record<string, unknown>>
	): AsyncIterable<StreamChunk | ThinkingStreamChunkWithSignature> {
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
			const err = error as Error;
			if (err.name !== "AbortError" && !err.message.includes("aborted")) {
				console.error("[Anthropic] error:", err.message);
			}
			yield {
				type: "error",
				id: this.generateId(),
				model: options.model,
				timestamp,
				error: { message: err.message },
			};
		}
	}

	private async *processStream(
		body: ReadableStream<Uint8Array>,
		model: string,
		timestamp: number
	): AsyncIterable<StreamChunk | ThinkingStreamChunkWithSignature> {
		const reader = body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";
		let responseId = "";
		let accumulatedContent = "";
		let accumulatedThinking = "";
		let currentSignature = "";
		const toolCalls = new Map<
			number,
			{ id: string; name: string; arguments: string }
		>();
		let currentBlockIndex = -1;
		let currentBlockType = "";

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

					// Handle different event types
					if (event.type === "message_start" && event.message) {
						responseId = event.message.id;
					} else if (
						event.type === "content_block_start" &&
						event.content_block
					) {
						currentBlockIndex = event.index ?? -1;
						currentBlockType = event.content_block.type;

						if (event.content_block.type === "thinking") {
							// Reset for new thinking block
							accumulatedThinking = "";
							currentSignature = "";
						} else if (event.content_block.type === "tool_use") {
							toolCalls.set(currentBlockIndex, {
								id: event.content_block.id || "",
								name: event.content_block.name || "",
								arguments: "",
							});
						}
					} else if (event.type === "content_block_delta" && event.delta) {
						if (event.delta.type === "thinking_delta" && event.delta.thinking) {
							accumulatedThinking += event.delta.thinking;
							yield {
								type: "thinking",
								id: responseId,
								model,
								timestamp,
								delta: event.delta.thinking,
								content: accumulatedThinking,
							};
						} else if (
							event.delta.type === "signature_delta" &&
							event.delta.signature
						) {
							// Capture signature
							currentSignature = event.delta.signature;
						} else if (event.delta.type === "text_delta" && event.delta.text) {
							accumulatedContent += event.delta.text;
							yield {
								type: "content",
								id: responseId,
								model,
								timestamp,
								delta: event.delta.text,
								content: accumulatedContent,
								role: "assistant",
							};
						} else if (
							event.delta.type === "input_json_delta" &&
							event.delta.partial_json
						) {
							const toolCall = toolCalls.get(currentBlockIndex);
							if (toolCall) {
								toolCall.arguments += event.delta.partial_json;
							}
						}
					} else if (event.type === "content_block_stop") {
						// Emit completion events
						if (currentBlockType === "thinking" && currentSignature) {
							// Emit final thinking chunk with signature
							yield {
								type: "thinking",
								id: responseId,
								model,
								timestamp,
								content: accumulatedThinking,
								signature: currentSignature,
								isComplete: true,
							};
						} else if (currentBlockType === "tool_use") {
							const toolCall = toolCalls.get(currentBlockIndex);
							if (toolCall) {
								yield {
									type: "tool_call",
									id: responseId,
									model,
									timestamp,
									index: currentBlockIndex,
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
						}
					} else if (event.type === "message_delta") {
						// Message complete
					} else if (event.type === "message_stop") {
						yield {
							type: "done",
							id: responseId,
							model,
							timestamp,
							usage: {
								promptTokens: event.usage?.input_tokens || 0,
								completionTokens: event.usage?.output_tokens || 0,
								totalTokens:
									(event.usage?.input_tokens || 0) +
									(event.usage?.output_tokens || 0),
							},
							finishReason: toolCalls.size > 0 ? "tool_calls" : "stop",
						};
					}
				}
			}
		} finally {
			reader.releaseLock();
		}
	}

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

		for (const msg of options.messages) {
			if (msg.role === "user") {
				messages.push({
					role: "user",
					content: this.extractContent(msg.content),
				});
			} else if (msg.role === "assistant") {
				// Match thinking by order of assistant messages
				const thinkingItem = thinkingItems[thinkingIndex];
				thinkingIndex++;

				if (msg.toolCalls?.length) {
					const content: AnthropicContentBlock[] = [];
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
							text: this.extractContent(msg.content),
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
				} else {
					// For thinking models without tool calls
					if (isThinkingModel && thinkingItem) {
						// Include thinking block if available
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
									text: this.extractContent(msg.content),
								},
							],
						});
					} else {
						// No thinking available, send as plain text
						messages.push({
							role: "assistant",
							content: this.extractContent(msg.content),
						});
					}
				}
			} else if (msg.role === "tool") {
				// Tool results need to be attached to user message in Anthropic format
				const toolResult: AnthropicContentBlock = {
					type: "tool_result",
					tool_use_id: msg.toolCallId || "",
					content:
						typeof msg.content === "string"
							? msg.content
							: JSON.stringify(msg.content),
				};
				// Find last user message or create new one
				const lastMsg = messages[messages.length - 1];
				if (lastMsg?.role === "user" && Array.isArray(lastMsg.content)) {
					(lastMsg.content as AnthropicContentBlock[]).push(toolResult);
				} else {
					messages.push({ role: "user", content: [toolResult] });
				}
			}
		}

		return messages;
	}

	private extractContent(
		content: string | null | ContentPart[] | undefined
	): string {
		if (!content) {
			return "";
		}
		if (typeof content === "string") {
			return content;
		}
		return content
			.filter((p) => p.type === "text")
			.map((p) => p.content)
			.join("");
	}

	async structuredOutput(): Promise<never> {
		throw new Error(
			"structuredOutput not implemented for Anthropic compat adapter"
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
