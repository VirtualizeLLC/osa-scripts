import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd, exit } from "node:process";

interface VSCodeSettings {
  [key: string]: any;
}

interface Finding {
  file: string;
  riskyPatterns: string[];
}

function buildSafeTemplate(prefixes: string[]): RegExp {
  const alt = prefixes.map((p) => p.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).join("|");
  const pattern =
    `^\\.\\/gradlew(\\.bat)?\\s+(:(${alt})-[A-Za-z0-9_-]+:[A-Za-z0-9_-]+|:?clean)(\\s+--(?:stacktrace|info|quiet|debug))*$`;
  return new RegExp(pattern);
}

function readSettingsFiles(baseDir = cwd()): string[] {
  const results: string[] = [];
  const recurse = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) recurse(full);
      else if (e.isFile() && e.name === "settings.json" && full.includes(".vscode")) results.push(full);
    }
  };
  recurse(baseDir);
  return results;
}

function loadSettings(file: string): VSCodeSettings | null {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export async function auditAutoApprove(opts: {
  allowPrefix: string;
  failOnRisk: boolean;
  json: boolean;
}) {
  const prefixes = opts.allowPrefix.split(",").map((s) => s.trim()).filter(Boolean);
  const safe = buildSafeTemplate(prefixes);
  const findings: Finding[] = [];

  for (const file of readSettingsFiles()) {
    const data = loadSettings(file);
    if (!data) continue;
    const tasks = data?.["github.copilot.advanced"]?.["autoApproveTasks"];
    if (!Array.isArray(tasks)) continue;
    const risky = tasks.filter((t) => typeof t === "string" && !safe.test(t));
    if (risky.length) findings.push({ file, riskyPatterns: risky });
  }

  if (opts.json) {
    console.log(JSON.stringify({ findings, prefixes }, null, 2));
  } else if (!findings.length) {
    console.log(`✅ All autoApproveTasks are safe for prefixes: ${prefixes.join(", ")}`);
  } else {
    console.log(`⚠️  Found risky patterns in ${findings.length} file(s):`);
    for (const f of findings) {
      console.log(`- ${f.file}`);
      for (const p of f.riskyPatterns) console.log(`    ✖ ${p}`);
    }
    console.log(`\nExpected safe pattern:\n${safe}`);
  }

  if (findings.length && opts.failOnRisk) exit(1);
}
