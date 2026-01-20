import { useCallback, useState } from "react";

interface UseMultiSelectOptions {
	initialSelected?: string[];
}

interface UseMultiSelectReturn {
	selected: string[];
	isSelected: (value: string) => boolean;
	toggle: (value: string) => void;
	add: (value: string) => void;
	remove: (value: string) => void;
	clear: () => void;
	setSelected: (values: string[]) => void;
}

/**
 * Hook for managing multi-select state.
 * Provides toggle, add, remove, and clear operations.
 */
export function useMultiSelect(
	options: UseMultiSelectOptions = {}
): UseMultiSelectReturn {
	const [selected, setSelected] = useState<string[]>(
		options.initialSelected ?? []
	);

	const isSelected = useCallback(
		(value: string) => selected.includes(value),
		[selected]
	);

	const toggle = useCallback((value: string) => {
		setSelected((prev) =>
			prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
		);
	}, []);

	const add = useCallback((value: string) => {
		setSelected((prev) => (prev.includes(value) ? prev : [...prev, value]));
	}, []);

	const remove = useCallback((value: string) => {
		setSelected((prev) => prev.filter((v) => v !== value));
	}, []);

	const clear = useCallback(() => {
		setSelected([]);
	}, []);

	return {
		selected,
		isSelected,
		toggle,
		add,
		remove,
		clear,
		setSelected,
	};
}
