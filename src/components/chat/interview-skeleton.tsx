export function InterviewSkeleton() {
	return (
		<div className="mx-auto max-w-[90%] animate-pulse rounded-2xl border border-border/50 bg-card/50 p-6 shadow-sm">
			<div className="mb-6 flex items-center justify-between opacity-50">
				<div className="h-4 w-24 rounded bg-muted-foreground/20" />
				<div className="h-3 w-16 rounded bg-muted-foreground/20" />
			</div>
			<div className="mb-4 h-5 w-3/4 rounded bg-muted-foreground/20 opacity-70" />
			<div className="space-y-3 opacity-60">
				{[1, 2, 3].map((i) => (
					<div
						className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4"
						key={i}
					>
						<div className="h-4 w-4 rounded-full bg-muted-foreground/20" />
						<div className="flex-1 space-y-2">
							<div className="h-4 w-1/3 rounded bg-muted-foreground/20" />
							<div className="h-3 w-2/3 rounded bg-muted-foreground/10" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
