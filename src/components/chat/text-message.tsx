import { Streamdown } from "streamdown";

interface TextMessageProps {
	content: string;
	role: "user" | "assistant";
}

export function TextMessage({ content, role }: TextMessageProps) {
	return (
		<div
			className={`flex items-start gap-4 ${role === "assistant" ? "" : "flex-row-reverse"}`}
		>
			<div
				className={`flex h-8 w-8 flex-shrink-0 select-none items-center justify-center rounded-full border font-medium text-xs ${
					role === "assistant"
						? "border-primary bg-primary text-primary-foreground"
						: "border-border bg-muted text-muted-foreground"
				}`}
			>
				{role === "assistant" ? "AI" : "U"}
			</div>
			<div
				className={`max-w-[85%] rounded-2xl px-4 py-3 ${
					role === "assistant"
						? "-ml-2 bg-transparent"
						: "bg-secondary text-secondary-foreground"
				}`}
			>
				<div className="prose prose-neutral dark:prose-invert prose-sm max-w-none leading-relaxed">
					<Streamdown>{content}</Streamdown>
				</div>
			</div>
		</div>
	);
}
