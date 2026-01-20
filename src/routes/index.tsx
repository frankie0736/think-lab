import {
	createChatClientOptions,
	fetchServerSentEvents,
	useChat,
} from "@tanstack/ai-react";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";

import {
	ChatInput,
	Messages,
	type RenderPartContext,
	type StreamPhase,
} from "@/components/chat";
import { useEditableChat } from "@/hooks/use-editable-chat";
import { getSettingsFromStorage } from "@/hooks/use-settings";
import type { ThinkingHistoryItem } from "@/lib/anthropic-compat-adapter";
import type { InterviewOutput } from "@/lib/interview-tool";

type UIState = "initial" | "interviewing" | "followup";

/**
 * Extended chunk type that may include signature from Anthropic adapter
 */
interface ThinkingChunkWithSignature {
	type: "thinking";
	id: string;
	content: string;
	signature?: string;
	isComplete?: boolean;
}

function ThinkingAssistant() {
	const [streamPhase, setStreamPhase] = useState<StreamPhase>("idle");

	// Store thinking history for multi-turn conversations with Claude thinking models
	const thinkingHistoryRef = useRef<Record<string, ThinkingHistoryItem>>({});
	const currentThinkingRef = useRef<{ id: string; content: string } | null>(
		null
	);

	const chatOptions = createChatClientOptions({
		connection: fetchServerSentEvents("/api/chat", () => {
			const settings = getSettingsFromStorage();
			// Only include non-empty settings
			const filteredSettings = Object.fromEntries(
				Object.entries(settings).filter(([_, v]) => v)
			);
			return {
				body: {
					...(Object.keys(filteredSettings).length > 0
						? { settings: filteredSettings }
						: {}),
					// Include thinking history for Claude multi-turn thinking
					...(Object.keys(thinkingHistoryRef.current).length > 0
						? { thinkingHistory: thinkingHistoryRef.current }
						: {}),
				},
			};
		}),
		onChunk: (chunk) => {
			switch (chunk.type) {
				case "thinking": {
					setStreamPhase("thinking");
					// Track current thinking content
					const thinkingChunk = chunk as ThinkingChunkWithSignature;
					currentThinkingRef.current = {
						id: thinkingChunk.id,
						content: thinkingChunk.content,
					};
					// Save signature when thinking is complete
					if (thinkingChunk.isComplete && thinkingChunk.signature) {
						thinkingHistoryRef.current[thinkingChunk.id] = {
							thinking: thinkingChunk.content,
							signature: thinkingChunk.signature,
						};
					}
					break;
				}
				case "tool_call":
					setStreamPhase("tool-streaming");
					break;
				case "content":
				case "done":
					setStreamPhase("complete");
					break;
				default:
					break;
			}
		},
		onFinish: () => {
			setStreamPhase("idle");
			currentThinkingRef.current = null;
		},
	});

	const chat = useChat(chatOptions);
	const {
		messages,
		sendMessage,
		addToolResult,
		replaceToolResult,
		canEditToolCall,
	} = useEditableChat(chat);

	// Derive actual phase: if loading but no chunk received yet, show pending
	const effectivePhase: StreamPhase =
		chat.isLoading && streamPhase === "idle" ? "pending" : streamPhase;

	// Determine UI state based on messages and loading
	const getUIState = (): UIState => {
		if (messages.length === 0) {
			return "initial";
		}

		const lastAssistantMsg = [...messages]
			.reverse()
			.find((m) => m.role === "assistant");
		if (!lastAssistantMsg) {
			return "initial";
		}

		// Check if there's an active interview (input-complete but no output yet)
		const hasActiveInterview = lastAssistantMsg.parts.some(
			(p) =>
				p.type === "tool-call" &&
				p.name === "interview" &&
				p.state === "input-complete" &&
				!p.output
		);
		if (hasActiveInterview || chat.isLoading) {
			return "interviewing";
		}

		return "followup";
	};

	const uiState = getUIState();

	const handleInterviewSubmit = (
		toolCallId: string,
		output: InterviewOutput
	) => {
		addToolResult({ toolCallId, tool: "interview", output });
	};

	const handleResubmit = (toolCallId: string, output: InterviewOutput) => {
		replaceToolResult(toolCallId, output);
	};

	const renderCtx: RenderPartContext = {
		onInterviewSubmit: handleInterviewSubmit,
		onResubmit: handleResubmit,
		canEditToolCall,
	};

	// Initial state: centered large input
	if (uiState === "initial") {
		return (
			<main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4">
				<div className="w-full space-y-6 text-center">
					<div className="space-y-2">
						<h1 className="font-semibold text-2xl text-foreground tracking-tight">
							想清楚一件事
						</h1>
						<p className="text-muted-foreground text-sm">
							输入一个模糊的想法，AI 会通过提问帮你理清思路
						</p>
					</div>
					<ChatInput onSend={sendMessage} placeholder="描述你想理清的问题..." />
				</div>
			</main>
		);
	}

	// Interviewing state: no input box, just messages
	// Followup state: messages + small input box
	return (
		<main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
			<Messages
				ctx={renderCtx}
				messages={messages}
				streamPhase={effectivePhase}
			/>
			{uiState === "followup" && (
				<div className="safe-area-bottom border-border/50 border-t p-4">
					<ChatInput onSend={sendMessage} placeholder="继续追问或换个方向..." />
				</div>
			)}
		</main>
	);
}

export const Route = createFileRoute("/")({
	component: ThinkingAssistant,
});
