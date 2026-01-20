import type { StreamChunk } from "@tanstack/ai";

/**
 * Check if an error is a user cancellation (AbortError).
 * These errors should not be logged as they are expected behavior.
 */
export function isUserCancellation(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false;
	}
	return error.name === "AbortError" || error.message.includes("aborted");
}

/**
 * Create a standardized error chunk for adapter stream responses.
 */
export function createErrorChunk(
	error: unknown,
	id: string,
	model: string,
	timestamp: number
): StreamChunk {
	const err = error instanceof Error ? error : new Error(String(error));
	return {
		type: "error",
		id,
		model,
		timestamp,
		error: { message: err.message },
	};
}

/**
 * Log adapter errors, filtering out user cancellations.
 */
export function logAdapterError(prefix: string, error: unknown): void {
	if (isUserCancellation(error)) {
		return;
	}
	const err = error instanceof Error ? error : new Error(String(error));
	console.error(`[${prefix}] error:`, err.message);
}
