import { Pencil } from "lucide-react";
import { useState } from "react";
import type { InterviewInput, InterviewOutput } from "@/lib/interview-tool";
import { InterviewUI } from "./interview-ui";

interface EditableInterviewProps {
	toolCallId: string;
	input: InterviewInput;
	output: InterviewOutput;
	canEdit: boolean;
	onResubmit: (toolCallId: string, output: InterviewOutput) => void;
}

/**
 * Displays a completed interview with edit capability
 *
 * - Shows answered questions in compact format
 * - Allows re-editing when canEdit is true
 * - On resubmit, truncates conversation and continues with new answers
 */
export function EditableInterview({
	toolCallId,
	input,
	output,
	canEdit,
	onResubmit,
}: EditableInterviewProps) {
	const [isEditing, setIsEditing] = useState(false);

	const handleResubmit = (newOutput: InterviewOutput) => {
		setIsEditing(false);
		onResubmit(toolCallId, newOutput);
	};

	if (isEditing) {
		return (
			<InterviewUI
				initialAnswers={output.answers}
				input={input}
				onCancel={() => setIsEditing(false)}
				onSubmit={handleResubmit}
			/>
		);
	}

	return (
		<div className="rounded-2xl border border-border/50 bg-muted/20 p-5">
			<div className="mb-4 flex items-center justify-between">
				<p className="font-medium text-foreground/80 text-sm">
					Completed Interview
				</p>
				{canEdit && (
					<button
						className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-muted-foreground text-xs transition-colors hover:bg-muted/50 hover:text-foreground"
						onClick={() => setIsEditing(true)}
						title="Resubmitting will truncate the conversation"
						type="button"
					>
						<Pencil className="h-3.5 w-3.5" />
						<span className="font-medium">Edit Answers</span>
					</button>
				)}
			</div>
			<div className="space-y-3 text-sm">
				{input.questions.map((q) => {
					const answer = output.answers[q.question];
					if (!answer) {
						return null;
					}

					return (
						<div
							className="flex items-start gap-3"
							key={`${toolCallId}-${q.question}`}
						>
							<span className="shrink-0 rounded-md border border-border/50 bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
								{q.header}
							</span>
							<span className="text-foreground/90 leading-relaxed">
								{Array.isArray(answer) ? answer.join(", ") : answer}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
