import { Brain } from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";

interface ThinkingMessageProps {
	content: string;
}

export function ThinkingMessage({ content }: ThinkingMessageProps) {
	const [isCollapsed, setIsCollapsed] = useState(false);

	return (
		<div className="mb-4 flex items-start gap-4">
			<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
				<Brain className="h-4 w-4 opacity-50" />
			</div>
			<div className="max-w-[85%] rounded-2xl border border-border/50 bg-muted/30 px-4 py-3">
				<button
					className="flex items-center gap-2 text-muted-foreground text-xs transition-colors hover:text-foreground"
					onClick={() => setIsCollapsed(!isCollapsed)}
					type="button"
				>
					<span className="font-medium">Thinking Process</span>
					<span className="opacity-70">
						{isCollapsed ? "▶ Show" : "▼ Hide"}
					</span>
				</button>
				{!isCollapsed && (
					<div className="prose prose-neutral dark:prose-invert prose-sm mt-3 max-w-none border-border/50 border-t pt-2 text-muted-foreground/90">
						<Streamdown>{content}</Streamdown>
					</div>
				)}
			</div>
		</div>
	);
}
