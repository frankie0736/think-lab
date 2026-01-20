import * as fs from "node:fs";
import type {
	ContentPart,
	DefaultMessageMetadataByModality,
	StreamChunk,
	TextOptions,
} from "@tanstack/ai";
import {
	BaseTextAdapter,
	type StructuredOutputOptions,
	type StructuredOutputResult,
} from "@tanstack/ai/adapters";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

interface OpenAICompatConfig {
	apiKey: string;
	baseURL?: string;
}

/**
 * OpenAI-compatible adapter using Chat Completions API
 * Works with OpenAI, DeepSeek, Qwen, OpenRouter, aihubmix, and other compatible providers
 */
export class OpenAICompatTextAdapter extends BaseTextAdapter<
	string,
	Record<string, unknown>,
	readonly ["text", "image"],
	DefaultMessageMetadataByModality
> {
	readonly name = "openai-compat" as const;
	private client: OpenAI;

	constructor(config: OpenAICompatConfig, model: string) {
		super({}, model);
		this.client = new OpenAI({
			apiKey: config.apiKey,
			baseURL: config.baseURL,
		});
	}

	async *chatStream(
		options: TextOptions<Record<string, unknown>>
	): AsyncIterable<StreamChunk> {
		const messages = this.convertMessages(options);
		const timestamp = Date.now();

		const tools = options.tools?.map((tool) => ({
			type: "function" as const,
			function: {
				name: tool.name,
				description: tool.description,
				parameters: (tool.inputSchema ?? {
					type: "object",
					properties: {},
					required: [],
				}) as Record<string, unknown>,
			},
		}));

		try {
			const stream = await this.client.chat.completions.create(
				{
					model: options.model,
					messages,
					stream: true,
					temperature: options.temperature,
					max_tokens: options.maxTokens,
					top_p: options.topP,
					tools: tools && tools.length > 0 ? tools : undefined,
				},
				{
					signal: options.request?.signal,
				}
			);

			let accumulatedContent = "";
			let accumulatedReasoning = "";
			const toolCallAccumulators = new Map<
				number,
				{ id: string; name: string; arguments: string }
			>();
			let responseId = "";

			// Debug: collect all chunks to jsonl file
			const debugChunks: string[] = [];
			for await (const chunk of stream) {
				debugChunks.push(JSON.stringify(chunk));
				responseId = chunk.id;
				const choice = chunk.choices[0];

				if (!choice) continue;

				const delta = choice.delta;

				// Handle reasoning/thinking content (DeepSeek R1, OpenAI o1, Claude thinking, etc.)
				// biome-ignore lint/suspicious/noExplicitAny: Some providers use non-standard field
				const deltaAny = delta as any;
				const reasoningContent =
					deltaAny.reasoning_content ||
					deltaAny.thinking ||
					deltaAny.thinking_content;
				if (reasoningContent) {
					accumulatedReasoning += reasoningContent;
					yield {
						type: "thinking",
						id: responseId,
						model: options.model,
						timestamp,
						delta: reasoningContent,
						content: accumulatedReasoning,
					};
				}

				// Handle regular content
				if (delta.content) {
					accumulatedContent += delta.content;
					yield {
						type: "content",
						id: responseId,
						model: options.model,
						timestamp,
						delta: delta.content,
						content: accumulatedContent,
						role: "assistant",
					};
				}

				// Handle tool calls
				if (delta.tool_calls) {
					for (const toolCallDelta of delta.tool_calls) {
						const index = toolCallDelta.index;

						if (!toolCallAccumulators.has(index)) {
							toolCallAccumulators.set(index, {
								id: toolCallDelta.id || "",
								name: toolCallDelta.function?.name || "",
								arguments: "",
							});
						}

						const acc = toolCallAccumulators.get(index);
						if (acc) {
							if (toolCallDelta.id) acc.id = toolCallDelta.id;
							if (toolCallDelta.function?.name)
								acc.name = toolCallDelta.function.name;
							if (toolCallDelta.function?.arguments)
								acc.arguments += toolCallDelta.function.arguments;
						}
					}
				}

				// Handle finish reason
				if (choice.finish_reason) {
					// Emit completed tool calls
					for (const [index, toolCall] of toolCallAccumulators) {
						yield {
							type: "tool_call",
							id: responseId,
							model: options.model,
							timestamp,
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

					yield {
						type: "done",
						id: responseId,
						model: options.model,
						timestamp,
						usage: {
							promptTokens: chunk.usage?.prompt_tokens || 0,
							completionTokens: chunk.usage?.completion_tokens || 0,
							totalTokens: chunk.usage?.total_tokens || 0,
						},
						finishReason:
							choice.finish_reason === "tool_calls" ? "tool_calls" : "stop",
					};
				}
			}
			// Debug: write all chunks to jsonl file
			if (debugChunks.length > 0) {
				fs.writeFileSync("stream-debug.jsonl", debugChunks.join("\n"));
				console.log(
					`[Stream] wrote ${debugChunks.length} chunks to stream-debug.jsonl`
				);
			}
		} catch (error) {
			const err = error as Error;
			// Don't log abort errors (user cancelled)
			if (err.name !== "AbortError" && !err.message.includes("aborted")) {
				console.error("[Stream] error:", err.message);
			}
			yield {
				type: "error",
				id: this.generateId(),
				model: options.model,
				timestamp,
				error: {
					message: err.message,
				},
			};
		}
	}

	async structuredOutput(
		options: StructuredOutputOptions<Record<string, unknown>>
	): Promise<StructuredOutputResult<unknown>> {
		const { chatOptions, outputSchema } = options;
		const messages = this.convertMessages(chatOptions);

		const response = await this.client.chat.completions.create(
			{
				model: chatOptions.model,
				messages,
				temperature: chatOptions.temperature,
				max_tokens: chatOptions.maxTokens,
				response_format: {
					type: "json_schema",
					json_schema: {
						name: "structured_output",
						schema: outputSchema,
						strict: true,
					},
				},
			},
			{
				signal: chatOptions.request?.signal,
			}
		);

		const rawText = response.choices[0]?.message?.content || "";
		const data = JSON.parse(rawText);

		return { data, rawText };
	}

	private convertMessages(
		options: TextOptions<Record<string, unknown>>
	): ChatCompletionMessageParam[] {
		const messages: ChatCompletionMessageParam[] = [];

		// Add system prompt
		if (options.systemPrompts?.length) {
			messages.push({
				role: "system",
				content: options.systemPrompts.join("\n"),
			});
		}

		// Convert messages
		for (const msg of options.messages) {
			if (msg.role === "user") {
				messages.push({
					role: "user",
					content: this.extractContent(msg.content),
				});
			} else if (msg.role === "assistant") {
				if (msg.toolCalls?.length) {
					messages.push({
						role: "assistant",
						content: this.extractContent(msg.content) || null,
						tool_calls: msg.toolCalls.map((tc) => ({
							id: tc.id,
							type: "function" as const,
							function: {
								name: tc.function.name,
								arguments:
									typeof tc.function.arguments === "string"
										? tc.function.arguments
										: JSON.stringify(tc.function.arguments),
							},
						})),
					});
				} else {
					messages.push({
						role: "assistant",
						content: this.extractContent(msg.content),
					});
				}
			} else if (msg.role === "tool") {
				messages.push({
					role: "tool",
					tool_call_id: msg.toolCallId || "",
					content:
						typeof msg.content === "string"
							? msg.content
							: JSON.stringify(msg.content),
				});
			}
		}

		return messages;
	}

	private extractContent(
		content: string | null | ContentPart[] | undefined
	): string {
		if (!content) return "";
		if (typeof content === "string") return content;
		return content
			.filter((p) => p.type === "text")
			.map((p) => p.content)
			.join("");
	}
}

/**
 * Creates an OpenAI-compatible adapter using Chat Completions API
 * Works with any OpenAI-compatible provider (OpenAI, DeepSeek, Qwen, OpenRouter, etc.)
 *
 * @example
 * ```ts
 * // OpenAI
 * const adapter = createOpenAICompatChat("gpt-4", apiKey);
 *
 * // DeepSeek
 * const adapter = createOpenAICompatChat("deepseek-v3", apiKey, {
 *   baseURL: "https://api.deepseek.com/v1"
 * });
 *
 * // OpenRouter
 * const adapter = createOpenAICompatChat("anthropic/claude-3-opus", apiKey, {
 *   baseURL: "https://openrouter.ai/api/v1"
 * });
 * ```
 */
export function createOpenAICompatChat(
	model: string,
	apiKey: string,
	config?: { baseURL?: string }
): OpenAICompatTextAdapter {
	return new OpenAICompatTextAdapter(
		{
			apiKey,
			baseURL: config?.baseURL,
		},
		model
	);
}
