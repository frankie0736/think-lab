/**
 * ThinkingHistory Store (SSOT)
 *
 * Single source of truth for Claude thinking history in multi-turn conversations.
 * This store manages the thinking content and signatures needed for extended thinking.
 */

import type { ThinkingHistoryItem, ThinkingStreamChunk } from "./adapter-types";

/**
 * In-memory store for thinking history.
 * Uses a simple object to store thinking items by message ID.
 */
class ThinkingHistoryStore {
	private history: Record<string, ThinkingHistoryItem> = {};
	private currentThinking: { id: string; content: string } | null = null;

	/**
	 * Save a completed thinking item with its signature.
	 */
	save(messageId: string, item: ThinkingHistoryItem): void {
		this.history[messageId] = item;
	}

	/**
	 * Get all thinking history items.
	 * Returns a copy to prevent external mutations.
	 */
	getAll(): Record<string, ThinkingHistoryItem> {
		return { ...this.history };
	}

	/**
	 * Get a specific thinking item by message ID.
	 */
	get(messageId: string): ThinkingHistoryItem | undefined {
		return this.history[messageId];
	}

	/**
	 * Check if there are any thinking items stored.
	 */
	hasHistory(): boolean {
		return Object.keys(this.history).length > 0;
	}

	/**
	 * Track current in-progress thinking (before signature is received).
	 */
	setCurrentThinking(id: string, content: string): void {
		this.currentThinking = { id, content };
	}

	/**
	 * Get current in-progress thinking.
	 */
	getCurrentThinking(): { id: string; content: string } | null {
		return this.currentThinking;
	}

	/**
	 * Clear current thinking (call when streaming finishes).
	 */
	clearCurrentThinking(): void {
		this.currentThinking = null;
	}

	/**
	 * Clear all history (e.g., on conversation reset).
	 */
	clear(): void {
		this.history = {};
		this.currentThinking = null;
	}

	/**
	 * Process a thinking chunk from the stream (SSOT for chunk handling).
	 * Encapsulates all thinking-related chunk processing logic.
	 */
	processChunk(chunk: ThinkingStreamChunk): void {
		// Track current thinking content
		this.setCurrentThinking(chunk.id, chunk.content);

		// Save signature when thinking is complete
		if (chunk.isComplete && chunk.signature) {
			this.save(chunk.id, {
				thinking: chunk.content,
				signature: chunk.signature,
			});
		}
	}
}

// Singleton instance (SSOT)
export const thinkingHistoryStore = new ThinkingHistoryStore();

/**
 * Hook-friendly interface for React components.
 * Returns stable references to avoid unnecessary re-renders.
 */
export function useThinkingHistory() {
	return {
		save: thinkingHistoryStore.save.bind(thinkingHistoryStore),
		getAll: thinkingHistoryStore.getAll.bind(thinkingHistoryStore),
		get: thinkingHistoryStore.get.bind(thinkingHistoryStore),
		hasHistory: thinkingHistoryStore.hasHistory.bind(thinkingHistoryStore),
		setCurrentThinking:
			thinkingHistoryStore.setCurrentThinking.bind(thinkingHistoryStore),
		getCurrentThinking:
			thinkingHistoryStore.getCurrentThinking.bind(thinkingHistoryStore),
		clearCurrentThinking:
			thinkingHistoryStore.clearCurrentThinking.bind(thinkingHistoryStore),
		clear: thinkingHistoryStore.clear.bind(thinkingHistoryStore),
		processChunk: thinkingHistoryStore.processChunk.bind(thinkingHistoryStore),
	};
}
