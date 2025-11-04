#!/usr/bin/env tsx
import { execSync } from "child_process";
import { Command } from "commander";
import { auditAutoApprove } from "./commands/copilot/audit-auto-approve.ts";

const packageJson = await import("./package.json", {
	with: { type: "json" },
});

const program = new Command();

program
	.name("osa")
	.description(
		"OSA command-line utilities for both setup and development tasks",
	)
	.version(packageJson.default.version);

// Group: copilot
const copilot = program
	.command("copilot")
	.description("GitHub Copilot helpers");

// Subcommand: copilot audit-auto-approve
copilot
	.command("audit-auto-approve")
	.description("Audit VSCode Copilot autoApproveTasks for safe Gradle patterns")
	.option(
		"--allow-prefix <list>",
		"Comma-separated prefixes (e.g. tachyon,vllc)",
		"tachyon",
	)
	.option("--fail-on-risk", "Exit non-zero if risky patterns found", false)
	.option("--json", "Output JSON", false)
	.action(auditAutoApprove);

// Command: setup
program
	.command("setup")
	.description(
		"Run OSA setup. Requires cloning https://github.com/VirtualizeLLC/osa and using it to manage setup.",
	)
	.allowUnknownOption()
	.action(() => {
		try {
			execSync("osa-setup", {
				stdio: "inherit",
				shell: "/bin/zsh",
			});
		} catch {
			console.log("osa-setup command not found.");
			console.log(
				"Please clone https://github.com/VirtualizeLLC/osa and follow its setup instructions.",
			);
			console.log("Then run 'osa-setup' from that repository.");
		}
	});

program.parseAsync();
