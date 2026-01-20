import * as fs from "node:fs";
import * as path from "node:path";

// Top-level regex constants for performance
const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const ID_REGEX = /^id:\s*(.+)$/m;
const TRIGGER_REGEX = /^trigger:\s*(.+)$/m;
const JSON_ARRAY_REGEX = /\[[\s\S]*?\]/;
const TOPIC_VAR_REGEX = /\{\{topic\}\}/g;

export interface ContextPatch {
	id: string;
	trigger: string;
	content: string;
}

export interface PatchMatchResult {
	patchId: string;
	topic: string;
}

/**
 * 解析 frontmatter 格式的 patch 文件
 */
function parsePatchFile(content: string): ContextPatch | null {
	const match = content.match(FRONTMATTER_REGEX);

	if (!match) {
		return null;
	}

	const frontmatter = match[1];
	const body = match[2].trim();

	// 简单解析 YAML frontmatter
	const idMatch = frontmatter.match(ID_REGEX);
	const triggerMatch = frontmatter.match(TRIGGER_REGEX);

	if (!(idMatch && triggerMatch)) {
		return null;
	}

	return {
		id: idMatch[1].trim(),
		trigger: triggerMatch[1].trim(),
		content: body,
	};
}

/**
 * 加载 patches/context 目录下所有 patch 文件
 */
export function loadPatches(patchesDir: string): ContextPatch[] {
	const patches: ContextPatch[] = [];

	if (!fs.existsSync(patchesDir)) {
		console.warn(`[Context Patches] Directory not found: ${patchesDir}`);
		return patches;
	}

	const files = fs.readdirSync(patchesDir).sort();

	for (const file of files) {
		if (!file.endsWith(".md")) {
			continue;
		}

		const filePath = path.join(patchesDir, file);
		try {
			const content = fs.readFileSync(filePath, "utf-8");
			const patch = parsePatchFile(content);

			if (patch) {
				patches.push(patch);
			} else {
				console.warn(`[Context Patches] Failed to parse: ${file}`);
			}
		} catch (error) {
			console.warn(`[Context Patches] Error reading ${file}:`, error);
		}
	}

	return patches;
}

/**
 * 构造 LLM 检测 prompt
 */
export function buildDetectionPrompt(
	patches: ContextPatch[],
	userMessage: string
): string {
	const patchDescriptions = patches
		.map((p) => `- ${p.id}: ${p.trigger}`)
		.join("\n");

	return `你是一个精确的话题检测器。分析用户消息，判断是否明确涉及以下领域。

## 可用领域
${patchDescriptions}

## 用户消息
${userMessage}

## 规则
1. **保守匹配**：只有当用户消息明确涉及该领域时才匹配，模糊或边缘情况不匹配
2. 如果匹配，提取用户讨论的具体话题作为 topic
3. 返回 JSON 格式

## 输出格式
返回 JSON 数组，每个匹配项包含 patchId 和 topic：
\`\`\`json
[{"patchId": "acf", "topic": "房产网站内容建模"}]
\`\`\`

如果没有匹配，返回空数组：
\`\`\`json
[]
\`\`\`

只返回 JSON，不要其他内容。`;
}

/**
 * 解析 LLM 返回的匹配结果
 */
export function parseDetectionResponse(response: string): PatchMatchResult[] {
	try {
		// 提取 JSON 部分（可能被 markdown 代码块包裹）
		const jsonMatch = response.match(JSON_ARRAY_REGEX);
		if (!jsonMatch) {
			return [];
		}

		const parsed = JSON.parse(jsonMatch[0]);
		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed.filter(
			(item): item is PatchMatchResult =>
				typeof item === "object" &&
				item !== null &&
				typeof item.patchId === "string" &&
				typeof item.topic === "string"
		);
	} catch {
		console.warn("[Context Patches] Failed to parse detection response");
		return [];
	}
}

/**
 * 替换 patch 内容中的变量
 */
export function replaceVariables(content: string, topic: string): string {
	return content.replace(TOPIC_VAR_REGEX, topic);
}

/**
 * 根据匹配结果生成要注入的 prompt 内容
 */
export function buildInjectionContent(
	patches: ContextPatch[],
	matches: PatchMatchResult[]
): string {
	if (matches.length === 0) {
		return "";
	}

	const patchMap = new Map(patches.map((p) => [p.id, p]));
	const injections: string[] = [];

	for (const match of matches) {
		const patch = patchMap.get(match.patchId);
		if (patch) {
			const content = replaceVariables(patch.content, match.topic);
			injections.push(content);
		}
	}

	if (injections.length === 0) {
		return "";
	}

	return `\n\n---\n\n## Context Patches\n\n${injections.join("\n\n")}`;
}

/**
 * 记录匹配日志（仅在有匹配时输出）
 */
export function logPatchMatch(
	_userMessage: string,
	matches: PatchMatchResult[]
): void {
	if (matches.length === 0) {
		return;
	}
	const matchInfo = matches.map((m) => m.patchId).join(", ");
	console.log(`[Patches] +${matchInfo}`);
}

/**
 * 获取项目根目录的 patches 路径
 */
export function getPatchesDir(): string {
	return path.join(process.cwd(), "patches", "context");
}

/**
 * 获取用于检测的模型名称
 * 检测任务简单，使用轻量模型；同时避免 thinking 模型的特殊要求
 */
export function getDetectionModel(mainModel: string): string {
	// 如果是 thinking 模型，去掉 -think 后缀
	if (mainModel.includes("-think")) {
		return mainModel.replace("-think", "");
	}
	// 如果是 Claude 模型，使用 haiku 做检测（更快更便宜）
	if (mainModel.includes("claude")) {
		return "claude-haiku-4-5-20251001";
	}
	// 如果是 GPT 模型，使用 gpt-4o-mini 做检测
	if (mainModel.includes("gpt")) {
		return "gpt-4.1-mini";
	}
	// 其他情况使用原模型
	return mainModel;
}

/**
 * 调用 LLM 进行 patch 检测（非流式）
 */
export async function detectPatches(
	prompt: string,
	apiKey: string,
	baseURL: string,
	model: string
): Promise<string> {
	const detectionModel = getDetectionModel(model);

	const response = await fetch(`${baseURL}/chat/completions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model: detectionModel,
			messages: [{ role: "user", content: prompt }],
			temperature: 0,
			max_tokens: 500,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		console.warn(
			`[Context Patches] Detection API error: ${response.status}`,
			errorText.slice(0, 200)
		);
		throw new Error(`Detection API error: ${response.status}`);
	}

	const data = await response.json();
	return data.choices?.[0]?.message?.content || "[]";
}
