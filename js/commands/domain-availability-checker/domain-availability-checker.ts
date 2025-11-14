#!/usr/bin/env -S tsx
/**
 * Domain availability checker using WHOIS/RDAP (whois-json).
 * - Exported Commander Command for composition into a parent CLI (osa).
 * - Also runnable directly (detects direct-run vs import).
 */

import * as fs from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Command } from "commander";
import { stringify as csvStringify } from "csv-stringify/sync";
import yaml from "js-yaml";
import pLimit from "p-limit";
import whois from "whois-json";

// ---------- Types ----------
export interface CheckResult {
	domain: string;
	name: string;
	tld: string;
	status: "registered" | "likely-available" | "unknown" | "error";
	elapsedMs: number;
	parsedSummary: string;
	rawSnippet: string;
}

export interface RunChecksOptions {
	names?: string[]; // candidate names without TLD
	filePath?: string; // optional file with one name per line, or YAML with names/tlds
	tlds: string[]; // TLDs without leading dot
	concurrency?: number; // default 8
	timeoutMs?: number; // default 20000
	provider?: string; // WHOIS provider/server to use
}

export interface WriteCsvOptions {
	outFile: string;
	results: CheckResult[];
	writeHeader?: boolean; // default true
}

// ---------- Utils ----------
interface YamlConfig {
	names?: string[];
	tlds?: string[];
}

export function readYamlConfig(filePath: string): YamlConfig | null {
	try {
		// Prefer reading the path as-provided first. This ensures tests that spy on
		// fs.readFileSync(filePath) will be exercised. If that fails, try a
		// workspace-root-relative fallback for CLI invocations where paths are
		// relative to the repo root.
		let text: string;
		try {
			text = fs.readFileSync(filePath, "utf8");
		} catch (err) {
			// Only attempt workspace-root fallback for explicitly relative paths
			if (filePath.startsWith("./") || filePath.startsWith("../")) {
				const currentDir = dirname(fileURLToPath(import.meta.url));
				const workspaceRoot = resolve(currentDir, "..", "..", "..");
				const resolvedPath = resolve(workspaceRoot, filePath);
				text = fs.readFileSync(resolvedPath, "utf8");
			} else {
				throw err;
			}
		}
		const config = yaml.load(text) as YamlConfig;
		return config || null;
	} catch {
		return null;
	}
}

export function readNamesFromInputs(
	namesList?: string[],
	filePath?: string,
): string[] {
	const names = new Set<string>();

	if (Array.isArray(namesList)) {
		for (const n of namesList) {
			const v = n.trim().toLowerCase();
			if (v) names.add(v);
		}
	}

	if (filePath) {
		// Try YAML first
		const yamlConfig = readYamlConfig(filePath);
		if (yamlConfig?.names) {
			for (const n of yamlConfig.names) {
				const v = String(n).trim().toLowerCase();
				if (v) names.add(v);
			}
		} else {
			// Fall back to plain text (one name per line). Prefer reading the
			// provided path first (so tests can mock readFileSync), and only if
			// that fails attempt the workspace-root-relative fallback.
			let text: string;
			try {
				text = fs.readFileSync(filePath, "utf8");
			} catch (err) {
				if (filePath.startsWith("./") || filePath.startsWith("../")) {
					const currentDir = dirname(fileURLToPath(import.meta.url));
					const workspaceRoot = resolve(currentDir, "..", "..", "..");
					const resolvedPath = resolve(workspaceRoot, filePath);
					text = fs.readFileSync(resolvedPath, "utf8");
				} else {
					throw err;
				}
			}
			for (const line of text.split(/\r?\n/)) {
				const t = line.trim().toLowerCase();
				if (t) names.add(t);
			}
		}
	}

	return Array.from(names);
}

export function readTldsFromInputs(
	tldsList: string[],
	filePath?: string,
): string[] {
	const tlds = new Set<string>();

	// Add provided tlds
	for (const t of tldsList) {
		const v = t.replace(/^\./, "").trim().toLowerCase();
		if (v) tlds.add(v);
	}

	// Add tlds from YAML file if present
	if (filePath) {
		const yamlConfig = readYamlConfig(filePath);
		if (yamlConfig?.tlds) {
			for (const t of yamlConfig.tlds) {
				const v = String(t).replace(/^\./, "").trim().toLowerCase();
				if (v) tlds.add(v);
			}
		}
	}

	return Array.from(tlds);
}

export function inferAvailability(
	whoisResult: any,
	rawText?: string,
): CheckResult["status"] {
	if (!whoisResult || Object.keys(whoisResult).length === 0)
		return "likely-available";
	const keys = Object.keys(whoisResult).map((k) => k.toLowerCase());

	if (
		keys.some(
			(k) =>
				k.includes("domain name") || k.includes("domainname") || k === "domain",
		)
	) {
		if (
			whoisResult.domainName ||
			whoisResult["Domain Name"] ||
			whoisResult["domain name"]
		) {
			return "registered";
		}
	}

	if (rawText) {
		const lower = rawText.toLowerCase();
		const notFoundPhrases = [
			"no match",
			"not found",
			"no entries found",
			"status: free",
			"no data found",
			"available",
			"domain not found",
			"no such domain",
			"not registered",
			"no object found",
		];
		for (const p of notFoundPhrases) {
			if (lower.includes(p)) return "likely-available";
		}
	}

	const registrarIndicators = [
		"registrar",
		"name server",
		"creation date",
		"updated date",
		"registry domain id",
		"sponsoring registrar",
	];
	if (registrarIndicators.some((i) => keys.some((k) => k.includes(i))))
		return "registered";

	return "unknown";
}

async function lookupWhois(
	domain: string,
	timeoutMs = 20_000,
	provider?: string,
): Promise<{ parsed: any; raw: string }> {
	const options: any = {};
	if (provider) {
		options.server = provider;
	}

	const p = (whois as any)(domain, options)
		.then((res: any) => ({ parsed: res, raw: "" }))
		.catch((err: any) => ({ parsed: null, raw: String(err) }));
	const timeout = new Promise<{ parsed: any; raw: string }>((res) =>
		setTimeout(() => res({ parsed: null, raw: "__TIMEOUT__" }), timeoutMs),
	);
	return Promise.race([p, timeout]) as Promise<{ parsed: any; raw: string }>;
}

function truncate(s: string, n: number): string {
	if (!s) return "";
	return s.length > n ? `${s.slice(0, n - 3)}...` : s;
}

export function summarizeParsed(parsed: any): string {
	if (!parsed) return "";
	const pick = [
		"domainName",
		"Domain Name",
		"Registrar",
		"registrar",
		"Creation Date",
		"creationDate",
		"Updated Date",
		"updatedDate",
		"status",
	];
	const out: string[] = [];
	for (const k of pick) {
		if (parsed[k]) out.push(`${k}:${truncate(String(parsed[k]), 80)}`);
	}
	if (parsed.domainName && !out.some((x) => x.startsWith("domainName:"))) {
		out.push(`domainName:${truncate(String(parsed.domainName), 80)}`);
	}
	return out.join(" | ");
}

// ---------- Core engine ----------
export async function runChecks(
	opts: RunChecksOptions,
): Promise<CheckResult[]> {
	const names = readNamesFromInputs(opts.names, opts.filePath);
	if (names.length === 0) {
		throw new Error("No candidate names provided. Use names[] or filePath.");
	}
	const tlds = readTldsFromInputs(opts.tlds, opts.filePath);
	if (tlds.length === 0) throw new Error("No TLDs supplied.");

	const concurrency = Math.max(1, Math.min(200, Number(opts.concurrency ?? 8)));
	const timeoutMs = Number(opts.timeoutMs ?? 20_000);
	const limit = pLimit(concurrency);

	const jobs: Array<Promise<CheckResult>> = [];
	for (const name of names) {
		for (const tld of tlds) {
			const fqdn = `${name}.${tld}`;
			jobs.push(
				limit(async () => {
					const started = Date.now();
					let status: CheckResult["status"] = "error";
					let parsed: any = null;
					let raw = "";
					try {
						const { parsed: p, raw: r } = await lookupWhois(
							fqdn,
							timeoutMs,
							opts.provider,
						);
						parsed = p;
						raw = r ?? "";
						// If parsed object is empty and we didn't receive any raw text, be conservative
						if (parsed && Object.keys(parsed).length === 0 && !raw) {
							status = "unknown";
						} else {
							status = inferAvailability(parsed, raw);
						}
					} catch (e: any) {
						raw = String(e);
						status = "error";
					}
					const elapsedMs = Date.now() - started;
					return {
						domain: fqdn,
						name,
						tld,
						status,
						elapsedMs,
						parsedSummary: parsed ? summarizeParsed(parsed) : "",
						rawSnippet: raw ? truncate(raw, 1200) : "",
					};
				}),
			);
		}
	}

	return Promise.all(jobs);
}

export function writeResultsCsv({
	outFile,
	results,
	writeHeader = true,
}: WriteCsvOptions): void {
	const columns = [
		"domain",
		"status",
		"elapsedMs",
		"parsedSummary",
		"rawSnippet",
	];
	const records = results.map((r) => [
		r.domain,
		r.status,
		r.elapsedMs,
		r.parsedSummary,
		r.rawSnippet,
	]);
	const csv = csvStringify(records, { header: writeHeader, columns });
	fs.writeFileSync(outFile, csv, "utf8");
}

// ---------- Exported Commander Command (for parent CLI composition) ----------
export function makeCheckDomainsCommand(): Command {
	const cmd = new Command("check-domains")
		.description(
			"Check domain availability via WHOIS/RDAP (heuristic). Use registrar APIs for purchase-grade checks.",
		)
		.option(
			"-n, --names <names>",
			"Comma-separated names (no TLD). Example: virtualize,vize",
			"",
		)
		.option(
			"-f, --file <file>",
			"Path to file with one candidate name per line",
		)
		.option(
			"-t, --tlds <tlds>",
			"Comma-separated TLDs (no dot). Default: com,dev,io",
			"com,dev,io",
		)
		.option(
			"-p, --provider <server>",
			"WHOIS server to use (e.g., whois.verisign-grs.com)",
		)
		.option("--format <format>", "Output format: csv, json, or yaml", "csv")
		.option("--timeout-ms <n>", "Lookup timeout (ms, default 20000)", "20000")
		.option(
			"-o, --out <file>",
			"Output file name (extension added automatically)",
			"domain-check-results",
		)
		.option("--no-header", "Do not write CSV header (for appending)")
		.option(
			"--max-rows-print <n>",
			"How many available-ish domains to log",
			"50",
		)
		.action(
			async (opts: {
				names?: string;
				file?: string;
				tlds: string;
				concurrency?: string | number;
				timeoutMs?: string | number;
				out: string;
				header: boolean; // from --no-header
				maxRowsPrint?: string | number;
				provider?: string;
				format?: string;
			}) => {
				const namesArg = opts.names
					? String(opts.names)
							.split(",")
							.map((s) => s.trim())
							.filter(Boolean)
					: undefined;

				const tldsArg = String(opts.tlds)
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean);

				const results = await runChecks({
					names: namesArg,
					filePath: opts.file,
					tlds: tldsArg,
					concurrency: Number(opts.concurrency ?? 8),
					timeoutMs: Number(opts.timeoutMs ?? 20_000),
					provider: opts.provider,
				});

				const format = (opts.format || "csv").toLowerCase();
				const outFile =
					opts.out +
					(format === "csv" ? ".csv" : format === "json" ? ".json" : ".yaml");

				if (format === "json") {
					const output = {
						summary: results.reduce<Record<string, number>>((acc, r) => {
							acc[r.status] = (acc[r.status] ?? 0) + 1;
							return acc;
						}, {}),
						results,
						generatedAt: new Date().toISOString(),
						total: results.length,
					};
					fs.writeFileSync(outFile, JSON.stringify(output, null, 2), "utf8");
					console.log(`Wrote ${results.length} results to ${outFile}`);
				} else if (format === "yaml") {
					const output = {
						summary: results.reduce<Record<string, number>>((acc, r) => {
							acc[r.status] = (acc[r.status] ?? 0) + 1;
							return acc;
						}, {}),
						results,
						generatedAt: new Date().toISOString(),
						total: results.length,
					};
					fs.writeFileSync(outFile, yaml.dump(output), "utf8");
					console.log(`Wrote ${results.length} results to ${outFile}`);
				} else {
					writeResultsCsv({
						outFile,
						results,
						writeHeader: opts.header,
					});
					console.log(`Wrote ${results.length} rows to ${outFile}`);
				}

				const summary = results.reduce<Record<string, number>>((acc, r) => {
					acc[r.status] = (acc[r.status] ?? 0) + 1;
					return acc;
				}, {});
				console.log("Summary:", summary);

				const max = Math.max(1, Number(opts.maxRowsPrint ?? 50));
				console.log(`Top ${max} likely-available/unknown:`);
				results
					.filter(
						(r) => r.status === "likely-available" || r.status === "unknown",
					)
					.slice(0, max)
					.forEach((r) => console.log(` - ${r.domain} => ${r.status}`));
			},
		);

	return cmd;
}

// Named + default export (handy for consumers)
const exported = {
	makeCheckDomainsCommand,
	runChecks,
	writeResultsCsv,
	inferAvailability,
	summarizeParsed,
};
export default exported;

// ---------- Direct-run detection (standalone mode) ----------
const isDirectRun =
	typeof process !== "undefined" &&
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).toString();

if (isDirectRun) {
	// Build a local program and attach our command.
	const program = new Command().name("check-domains");
	program.addCommand(makeCheckDomainsCommand());
	program.parseAsync(process.argv).catch((err) => {
		console.error("Fatal error:", err);
		process.exit(1);
	});
}
