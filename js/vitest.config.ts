import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		coverage: {
			include: ["./**/*"],
      		exclude: ["node_modules", "vitest.config.ts", "./cli.ts", "./**/*.json"],
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