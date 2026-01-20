import { ExternalLink, Search } from "lucide-react";
import { useState } from "react";
import type { WebSearchInput, WebSearchOutput } from "@/lib/web-search-tool";

interface WebSearchResultProps {
	input: WebSearchInput;
	output?: WebSearchOutput;
	isLoading?: boolean;
}

export function WebSearchResult({
	input,
	output,
	isLoading,
}: WebSearchResultProps) {
	const [isCollapsed, setIsCollapsed] = useState(true);

	return (
		<div className="mb-4 flex items-start gap-4">
			<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
				<Search className="h-4 w-4 opacity-50" />
			</div>
			<div className="max-w-[85%] rounded-2xl border border-border/50 bg-muted/30 px-4 py-3">
				<button
					className="flex items-center gap-2 text-muted-foreground text-xs transition-colors hover:text-foreground"
					onClick={() => setIsCollapsed(!isCollapsed)}
					type="button"
				>
					<span className="font-medium">
						{isLoading ? "Searching..." : "Web Search"}
					</span>
					<span className="mx-1 text-muted-foreground/70">·</span>
					<span className="max-w-[300px] truncate opacity-70">
						{input.query}
					</span>
					{!isLoading && (
						<span className="ml-1 opacity-70">{isCollapsed ? "▶" : "▼"}</span>
					)}
				</button>

				{!isCollapsed && output && (
					<div className="mt-3 space-y-3 border-border/50 border-t pt-3">
						{output.results.length === 0 ? (
							<p className="text-muted-foreground/70 text-sm">
								No results found
							</p>
						) : (
							output.results.map((result, index) => (
								<div
									className="space-y-1 text-sm"
									key={`${result.url}-${index}`}
								>
									<a
										className="flex items-center gap-1 font-medium text-primary hover:underline"
										href={result.url}
										rel="noopener noreferrer"
										target="_blank"
									>
										{result.title}
										<ExternalLink className="h-3 w-3" />
									</a>
									<p className="line-clamp-2 text-muted-foreground/80 text-xs">
										{result.content}
									</p>
								</div>
							))
						)}
					</div>
				)}
			</div>
		</div>
	);
}
