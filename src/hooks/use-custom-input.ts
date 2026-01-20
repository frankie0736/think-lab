import { useCallback, useState } from "react";

interface UseCustomInputReturn {
	value: string;
	isOpen: boolean;
	setValue: (value: string) => void;
	open: () => void;
	close: () => void;
	submit: () => string | null;
	reset: () => void;
}

/**
 * Hook for managing custom input state with open/close behavior.
 * Provides submit that returns trimmed value and resets state.
 */
export function useCustomInput(): UseCustomInputReturn {
	const [value, setValue] = useState("");
	const [isOpen, setIsOpen] = useState(false);

	const open = useCallback(() => {
		setIsOpen(true);
	}, []);

	const close = useCallback(() => {
		setIsOpen(false);
		setValue("");
	}, []);

	const submit = useCallback(() => {
		const trimmed = value.trim();
		if (!trimmed) {
			return null;
		}
		setValue("");
		setIsOpen(false);
		return trimmed;
	}, [value]);

	const reset = useCallback(() => {
		setValue("");
		setIsOpen(false);
	}, []);

	return {
		value,
		isOpen,
		setValue,
		open,
		close,
		submit,
		reset,
	};
}
