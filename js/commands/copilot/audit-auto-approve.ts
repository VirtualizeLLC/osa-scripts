import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
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

// Define risky patterns that should never be auto-approved
const RISKY_PATTERNS = [
	// File system dangers
	/\*\*/, // Double glob (can traverse up directories)
	/\.\./, // Parent directory traversal
	/^\//, // Absolute paths
	/^~\//, // Home directory paths
	/\/\.\./, // Embedded parent directory
	/\/\/+/, // Multiple slashes (potential path confusion)
	
	// System and privilege escalation
	/sudo/, // Privilege escalation
	/su\s/, // Switch user
	/chmod\s+777/, // Dangerous permissions
	/chown\s+root/, // Root ownership
	/chown\s+0/, // Root ownership by UID
	
	// System operations
	/dd\s+if=/, // Disk operations
	/mkfs/, // Filesystem creation
	/fdisk/, // Disk partitioning
	/format/, // Drive formatting
	/shutdown/, // System shutdown
	/reboot/, // System reboot
	/halt/, // System halt
	/poweroff/, // Power off
	/killall/, // Kill all processes
	/pkill\s+-9/, // Force kill processes
	
	// Network and remote execution
	/curl.*\|\s*(sh|bash|zsh)/, // Pipe to shell from curl
	/wget.*\|\s*(sh|bash|zsh)/, // Pipe to shell from wget
	/ssh\s/, // SSH commands
	/scp\s/, // SCP file transfer
	/rsync/, // Rsync operations
	
	// Code execution
	/eval/, // Code evaluation
	/exec/, // Command execution
	/system/, // System calls
	/popen/, // Process opening
	/subprocess/, // Subprocess calls
	/spawn/, // Process spawning
	/node\s+-e/, // Node.js -e execution
	/python\s+-c/, // Python -c execution
	/perl\s+-e/, // Perl -e execution
	/ruby\s+-e/, // Ruby -e execution
	
	// Sensitive files and directories
	/~\/\.ssh/, // SSH keys
	/\/etc\/passwd/, // System password file
	/\/etc\/shadow/, // System shadow file
	/\/etc\/sudoers/, // Sudo configuration
	/\/root/, // Root directory access
	/\/home/, // Home directory access
	/\/var\/log/, // System logs
	/\/proc/, // Process information
	/\/sys/, // System information
	
	// Database operations
	/mysql\s+/, // MySQL commands
	/psql\s+/, // PostgreSQL commands
	/mongo\s+/, // MongoDB commands
	/redis-cli/, // Redis commands
	
	// Package managers with dangerous flags
	/npm\s+install\s+.*-g/, // Global npm installs
	/pip\s+install\s+.*--user/, // User pip installs
	/apt-get\s+install/, // System package installation
	/yum\s+install/, // System package installation
	/brew\s+install/, // Homebrew installation
	
	// Git operations that could be dangerous
	/git\s+push\s+--force/, // Force push
	/git\s+reset\s+--hard/, // Hard reset
	/git\s+clean\s+-fd/, // Force clean
	
	// Dangerous shell constructs
	/`.*`/, // Backticks (command substitution)
	/\$\(.*\)/, // Command substitution
	/>\s*\/dev\/null/, // Redirecting to null (hiding output)
	/&\s*$/, // Background processes without proper handling
	
	// Unterminated or malformed patterns
	/;\s*$/, // Commands ending with semicolon (potential chaining)
	/\|\s*$/, // Commands ending with pipe (incomplete pipeline)
	/&&\s*$/, // Commands ending with AND (incomplete conditional)
	/\|\|\s*$/, // Commands ending with OR (incomplete conditional)
	
	// Path manipulation
	/PATH=/, // PATH manipulation
	/LD_LIBRARY_PATH=/, // Library path manipulation
	/LD_PRELOAD=/, // Preload manipulation
];

// Safe rm -rf targets (common build artifacts and dependencies)
const SAFE_RM_TARGETS = [
	/node_modules/,
	/build/,
	/dist/,
	/.next/,
	/out/,
	/\.cache/,
	/\.tmp/,
	/temp/,
	/tmp/,
];

// Dangerous rm -rf patterns (even with rm -rf)
const DANGEROUS_RM_PATTERNS = [
	/\*/, // Wildcards
	/\.\./, // Parent directory
	/^\//, // Absolute paths
	/^~\//, // Home directory
	/\.\./, // Any parent directory traversal
];

function isDangerousRmRf(pattern: string): boolean {
	// If it contains rm -rf, check if it's dangerous
	if (/rm\s+-rf/.test(pattern)) {
		// Check if it matches any dangerous patterns
		const hasDangerousPattern = DANGEROUS_RM_PATTERNS.some(dangerous => dangerous.test(pattern));
		if (hasDangerousPattern) return true;
		
		// If no dangerous patterns, check if it's a safe target
		const hasSafeTarget = SAFE_RM_TARGETS.some(safe => safe.test(pattern));
		// If it's not a safe target, it's risky
		return !hasSafeTarget;
	}
	return false;
}

function validatePatternSyntax(pattern: string): { valid: boolean; issues: string[] } {
	const issues: string[] = [];
	
	// Check for unterminated quotes
	const singleQuotes = (pattern.match(/'/g) || []).length;
	const doubleQuotes = (pattern.match(/"/g) || []).length;
	const backticks = (pattern.match(/`/g) || []).length;
	
	if (singleQuotes % 2 !== 0) issues.push("unterminated single quotes");
	if (doubleQuotes % 2 !== 0) issues.push("unterminated double quotes");
	if (backticks % 2 !== 0) issues.push("unterminated backticks");
	
	// Check for unbalanced parentheses/brackets
	const openParens = (pattern.match(/\(/g) || []).length;
	const closeParens = (pattern.match(/\)/g) || []).length;
	const openBrackets = (pattern.match(/\[/g) || []).length;
	const closeBrackets = (pattern.match(/\]/g) || []).length;
	const openBraces = (pattern.match(/\{/g) || []).length;
	const closeBraces = (pattern.match(/\}/g) || []).length;
	
	if (openParens !== closeParens) issues.push("unbalanced parentheses");
	if (openBrackets !== closeBrackets) issues.push("unbalanced brackets");
	if (openBraces !== closeBraces) issues.push("unbalanced braces");
	
	// Check for dangerous path constructs
	if (pattern.includes("/../") || pattern.includes("\\..\\")) {
		issues.push("directory traversal (..)");
	}
	
	// Check for null bytes
	if (pattern.includes('\0')) {
		issues.push("null bytes detected");
	}
	
	// Check for extremely long patterns (potential DoS)
	if (pattern.length > 1000) {
		issues.push("pattern too long");
	}
	
	return { valid: issues.length === 0, issues };
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
	
	// Add user settings file (global VSCode settings)
	const userSettingsPath = join(homedir(), "Library", "Application Support", "Code", "User", "settings.json");
	try {
		if (readFileSync(userSettingsPath)) {
			results.push(userSettingsPath);
		}
	} catch {
		// User settings file doesn't exist or isn't readable
	}
	
	// Add workspace settings files (.vscode/settings.json)
	const recurse = (dir: string) => {
		for (const e of readdirSync(dir, { withFileTypes: true })) {
			const full = join(dir, e.name);
			if (e.isDirectory()) recurse(full);
			else if (
				e.isFile() &&
				e.name === "settings.json" &&
				full.includes(".vscode")
			) {
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

interface PrefixHealth {
	prefix: string;
	totalPatterns: number;
	riskyPatterns: number;
	safePatterns: number;
	patterns: string[];
	riskyList: string[];
}

export async function auditAutoApprove(opts: {
	allowPrefix?: string; // Now optional
	settingsFile?: string;
	failOnRisk: boolean;
	json: boolean;
	silent?: boolean;
	scanPrefixes?: boolean; // New option to auto-scan prefixes
}) {
	const explicitPrefixes = opts.allowPrefix
		? opts.allowPrefix.split(",").map((s) => s.trim()).filter(Boolean)
		: [];
	
	const findings: Finding[] = [];
	const prefixHealth: Map<string, PrefixHealth> = new Map();

	// If a specific settings file is provided, audit only that file
	const settingsFiles = opts.settingsFile
		? [opts.settingsFile]
		: readSettingsFiles();

	for (const file of settingsFiles) {
		const data = loadSettings(file);
		if (!data) continue;

		const map = data["chat.tools.terminal.autoApprove"];
		if (map == null || typeof map !== "object" || Array.isArray(map)) continue;

		const risky: string[] = [];
		const nonBoolean: string[] = [];

		for (const [pattern, val] of Object.entries(
			map as Record<string, unknown>,
		)) {
			if (typeof val !== "boolean") {
				nonBoolean.push(pattern);
				continue;
			}

			// Extract prefix from pattern (e.g., ":tachyon-something" -> "tachyon")
			const prefixMatch = pattern.match(/^:([a-zA-Z0-9_-]+)-/);
			const prefix = prefixMatch ? prefixMatch[1] : "unknown";

			// Initialize prefix health tracking
			let health = prefixHealth.get(prefix);
			if (!health) {
				health = {
					prefix,
					totalPatterns: 0,
					riskyPatterns: 0,
					safePatterns: 0,
					patterns: [],
					riskyList: [],
				};
				prefixHealth.set(prefix, health);
			}
			health.totalPatterns++;
			health.patterns.push(pattern);

			// Validate pattern syntax for security
			const syntaxValidation = validatePatternSyntax(pattern);
			if (!syntaxValidation.valid) {
				risky.push(`syntax issues: ${syntaxValidation.issues.join(", ")}`);
			}

			// Check against comprehensive list of risky patterns
			const isRiskyPattern = RISKY_PATTERNS.some((riskyRegex) =>
				riskyRegex.test(pattern),
			);
			
			// Special handling for rm -rf commands
			const isDangerousRm = isDangerousRmRf(pattern);
			
			// Check if pattern matches allowed prefixes (if specified)
			const safe = explicitPrefixes.length > 0 ? buildSafeTemplate(explicitPrefixes) : null;
			const isAllowed = safe ? safe.test(pattern) : true; // If no explicit prefixes, allow all
			
			const isRisky = isRiskyPattern || isDangerousRm || !isAllowed || !syntaxValidation.valid;
			
			if (isRisky) {
				health.riskyPatterns++;
				health.riskyList.push(pattern);
				risky.push(pattern);
			} else {
				health.safePatterns++;
			}
		}

		if (risky.length || nonBoolean.length) {
			const f: Finding = { file, riskyPatterns: risky };
			if (nonBoolean.length) f.nonBoolean = nonBoolean;
			findings.push(f);
		}
	}

	// Report prefix health if requested or if no explicit prefixes provided
	if (opts.scanPrefixes || !opts.allowPrefix) {
		reportPrefixHealth(prefixHealth, opts.json);
	}

	if (opts.json) {
		console.log(JSON.stringify({ 
			findings, 
			prefixes: explicitPrefixes,
			prefixHealth: Object.fromEntries(prefixHealth)
		}, null, 2));
	} else if (!findings.length) {
		if (!opts.silent) {
			const prefixMsg = explicitPrefixes.length > 0 
				? ` for prefixes: ${explicitPrefixes.join(", ")}`
				: "";
			console.log(`✅ All autoApprove entries are safe${prefixMsg}`);
		}
	} else {
		// Always show warnings when failing, regardless of silent option
		const shouldShowWarnings = !opts.silent || opts.failOnRisk;
		if (shouldShowWarnings) {
			console.log(`⚠️  Found issues in ${findings.length} file(s):`);
			for (const f of findings) {
				console.log(`- ${f.file}`);
				for (const p of f.riskyPatterns)
					console.log(`    \x1b[31m✖ risky (enabled & not allowed):\x1b[37m ${p}\x1b[0m`);
			}
			if (explicitPrefixes.length > 0) {
				console.log(`\nExpected safe pattern:\n${buildSafeTemplate(explicitPrefixes)}`);
			}
		}
	}
	if (findings.length && opts.failOnRisk) exit(1);
}

function reportPrefixHealth(prefixHealth: Map<string, PrefixHealth>, json: boolean) {
	const healthArray = Array.from(prefixHealth.values());
	
	if (json) return; // Will be included in main JSON output
	
	console.log("\n📊 Prefix Health Report:");
	console.log("========================");
	
	for (const health of healthArray.sort((a, b) => b.totalPatterns - a.totalPatterns)) {
		const riskPercentage = health.totalPatterns > 0 
			? Math.round((health.riskyPatterns / health.totalPatterns) * 100)
			: 0;
		
		const status = health.riskyPatterns === 0 ? "✅" : health.safePatterns === 0 ? "❌" : "⚠️";
		console.log(`${status} ${health.prefix}: ${health.safePatterns}/${health.totalPatterns} safe (${riskPercentage}% risky)`);
		
		if (health.riskyPatterns > 0) {
			console.log(`    Risky patterns: ${health.riskyList.slice(0, 3).join(", ")}${health.riskyList.length > 3 ? "..." : ""}`);
		}
	}
	console.log("");
}
