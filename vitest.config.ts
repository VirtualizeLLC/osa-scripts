import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		coverage: {
			include: ["js/**/*"],
			exclude: ["node_modules","./**/*.json", "./js/cli.ts"],
			// Global thresholds
			thresholds: {
				lines: 95,
				functions: 95,
				branches: 95,
				statements: 95,
			},
		},
	},
});