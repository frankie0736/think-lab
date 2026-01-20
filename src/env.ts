import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		SERVER_URL: z.string().url().optional(),
		// OpenAI compatible API (OpenRouter, aihubmix, etc.)
		OPENAI_BASE_URL: z.string().url().optional(),
		OPENAI_API_KEY: z.string().optional(),
		OPENAI_MODEL: z.string().optional(),
		// Set to "true" for models that don't support OpenAI Responses API (e.g., DeepSeek, Qwen)
		USE_COMPLETIONS_API: z.string().optional(),
	},

	/**
	 * The prefix that client-side variables must have. This is enforced both at
	 * a type-level and at runtime.
	 */
	clientPrefix: "VITE_",

	client: {
		VITE_APP_TITLE: z.string().min(1).optional(),
	},

	/**
	 * What object holds the environment variables at runtime.
	 * Server vars use process.env, client vars use import.meta.env.
	 */
	runtimeEnv: {
		// Server
		SERVER_URL: process.env.SERVER_URL,
		OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
		OPENAI_MODEL: process.env.OPENAI_MODEL,
		USE_COMPLETIONS_API: process.env.USE_COMPLETIONS_API,
		// Client
		VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE,
	},

	/**
	 * By default, this library will feed the environment variables directly to
	 * the Zod validator.
	 *
	 * This means that if you have an empty string for a value that is supposed
	 * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
	 * it as a type mismatch violation. Additionally, if you have an empty string
	 * for a value that is supposed to be a string with a default value (e.g.
	 * `DOMAIN=` in an ".env" file), the default value will never be applied.
	 *
	 * In order to solve these issues, we recommend that all new projects
	 * explicitly specify this option as true.
	 */
	emptyStringAsUndefined: true,
});
