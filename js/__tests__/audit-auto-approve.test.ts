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

const mockReaddirSync = vi.mocked(readdirSync);
const mockReadFileSync = vi.mocked(readFileSync);

describe("auditAutoApprove", () => {
	beforeEach(() => {
		vi.clearAllMocks();
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

		mockReadFileSync.mockReturnValue(
			JSON.stringify({
				"chat.tools.terminal.autoApprove": {
					":tachyon-build": true,
					":unknown-task": true,
				},
			}),
		);

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "tachyon",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith('⚠️  Found issues in 1 file(s):');
		expect(consoleSpy).toHaveBeenCalledWith('- /test/.vscode/settings.json');
		expect(consoleSpy).toHaveBeenCalledWith('    ✖ risky (enabled & not allowed): :unknown-task');
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
		);		vi.mocked(exit).mockImplementation(() => {
			throw new Error("process.exit called");
		});

		await expect(
			auditAutoApprove({
				allowPrefix: "safe",
				failOnRisk: true,
				json: false,
				silent: true,
			})
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
					":safe-task": true,
				},
			}),
		);

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe",
			failOnRisk: false,
			json: true,
		});

		expect(consoleSpy).toHaveBeenCalledWith(
			JSON.stringify({ findings: [], prefixes: ["safe"] }, null, 2),
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

		mockReadFileSync.mockReturnValue(
			JSON.stringify({
				"chat.tools.terminal.autoApprove": {
					":prefix1-task": true,
					":prefix2-command": true,
					":unknown-task": true,
				},
			}),
		);

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "prefix1,prefix2",
			failOnRisk: false,
			json: false,
			silent: false,
		});

		expect(consoleSpy).toHaveBeenCalledWith('⚠️  Found issues in 1 file(s):');
		expect(consoleSpy).toHaveBeenCalledWith('- /test/.vscode/settings.json');
		expect(consoleSpy).toHaveBeenCalledWith('    ✖ risky (enabled & not allowed): :unknown-task');
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
					":safe-task": true,
					":non-boolean-task": "string",
					":another-non-boolean": 123,
				},
			}),
		);

		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await auditAutoApprove({
			allowPrefix: "safe",
			failOnRisk: false,
			json: true,
		});

		const expectedOutput = JSON.stringify({
			findings: [{
				file: "/test/.vscode/settings.json",
				riskyPatterns: [],
				nonBoolean: [":non-boolean-task", ":another-non-boolean"]
			}],
			prefixes: ["safe"]
		}, null, 2);

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
					":safe-task": true,
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

		expect(consoleSpy).toHaveBeenCalledWith('✅ All autoApprove entries are safe for prefixes: test');
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

		expect(consoleSpy).toHaveBeenCalledWith('✅ All autoApprove entries are safe for prefixes: test');
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
		mockReadFileSync.mockImplementation(() => {
			callCount++;
			if (callCount === 1) {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":safe-task": true,
					},
				});
			} else {
				return JSON.stringify({
					"chat.tools.terminal.autoApprove": {
						":risky-task": true,
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

		expect(consoleSpy).toHaveBeenCalledWith('⚠️  Found issues in 1 file(s):');
		expect(consoleSpy).toHaveBeenCalledWith('- /test/subdir/.vscode/settings.json');
		expect(consoleSpy).toHaveBeenCalledWith('    ✖ risky (enabled & not allowed): :risky-task');
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

		expect(consoleSpy).toHaveBeenCalledWith('✅ All autoApprove entries are safe for prefixes: ');
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
					"task": true,
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

		expect(consoleSpy).toHaveBeenCalledWith('✅ All autoApprove entries are safe for prefixes: test');
		consoleSpy.mockRestore();
	});
});
