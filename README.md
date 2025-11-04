# OSA Scripts

> A collection of developer scripts and shell utilities to boost productivity and streamline development workflows.

Part of the [OSA (Open Source Automation)](https://github.com/VirtualizeLLC/osa) ecosystem by VirtualizeLLC.

## Overview

OSA Scripts provides a modular collection of zsh aliases, functions, and plugins designed to enhance your development experience across various tools and platforms. Each script is carefully crafted to automate common tasks, reduce repetitive typing, and improve overall productivity.

## Features

- **Profile-Based Loading**: Scripts are loaded conditionally based on your OSA profile configuration
- **Modular Architecture**: Each script focuses on specific tools or workflows (Git, Node.js, Docker, React Native, etc.)
- **macOS Optimized**: Includes Mac-specific utilities for Xcode, Android development, eGPU management, and more
- **Version Manager Support**: Integrations for nvm, fnm, rbenv, pyenv, jenv, and direnv
- **Developer Aliases**: Time-saving shortcuts for npm, yarn, git, and common development tasks

## Setup

These scripts work with the [OSA](https://github.com/VirtualizeLLC/osa) configuration system.

### Quick Start

1. **Use OSA**: Install and run `osa setup` to automatically configure your environment
2. **Or Manual Setup**: Source `entry.zsh` in your shell profile and generate a `~/.osa-config` file

### Configuration

Scripts are loaded based on boolean flags in `~/.osa-config`. Key configuration values:

```bash
# Core components
OSA_CONFIG_COMPONENTS_GIT=true          # Git aliases
OSA_CONFIG_COMPONENTS_NODE=true         # Node.js tools
OSA_CONFIG_COMPONENTS_HOMEBREW=true     # Homebrew utilities

# Development tools
OSA_CONFIG_RUNTIMES_NODE_ENABLED=true   # Node runtime management
OSA_CONFIG_SNIPPETS_OSASNIPPETS_REACT_NATIVE=true  # React Native tools
OSA_CONFIG_SNIPPETS_OSASNIPPETS_ANDROID=true       # Android development
```

See the [OSA repository](https://github.com/VirtualizeLLC/osa) for complete configuration options.

## Productivity Scripts

Key scripts designed to boost developer productivity:

### File Management

**`rmAsync` - Asynchronous Bulk File Deletion**

- **Problem Solved**: Unblocks developers instantly when deleting massive directories (node_modules, build artifacts, etc)
- **How It Works**: Moves files to a staging area and deletes them in the background, returning control immediately
- **Usage**: `rmAsync node_modules` or `rmAsync src/**/*.tmp build/*`
- **Benefits**: No filesystem blocking on large deletions; instant command return; automatic cleanup
- **Perfect For**: React/Node projects, build systems, dependency management

### Xcode & iOS Development

**`xcwo` - Smart Xcode Workspace Opener**

- **Problem Solved**: Quick access to Xcode workspace without remembering directory structure
- **How It Works**: Automatically finds and opens `.xcworkspace` in current or ios/ subdirectory
- **Usage**: `xcwo`
- **Benefits**: Saves time in React Native development workflows

**`purgeallbuilds` - Clear Xcode Cache**

- **Aliases**: Instantly clears all Xcode derived data to fix mysterious build issues
- **Usage**: `purgeallbuilds`

### Browser Development

**`chrome-cors` & `chrome-cors-https`** - CORS-Disabled Chrome Instances

- **Problem Solved**: Launch Chrome without CORS restrictions for local development
- **Usage**: `chrome-cors` or `chrome-cors-https`
- **Perfect For**: API testing, frontend development, HTTPS localhost testing

### React Native Development

**`rn-fix`** - Complete React Native Reset

- **Clears**: Node modules, watchman, temp files, cache
- **Usage**: `rn-fix`
- **Saves Time**: 5-10 minutes of manual cleanup per fix

**`rnios` / `rnra`** - iOS/Android Launch Shortcuts

- **Usage**: `rnios` (iOS) or `rnra` (Android)
- **Benefit**: Fewer keystrokes, faster iteration

### Package Manager Helpers

**`react-native` / `rn`** - Shorthand aliases

- **Auto-detects** lock files (yarn.lock, package-lock.json) for correct package manager
- **Usage**: `rn run-ios`, `rn run-android`

### CLI Tools

**`osa copilot audit-auto-approve`** - Audit GitHub Copilot Auto-Approve Tasks

- **Problem Solved**: Ensures VSCode Copilot autoApproveTasks only contain safe Gradle patterns
- **How It Works**: Scans VSCode settings for risky auto-approve patterns in Gradle build files
- **Usage**: `osa copilot audit-auto-approve [--allow-prefix <prefixes>] [--fail-on-risk] [--json]`
- **Options**:
  - `--allow-prefix`: Comma-separated allowed prefixes (default: "tachyon")
  - `--fail-on-risk`: Exit with error if risky patterns found
  - `--json`: Output results in JSON format
- **Perfect For**: Security auditing, CI/CD pipelines, team policy enforcement

## Productivity Benefits

- **Faster Command Execution**: Aliases reduce typing and memorization overhead
- **Consistent Workflows**: Standardized commands across team members
- **Environment Automation**: Automatic tool initialization (version managers, path setup)
- **Error Reduction**: Pre-configured commands reduce syntax errors
- **Quick Navigation**: Smart directory shortcuts and git navigation helpers

## Contributing

This is part of the OSA project. For contributions, issues, or feature requests, please visit the main [OSA repository](https://github.com/VirtualizeLLC/osa).

## License

See the main [OSA repository](https://github.com/VirtualizeLLC/osa) for license information.
