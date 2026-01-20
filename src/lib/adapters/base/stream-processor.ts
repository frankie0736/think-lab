/**
 * Stream Processor (SSOT)
 *
 * Unified SSE stream processing for all adapters.
 * Handles reading, buffering, and parsing of server-sent events.
 */

export interface SSEEvent {
	type: string;
	data: unknown;
}

/**
 * Generic SSE stream reader that handles buffering and line parsing.
 * This is the single source of truth for SSE parsing logic.
 */
export async function* readSSEStream(
	body: ReadableStream<Uint8Array>
): AsyncGenerator<SSEEvent> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				if (!line.startsWith("data: ")) {
					continue;
				}

				const data = line.slice(6);
				if (data === "[DONE]") {
					continue;
				}

				try {
					const parsed = JSON.parse(data);
					yield { type: parsed.type || "unknown", data: parsed };
				} catch {
					// Skip malformed JSON lines silently
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
}

/**
 * Tool call accumulator for streaming tool calls.
 * Manages the state of in-progress tool calls during streaming.
 */
export class ToolCallAccumulator {
	private readonly calls = new Map<
		number,
		{ id: string; name: string; arguments: string }
	>();

	/**
	 * Initialize or update a tool call at the given index.
	 */
	update(
		index: number,
		partial: { id?: string; name?: string; arguments?: string }
	): void {
		let call = this.calls.get(index);
		if (!call) {
			call = { id: "", name: "", arguments: "" };
			this.calls.set(index, call);
		}
		if (partial.id) {
			call.id = partial.id;
		}
		if (partial.name) {
			call.name = partial.name;
		}
		if (partial.arguments) {
			call.arguments += partial.arguments;
		}
	}

	/**
	 * Get a tool call by index.
	 */
	get(
		index: number
	): { id: string; name: string; arguments: string } | undefined {
		return this.calls.get(index);
	}

	/**
	 * Get all completed tool calls.
	 */
	getAll(): Map<number, { id: string; name: string; arguments: string }> {
		return new Map(this.calls);
	}

	/**
	 * Check if there are any tool calls.
	 */
	hasToolCalls(): boolean {
		return this.calls.size > 0;
	}

	/**
	 * Clear all tool calls.
	 */
	clear(): void {
		this.calls.clear();
	}
}

/**
 * Content accumulator for streaming content.
 */
export class ContentAccumulator {
	private content = "";
	private thinking = "";
	private signature = "";

	appendContent(delta: string): string {
		this.content += delta;
		return this.content;
	}

	appendThinking(delta: string): string {
		this.thinking += delta;
		return this.thinking;
	}

	setSignature(sig: string): void {
		this.signature = sig;
	}

	getContent(): string {
		return this.content;
	}

	getThinking(): string {
		return this.thinking;
	}

	getSignature(): string {
		return this.signature;
	}

	resetThinking(): void {
		this.thinking = "";
		this.signature = "";
	}

	reset(): void {
		this.content = "";
		this.thinking = "";
		this.signature = "";
	}
}
