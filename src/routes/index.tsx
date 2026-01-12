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
import type { InterviewOutput } from "@/lib/interview-tool";

type UIState = "initial" | "interviewing" | "followup";

function ThinkingAssistant() {
	const [streamPhase, setStreamPhase] = useState<StreamPhase>("idle");

	const chatOptions = createChatClientOptions({
		connection: fetchServerSentEvents("/api/chat"),
		onChunk: (chunk) => {
			switch (chunk.type) {
				case "thinking":
					setStreamPhase("thinking");
					break;
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
			<div className="flex h-[100dvh] flex-col bg-background text-foreground transition-colors">
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
						<ChatInput
							onSend={sendMessage}
							placeholder="描述你想理清的问题..."
						/>
					</div>
				</main>
			</div>
		);
	}

	// Interviewing state: no input box, just messages
	// Followup state: messages + small input box
	return (
		<div className="flex h-[100dvh] flex-col bg-background text-foreground transition-colors">
			<main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
				<Messages
					ctx={renderCtx}
					messages={messages}
					streamPhase={effectivePhase}
				/>
				{uiState === "followup" && (
					<div className="safe-area-bottom border-border/50 border-t p-4">
						<ChatInput
							onSend={sendMessage}
							placeholder="继续追问或换个方向..."
						/>
					</div>
				)}
			</main>
		</div>
	);
}

export const Route = createFileRoute("/")({
	component: ThinkingAssistant,
});
