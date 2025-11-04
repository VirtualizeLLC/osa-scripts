#!/usr/bin/env node
// tools/audit/audit-auto-approve.mjs
import fs from "fs";
import path from "path";
import process from "process";

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};
const ok = (s) => `${C.green}OK${C.reset} ${s ?? ""}`;
const warn = (s) => `${C.yellow}WARN${C.reset} ${s ?? ""}`;
const bad = (s) => `${C.red}RISK${C.reset} ${s ?? ""}`;

// --- JSON parser that tolerates // and /* */
function parseJsonWithComments(input) {
  let out = "";
  let inStr = false;
  let quote = "";
  let escape = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    const n = input[i + 1];
    if (inStr) {
      out += c;
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === quote) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = true;
      quote = c;
      out += c;
      continue;
    }
    if (c === "/" && n === "/") {
      while (i < input.length && input[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && n === "*") {
      i += 2;
      while (i < input.length && !(input[i] === "*" && input[i + 1] === "/")) i++;
      i++;
      continue;
    }
    out += c;
  }
  return JSON.parse(out);
}

function* findSettingsFiles(root) {
  const ignore = new Set(["node_modules", ".git", "build", "dist", "out"]);
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (ignore.has(entry.name)) continue;
        walk(path.join(dir, entry.name));
      } else if (entry.isFile()) {
        if (
          entry.name === "settings.json" &&
          path.basename(path.dirname(path.join(dir, entry.name))) === ".vscode"
        )
          yield path.join(dir, entry.name);
        if (entry.name.endsWith(".code-workspace"))
          yield path.join(dir, entry.name);
      }
    }
  };
  walk(root);
}

function getAutoApprovePatterns(json) {
  const arr =
    json?.github?.copilot?.advanced?.autoApproveTasks ??
    json?.settings?.["github.copilot.advanced"]?.autoApproveTasks;
  return Array.isArray(arr)
    ? arr.filter((s) => typeof s === "string")
    : [];
}

function assessPattern(pattern) {
  const results = [];
  const rx = new RegExp(pattern);
  const safe = [
    "./gradlew :tachyon-archiver:downloadZstd --stacktrace",
    "./gradlew clean",
  ];
  const risky = [
    "./gradlew :tachyon-archiver:downloadZstd --init-script x.gradle",
    "./gradlew :tachyon-archiver:downloadZstd && rm -rf /",
  ];
  const safeHits = safe.filter((s) => rx.test(s));
  const riskHits = risky.filter((s) => rx.test(s));
  if (!pattern.startsWith("^") || !pattern.endsWith("$"))
    results.push(bad("not anchored ^...$"));
  if (!/gradle[w]?/.test(pattern))
    results.push(warn("does not restrict to gradlew"));
  if (!/:tachyon-[A-Za-z0-9_-]+:[A-Za-z0-9_-]+/.test(pattern))
    results.push(warn("does not restrict to :tachyon-* modules"));
  if (riskHits.length)
    results.push(bad("matches risky command patterns"));
  return { pattern, results, safeHits, riskHits };
}

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
console.log(`${C.cyan}Scanning${C.reset} ${root}\n`);

let total = 0;
for (const file of findSettingsFiles(root)) {
  const json = parseJsonWithComments(fs.readFileSync(file, "utf8"));
  const patterns = getAutoApprovePatterns(json);
  if (!patterns.length) continue;
  console.log(`${C.bold}${file}${C.reset}`);
  for (const p of patterns) {
    total++;
    const { results, safeHits, riskHits } = assessPattern(p);
    console.log(`  ${C.dim}${p}${C.reset}`);
    results.forEach((r) => console.log("   - " + r));
    console.log(`   safe=${safeHits.length} risky=${riskHits.length}\n`);
  }
}
console.log(`${C.cyan}Done.${C.reset} checked ${total} patterns`);
