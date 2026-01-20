import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertCircle,
	ArrowLeft,
	Check,
	CheckCircle2,
	Loader2,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-settings";

export const Route = createFileRoute("/settings")({
	component: SettingsPage,
});

interface ModelInfo {
	id: string;
	owned_by?: string;
}

interface ModelsState {
	status: "idle" | "loading" | "loaded" | "auth-required" | "error";
	models: ModelInfo[];
	error?: string;
}

interface ApiKeyValidation {
	status: "idle" | "validating" | "valid" | "invalid";
	error?: string;
}

function getInputBorderClass(status: ApiKeyValidation["status"]): string {
	if (status === "invalid") {
		return "border-destructive";
	}
	if (status === "valid") {
		return "border-green-500";
	}
	return "border-input";
}

function getModelPlaceholder(state: ModelsState): string {
	if (state.status === "loading") {
		return "Loading models...";
	}
	if (state.status === "auth-required") {
		return "Fill API Key to load models";
	}
	if (state.status === "error") {
		return "Failed to load models";
	}
	if (state.models.length === 0) {
		return "No models available";
	}
	return "Select a model";
}

async function fetchModels(
	baseURL: string,
	apiKey?: string
): Promise<ModelInfo[]> {
	const headers: Record<string, string> = {};
	if (apiKey) {
		headers.Authorization = `Bearer ${apiKey}`;
	}

	const response = await fetch(`${baseURL}/models`, { headers });

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(error.error?.message || `HTTP ${response.status}`);
	}

	const data = await response.json();
	return data.data || [];
}

function SettingsPage() {
	const { settings, updateSettings } = useSettings();
	const [saved, setSaved] = useState(false);
	const [modelsState, setModelsState] = useState<ModelsState>({
		status: "idle",
		models: [],
	});
	const [apiKeyValidation, setApiKeyValidation] = useState<ApiKeyValidation>({
		status: "idle",
	});

	const form = useForm({
		defaultValues: {
			baseURL: settings.baseURL,
			model: settings.model,
			apiKey: settings.apiKey,
		},
		onSubmit: ({ value }) => {
			updateSettings(value);
			setSaved(true);
			setTimeout(() => setSaved(false), 2000);
		},
	});

	// Load models when baseURL changes (try without auth first)
	const loadModels = useCallback(async (baseURL: string, apiKey?: string) => {
		if (!baseURL) {
			setModelsState({ status: "idle", models: [] });
			return;
		}

		setModelsState({ status: "loading", models: [] });

		try {
			const modelList = await fetchModels(baseURL, apiKey);
			setModelsState({
				status: "loaded",
				models: modelList.sort((a, b) => a.id.localeCompare(b.id)),
			});
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : "Unknown error";
			// Check if it's an auth error (401/403)
			if (
				errorMsg.includes("401") ||
				errorMsg.includes("403") ||
				errorMsg.toLowerCase().includes("unauthorized") ||
				errorMsg.toLowerCase().includes("auth")
			) {
				setModelsState({ status: "auth-required", models: [] });
			} else {
				setModelsState({ status: "error", models: [], error: errorMsg });
			}
		}
	}, []);

	// Validate API key
	const validateApiKey = useCallback(
		async (baseURL: string, apiKey: string) => {
			if (!apiKey) {
				setApiKeyValidation({ status: "idle" });
				return;
			}

			if (!apiKey.startsWith("sk-")) {
				setApiKeyValidation({
					status: "invalid",
					error: "API Key must start with 'sk-'",
				});
				return;
			}

			setApiKeyValidation({ status: "validating" });

			try {
				const modelList = await fetchModels(baseURL, apiKey);
				setModelsState({
					status: "loaded",
					models: modelList.sort((a, b) => a.id.localeCompare(b.id)),
				});
				setApiKeyValidation({ status: "valid" });
			} catch (err) {
				const errorMsg =
					err instanceof Error ? err.message : "Failed to validate";
				setApiKeyValidation({ status: "invalid", error: errorMsg });
			}
		},
		[]
	);

	const canSelectModel =
		modelsState.status === "loaded" && modelsState.models.length > 0;

	return (
		<div className="mx-auto max-w-2xl flex-1 overflow-auto px-4 py-8">
			<div className="mb-8 flex items-center gap-4">
				<Link to="/">
					<Button size="icon" variant="ghost">
						<ArrowLeft className="h-5 w-5" />
					</Button>
				</Link>
				<h1 className="font-semibold text-2xl">Settings</h1>
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
			>
				<div className="space-y-6">
					<div className="rounded-lg border border-border bg-card p-6">
						<h2 className="mb-4 font-medium text-lg">API Configuration</h2>
						<p className="mb-6 text-muted-foreground text-sm">
							Configure your OpenAI-compatible API. Fill in Base URL and API
							Key, then select a model.
						</p>

						<div className="space-y-4">
							{/* 1. Base URL */}
							<form.Field name="baseURL">
								{(field) => (
									<div>
										<label
											className="mb-2 block font-medium text-sm"
											htmlFor={field.name}
										>
											Base URL
										</label>
										<input
											className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
											id={field.name}
											onBlur={() => {
												field.handleBlur();
												// Try to load models when leaving the field
												loadModels(field.state.value);
											}}
											onChange={(e) => {
												field.handleChange(e.target.value);
												// Reset states when baseURL changes
												setModelsState({ status: "idle", models: [] });
												setApiKeyValidation({ status: "idle" });
											}}
											placeholder="https://aihubmix.com/v1"
											type="url"
											value={field.state.value}
										/>
									</div>
								)}
							</form.Field>

							{/* 2. Model (dropdown) */}
							<form.Field name="model">
								{(field) => (
									<div>
										<label
											className="mb-2 block font-medium text-sm"
											htmlFor={field.name}
										>
											Model
										</label>
										<div className="relative">
											<select
												className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
												disabled={!canSelectModel}
												id={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												value={field.state.value}
											>
												<option value="">
													{getModelPlaceholder(modelsState)}
												</option>
												{modelsState.models.map((model) => (
													<option key={model.id} value={model.id}>
														{model.id}
													</option>
												))}
											</select>
											{modelsState.status === "loading" && (
												<Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
											)}
										</div>
										{modelsState.status === "error" && modelsState.error && (
											<p className="mt-1 flex items-center gap-1 text-destructive text-sm">
												<AlertCircle className="h-4 w-4" />
												{modelsState.error}
											</p>
										)}
									</div>
								)}
							</form.Field>

							{/* 3. API Key */}
							<form.Field name="apiKey">
								{(field) => (
									<div>
										<label
											className="mb-2 block font-medium text-sm"
											htmlFor={field.name}
										>
											API Key
											{modelsState.status === "auth-required" && (
												<span className="ml-2 font-normal text-muted-foreground">
													(required for this API)
												</span>
											)}
										</label>
										<div className="relative">
											<input
												className={`w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${getInputBorderClass(apiKeyValidation.status)}`}
												id={field.name}
												onBlur={() => {
													field.handleBlur();
													// Validate when user leaves the field
													if (field.state.value) {
														validateApiKey(
															form.getFieldValue("baseURL"),
															field.state.value
														);
													}
												}}
												onChange={(e) => {
													field.handleChange(e.target.value);
													// Reset validation when apiKey changes
													if (apiKeyValidation.status !== "idle") {
														setApiKeyValidation({ status: "idle" });
													}
												}}
												placeholder="sk-..."
												type="password"
												value={field.state.value}
											/>
											{apiKeyValidation.status === "validating" && (
												<Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
											)}
											{apiKeyValidation.status === "valid" && (
												<CheckCircle2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-green-500" />
											)}
											{apiKeyValidation.status === "invalid" && (
												<AlertCircle className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-destructive" />
											)}
										</div>
										{apiKeyValidation.status === "invalid" &&
											apiKeyValidation.error && (
												<p className="mt-1 text-destructive text-sm">
													{apiKeyValidation.error}
												</p>
											)}
										{apiKeyValidation.status === "valid" && (
											<p className="mt-1 text-green-600 text-sm">
												API Key valid ({modelsState.models.length} models
												available)
											</p>
										)}
									</div>
								)}
							</form.Field>
						</div>
					</div>

					<div className="flex items-center justify-end gap-3">
						{saved && (
							<span className="flex items-center gap-1 text-green-600 text-sm">
								<Check className="h-4 w-4" />
								Saved
							</span>
						)}
						<form.Subscribe selector={(state) => state.isDirty}>
							{(isDirty) => (
								<Button disabled={!isDirty} type="submit">
									Save Settings
								</Button>
							)}
						</form.Subscribe>
					</div>
				</div>
			</form>
		</div>
	);
}
