import { EditableInterview, InterviewUI } from "@/components/interview";
import type { InterviewInput, InterviewOutput } from "@/lib/interview-tool";

import { InterviewSkeleton } from "./interview-skeleton";
import { TextMessage } from "./text-message";
import { ThinkingMessage } from "./thinking-message";
import type { MessagePart, RenderPartContext } from "./types";

export function renderMessagePart(
	part: MessagePart,
	role: "user" | "assistant",
	partKey: string,
	ctx: RenderPartContext
) {
	if (part.type === "thinking" && part.content) {
		return <ThinkingMessage content={part.content} key={partKey} />;
	}

	if (part.type === "text" && part.content) {
		return <TextMessage content={part.content} key={partKey} role={role} />;
	}

	if (part.type === "tool-call" && part.name === "interview") {
		let input: InterviewInput | null = null;
		try {
			input = part.arguments ? JSON.parse(part.arguments) : null;
		} catch {
			return <InterviewSkeleton key={partKey} />;
		}

		if (part.output && input) {
			return (
				<div className="mx-auto max-w-[90%]" key={partKey}>
					<EditableInterview
						canEdit={ctx.canEditToolCall(part.id)}
						input={input}
						onResubmit={ctx.onResubmit}
						output={part.output as InterviewOutput}
						toolCallId={part.id}
					/>
				</div>
			);
		}

		if (part.state === "input-streaming" || part.state === "awaiting-input") {
			return <InterviewSkeleton key={partKey} />;
		}

		if (!input?.questions) {
			return <InterviewSkeleton key={partKey} />;
		}

		return (
			<div className="mx-auto max-w-[90%]" key={partKey}>
				<InterviewUI
					input={input}
					onSubmit={(output) => ctx.onInterviewSubmit(part.id, output)}
				/>
			</div>
		);
	}

	return null;
}
