import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd, exit } from "node:process";

interface VSCodeSettings {
  [key: string]: unknown;
  "chat.tools.terminal.autoApprove"?: Record<string, boolean | unknown>;
}

interface Finding {
  file: string;
  riskyPatterns: string[];
  nonBoolean?: string[]; // keys with non-boolean values
}

function buildSafeTemplate(prefixes: string[]): RegExp {
  const alt = prefixes
    .map((p) => p.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"))
    .join("|");
  // Allowed examples:
  //   :tachyon-archiver:downloadZstd
  //   :tachyon-something           (module only)
  //   :tachyon-something:task      (module + task)
  //   :clean                       (global clean)
  const pattern = `^:(${alt})-[A-Za-z0-9_-]+(:[A-Za-z0-9_-]+)?$|^:clean$`;
  return new RegExp(pattern);
}

function readSettingsFiles(baseDir = cwd()): string[] {
  const results: string[] = [];
  const recurse = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) recurse(full);
      else if (e.isFile() && e.name === "settings.json" && full.includes(".vscode")) {
        results.push(full);
      }
    }
  };
  recurse(baseDir);
  return results;
}

function loadSettings(file: string): VSCodeSettings | null {
  try {
    // NOTE: VSCode settings are JSONC; if you hit parse errors, consider using `strip-json-comments` or `jsonc-parser`.
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export async function auditAutoApprove(opts: {
	allowPrefix: string;
	failOnRisk: boolean;
	json: boolean;
	silent?: boolean;
}) {
  const prefixes = opts.allowPrefix
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const safe = buildSafeTemplate(prefixes);
  const findings: Finding[] = [];

  for (const file of readSettingsFiles()) {
    const data = loadSettings(file);
    if (!data) continue;

    const map = data["chat.tools.terminal.autoApprove"];
    if (map == null || typeof map !== "object" || Array.isArray(map)) continue;

    const risky: string[] = [];
    const nonBoolean: string[] = [];

    for (const [pattern, val] of Object.entries(map as Record<string, unknown>)) {
      if (typeof val !== "boolean") {
        nonBoolean.push(pattern);
        continue;
      }
      if (val === true && !safe.test(pattern)) {
        risky.push(pattern);
      }
    }

    if (risky.length || nonBoolean.length) {
      const f: Finding = { file, riskyPatterns: risky };
      if (nonBoolean.length) f.nonBoolean = nonBoolean;
      findings.push(f);
    }
  }

	if (opts.json) {
		console.log(JSON.stringify({ findings, prefixes }, null, 2));
	} else if (!findings.length) {
		if (!opts.silent) console.log(
			`✅ All autoApprove entries are safe for prefixes: ${prefixes.join(", ")}`,
		);
	} else {
		if (!opts.silent) {
			console.log(`⚠️  Found issues in ${findings.length} file(s):`);
			for (const f of findings) {
				console.log(`- ${f.file}`);
				for (const p of f.riskyPatterns) console.log(`    ✖ risky (enabled & not allowed): ${p}`);
			}
			console.log(`\nExpected safe pattern:\n${safe}`);
		}
	}  if (findings.length && opts.failOnRisk) exit(1);
}
