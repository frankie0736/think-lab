import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

/**
 * Tool name constant (SSOT - single source of truth for tool identification)
 */
export const INTERVIEW_TOOL_NAME = "interview" as const;

/**
 * Option schema for interview questions
 */
const optionSchema = z.object({
	label: z.string().describe("选项标签，1-5 词"),
	description: z.string().describe("选项说明"),
});

/**
 * Question schema for interview tool
 */
const questionSchema = z.object({
	question: z.string().describe("完整问题，以问号结尾"),
	header: z.string().max(12).describe("简短标签，≤12 字符"),
	multiSelect: z.boolean().describe("是否多选"),
	options: z.array(optionSchema).min(2).max(4).describe("可选项列表，2-4 个"),
});

/**
 * Input schema for interview tool (AI → Frontend)
 */
export const interviewInputSchema = z.object({
	questions: z
		.array(questionSchema)
		.min(1)
		.max(4)
		.describe("问题列表，1-4 个问题"),
});

/**
 * Output schema for interview tool (Frontend → AI)
 */
export const interviewOutputSchema = z.object({
	answers: z
		.record(z.string(), z.union([z.string(), z.array(z.string())]))
		.describe("用户回答，key 为问题，value 为选中的 label 或自定义输入"),
});

/**
 * Interview tool definition
 *
 * AI calls this tool to ask structured questions when:
 * - Requirements are ambiguous
 * - Technical decisions need user input
 * - Trade-offs require user choice
 */
export const interviewToolDef = toolDefinition({
	name: INTERVIEW_TOOL_NAME,
	description: `向用户展示结构化选择界面来澄清模糊需求。

【重要】必须提供 questions 数组参数，格式如下：
{
  "questions": [
    {
      "question": "您希望构建什么类型的系统？",
      "header": "系统类型",
      "multiSelect": false,
      "options": [
        {"label": "Web应用", "description": "浏览器中运行的应用"},
        {"label": "后端服务", "description": "API或微服务"},
        {"label": "自动化流程", "description": "定时任务或工作流"}
      ]
    }
  ]
}

约束：
- questions: 1-4个问题
- header: ≤12字符
- options: 每个问题2-4个选项
- 用户可选"其他"输入自定义答案`,
	inputSchema: interviewInputSchema,
	outputSchema: interviewOutputSchema,
});

// Type exports for consumers
export type InterviewInput = z.infer<typeof interviewInputSchema>;
export type InterviewOutput = z.infer<typeof interviewOutputSchema>;
export type InterviewQuestion = z.infer<typeof questionSchema>;
export type InterviewOption = z.infer<typeof optionSchema>;
