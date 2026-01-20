import * as fs from "node:fs";
import type {
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
import type { AdapterConfig } from "./adapter-types";
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
	private readonly client: OpenAI;

	constructor(config: AdapterConfig, model: string) {
		super({}, model);
		this.client = new OpenAI({
			apiKey: config.apiKey,
			baseURL: config.baseURL,
		});
	}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: stream processing requires handling many response scenarios
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

			// Use shared accumulators (SSOT for stream state management)
			const content = new ContentAccumulator();
			const toolCalls = new ToolCallAccumulator();
			let responseId = "";

			const ctx = () => ({ id: responseId, model: options.model, timestamp });

			// Debug: collect all chunks to jsonl file
			const debugChunks: string[] = [];
			for await (const chunk of stream) {
				debugChunks.push(JSON.stringify(chunk));
				responseId = chunk.id;
				const choice = chunk.choices[0];

				if (!choice) {
					continue;
				}

				const delta = choice.delta;

				// Handle reasoning/thinking content (DeepSeek R1, OpenAI o1, Claude thinking, etc.)
				// biome-ignore lint/suspicious/noExplicitAny: Some providers use non-standard field
				const deltaAny = delta as any;
				const reasoningContent =
					deltaAny.reasoning_content ||
					deltaAny.thinking ||
					deltaAny.thinking_content;
				if (reasoningContent) {
					const accumulated = content.appendThinking(reasoningContent);
					yield buildThinkingChunk(ctx(), accumulated, {
						delta: reasoningContent,
					});
				}

				// Handle regular content
				if (delta.content) {
					const accumulated = content.appendContent(delta.content);
					yield buildContentChunk(ctx(), delta.content, accumulated);
				}

				// Handle tool calls
				if (delta.tool_calls) {
					for (const toolCallDelta of delta.tool_calls) {
						toolCalls.update(toolCallDelta.index, {
							id: toolCallDelta.id,
							name: toolCallDelta.function?.name,
							arguments: toolCallDelta.function?.arguments,
						});
					}
				}

				// Handle finish reason
				if (choice.finish_reason) {
					// Emit completed tool calls
					for (const [index, toolCall] of toolCalls.getAll()) {
						yield buildToolCallChunk(ctx(), index, toolCall);
					}

					yield buildDoneChunk(
						ctx(),
						{
							promptTokens: chunk.usage?.prompt_tokens || 0,
							completionTokens: chunk.usage?.completion_tokens || 0,
						},
						choice.finish_reason === "tool_calls" ? "tool_calls" : "stop"
					);
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
			logAdapterError("OpenAI", error);
			yield createErrorChunk(
				error,
				this.generateId(),
				options.model,
				timestamp
			);
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
					content: extractContent(msg.content),
				});
			} else if (msg.role === "assistant") {
				if (msg.toolCalls?.length) {
					messages.push({
						role: "assistant",
						content: extractContent(msg.content) || null,
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
						content: extractContent(msg.content),
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
