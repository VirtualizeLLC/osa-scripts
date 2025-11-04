import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { exit } from "node:process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { auditAutoApprove } from "../commands/copilot/audit-auto-approve.js";

// Mock fs
vi.mock("node:fs", () => ({
	readdirSync: vi.fn(),
	readFileSync: vi.fn(),
}));

vi.mock("node:path", () => ({
	join: vi.fn((...args: string[]) => args.join("/")),
}));

vi.mock("node:process", () => ({
	cwd: vi.fn(() => "/test"),
	exit: vi.fn(),
}));

vi.mock("os", () => ({
	homedir: vi.fn(() => "/mock-home"),
}));

const mockReaddirSync = vi.mocked(readdirSync);
const mockReadFileSync = vi.mocked(readFileSync);

describe("auditAutoApprove", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Mock readFileSync to throw for user settings file
		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			return "{}"; // Return empty JSON for other files by default
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should pass when no risky patterns found", async () => {
		// Mock file structure - return proper Dirent-like objects
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
					{ name: "other", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockReturnValue(
			JSON.stringify({
				"chat.tools.terminal.autoApprove": {
					":tachyon-build": true,
					":clean": true,
				},
			}),
		);

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "tachyon",
			failOnRisk: false,
			json: false,
			silent: true,
		});
	});

	it("should detect risky patterns", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":tachyon-build": true,
						":unknown-task": true,
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "tachyon",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith("⚠️  Found issues in 1 file(s):");
		expect(consoleSpy).toHaveBeenCalledWith("- /test/.vscode/settings.json");
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :unknown-task\x1b[0m",
		);
		consoleSpy.mockRestore();
	});

	it("should exit with code 1 when failOnRisk is true and risks found", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockReturnValue(
			JSON.stringify({
				"chat.tools.terminal.autoApprove": {
					":risky-task": true,
				},
			}),
		);
		vi.mocked(exit).mockImplementation(() => {
			throw new Error("process.exit called");
		});

		await expect(
			auditAutoApprove({
				allowPrefix: "safe",
				failOnRisk: true,
				json: false,
				silent: true,
			}),
		).rejects.toThrow("process.exit called");

		expect(exit).toHaveBeenCalledWith(1);
	});

	it("should output JSON when json option is true", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockReturnValue(
			JSON.stringify({
				"chat.tools.terminal.autoApprove": {
					":safe:task": true,
				},
			}),
		);

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe",
			failOnRisk: false,
			json: true,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith(
			JSON.stringify(
				{
					findings: [],
					prefixes: ["safe"],
					prefixHealth: {
						safe: {
							prefix: "safe",
							totalPatterns: 2,
							riskyPatterns: 0,
							safePatterns: 2,
							patterns: [":safe:task", ":safe:task"],
							riskyList: [],
						},
					},
				},
				null,
				2,
			),
		);
		consoleSpy.mockRestore();
	});

	it("should output JSON when json option is true and there are findings", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":safe:task": true,
						":risky:rm -rf /": true,
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe",
			failOnRisk: false,
			json: true,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith(
			JSON.stringify(
				{
					findings: [
						{
							file: "/test/.vscode/settings.json",
							riskyPatterns: [":risky:rm -rf /"],
						},
					],
					prefixes: ["safe"],
					prefixHealth: {
						safe: {
							prefix: "safe",
							totalPatterns: 1,
							riskyPatterns: 0,
							safePatterns: 1,
							patterns: [":safe:task"],
							riskyList: [],
						},
						risky: {
							prefix: "risky",
							totalPatterns: 1,
							riskyPatterns: 1,
							safePatterns: 0,
							patterns: [":risky:rm -rf /"],
							riskyList: [":risky:rm -rf /"],
						},
					},
				},
				null,
				2,
			),
		);
		consoleSpy.mockRestore();
	});

	it("should include prefix health in JSON output", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":safe:task": true,
						":risky:rm -rf /": true,
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: undefined,
			failOnRisk: false,
			json: true,
			silent: false,
			scanPrefixes: true,
		});

		expect(consoleSpy).toHaveBeenCalledWith(
			JSON.stringify(
				{
					findings: [
						{
							file: "/test/.vscode/settings.json",
							riskyPatterns: [":risky:rm -rf /"],
						},
					],
					prefixes: [],
					prefixHealth: {
						safe: {
							prefix: "safe",
							totalPatterns: 1,
							riskyPatterns: 0,
							safePatterns: 1,
							patterns: [":safe:task"],
							riskyList: [],
						},
						risky: {
							prefix: "risky",
							totalPatterns: 1,
							riskyPatterns: 1,
							safePatterns: 0,
							patterns: [":risky:rm -rf /"],
							riskyList: [":risky:rm -rf /"],
						},
					},
				},
				null,
				2,
			),
		);
		consoleSpy.mockRestore();
	});

	it("should handle prefix with all risky patterns", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":bad:rm -rf /": true,
						":bad:rm -rf *": true,
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: undefined,
			failOnRisk: false,
			json: false,
			silent: false,
			scanPrefixes: true,
		});

		expect(consoleSpy).toHaveBeenCalledWith("\n📊 Prefix Health Report:");
		expect(consoleSpy).toHaveBeenCalledWith("========================");
		expect(consoleSpy).toHaveBeenCalledWith("❌ bad: 0/2 safe (100% risky)");
		expect(consoleSpy).toHaveBeenCalledWith(
			"    Risky patterns: :bad:rm -rf /, :bad:rm -rf *",
		);
		expect(consoleSpy).toHaveBeenCalledWith("⚠️  Found issues in 1 file(s):");
		expect(consoleSpy).toHaveBeenCalledWith("- /test/.vscode/settings.json");
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :bad:rm -rf /\x1b[0m",
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :bad:rm -rf *\x1b[0m",
		);
		consoleSpy.mockRestore();
	});

	it("should handle prefix with many risky patterns", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":many:rm -rf /": true,
						":many:rm -rf *": true,
						":many:rm -rf .": true,
						":many:rm -rf ~": true,
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: undefined,
			failOnRisk: false,
			json: false,
			silent: false,
			scanPrefixes: true,
		});

		expect(consoleSpy).toHaveBeenCalledWith("\n📊 Prefix Health Report:");
		expect(consoleSpy).toHaveBeenCalledWith("========================");
		expect(consoleSpy).toHaveBeenCalledWith("❌ many: 0/4 safe (100% risky)");
		expect(consoleSpy).toHaveBeenCalledWith(
			"    Risky patterns: :many:rm -rf /, :many:rm -rf *, :many:rm -rf ....",
		);
		expect(consoleSpy).toHaveBeenCalledWith("⚠️  Found issues in 1 file(s):");
		expect(consoleSpy).toHaveBeenCalledWith("- /test/.vscode/settings.json");
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :many:rm -rf /\x1b[0m",
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :many:rm -rf *\x1b[0m",
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :many:rm -rf .\x1b[0m",
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :many:rm -rf ~\x1b[0m",
		);
		consoleSpy.mockRestore();
	});

	it("should handle multiple prefixes", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":prefix1:task": true,
						":prefix2:command": true,
						":unknown:task": true,
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "prefix1,prefix2",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith("⚠️  Found issues in 1 file(s):");
		expect(consoleSpy).toHaveBeenCalledWith("- /test/.vscode/settings.json");
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :unknown:task\x1b[0m",
		);
		consoleSpy.mockRestore();
	});

	it("should detect non-boolean values", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockReturnValue(
			JSON.stringify({
				"chat.tools.terminal.autoApprove": {
					":safe:task": true,
					":non-boolean:task": "string",
					":another-non-boolean": 123,
				},
			}),
		);

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe",
			failOnRisk: false,
			json: true,
			silent: false,
		});

		const expectedOutput = JSON.stringify(
			{
				findings: [
					{
						file: "/mock-home/Library/Application Support/Code/User/settings.json",
						riskyPatterns: [],
						nonBoolean: [":non-boolean:task", ":another-non-boolean"],
					},
					{
						file: "/test/.vscode/settings.json",
						riskyPatterns: [],
						nonBoolean: [":non-boolean:task", ":another-non-boolean"],
					},
				],
				prefixes: ["safe"],
				prefixHealth: {
					safe: {
						prefix: "safe",
						totalPatterns: 2,
						riskyPatterns: 0,
						safePatterns: 2,
						patterns: [":safe:task", ":safe:task"],
						riskyList: [],
					},
				},
			},
			null,
			2,
		);

		expect(consoleSpy).toHaveBeenCalledWith(expectedOutput);
		consoleSpy.mockRestore();
	});

	it("should work in silent mode", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockReturnValue(
			JSON.stringify({
				"chat.tools.terminal.autoApprove": {
					":safe:task": true,
				},
			}),
		);

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe",
			failOnRisk: false,
			json: false,
			silent: true,
		});

		expect(consoleSpy).not.toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it("should handle no settings files found", async () => {
		mockReaddirSync.mockReturnValue([]);

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "test",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith(
			"✅ All autoApprove entries are safe for prefixes: test",
		);
		consoleSpy.mockRestore();
	});

	it("should handle malformed JSON", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockReturnValue("invalid json");

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "test",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith(
			"✅ All autoApprove entries are safe for prefixes: test",
		);
		consoleSpy.mockRestore();
	});

	it("should handle multiple settings files", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
					{ name: "subdir", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			if (dir === "/test/subdir") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/subdir/.vscode") {
				return [
					{
						name: "settings.json",
					 isDirectory: () => false,
					 isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		let callCount = 0;
		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			callCount++;
			if (callCount === 1) {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":safe:task": true,
					},
				});
			} else {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":risky:task": true,
					},
				});
			}
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith("⚠️  Found issues in 1 file(s):");
		expect(consoleSpy).toHaveBeenCalledWith(
			"- /test/subdir/.vscode/settings.json",
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :risky:task\x1b[0m",
		);
		consoleSpy.mockRestore();
	});

	it("should handle empty allowPrefix", async () => {
		mockReaddirSync.mockReturnValue([]);

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith("\n📊 Prefix Health Report:");
		expect(consoleSpy).toHaveBeenCalledWith("========================");
		expect(consoleSpy).toHaveBeenCalledWith(
			"✅ All autoApprove entries are safe",
		);
		consoleSpy.mockRestore();
	});

	it("should handle missing autoApprove setting", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockReturnValue(
			JSON.stringify({
				"some.other.setting": {
					task: true,
				},
			}),
		);

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "test",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith(
			"✅ All autoApprove entries are safe for prefixes: test",
		);
		consoleSpy.mockRestore();
	});

	it("should always show warnings when failing even in silent mode", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":risky:task": true,
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		vi.mocked(exit).mockImplementation(() => {
			throw new Error("process.exit called");
		});

		await expect(
			auditAutoApprove({
				allowPrefix: "safe",
				failOnRisk: true,
				json: false,
				silent: true, // Even in silent mode, warnings should be shown when failing
			}),
		).rejects.toThrow("process.exit called");

		expect(consoleSpy).toHaveBeenCalledWith("⚠️  Found issues in 1 file(s):");
		expect(consoleSpy).toHaveBeenCalledWith("- /test/.vscode/settings.json");
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :risky:task\x1b[0m",
		);
		consoleSpy.mockRestore();
	});

	it("should apply correct ANSI color codes to failure messages", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":dangerous:rm -rf /": true,
						":safe:ls -la": true,
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		// Verify ANSI color codes are applied correctly
		expect(consoleSpy).toHaveBeenCalledWith("⚠️  Found issues in 1 file(s):");
		expect(consoleSpy).toHaveBeenCalledWith("- /test/.vscode/settings.json");
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :dangerous:rm -rf /\x1b[0m",
		);
		consoleSpy.mockRestore();
	});

	it("should provide comprehensive prefix health reporting", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				];
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				];
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":safe:build": true,
						":safe:test": true,
						":safe:deploy": true,
						":dangerous:rm -rf /": true,
						":dangerous:sudo rm": true,
						":dangerous:rm -rf *": true,
						":dangerous:rm -rf .": true,
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: undefined, // No explicit prefix - should scan all
			failOnRisk: false,
			json: false,
			silent: false,
			scanPrefixes: true,
		});

		expect(consoleSpy).toHaveBeenCalledWith("\n📊 Prefix Health Report:");
		expect(consoleSpy).toHaveBeenCalledWith("========================");
		expect(consoleSpy).toHaveBeenCalledWith("❌ dangerous: 0/4 safe (100% risky)");
		expect(consoleSpy).toHaveBeenCalledWith(
			"    Risky patterns: :dangerous:rm -rf /, :dangerous:sudo rm, :dangerous:rm -rf *...",
		);
		expect(consoleSpy).toHaveBeenCalledWith("✅ safe: 3/3 safe (0% risky)");
		expect(consoleSpy).toHaveBeenCalledWith("⚠️  Found issues in 1 file(s):");
		expect(consoleSpy).toHaveBeenCalledWith("- /test/.vscode/settings.json");
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :dangerous:rm -rf /\x1b[0m",
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :dangerous:sudo rm\x1b[0m",
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :dangerous:rm -rf *\x1b[0m",
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :dangerous:rm -rf .\x1b[0m",
		);
		consoleSpy.mockRestore();
	});

	it("should handle complex prefix patterns correctly", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":gradle:build": true,
						":gradle:test": true,
						":gradle:clean": true,
						":npm:install": true,
						":npm:run build": true,
						":unknown:command": true,
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "gradle,npm",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith("⚠️  Found issues in 1 file(s):");
		expect(consoleSpy).toHaveBeenCalledWith("- /test/.vscode/settings.json");
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :unknown:command\x1b[0m",
		);
		consoleSpy.mockRestore();
	});

	it("should handle large numbers of patterns efficiently", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		// Create a large number of patterns
		const patterns: Record<string, boolean> = {};
		for (let i = 0; i < 100; i++) {
			patterns[`:safe:task${i}`] = true;
		}
		patterns[":risky:rm"] = true; // One risky pattern

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": patterns,
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith("⚠️  Found issues in 1 file(s):");
		expect(consoleSpy).toHaveBeenCalledWith("- /test/.vscode/settings.json");
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :risky:rm\x1b[0m",
		);
		consoleSpy.mockRestore();
	});

	it("should handle syntax validation errors", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":safe:echo hello": true,
						":malformed[pattern": true, // Invalid regex pattern
						":another:pattern": true,
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe,malformed,another",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith("⚠️  Found issues in 1 file(s):");
		expect(consoleSpy).toHaveBeenCalledWith("- /test/.vscode/settings.json");
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :safe:echo hello\x1b[0m",
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m syntax issues: unbalanced brackets\x1b[0m",
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :malformed[pattern\x1b[0m",
		);
		consoleSpy.mockRestore();
	});

	it("should handle specific settings file path", async () => {
		mockReadFileSync.mockImplementation((path: string) => {
			if (path === "/custom/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":risky:rm": true,
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			settingsFile: "/custom/settings.json",
			allowPrefix: "safe",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith("⚠️  Found issues in 1 file(s):");
		expect(consoleSpy).toHaveBeenCalledWith("- /custom/settings.json");
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :risky:rm\x1b[0m",
		);
		consoleSpy.mockRestore();
	});

	it("should handle empty autoApprove object", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith(
			"✅ All autoApprove entries are safe for prefixes: safe",
		);
		consoleSpy.mockRestore();
	});

	it("should handle null autoApprove setting", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": null,
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith(
			"✅ All autoApprove entries are safe for prefixes: safe",
		);
		consoleSpy.mockRestore();
	});

	it("should handle invalid autoApprove setting type", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": "invalid string",
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith(
			"✅ All autoApprove entries are safe for prefixes: safe",
		);
		consoleSpy.mockRestore();
	});

	it("should handle deeply nested directory structures", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: "deep", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/deep") {
				return [
					{ name: "nested", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/deep/nested") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/deep/nested/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/deep/nested/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":risky:rm": true,
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith("⚠️  Found issues in 1 file(s):");
		expect(consoleSpy).toHaveBeenCalledWith(
			"- /test/deep/nested/.vscode/settings.json",
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :risky:rm\x1b[0m",
		);
		consoleSpy.mockRestore();
	});

	it("should handle mixed valid and invalid patterns", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":safe:build": true,
						":safe:test": true,
						":dangerous:rm": true,
						":invalid[pattern": true,
						":another:valid": true,
						":mixed:value": "string", // Non-boolean
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe,another",
			failOnRisk: false,
			json: true,
			silent: false,
		});

		const expectedOutput = JSON.stringify(
			{
				findings: [
					{
						file: "/test/.vscode/settings.json",
						riskyPatterns: [
							":dangerous:rm",
							"syntax issues: unbalanced brackets",
							":invalid[pattern",
						],
						nonBoolean: [":mixed:value"],
					},
				],
				prefixes: ["safe", "another"],
				prefixHealth: {
					safe: {
						prefix: "safe",
						totalPatterns: 2,
						riskyPatterns: 0,
						safePatterns: 2,
						patterns: [":safe:build", ":safe:test"],
						riskyList: [],
					},
					dangerous: {
						prefix: "dangerous",
						totalPatterns: 1,
						riskyPatterns: 1,
						safePatterns: 0,
						patterns: [":dangerous:rm"],
						riskyList: [":dangerous:rm"],
					},
					unknown: {
						prefix: "unknown",
						totalPatterns: 1,
						riskyPatterns: 1,
						safePatterns: 0,
						patterns: [":invalid[pattern"],
						riskyList: [":invalid[pattern"],
					},
					another: {
						prefix: "another",
						totalPatterns: 1,
						riskyPatterns: 0,
						safePatterns: 1,
						patterns: [":another:valid"],
						riskyList: [],
					},
				},
			},
			null,
			2,
		);

		expect(consoleSpy).toHaveBeenCalledWith(expectedOutput);
		consoleSpy.mockRestore();
	});

	it("should detect directory traversal in patterns", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":safe:echo /../etc/passwd": true,
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith("⚠️  Found issues in 1 file(s):");
		expect(consoleSpy).toHaveBeenCalledWith("- /test/.vscode/settings.json");
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m syntax issues: directory traversal (..)\x1b[0m",
		);
		consoleSpy.mockRestore();
	});

	it("should detect null bytes in patterns", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":safe:echo \0": true,
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith("⚠️  Found issues in 1 file(s):");
		expect(consoleSpy).toHaveBeenCalledWith("- /test/.vscode/settings.json");
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m syntax issues: null bytes detected\x1b[0m",
		);
		consoleSpy.mockRestore();
	});

	it("should detect extremely long patterns", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		const longPattern = ":safe:" + "a".repeat(1001);
		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						[longPattern]: true,
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith("⚠️  Found issues in 1 file(s):");
		expect(consoleSpy).toHaveBeenCalledWith("- /test/.vscode/settings.json");
		expect(consoleSpy).toHaveBeenCalledWith(
			`    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m syntax issues: pattern too long\x1b[0m`,
		);
		consoleSpy.mockRestore();
	});

	it("should output JSON when json option is true and there are findings", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":safe:task": true,
						":risky:rm": true,
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe",
			failOnRisk: false,
			json: true,
			silent: false,
		});

		const expectedOutput = JSON.stringify(
			{
				findings: [
					{
						file: "/test/.vscode/settings.json",
						riskyPatterns: [":risky:rm"],
					},
				],
				prefixes: ["safe"],
				prefixHealth: {
					safe: {
						prefix: "safe",
						totalPatterns: 1,
						riskyPatterns: 0,
						safePatterns: 1,
						patterns: [":safe:task"],
						riskyList: [],
					},
					risky: {
						prefix: "risky",
						totalPatterns: 1,
						riskyPatterns: 1,
						safePatterns: 0,
						patterns: [":risky:rm"],
						riskyList: [":risky:rm"],
					},
				},
			},
			null,
			2,
		);

		expect(consoleSpy).toHaveBeenCalledWith(expectedOutput);
		consoleSpy.mockRestore();
	});

	it("should not show warnings in silent mode when not failing", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":risky:task": true,
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe",
			failOnRisk: false, // Not failing
			json: false,
			silent: true, // Silent mode
		});

		// Should not show warnings since silent and not failing
		expect(consoleSpy).not.toHaveBeenCalledWith("⚠️  Found issues in 1 file(s):");
		expect(consoleSpy).not.toHaveBeenCalledWith("- /test/.vscode/settings.json");
		expect(consoleSpy).not.toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m :risky:task\x1b[0m",
		);
		consoleSpy.mockRestore();
	});

	it("should detect unterminated quotes in patterns", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":safe:echo 'unterminated": true,
						":safe:echo \"double": true,
						":safe:echo `backtick": true,
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith("⚠️  Found issues in 1 file(s):");
		expect(consoleSpy).toHaveBeenCalledWith("- /test/.vscode/settings.json");
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m syntax issues: unterminated single quotes\x1b[0m",
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m syntax issues: unterminated double quotes\x1b[0m",
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m syntax issues: unterminated backticks\x1b[0m",
		);
		consoleSpy.mockRestore();
	});

	it("should detect unbalanced brackets and parentheses in patterns", async () => {
		mockReaddirSync.mockImplementation((dir: string, options?: any) => {
			if (dir === "/test") {
				return [
					{ name: ".vscode", isDirectory: () => true, isFile: () => false },
				] as any;
			}
			if (dir === "/test/.vscode") {
				return [
					{
						name: "settings.json",
						isDirectory: () => false,
						isFile: () => true,
					},
				] as any;
			}
			return [];
		});

		mockReadFileSync.mockImplementation((path: string) => {
			if (
				path.includes("Library/Application Support/Code/User/settings.json")
			) {
				throw new Error("File not found");
			}
			if (path === "/test/.vscode/settings.json") {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":safe:echo (unbalanced": true,
						":safe:echo [unbalanced": true,
						":safe:echo {unbalanced": true,
					},
				});
			}
			return "{}";
		});

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith("⚠️  Found issues in 1 file(s):");
		expect(consoleSpy).toHaveBeenCalledWith("- /test/.vscode/settings.json");
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m syntax issues: unbalanced parentheses\x1b[0m",
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m syntax issues: unbalanced brackets\x1b[0m",
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			"    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m syntax issues: unbalanced braces\x1b[0m",
		);
		consoleSpy.mockRestore();
	});
});
