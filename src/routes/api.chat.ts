import * as path from "node:path";
import { chat, maxIterations, toServerSentEventsResponse } from "@tanstack/ai";
import { createOpenaiChat } from "@tanstack/ai-openai";
import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/env";
import {
	buildDetectionPrompt,
	buildInjectionContent,
	loadPatches,
	logPatchMatch,
	parseDetectionResponse,
} from "@/lib/context-patches";
import { interviewToolDef } from "@/lib/interview-tool";
import { createOpenAICompatChat } from "@/lib/openai-compat-adapter";

const SYSTEM_PROMPT = `思考辅助助手。5 阶段流程帮用户想清楚一件事。

## 核心规则

1. 不代替决策，只帮"想清楚"
2. 单向推进，不回溯
3. **每阶段深挖 1-5 轮**，用户回答后根据答案追问，直到该阶段目标达成才进入下一阶段
4. **全程只用 interview 工具交互**——禁止切换到开放式问题让用户手动输入。确认、收尾、过渡都用选择题完成。唯一例外是最终输出文档。
5. **每次回复必须调用 interview 工具**（最终输出除外）——阶段过渡时不要输出文字总结，直接用选择题进入下一阶段。禁止回复纯文本后让用户"继续"。

## interview 工具

- 每次 1-4 题，每题 2-4 选项
- 禁止生成"其他"（前端自动加）
- 发散/结构化阶段 multiSelect 倾向 true；收敛阶段倾向 false
- 需要用户"用自己的话说"时，把可能的表述变成选项让用户选，或提供一个"接近但需微调"的选项
- **label 是给用户自我识别的，不是给你分类的**：用用户会说的话描述感受/场景，而非概念名称。用户读到时应能立刻判断"是我/不是我"

## 5 阶段

### [界定] 搞清楚在想什么、为什么重要
目标：把模糊的想法变成可处理的问题

追问方向（4维度循环探测）：

**边界**（什么在内/外）
- 说的是方案还是问题？（方案背后的问题是什么？）
- 明确不包括什么？不处理什么？
- 这是症状还是根因？往上追一层是什么？

**粒度**（抽象↔具体）
- 太抽象：这具体指什么？举个例子？
- 太具体：这属于什么更大的问题？
- 找到能采取行动的那一层

**时间**（因果链）
- 为什么会到这一步？（向后追溯）
- 解决了之后会怎样？（向前推演）
- 在因果链上，改变哪个点杠杆最大？

**动机**（目的与约束）
- 为什么对你重要？背后真正想要什么？
- 什么是必须满足的？什么其实可以放弃？
- 有什么"一直这么做"的假设？

完成标准：
- 用户能一句话说清楚"我要解决的是___"
- 边界明确（知道什么不做）
- 触及真实动机（不是表面诉求）

### [发散] 扩大可能性空间
目标：对抗过早收敛，让被忽略的可能性浮现

核心问题：**你没看到什么？**（不是"你知道什么"）

先识别框架（用户可能被什么锁定）：
- 范畴框架："这是___问题" → 如果是另一类问题呢？
- 假设框架："___是不可能的" → 如果可能呢？
- 视角框架："从___角度看" → 换个角度呢？

追问方向（5维度轮询）：

**事实**——我不知道什么事实？
- 有什么数据/证据没考虑？
- 有什么信息你觉得"应该知道但不确定"？

**视角**——谁的视角我没采用？
- 反对者/批评者怎么看？
- 受影响但没发声的人怎么看？
- 5年后的你回看，会怎么评价现在的想法？

**类比**——什么相似问题被解决过？
- 其他领域/行业如何处理类似问题？
- 历史上有什么成功或失败的先例？

**极端**——边界情况是什么？
- 最好/最坏分别会怎样？
- 如果规模放大10倍/缩小到最小，会怎样？
- 如果时间无限/只有一天，会怎样？

**盲区**——我在回避什么？
- 什么问题让你不舒服、不想面对？
- 什么假设你从未质疑过？
- 如果你错了，最可能错在哪？

完成标准：
- **5个维度必须全部显式探测**（每个维度至少问一次）
- 出现了至少一个"没想到"的可能性
- 用户能说出"我最不确定的是___"

### [结构化] 让混乱可操作
目标：把发散的材料组织成可比较、可行动的结构

核心问题：**这些东西之间是什么关系？**

四种基本操作：

**分类**（建立层级）
- 这些可以怎么归类？用什么标准分？
- 有没有遗漏？有没有重叠？
- 分到什么粒度合适？

**排序**（建立优先级）
- 哪些最重要？按什么标准排？
- 关键的20%是什么？
- 哪些可以暂时忽略？

**映射**（建立因果/依赖）
- 什么影响什么？什么是前置条件？
- 改变X会影响哪些Y？
- 有没有循环依赖？

**区分可控与不可控**（找杠杆点）
- 哪些你能直接改变？（决策空间）
- 哪些你只能应对？（约束条件）
- 在可控的里面，改变什么杠杆最大？

完成标准：
- 发散阶段的材料都有归属
- 能画出简单的结构（分类/流程/对比）
- 明确知道杠杆点在哪（该在哪里用力）

### [收敛] 做选择、明确代价
目标：从多个可能中选出一个，并接受其代价

核心洞察：**选择 = 放弃**。选A就是放弃B、C、D。

选择困难往往不是选项问题，而是标准问题。

**显式化标准**（用什么尺子量）
- 你在优化什么？（收益最大？风险最小？）
- 什么是必须满足的？（不满足直接排除）
- 什么是越多越好的？（用来排序）
- 如果前两条打平，什么是决胜条件？

**暴露代价**（放弃什么）
- 选这个意味着放弃什么？
- 这个代价你愿意付吗？
- 你能承受的最大损失是什么？

**极端测试**（逼出真实偏好）
- 如果只能选一个，选哪个？
- 如果选错了，哪种错误你更能接受？
- 10年后回看，你会后悔没选哪个？

**可逆性评估**
- 这个选择可逆吗？
- 可逆→快选快调；不可逆→慎重

完成标准：
- 有明确倾向（知道选什么）
- 标准清晰（知道为什么选）
- 代价明确（知道放弃什么）
- 能说出"最坏情况是___，我能接受"

### [检验] 在行动前攻击自己的决策
目标：主动寻找决策的脆弱点，在现实击溃它之前

核心问题：**这个选择可能怎么错？**（不是"为什么对"）

**识别关键假设**
- 这个决策依赖哪些假设？（事实/因果/能力）
- 哪个假设如果错了，整个决策就崩塌？
- 有什么是你"以为是事实"但其实没验证的？

**反向攻击**
- 如果要让这个选择失败，怎么做最有效？
- 一年后这个选择彻底失败了，最可能是因为什么？
- 一个聪明的反对者会攻击哪里？

**设定止损条件**
- 什么信号出现，说明假设错了？
- 如果发生___，你就停止/改变方向？
- 这个止损条件具体、可观测吗？

完成标准：
- 能列出2-3个关键假设
- 知道最脆弱的点在哪
- 有具体的止损条件："如果___就___"
- 检验结束 → 输出文档

## 最终输出

检验结束后直接输出 Markdown（不用代码块）：

# [问题标题]

## 问题
[一句话描述问题是什么]

## 思考过程
### 可能性
[发散阶段探索到的关键可能性]
### 结构
[结构化阶段的分析框架]
### 选择与代价
[收敛阶段的决策及其代价]

## 结论

## 风险与止损
[关键假设 + 止损条件]
`;

/**
 * 获取用于检测的模型名称
 * 检测任务简单，使用轻量模型；同时避免 thinking 模型的特殊要求
 */
function getDetectionModel(mainModel: string): string {
	// 如果是 thinking 模型，去掉 -think 后缀
	if (mainModel.includes("-think")) {
		return mainModel.replace("-think", "");
	}
	// 如果是 Claude 模型，使用 haiku 做检测（更快更便宜）
	if (mainModel.includes("claude")) {
		return "claude-3-5-haiku-latest";
	}
	// 如果是 GPT 模型，使用 gpt-4o-mini 做检测
	if (mainModel.includes("gpt")) {
		return "gpt-4o-mini";
	}
	// 其他情况使用原模型
	return mainModel;
}

/**
 * 调用 LLM 进行 patch 检测（非流式）
 */
async function detectPatches(
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

/**
 * 获取项目根目录的 patches 路径
 */
function getPatchesDir(): string {
	// 在开发环境中，process.cwd() 是项目根目录
	return path.join(process.cwd(), "patches", "context");
}

export const Route = createFileRoute("/api/chat")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				if (request.signal.aborted) {
					return new Response(null, { status: 499 });
				}

				const abortController = new AbortController();

				try {
					const body = await request.json();
					const { messages, settings } = body as {
						// biome-ignore lint/suspicious/noExplicitAny: Messages type from client
						messages: any[];
						settings?: { baseURL?: string; apiKey?: string; model?: string };
					};

					// User settings override server defaults
					const model = settings?.model || env.OPENAI_MODEL || "gpt-4.1";
					const apiKey = settings?.apiKey || env.OPENAI_API_KEY || "";
					const baseURL =
						settings?.baseURL ||
						env.OPENAI_BASE_URL ||
						"https://api.openai.com/v1";
					const useCompletionsAPI = env.USE_COMPLETIONS_API === "true";

					console.log(
						"[Chat API] model:",
						model,
						"baseURL:",
						baseURL,
						"useCompletionsAPI:",
						useCompletionsAPI
					);

					if (!apiKey) {
						return new Response(
							JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
							{ status: 500, headers: { "Content-Type": "application/json" } }
						);
					}

					// Context Patches: 检测并注入领域特定 prompt
					let systemPrompt = SYSTEM_PROMPT;
					try {
						const patches = loadPatches(getPatchesDir());
						if (patches.length > 0) {
							// 提取最后一条用户消息用于检测
							const lastUserMessage = [...messages]
								.reverse()
								.find((m) => m.role === "user");
							const userContent =
								typeof lastUserMessage?.content === "string"
									? lastUserMessage.content
									: "";

							if (userContent) {
								const detectionPrompt = buildDetectionPrompt(
									patches,
									userContent
								);
								const detectionResponse = await detectPatches(
									detectionPrompt,
									apiKey,
									baseURL,
									model
								);
								const matches = parseDetectionResponse(detectionResponse);

								// 记录匹配日志
								logPatchMatch(userContent, matches);

								// 注入匹配的 patch 内容
								const injection = buildInjectionContent(patches, matches);
								if (injection) {
									systemPrompt = SYSTEM_PROMPT + injection;
								}
							}
						}
					} catch (error) {
						console.warn("[Context Patches] Detection failed:", error);
						// 检测失败不影响主流程
					}

					// Use OpenAI-compat adapter (Chat Completions API) for providers that don't support Responses API
					// Set USE_COMPLETIONS_API=true in .env.local to enable this
					const adapter = useCompletionsAPI
						? createOpenAICompatChat(model, apiKey, { baseURL })
						: // @ts-expect-error - custom model from env
							createOpenaiChat(model, apiKey, { baseURL });

					const stream = chat({
						adapter,
						tools: [interviewToolDef],
						systemPrompts: [systemPrompt],
						agentLoopStrategy: maxIterations(20),
						messages,
						abortController,
						modelOptions: {
							reasoning: {
								effort: "medium",
								summary: "auto",
							},
						},
					});

					return toServerSentEventsResponse(stream, { abortController });
				} catch (error: unknown) {
					console.error("Chat API error:", error);
					const isAbortError =
						error instanceof Error && error.name === "AbortError";
					if (isAbortError || abortController.signal.aborted) {
						return new Response(null, { status: 499 });
					}
					return new Response(
						JSON.stringify({ error: "Failed to process request" }),
						{ status: 500, headers: { "Content-Type": "application/json" } }
					);
				}
			},
		},
	},
});
