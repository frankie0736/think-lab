import { Send } from "lucide-react";
import { useState } from "react";

interface ChatInputProps {
	onSend: (message: string) => void;
	placeholder?: string;
}

export function ChatInput({
	onSend,
	placeholder = "输入你想理清的问题...",
}: ChatInputProps) {
	const [input, setInput] = useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (input.trim()) {
			onSend(input);
			setInput("");
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey && input.trim()) {
			e.preventDefault();
			onSend(input);
			setInput("");
		}
	};

	return (
		<div className="relative">
			<form
				className="relative flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm transition-all focus-within:ring-1 focus-within:ring-ring"
				onSubmit={handleSubmit}
			>
				<textarea
					className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent px-3 py-3 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					onChange={(e) => setInput(e.target.value)}
					onInput={(e) => {
						const target = e.target as HTMLTextAreaElement;
						target.style.height = "auto";
						target.style.height = `${target.scrollHeight}px`;
					}}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					rows={1}
					value={input}
				/>
				<button
					className="mb-1 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
					disabled={!input.trim()}
					type="submit"
				>
					<Send className="h-4 w-4" />
				</button>
			</form>
		</div>
	);
}
