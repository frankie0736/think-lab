import { useCallback, useEffect, useState } from "react";

export interface UserSettings {
	baseURL: string;
	apiKey: string;
	model: string;
}

const STORAGE_KEY = "thinklab-settings";

const defaultSettings: UserSettings = {
	baseURL: "https://aihubmix.com/v1",
	apiKey: "",
	model: "",
};

function getStoredSettings(): UserSettings {
	if (typeof window === "undefined") return defaultSettings;
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return { ...defaultSettings, ...JSON.parse(stored) };
		}
	} catch {
		// Ignore parse errors
	}
	return defaultSettings;
}

function setStoredSettings(settings: UserSettings): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	window.dispatchEvent(new CustomEvent("settings-change"));
}

export function useSettings() {
	const [settings, setSettings] = useState<UserSettings>(defaultSettings);

	useEffect(() => {
		// Load initial settings
		setSettings(getStoredSettings());

		// Listen for changes
		const handleChange = () => {
			setSettings(getStoredSettings());
		};

		window.addEventListener("settings-change", handleChange);
		window.addEventListener("storage", handleChange);

		return () => {
			window.removeEventListener("settings-change", handleChange);
			window.removeEventListener("storage", handleChange);
		};
	}, []);

	const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
		const current = getStoredSettings();
		const updated = { ...current, ...newSettings };
		setStoredSettings(updated);
		setSettings(updated);
	}, []);

	const clearSettings = useCallback(() => {
		setStoredSettings(defaultSettings);
		setSettings(defaultSettings);
	}, []);

	return { settings, updateSettings, clearSettings };
}

export function getSettingsFromStorage(): UserSettings {
	return getStoredSettings();
}

/**
 * Get settings with empty values filtered out (SSOT for non-empty settings).
 * Use this when sending settings to API - avoids filtering logic in consumers.
 */
export function getNonEmptySettings(): Partial<UserSettings> {
	const settings = getStoredSettings();
	return Object.fromEntries(
		Object.entries(settings).filter(([_, v]) => v)
	) as Partial<UserSettings>;
}
