import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

/**
 * Tool name constant (SSOT - single source of truth for tool identification)
 */
export const WEB_SEARCH_TOOL_NAME = "web_search" as const;

/**
 * Search result schema
 */
const searchResultSchema = z.object({
	title: z.string().describe("搜索结果标题"),
	url: z.string().describe("结果 URL"),
	content: z.string().describe("结果摘要内容"),
});

/**
 * Input schema for web search tool (AI → Server)
 */
export const webSearchInputSchema = z.object({
	query: z.string().describe("搜索查询词"),
});

/**
 * Output schema for web search tool (Server → AI)
 */
export const webSearchOutputSchema = z.object({
	results: z.array(searchResultSchema).describe("搜索结果列表"),
});

/**
 * Web search tool definition
 *
 * AI calls this tool to search the web for:
 * - Industry standard terms and naming conventions
 * - Competitor website structures
 * - Verification of user claims about products
 */
export const webSearchToolDef = toolDefinition({
	name: WEB_SEARCH_TOOL_NAME,
	description: `搜索互联网获取实时信息。

使用场景：
- 查询行业标准术语、规格命名
- 了解同行网站的产品分类方式
- 验证用户提到的产品名称是否准确

调用后搜索自动执行，结果会返回给你。`,
	inputSchema: webSearchInputSchema,
	outputSchema: webSearchOutputSchema,
});

/**
 * Tavily API response type
 */
interface TavilyResponse {
	results?: Array<{
		title: string;
		url: string;
		content: string;
	}>;
}

/**
 * Create a server-side web search tool with Tavily API
 */
export function createWebSearchServerTool(apiKey: string) {
	return webSearchToolDef.server(async ({ query }) => {
		const response = await fetch("https://api.tavily.com/search", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				api_key: apiKey,
				query,
				search_depth: "basic",
				max_results: 5,
			}),
		});

		if (!response.ok) {
			console.error("[WebSearch] Tavily API error:", response.status);
			return { results: [] };
		}

		const data = (await response.json()) as TavilyResponse;
		return {
			results:
				data.results?.map((r) => ({
					title: r.title,
					url: r.url,
					content: r.content,
				})) ?? [],
		};
	});
}

// Type exports for consumers
export type WebSearchInput = z.infer<typeof webSearchInputSchema>;
export type WebSearchOutput = z.infer<typeof webSearchOutputSchema>;
export type WebSearchResult = z.infer<typeof searchResultSchema>;
