import type { ContentPart } from "@tanstack/ai";

/**
 * Extract plain text content from various message content formats.
 * Handles string, null, undefined, and ContentPart array inputs.
 */
export function extractContent(
	content: string | null | ContentPart[] | undefined
): string {
	if (!content) {
		return "";
	}
	if (typeof content === "string") {
		return content;
	}
	return content
		.filter((p) => p.type === "text")
		.map((p) => p.content)
		.join("");
}
