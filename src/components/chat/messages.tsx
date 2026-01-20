import { useEffect, useRef } from "react";

import { InterviewSkeleton } from "./interview-skeleton";
import { renderMessagePart } from "./message-part";
import type { ChatMessages, RenderPartContext, StreamPhase } from "./types";

interface MessagesProps {
	messages: ChatMessages;
	streamPhase: StreamPhase;
	ctx: RenderPartContext;
}

export function Messages({ messages, streamPhase, ctx }: MessagesProps) {
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const messagesLength = messages.length;

	const lastMessage = messages.at(-1);
	const hasCompleteTool = lastMessage?.parts.some(
		(p) => p.type === "tool-call" && p.state === "input-complete"
	);
	const hasStreamingTool = lastMessage?.parts.some(
		(p) => p.type === "tool-call" && p.state === "input-streaming"
	);
	const isActive =
		streamPhase === "pending" ||
		streamPhase === "thinking" ||
		streamPhase === "tool-streaming";
	// Show skeleton when loading and no tool is being displayed yet
	// (message-part.tsx handles skeleton for streaming tools)
	const showSkeleton = isActive && !hasCompleteTool && !hasStreamingTool;

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message count change or skeleton visibility
	useEffect(() => {
		if (messagesContainerRef.current) {
			messagesContainerRef.current.scrollTo({
				top: messagesContainerRef.current.scrollHeight,
				behavior: "smooth",
			});
		}
	}, [messagesLength, showSkeleton]);

	if (!messages.length) {
		return null;
	}

	return (
		<div
			className="flex-1 space-y-4 overflow-y-auto p-4"
			ref={messagesContainerRef}
		>
			{messages
				.filter((m) => m.role !== "system")
				.map(({ id, role, parts }) => (
					<div key={id}>
						{parts.map((part, index) =>
							renderMessagePart(
								part,
								role as "user" | "assistant",
								`${id}-${part.type}-${index}`,
								ctx
							)
						)}
					</div>
				))}
			{showSkeleton && <InterviewSkeleton />}
		</div>
	);
}
