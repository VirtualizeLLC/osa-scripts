import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import {
	readNamesFromInputs,
	readTldsFromInputs,
	readYamlConfig,
	inferAvailability,
	summarizeParsed,
} from "../commands/domain-availability-checker/domain-availability-checker";

// Mock only readFileSync
const mockReadFileSync = vi.fn();
vi.spyOn(fs, "readFileSync").mockImplementation(mockReadFileSync);

describe("Domain Availability Checker", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("readYamlConfig", () => {
		it("should parse valid YAML config", () => {
			const yamlContent = `
names:
  - test1
  - test2
tlds:
  - com
  - dev
`;
			mockReadFileSync.mockReturnValue(yamlContent);

			const result = readYamlConfig("test.yaml");

			expect(result).toEqual({
				names: ["test1", "test2"],
				tlds: ["com", "dev"],
			});
		});

		it("should return null for invalid YAML", () => {
			mockReadFileSync.mockImplementation(() => {
				throw new Error("Invalid YAML");
			});

			const result = readYamlConfig("test.yaml");

			expect(result).toBeNull();
		});

		it("should return null for empty file", () => {
			mockReadFileSync.mockReturnValue("");

			const result = readYamlConfig("test.yaml");

			expect(result).toBeNull();
		});
	});

	describe("readNamesFromInputs", () => {
		it("should read names from array", () => {
			const result = readNamesFromInputs(["test1", "test2"]);

			expect(result).toEqual(["test1", "test2"]);
		});

		it("should read names from YAML file", () => {
			const yamlContent = "names:\n  - yamlname1\n  - yamlname2";
			mockReadFileSync.mockReturnValue(yamlContent);

			const result = readNamesFromInputs(undefined, "test.yaml");

			expect(result).toEqual(["yamlname1", "yamlname2"]);
		});

		it("should read names from plain text file when YAML fails", () => {
			mockReadFileSync.mockReturnValue("name1\nname2\n\nname3");

			const result = readNamesFromInputs(undefined, "test.txt");

			expect(result).toEqual(["name1", "name2", "name3"]);
		});

		it("should combine array and file names", () => {
			const yamlContent = "names:\n  - file1\n  - file2";
			mockReadFileSync.mockReturnValue(yamlContent);

			const result = readNamesFromInputs(["arg1", "arg2"], "test.yaml");

			expect(result).toEqual(["arg1", "arg2", "file1", "file2"]);
		});

		it("should deduplicate names", () => {
			const result = readNamesFromInputs(["test", "test", "other"]);

			expect(result).toEqual(["test", "other"]);
		});

		it("should trim and lowercase names", () => {
			const result = readNamesFromInputs(["  TEST  ", " Other "]);

			expect(result).toEqual(["test", "other"]);
		});
	});

	describe("readTldsFromInputs", () => {
		it("should read TLDs from array", () => {
			const result = readTldsFromInputs(["com", "dev"]);

			expect(result).toEqual(["com", "dev"]);
		});

		it("should read TLDs from YAML file", () => {
			const yamlContent = "tlds:\n  - com\n  - dev";
			mockReadFileSync.mockReturnValue(yamlContent);

			const result = readTldsFromInputs(["net"], "test.yaml");

			expect(result).toEqual(["net", "com", "dev"]);
		});

		it("should remove dots and lowercase TLDs", () => {
			const result = readTldsFromInputs([".COM", "DEV"]);

			expect(result).toEqual(["com", "dev"]);
		});

		it("should deduplicate TLDs", () => {
			const result = readTldsFromInputs(["com", "com", "dev"]);

			expect(result).toEqual(["com", "dev"]);
		});
	});

	describe("inferAvailability", () => {
		it("should return likely-available for empty/null results", () => {
			expect(inferAvailability(null)).toBe("likely-available");
			expect(inferAvailability({})).toBe("likely-available");
		});

		it("should return registered for domains with domain name", () => {
			const result = inferAvailability({
				"Domain Name": "example.com",
				registrar: "Test Registrar",
			});

			expect(result).toBe("registered");
		});

		it("should return likely-available for 'not found' phrases", () => {
			expect(inferAvailability({}, "No match for domain")).toBe("likely-available");
			expect(inferAvailability({}, "Domain not found")).toBe("likely-available");
			expect(inferAvailability({}, "Available")).toBe("likely-available");
		});

		it("should return registered for registrar indicators", () => {
			const result = inferAvailability({
				registrar: "Test Registrar",
				"Creation Date": "2020-01-01",
			});

			expect(result).toBe("registered");
		});

		it("should return unknown for unrecognized results", () => {
			const result = inferAvailability({
				someField: "someValue",
			});

			expect(result).toBe("unknown");
		});
	});

	describe("summarizeParsed", () => {
		it("should return empty string for null/undefined", () => {
			expect(summarizeParsed(null)).toBe("");
			expect(summarizeParsed(undefined)).toBe("");
		});

		it("should summarize WHOIS data", () => {
			const parsed = {
				domainName: "example.com",
				registrar: "Test Registrar",
				creationDate: "2020-01-01T00:00:00.000Z",
				status: "active",
			};

			const result = summarizeParsed(parsed);

			expect(result).toContain("domainName:example.com");
			expect(result).toContain("registrar:Test Registrar");
			expect(result).toContain("creationDate:2020-01-01T00:00:00.000Z");
			expect(result).toContain("status:active");
		});

		it("should handle multiple domain name fields", () => {
			const parsed = {
				"Domain Name": "EXAMPLE.COM",
				domainName: "example.com",
			};

			const result = summarizeParsed(parsed);

			expect(result).toContain("domainName:example.com");
			expect(result).toContain("Domain Name:EXAMPLE.COM");
		});

		it("should truncate long values", () => {
			const longValue = "a".repeat(100);
			const parsed = {
				domainName: longValue,
			};

			const result = summarizeParsed(parsed);

			expect(result.length).toBeLessThan(100);
			expect(result).toContain("...");
		});
	});
});