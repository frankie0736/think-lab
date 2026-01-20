import { chat, maxIterations, toServerSentEventsResponse } from "@tanstack/ai";
import { createOpenaiChat } from "@tanstack/ai-openai";
import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/env";
import { createAnthropicCompatChat } from "@/lib/anthropic-compat-adapter";
import {
	buildDetectionPrompt,
	buildInjectionContent,
	detectPatches,
	getPatchesDir,
	loadPatches,
	logPatchMatch,
	parseDetectionResponse,
} from "@/lib/context-patches";
import { interviewToolDef } from "@/lib/interview-tool";
import { createOpenAICompatChat } from "@/lib/openai-compat-adapter";
import { INTERVIEW_SYSTEM_PROMPT } from "@/lib/prompts/interview";

// Regex to strip /v1 suffix from base URL for Anthropic adapter
const V1_SUFFIX_REGEX = /\/v1\/?$/;

export const Route = createFileRoute("/api/chat")({
	server: {
		handlers: {
			// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: API handler has multiple code paths for different providers
			POST: async ({ request }) => {
				if (request.signal.aborted) {
					return new Response(null, { status: 499 });
				}

				const abortController = new AbortController();

				try {
					const body = await request.json();
					const { messages, settings, thinkingHistory } = body as {
						// biome-ignore lint/suspicious/noExplicitAny: Messages type from client
						messages: any[];
						settings?: { baseURL?: string; apiKey?: string; model?: string };
						thinkingHistory?: Record<
							string,
							{ thinking: string; signature: string }
						>;
					};

					// User settings override server defaults
					const model = settings?.model || env.OPENAI_MODEL || "gpt-4.1";
					const apiKey = settings?.apiKey || env.OPENAI_API_KEY || "";
					const baseURL =
						settings?.baseURL ||
						env.OPENAI_BASE_URL ||
						"https://api.openai.com/v1";
					const useCompletionsAPI = env.USE_COMPLETIONS_API === "true";

					console.log(`[Chat] ${model}`);

					if (!apiKey) {
						return new Response(
							JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
							{ status: 500, headers: { "Content-Type": "application/json" } }
						);
					}

					// Context Patches: 检测并注入领域特定 prompt
					let systemPrompt = INTERVIEW_SYSTEM_PROMPT;
					try {
						const patches = loadPatches(getPatchesDir());
						if (patches.length > 0) {
							// 提取最后一条用户消息用于检测
							const lastUserMessage = [...messages]
								.reverse()
								.find((m) => m.role === "user");
							const userContent =
								typeof lastUserMessage?.content === "string"
									? lastUserMessage.content
									: "";

							if (userContent) {
								const detectionPrompt = buildDetectionPrompt(
									patches,
									userContent
								);
								const detectionResponse = await detectPatches(
									detectionPrompt,
									apiKey,
									baseURL,
									model
								);
								const matches = parseDetectionResponse(detectionResponse);

								// 记录匹配日志
								logPatchMatch(userContent, matches);

								// 注入匹配的 patch 内容
								const injection = buildInjectionContent(patches, matches);
								if (injection) {
									systemPrompt = INTERVIEW_SYSTEM_PROMPT + injection;
								}
							}
						}
					} catch (error) {
						console.warn("[Context Patches] Detection failed:", error);
						// 检测失败不影响主流程
					}

					// Select adapter based on model type
					const isClaudeModel = model.toLowerCase().includes("claude");
					// biome-ignore lint/suspicious/noExplicitAny: adapter types vary
					let adapter: any;

					if (isClaudeModel) {
						// Use Anthropic compat adapter for Claude models (supports thinking)
						// Remove /v1 suffix since adapter adds /v1/messages
						const anthropicBaseURL = baseURL.replace(V1_SUFFIX_REGEX, "");
						adapter = createAnthropicCompatChat(model, apiKey, {
							baseURL: anthropicBaseURL,
						});
						console.log("[Chat] using Anthropic compat adapter");
					} else if (useCompletionsAPI) {
						// Use OpenAI-compat adapter for other models via Chat Completions API
						adapter = createOpenAICompatChat(model, apiKey, { baseURL });
					} else {
						// Use OpenAI Responses API adapter
						// @ts-expect-error - custom model from env
						adapter = createOpenaiChat(model, apiKey, { baseURL });
					}

					// Configure model options
					// Claude thinking is handled internally by anthropic-compat-adapter
					// thinkingHistory is passed through modelOptions to the adapter
					const modelOptions = isClaudeModel
						? { thinkingHistory }
						: { reasoning: { effort: "medium", summary: "auto" } };

					const stream = chat({
						adapter,
						tools: [interviewToolDef],
						systemPrompts: [systemPrompt],
						agentLoopStrategy: maxIterations(20),
						messages,
						abortController,
						modelOptions,
					});

					return toServerSentEventsResponse(stream, {
						abortController,
					});
				} catch (error: unknown) {
					console.error("Chat API error:", error);
					const isAbortError =
						error instanceof Error && error.name === "AbortError";
					if (isAbortError || abortController.signal.aborted) {
						return new Response(null, { status: 499 });
					}
					return new Response(
						JSON.stringify({ error: "Failed to process request" }),
						{ status: 500, headers: { "Content-Type": "application/json" } }
					);
				}
			},
		},
	},
});
