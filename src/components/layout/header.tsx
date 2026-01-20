import { Link } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
	return (
		<header className="flex h-14 shrink-0 items-center justify-between border-border border-b px-4">
			<Link className="font-semibold text-lg tracking-tight" to="/">
				ACF Planner
			</Link>
			<Link to="/settings">
				<Button size="icon" variant="ghost">
					<Settings className="h-5 w-5" />
				</Button>
			</Link>
		</header>
	);
}
