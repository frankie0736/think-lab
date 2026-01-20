import {
	createChatClientOptions,
	fetchServerSentEvents,
	useChat,
} from "@tanstack/ai-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import {
	ChatInput,
	Messages,
	type RenderPartContext,
	type StreamPhase,
} from "@/components/chat";
import { useEditableChat } from "@/hooks/use-editable-chat";
import { getNonEmptySettings } from "@/hooks/use-settings";
import type { ThinkingStreamChunk } from "@/lib/adapter-types";
import {
	INTERVIEW_TOOL_NAME,
	type InterviewOutput,
} from "@/lib/interview-tool";
import { thinkingHistoryStore } from "@/lib/thinking-history";

type UIState = "initial" | "interviewing" | "followup";

function ThinkingAssistant() {
	const [streamPhase, setStreamPhase] = useState<StreamPhase>("idle");

	const chatOptions = createChatClientOptions({
		connection: fetchServerSentEvents("/api/chat", () => {
			const settings = getNonEmptySettings();
			return {
				body: {
					...(Object.keys(settings).length > 0 ? { settings } : {}),
					...(thinkingHistoryStore.hasHistory()
						? { thinkingHistory: thinkingHistoryStore.getAll() }
						: {}),
				},
			};
		}),
		onChunk: (chunk) => {
			switch (chunk.type) {
				case "thinking":
					setStreamPhase("thinking");
					thinkingHistoryStore.processChunk(chunk as ThinkingStreamChunk);
					break;
				case "tool_call":
					setStreamPhase("tool-streaming");
					break;
				case "content":
					// Keep current phase - AI may still generate tool calls after text
					break;
				case "done":
					setStreamPhase("complete");
					break;
				default:
					// Ignore other chunk types
					break;
			}
		},
		onFinish: () => {
			setStreamPhase("idle");
			thinkingHistoryStore.clearCurrentThinking();
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
				p.name === INTERVIEW_TOOL_NAME &&
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
		addToolResult({ toolCallId, tool: INTERVIEW_TOOL_NAME, output });
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
							产品数据结构规划
						</h1>
						<p className="text-muted-foreground text-sm">
							告诉我你卖什么产品，AI 会帮你梳理网站的产品管理结构
						</p>
					</div>
					<ChatInput
						onSend={sendMessage}
						placeholder="简单描述你的产品，比如：我卖不锈钢螺丝，有几百种规格..."
					/>
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
					<ChatInput onSend={sendMessage} placeholder="补充说明或提问..." />
				</div>
			)}
		</main>
	);
}

export const Route = createFileRoute("/")({
	component: ThinkingAssistant,
});
