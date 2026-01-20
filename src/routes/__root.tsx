import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { Header } from "@/components/layout/header";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "ACF 产品规划",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	component: RootLayout,
	shellComponent: RootDocument,
	notFoundComponent: () => <div>Not Found</div>,
	pendingComponent: () => <div>Loading...</div>,
	errorComponent: ({ error }) => <div>{error.message}</div>,
});

function RootLayout() {
	return (
		<div className="flex h-[100dvh] flex-col bg-background text-foreground">
			<Header />
			<Outlet />
		</div>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="zh-CN">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
