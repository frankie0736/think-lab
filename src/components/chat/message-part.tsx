import { EditableInterview, InterviewUI } from "@/components/interview";
import {
	INTERVIEW_TOOL_NAME,
	type InterviewInput,
	type InterviewOutput,
} from "@/lib/interview-tool";
import {
	WEB_SEARCH_TOOL_NAME,
	type WebSearchInput,
	type WebSearchOutput,
} from "@/lib/web-search-tool";

import { InterviewSkeleton } from "./interview-skeleton";
import { TextMessage } from "./text-message";
import { ThinkingMessage } from "./thinking-message";
import type { MessagePart, RenderPartContext } from "./types";
import { WebSearchResult } from "./web-search-result";

/**
 * Helper to safely parse JSON tool arguments
 */
function parseToolArguments<T>(args: string | undefined): T | null {
	if (!args) {
		return null;
	}
	try {
		return JSON.parse(args) as T;
	} catch {
		return null;
	}
}

/**
 * Render interview tool call
 */
function renderInterviewToolCall(
	part: Extract<MessagePart, { type: "tool-call" }>,
	partKey: string,
	ctx: RenderPartContext
) {
	const input = parseToolArguments<InterviewInput>(part.arguments);

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

/**
 * Render web search tool call
 */
function renderWebSearchToolCall(
	part: Extract<MessagePart, { type: "tool-call" }>,
	partKey: string
) {
	const input = parseToolArguments<WebSearchInput>(part.arguments);
	if (!input) {
		return null;
	}

	return (
		<WebSearchResult
			input={input}
			isLoading={!part.output}
			key={partKey}
			output={part.output as WebSearchOutput | undefined}
		/>
	);
}

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

	if (part.type === "tool-call") {
		if (part.name === INTERVIEW_TOOL_NAME) {
			return renderInterviewToolCall(part, partKey, ctx);
		}
		if (part.name === WEB_SEARCH_TOOL_NAME) {
			return renderWebSearchToolCall(part, partKey);
		}
	}

	return null;
}
