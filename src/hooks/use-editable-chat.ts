import type { UIMessage } from "@tanstack/ai-client";
import type { UseChatReturn } from "@tanstack/ai-react";
import { useCallback, useRef } from "react";

interface ToolCallPart {
	type: "tool-call";
	id: string;
	name: string;
	arguments?: string;
	output?: unknown;
	state?: string;
}

/**
 * Hook to add message editing capabilities to useChat
 *
 * Provides:
 * - replaceToolResult: Replace a tool result and truncate subsequent messages
 * - getToolCallData: Get the input/output data for a specific tool call
 * - canEditToolCall: Check if a tool call can be edited
 */
export function useEditableChat<T extends UseChatReturn>(chat: T) {
	const { messages, setMessages, sendMessage } = chat;

	// Use ref to always have latest messages in callbacks
	const messagesRef = useRef(messages);
	messagesRef.current = messages;

	/**
	 * Find message index and part index for a tool call
	 */
	const findToolCall = useCallback((toolCallId: string) => {
		const msgs = messagesRef.current;
		for (let msgIndex = 0; msgIndex < msgs.length; msgIndex++) {
			const msg = msgs[msgIndex];
			for (let partIndex = 0; partIndex < msg.parts.length; partIndex++) {
				const part = msg.parts[partIndex];
				if (
					part.type === "tool-call" &&
					(part as ToolCallPart).id === toolCallId
				) {
					return {
						msgIndex,
						partIndex,
						message: msg,
						part: part as ToolCallPart,
					};
				}
			}
		}
		return null;
	}, []);

	/**
	 * Get tool call input and output data
	 */
	const getToolCallData = useCallback(
		<TInput, TOutput>(toolCallId: string) => {
			const found = findToolCall(toolCallId);
			if (!found) {
				return null;
			}

			const { part } = found;
			let input: TInput | null = null;

			try {
				input = part.arguments ? JSON.parse(part.arguments) : null;
			} catch {
				input = null;
			}

			return {
				input,
				output: part.output as TOutput | undefined,
			};
		},
		[findToolCall]
	);

	/**
	 * Replace a tool result and truncate all subsequent messages
	 * Then trigger AI to continue based on updated context
	 */
	const replaceToolResult = useCallback(
		<TOutput>(toolCallId: string, newOutput: TOutput) => {
			const found = findToolCall(toolCallId);
			if (!found) {
				console.warn(`Tool call ${toolCallId} not found`);
				return;
			}

			const { msgIndex, partIndex } = found;
			const currentMessages = messagesRef.current;

			// Keep messages up to and including the one with the tool call
			const truncated = currentMessages.slice(0, msgIndex + 1);

			// Deep clone and update the message with the tool call
			const lastMsg = JSON.parse(
				JSON.stringify(truncated[msgIndex])
			) as UIMessage;
			const toolPart = lastMsg.parts[partIndex] as ToolCallPart;
			toolPart.output = newOutput;
			truncated[msgIndex] = lastMsg;

			// Update messages
			setMessages(truncated as UIMessage[]);

			// Trigger AI continuation after state update
			setTimeout(() => {
				sendMessage("");
			}, 100);
		},
		[findToolCall, setMessages, sendMessage]
	);

	/**
	 * Check if a tool call can be edited (has output)
	 */
	const canEditToolCall = useCallback(
		(toolCallId: string) => {
			const found = findToolCall(toolCallId);
			if (!found) {
				return false;
			}
			return found.part.output !== undefined;
		},
		[findToolCall]
	);

	return {
		...chat,
		replaceToolResult,
		getToolCallData,
		canEditToolCall,
		findToolCall,
	};
}
