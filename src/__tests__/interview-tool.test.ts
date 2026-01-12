import { describe, expect, it } from "vitest";

import {
	type InterviewInput,
	type InterviewOutput,
	interviewInputSchema,
	interviewOutputSchema,
	interviewToolDef,
} from "@/lib/interview-tool";

describe("Interview Tool", () => {
	describe("Schema Validation", () => {
		it("should validate correct interview input", () => {
			const validInput: InterviewInput = {
				questions: [
					{
						question: "你希望使用哪种认证方式？",
						header: "认证方式",
						multiSelect: false,
						options: [
							{
								label: "JWT Token",
								description: "无状态，适合 API 和微服务架构",
							},
							{
								label: "Session Cookie",
								description: "有状态，适合传统 Web 应用",
							},
						],
					},
				],
			};

			const result = interviewInputSchema.safeParse(validInput);
			expect(result.success).toBe(true);
		});

		it("should reject input with too many questions", () => {
			const invalidInput = {
				questions: [
					{
						question: "Q1?",
						header: "H1",
						multiSelect: false,
						options: [
							{ label: "A", description: "a" },
							{ label: "B", description: "b" },
						],
					},
					{
						question: "Q2?",
						header: "H2",
						multiSelect: false,
						options: [
							{ label: "A", description: "a" },
							{ label: "B", description: "b" },
						],
					},
					{
						question: "Q3?",
						header: "H3",
						multiSelect: false,
						options: [
							{ label: "A", description: "a" },
							{ label: "B", description: "b" },
						],
					},
					{
						question: "Q4?",
						header: "H4",
						multiSelect: false,
						options: [
							{ label: "A", description: "a" },
							{ label: "B", description: "b" },
						],
					},
					{
						question: "Q5?",
						header: "H5",
						multiSelect: false,
						options: [
							{ label: "A", description: "a" },
							{ label: "B", description: "b" },
						],
					},
				],
			};

			const result = interviewInputSchema.safeParse(invalidInput);
			expect(result.success).toBe(false);
		});

		it("should reject input with too many options", () => {
			const invalidInput = {
				questions: [
					{
						question: "Q?",
						header: "H",
						multiSelect: false,
						options: [
							{ label: "A", description: "a" },
							{ label: "B", description: "b" },
							{ label: "C", description: "c" },
							{ label: "D", description: "d" },
							{ label: "E", description: "e" },
						],
					},
				],
			};

			const result = interviewInputSchema.safeParse(invalidInput);
			expect(result.success).toBe(false);
		});

		it("should reject header longer than 12 characters", () => {
			const invalidInput = {
				questions: [
					{
						question: "Q?",
						header: "这个标签太长了超过十二个字符",
						multiSelect: false,
						options: [
							{ label: "A", description: "a" },
							{ label: "B", description: "b" },
						],
					},
				],
			};

			const result = interviewInputSchema.safeParse(invalidInput);
			expect(result.success).toBe(false);
		});

		it("should validate correct interview output", () => {
			const validOutput: InterviewOutput = {
				answers: {
					"你希望使用哪种认证方式？": "JWT Token",
					"你需要哪些功能？": ["登录", "注册", "忘记密码"],
				},
			};

			const result = interviewOutputSchema.safeParse(validOutput);
			expect(result.success).toBe(true);
		});
	});

	describe("Tool Definition", () => {
		it("should have correct tool name", () => {
			expect(interviewToolDef.name).toBe("interview");
		});

		it("should have description", () => {
			expect(interviewToolDef.description).toContain("澄清模糊需求");
		});
	});
});
