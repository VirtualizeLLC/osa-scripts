#!/usr/bin/env zsh
# ==============================================================================
# OSA Scripts Entry Point
# ==============================================================================
# This script loads aliases and plugins based on the OSA configuration.
# Configuration flags are already injected by OSA setup (from ~/.osa-config).
# Do NOT source ~/.osa-config here - it's already in the environment!
#
# Part of: https://github.com/VirtualizeLLC/osa
# ==============================================================================

# Get the directory where this script is located
# This is the root of the osa-scripts repository
export OSA_SCRIPTS_ROOT="${0:A:h}"

# ==============================================================================
# PLATFORM DETECTION
# ==============================================================================

# Load platform detection utilities
[[ -f "$OSA_SCRIPTS_ROOT/src/platform/detect-platform.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/platform/detect-platform.zsh"

# ==============================================================================
# ALIASES
# ==============================================================================

# Git Aliases
if [[ "${OSA_CONFIG_COMPONENTS_GIT}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/aliases/development/git.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/aliases/development/git.zsh"
fi

# Node.js Aliases (load if Node is enabled in components OR if runtimes.node is enabled)
if [[ "${OSA_CONFIG_COMPONENTS_NODE}" == "true" ]] || [[ "${OSA_CONFIG_RUNTIMES_NODE_ENABLED}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/aliases/development/node.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/aliases/development/node.zsh"
fi

# NPM Aliases
if [[ "${OSA_CONFIG_COMPONENTS_NODE}" == "true" ]] || [[ "${OSA_CONFIG_RUNTIMES_NODE_ENABLED}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/aliases/development/npm.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/aliases/development/npm.zsh"
fi

# Yarn Aliases
if [[ "${OSA_CONFIG_COMPONENTS_NODE}" == "true" ]] || [[ "${OSA_CONFIG_RUNTIMES_NODE_ENABLED}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/aliases/development/yarn.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/aliases/development/yarn.zsh"
fi

# OSA Aliases (always load)
[[ -f "$OSA_SCRIPTS_ROOT/src/aliases/system/osa.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/aliases/system/osa.zsh"

# ==============================================================================
# AUTHORIZATION & SECRETS
# ==============================================================================

# Secrets Management (always load if exists)
[[ -f "$OSA_SCRIPTS_ROOT/src/authorization/secrets.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/authorization/secrets.zsh"

# ==============================================================================
# PLUGINS - CORE UTILITIES
# ==============================================================================

# ANSI Colors (always load)
[[ -f "$OSA_SCRIPTS_ROOT/src/core/ansi-colors.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/core/ansi-colors.zsh"

# Oh My Zsh Config
if [[ "${OSA_CONFIG_COMPONENTS_OH_MY_ZSH}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/core/oh-my-zsh-config.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/core/oh-my-zsh-config.zsh"
fi

# Powerlevel10k
if [[ "${OSA_CONFIG_COMPONENTS_ZSH_PLUGINS}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/core/p10k.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/core/p10k.zsh"
fi

# ==============================================================================
# PLUGINS - TOOLS
# ==============================================================================

# Homebrew
if [[ "${OSA_CONFIG_COMPONENTS_HOMEBREW}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/tools/brew.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/tools/brew.zsh"
fi

# Direnv
if [[ "${OSA_CONFIG_COMPONENTS_DIRENV}" == "true" ]] || [[ "${OSA_CONFIG_SNIPPETS_OSASNIPPETS_DIRENV}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/tools/direnv.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/tools/direnv.zsh"
fi

# Keychain
if [[ "${OSA_CONFIG_COMPONENTS_KEYCHAIN}" == "true" ]] || [[ "${OSA_CONFIG_SNIPPETS_OSASNIPPETS_KEYCHAIN}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/tools/keychain.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/tools/keychain.zsh"
fi

# Ngrok
if [[ "${OSA_CONFIG_COMPONENTS_NGROK}" == "true" ]] || [[ "${OSA_CONFIG_SNIPPETS_OSASNIPPETS_NGROK}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/tools/ngrok.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/tools/ngrok.zsh"
fi

# VS Code
if [[ "${OSA_CONFIG_COMPONENTS_VSCODE}" == "true" ]] || [[ "${OSA_CONFIG_SNIPPETS_OSASNIPPETS_VSCODE}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/tools/vscode.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/tools/vscode.zsh"
fi

# ==============================================================================
# PLUGINS - MOBILE & NATIVE DEVELOPMENT
# ==============================================================================

# React Native
if [[ "${OSA_CONFIG_COMPONENTS_REACT_NATIVE}" == "true" ]] || [[ "${OSA_CONFIG_SNIPPETS_OSASNIPPETS_REACT_NATIVE}" == "true" ]] || [[ "${OSA_CONFIG_COMPONENTS_ANDROID}" == "true" ]] || [[ "${OSA_CONFIG_SNIPPETS_OSASNIPPETS_ANDROID}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/react-native/react-native.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/react-native/react-native.zsh"
fi

# Android Snippets
if [[ "${OSA_CONFIG_COMPONENTS_ANDROID}" == "true" ]] || [[ "${OSA_CONFIG_SNIPPETS_OSASNIPPETS_ANDROID}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/platform/android/android-adb.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/platform/android/android-adb.zsh"
  [[ -f "$OSA_SCRIPTS_ROOT/src/platform/android/android-emulator.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/platform/android/android-emulator.zsh"
fi

# ==============================================================================
# PLUGINS - macOS SPECIFIC
# ==============================================================================

# macOS Browsers
if [[ "${OSA_CONFIG_COMPONENTS_MAC_TOOLS}" == "true" ]] || [[ "${OSA_CONFIG_SNIPPETS_OSASNIPPETS_MAC_TOOLS}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/platform/mac/browsers.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/platform/mac/browsers.zsh"
fi

# macOS Deletion Commands
if [[ "${OSA_CONFIG_COMPONENTS_MAC_TOOLS}" == "true" ]] || [[ "${OSA_CONFIG_SNIPPETS_OSASNIPPETS_MAC_TOOLS}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/platform/mac/deletion-commands.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/platform/mac/deletion-commands.zsh"
  [[ -f "$OSA_SCRIPTS_ROOT/src/platform/mac/rmAsync.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/platform/mac/rmAsync.zsh"
fi

# macOS eGPU Management
if [[ "${OSA_CONFIG_COMPONENTS_EGPU}" == "true" ]] || [[ "${OSA_CONFIG_SNIPPETS_OSASNIPPETS_EGPU}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/platform/mac/egpu.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/platform/mac/egpu.zsh"
fi

# macOS Keystore Requirements
if [[ "${OSA_CONFIG_COMPONENTS_ANDROID}" == "true" ]] || [[ "${OSA_CONFIG_SNIPPETS_OSASNIPPETS_ANDROID}" == "true" ]] || [[ "${OSA_CONFIG_COMPONENTS_MAC_TOOLS}" == "true" ]] || [[ "${OSA_CONFIG_SNIPPETS_OSASNIPPETS_MAC_TOOLS}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/platform/mac/keystore-req.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/platform/mac/keystore-req.zsh"
fi

# macOS Xcode Commands
if [[ "${OSA_CONFIG_COMPONENTS_XCODE}" == "true" ]] || [[ "${OSA_CONFIG_SNIPPETS_OSASNIPPETS_XCODE}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/platform/mac/xcode-commands.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/platform/mac/xcode-commands.zsh"
fi

# macOS CocoaPods Nuke
if [[ "${OSA_CONFIG_COMPONENTS_COCOAPODS}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/platform/mac/cocoapods/nuke.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/platform/mac/cocoapods/nuke.zsh"
fi

# ==============================================================================
# PLUGINS - COMPRESSION & UTILITIES
# ==============================================================================

# Parallel bzip2 (pbzip2)
if [[ "${OSA_CONFIG_COMPONENTS_COMPRESSION}" == "true" ]] || [[ "${OSA_CONFIG_SNIPPETS_OSASNIPPETS_COMPRESSION}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/compression/tar/pbzip2.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/compression/tar/pbzip2.zsh"
fi

# ==============================================================================
# CONFIGURATION INFORMATION
# ==============================================================================
# Scripts are loaded based on flags from ~/.osa-config (sourced by OSA setup)
# DO NOT source ~/.osa-config in this script - it's already in the environment!
#
# This script uses relative paths from OSA_SCRIPTS_ROOT (the repo location)
# which is set at the top of this file using ${0:A:h}
#
# Configuration variables use the new OSA_CONFIG_* format:
#
# Component flags (setup components):
#   OSA_CONFIG_COMPONENTS_SYMLINKS=true       # Symlinks management
#   OSA_CONFIG_COMPONENTS_OH_MY_ZSH=true      # Oh My Zsh framework
#   OSA_CONFIG_COMPONENTS_ZSH_PLUGINS=true    # Zsh plugins (syntax highlighting, etc)
#   OSA_CONFIG_COMPONENTS_HOMEBREW=true       # Homebrew package manager
#   OSA_CONFIG_COMPONENTS_MISE=true           # Mise version manager
#   OSA_CONFIG_COMPONENTS_OSA_SNIPPETS=true   # OSA snippets repository
#   OSA_CONFIG_COMPONENTS_GIT=true            # Git configuration
#   OSA_CONFIG_COMPONENTS_COCOAPODS=true      # CocoaPods (iOS/React Native)
#
# Snippet feature flags (from snippets.osasnippets.features):
#   OSA_CONFIG_SNIPPETS_OSASNIPPETS_ANDROID=true        # Android development
#   OSA_CONFIG_SNIPPETS_OSASNIPPETS_REACT_NATIVE=true   # React Native utilities
#   OSA_CONFIG_SNIPPETS_OSASNIPPETS_VSCODE=true         # VS Code integration
#   OSA_CONFIG_SNIPPETS_OSASNIPPETS_DIRENV=true         # Direnv support
#   OSA_CONFIG_SNIPPETS_OSASNIPPETS_KEYCHAIN=true       # Keychain utilities
#   OSA_CONFIG_SNIPPETS_OSASNIPPETS_NGROK=true          # Ngrok tunneling
#   OSA_CONFIG_SNIPPETS_OSASNIPPETS_MAC_TOOLS=true      # macOS utilities
#   OSA_CONFIG_SNIPPETS_OSASNIPPETS_XCODE=true          # Xcode commands
#   OSA_CONFIG_SNIPPETS_OSASNIPPETS_EGPU=true           # eGPU management
#   OSA_CONFIG_SNIPPETS_OSASNIPPETS_COMPRESSION=true    # Compression utilities
#   OSA_CONFIG_SNIPPETS_OSASNIPPETS_NODE=true           # Node.js (if not using mise)
#   OSA_CONFIG_SNIPPETS_OSASNIPPETS_PYTHON=true         # Python/pyenv (if not using mise)
#   OSA_CONFIG_SNIPPETS_OSASNIPPETS_RUBY=true           # Ruby/rbenv (if not using mise)
#   OSA_CONFIG_SNIPPETS_OSASNIPPETS_JAVA=true           # Java/jenv (if not using mise)
#   OSA_CONFIG_SNIPPETS_OSASNIPPETS_NVM=true            # NVM for Node.js
#   OSA_CONFIG_SNIPPETS_OSASNIPPETS_FNM=true            # FNM for Node.js
#
# Runtime versions (from runtimes section):
#   OSA_CONFIG_RUNTIMES_NODE_ENABLED=true
#   OSA_CONFIG_RUNTIMES_NODE_VERSION=22
#   OSA_CONFIG_RUNTIMES_PYTHON_ENABLED=true
#   OSA_CONFIG_RUNTIMES_PYTHON_VERSION=3.13
#   (and similar for ruby, java, rust, go, deno, elixir, erlang)
#
# These variables are set by the OSA installation wizard and saved to ~/.osa-config
# ==============================================================================

