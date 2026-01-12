import type {
	createChatClientOptions,
	InferChatMessages,
} from "@tanstack/ai-react";

import type { InterviewOutput } from "@/lib/interview-tool";

export type ChatMessages = InferChatMessages<
	ReturnType<typeof createChatClientOptions>
>;

export type MessagePart = ChatMessages[number]["parts"][number];

export type StreamPhase =
	| "idle"
	| "pending"
	| "thinking"
	| "tool-streaming"
	| "complete";

export interface RenderPartContext {
	onInterviewSubmit: (toolCallId: string, output: InterviewOutput) => void;
	onResubmit: (toolCallId: string, output: InterviewOutput) => void;
	canEditToolCall: (toolCallId: string) => boolean;
}
