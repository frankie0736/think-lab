import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useCustomInput } from "@/hooks/use-custom-input";
import { useMultiSelect } from "@/hooks/use-multi-select";
import type {
	InterviewInput,
	InterviewOutput,
	InterviewQuestion,
} from "@/lib/interview-tool";
import { cn } from "@/lib/utils";

/**
 * Displays previously answered questions with click-to-edit capability
 */
function AnsweredQuestions({
	questions,
	answers,
	onGoBack,
}: {
	questions: InterviewQuestion[];
	answers: Record<string, string | string[]>;
	onGoBack: (stepIndex: number) => void;
}) {
	const answeredQuestions = questions.filter((q) => answers[q.question]);

	if (answeredQuestions.length === 0) {
		return null;
	}

	return (
		<div className="mb-6 space-y-2">
			{answeredQuestions.map((q, idx) => {
				const answer = answers[q.question];
				const displayAnswer = Array.isArray(answer)
					? answer.join("、")
					: answer;

				return (
					<button
						className="group flex w-full items-center gap-3 rounded-xl border border-border/50 bg-secondary/30 p-3 text-left transition-all hover:border-border hover:bg-secondary/50"
						key={q.question}
						onClick={() => onGoBack(idx)}
						title="Click to edit"
						type="button"
					>
						<ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
						<span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 font-medium text-secondary-foreground/70 text-xs">
							{q.header}
						</span>
						<span className="truncate text-foreground/80 text-sm">
							{displayAnswer}
						</span>
					</button>
				);
			})}
		</div>
	);
}

interface StepQuestionProps {
	question: InterviewQuestion;
	questionIndex: number;
	totalQuestions: number;
	initialAnswer?: string | string[];
	onAnswer: (answer: string | string[]) => void;
}

function StepQuestion({
	question,
	questionIndex,
	totalQuestions,
	initialAnswer,
	onAnswer,
}: StepQuestionProps) {
	// Initialize selected from initialAnswer
	const getInitialSelected = (): string[] => {
		if (!initialAnswer) {
			return [];
		}
		if (Array.isArray(initialAnswer)) {
			return initialAnswer;
		}
		return [initialAnswer];
	};

	// Use extracted hooks (SSOT for multi-select and custom input logic)
	const { selected, isSelected, toggle, add } = useMultiSelect({
		initialSelected: getInitialSelected(),
	});
	const customInput = useCustomInput();

	const handleOptionClick = (label: string) => {
		if (question.multiSelect) {
			toggle(label);
		} else {
			// Single select: immediately advance
			onAnswer(label);
		}
	};

	const handleMultiSelectConfirm = () => {
		if (selected.length > 0) {
			onAnswer(selected);
		}
	};

	const handleCustomSubmit = () => {
		const value = customInput.submit();
		if (!value) {
			return;
		}
		if (question.multiSelect) {
			add(value);
		} else {
			onAnswer(value);
		}
	};

	const getStepColor = (i: number) => {
		if (i <= questionIndex) {
			return "bg-primary";
		}
		return "bg-muted";
	};

	return (
		<div className="space-y-6">
			{/* Progress indicator */}
			<div className="flex items-center gap-3">
				<div className="flex gap-1.5">
					{Array.from({ length: totalQuestions }).map((_, i) => (
						<div
							className={cn(
								"h-1.5 w-8 rounded-full transition-colors duration-300",
								getStepColor(i)
							)}
							// biome-ignore lint/suspicious/noArrayIndexKey: fixed length progress bar
							key={i}
						/>
					))}
				</div>
				<span className="font-medium text-muted-foreground text-xs">
					{questionIndex + 1} / {totalQuestions}
				</span>
			</div>

			{/* Question header */}
			<div className="flex items-center gap-2">
				<span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary text-xs">
					{question.header}
				</span>
				{question.multiSelect && (
					<span className="text-muted-foreground text-xs">
						(Multiple selection)
					</span>
				)}
			</div>

			{/* Question text */}
			<p className="font-semibold text-foreground text-xl tracking-tight">
				{question.question}
			</p>

			{/* Options */}
			<div className="space-y-3">
				{question.options.map((option) => (
					<button
						className={cn(
							"group flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all duration-200",
							isSelected(option.label)
								? "border-primary bg-primary/5 shadow-sm"
								: "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
						)}
						key={option.label}
						onClick={() => handleOptionClick(option.label)}
						type="button"
					>
						<div className="flex items-center gap-4">
							<div
								className={cn(
									"flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
									isSelected(option.label)
										? "border-primary bg-primary"
										: "border-muted-foreground/30 group-hover:border-primary/50"
								)}
							>
								{isSelected(option.label) && (
									<Check className="h-3 w-3 text-primary-foreground" />
								)}
							</div>
							<div>
								<span className="font-medium text-foreground text-sm">
									{option.label}
								</span>
								{option.description && (
									<p className="mt-0.5 text-muted-foreground text-xs">
										{option.description}
									</p>
								)}
							</div>
						</div>
						{!question.multiSelect && (
							<ChevronRight className="h-4 w-4 text-muted-foreground/50 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
						)}
					</button>
				))}

				{/* Custom input */}
				{customInput.isOpen ? (
					<div className="fade-in slide-in-from-top-2 flex animate-in gap-2 duration-200">
						<input
							autoFocus
							className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
							onChange={(e) => customInput.setValue(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									handleCustomSubmit();
								}
							}}
							placeholder="Type your own answer..."
							type="text"
							value={customInput.value}
						/>
						<Button onClick={handleCustomSubmit} size="sm">
							Confirm
						</Button>
						<Button onClick={customInput.close} size="sm" variant="ghost">
							Cancel
						</Button>
					</div>
				) : (
					<button
						className="w-full rounded-xl border border-border border-dashed p-4 text-muted-foreground text-sm transition-colors hover:border-primary/50 hover:bg-muted/30 hover:text-foreground"
						onClick={customInput.open}
						type="button"
					>
						+ Add custom answer
					</button>
				)}
			</div>

			{/* Multi-select confirm button */}
			{question.multiSelect && (
				<div className="flex justify-end pt-2">
					<Button
						disabled={selected.length === 0}
						onClick={handleMultiSelectConfirm}
					>
						Confirm Selection ({selected.length})
					</Button>
				</div>
			)}
		</div>
	);
}

interface InterviewUIProps {
	input: InterviewInput;
	initialAnswers?: Record<string, string | string[]>;
	onSubmit: (output: InterviewOutput) => void;
	onCancel?: () => void;
}

export function InterviewUI({
	input,
	initialAnswers,
	onSubmit,
	onCancel,
}: InterviewUIProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const [answers, setAnswers] = useState<Record<string, string | string[]>>(
		initialAnswers ?? {}
	);

	// Defensive check: ensure questions is an array
	const questions = Array.isArray(input.questions) ? input.questions : [];
	const currentQuestion = questions[currentStep];
	const isLastQuestion = currentStep === questions.length - 1;

	// Early return if no valid questions
	if (!currentQuestion || questions.length === 0) {
		return null;
	}

	const handleAnswer = (answer: string | string[]) => {
		const newAnswers = {
			...answers,
			[currentQuestion.question]: answer,
		};
		setAnswers(newAnswers);

		if (isLastQuestion) {
			// Last question answered - submit
			onSubmit({ answers: newAnswers });
		} else {
			// Move to next question
			setCurrentStep((prev) => prev + 1);
		}
	};

	const handleGoBack = (stepIndex: number) => {
		// Clear answers from stepIndex onwards (they may depend on earlier answers)
		const questionsToKeep = questions.slice(0, stepIndex);
		const newAnswers: Record<string, string | string[]> = {};
		for (const q of questionsToKeep) {
			if (answers[q.question]) {
				newAnswers[q.question] = answers[q.question];
			}
		}
		setAnswers(newAnswers);
		setCurrentStep(stepIndex);
	};

	return (
		<div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
			{onCancel && (
				<div className="mb-4 flex justify-end">
					<button
						className="text-muted-foreground text-xs transition-colors hover:text-foreground"
						onClick={onCancel}
						type="button"
					>
						Cancel Editing
					</button>
				</div>
			)}

			{/* Show answered questions - click to go back */}
			<AnsweredQuestions
				answers={answers}
				onGoBack={handleGoBack}
				questions={questions.slice(0, currentStep)}
			/>

			<StepQuestion
				initialAnswer={answers[currentQuestion.question]}
				key={currentStep}
				onAnswer={handleAnswer}
				question={currentQuestion}
				questionIndex={currentStep}
				totalQuestions={questions.length}
			/>
		</div>
	);
}

export default InterviewUI;
