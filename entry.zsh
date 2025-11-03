#!/usr/bin/env zsh
# ==============================================================================
# OSA Scripts Entry Point
# ==============================================================================
# This script loads aliases and plugins based on the OSA configuration.
# Configuration flags are already injected by OSA setup (from ~/.osaconfig).
# Do NOT source ~/.osaconfig here - it's already in the environment!
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
if [[ "${OSA_SETUP_GIT}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/aliases/development/git.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/aliases/development/git.zsh"
fi

# Node.js Aliases
if [[ "${OSA_SETUP_NODE:-false}" == "true" ]] || [[ "${OSA_SETUP_MISE}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/aliases/development/node.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/aliases/development/node.zsh"
fi

# NPM Aliases
if [[ "${OSA_SETUP_NODE:-false}" == "true" ]] || [[ "${OSA_SETUP_MISE}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/src/aliases/development/npm.zsh" ]] && source "$OSA_SCRIPTS_ROOT/src/aliases/development/npm.zsh"
fi

# Yarn Aliases
if [[ "${OSA_SETUP_NODE:-false}" == "true" ]] || [[ "${OSA_SETUP_MISE}" == "true" ]]; then
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
[[ -f "$OSA_SCRIPTS_ROOT/plugins/core/ansi-colors.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/core/ansi-colors.zsh"

# Oh My Zsh Config
if [[ "${OSA_SETUP_OH_MY_ZSH}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/core/oh-my-zsh-config.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/core/oh-my-zsh-config.zsh"
fi

# Powerlevel10k
if [[ "${OSA_SETUP_ZSH_PLUGINS}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/core/p10k.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/core/p10k.zsh"
fi

# ==============================================================================
# PLUGINS - TOOLS
# ==============================================================================

# Homebrew
if [[ "${OSA_SETUP_HOMEBREW}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/tools/brew.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/tools/brew.zsh"
fi

# Direnv
if [[ "${OSA_SETUP_DIRENV:-false}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/tools/direnv.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/tools/direnv.zsh"
fi

# Keychain
if [[ "${OSA_SETUP_KEYCHAIN:-false}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/tools/keychain.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/tools/keychain.zsh"
fi

# Ngrok
if [[ "${OSA_SETUP_NGROK:-false}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/tools/ngrok.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/tools/ngrok.zsh"
fi

# VS Code
if [[ "${OSA_SETUP_VSCODE:-false}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/tools/vscode.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/tools/vscode.zsh"
fi

# ==============================================================================
# PLUGINS - VERSION MANAGERS
# ==============================================================================

# Java Version Manager (jenv)
if [[ "${OSA_SETUP_JAVA:-false}" == "true" ]] || [[ "${OSA_SETUP_MISE}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/version-managers/jenv.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/version-managers/jenv.zsh"
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/version-managers/java-version.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/version-managers/java-version.zsh"
fi

# Python Version Manager (pyenv)
if [[ "${OSA_SETUP_PYTHON:-false}" == "true" ]] || [[ "${OSA_SETUP_MISE}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/version-managers/pyenv.sh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/version-managers/pyenv.sh"
fi

# Ruby Version Manager (rbenv)
if [[ "${OSA_SETUP_RUBY:-false}" == "true" ]] || [[ "${OSA_SETUP_MISE}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/version-managers/rbenv.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/version-managers/rbenv.zsh"
fi

# Node Version Manager (nvm)
if [[ "${OSA_SETUP_NVM:-false}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/version-managers/node-managers/nvm.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/version-managers/node-managers/nvm.zsh"
fi

# Fast Node Manager (fnm)
if [[ "${OSA_SETUP_FNM:-false}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/version-managers/node-managers/fnm.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/version-managers/node-managers/fnm.zsh"
fi

# ==============================================================================
# PLUGINS - MOBILE & NATIVE DEVELOPMENT
# ==============================================================================

# React Native
if [[ "${OSA_SETUP_REACT_NATIVE:-false}" == "true" ]] || [[ "${OSA_SETUP_ANDROID}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/platform/react-native.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/platform/react-native.zsh"
fi

# Android Setup
if [[ "${OSA_SETUP_ANDROID}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/platform/android/android-setup.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/platform/android/android-setup.zsh"
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/platform/android/android-adb.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/platform/android/android-adb.zsh"
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/platform/android/android-emulator.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/platform/android/android-emulator.zsh"
fi

# ==============================================================================
# PLUGINS - macOS SPECIFIC
# ==============================================================================

# macOS Browsers
if [[ "${OSA_SETUP_MAC_TOOLS:-false}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/platform/mac/browsers.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/platform/mac/browsers.zsh"
fi

# macOS Deletion Commands
if [[ "${OSA_SETUP_MAC_TOOLS:-false}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/platform/mac/deletion-commands.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/platform/mac/deletion-commands.zsh"
fi

# macOS eGPU Management
if [[ "${OSA_SETUP_EGPU:-false}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/platform/mac/egpu.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/platform/mac/egpu.zsh"
fi

# macOS Keystore Requirements
if [[ "${OSA_SETUP_ANDROID}" == "true" ]] || [[ "${OSA_SETUP_MAC_TOOLS:-false}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/platform/mac/keystore-req.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/platform/mac/keystore-req.zsh"
fi

# macOS Xcode Commands
if [[ "${OSA_SETUP_XCODE:-false}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/platform/mac/xcode-commands.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/platform/mac/xcode-commands.zsh"
fi

# macOS CocoaPods Nuke
if [[ "${OSA_SETUP_COCOAPODS}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/platform/mac/cocoapods/nuke.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/platform/mac/cocoapods/nuke.zsh"
fi

# ==============================================================================
# PLUGINS - COMPRESSION & UTILITIES
# ==============================================================================

# Parallel bzip2 (pbzip2)
if [[ "${OSA_SETUP_COMPRESSION:-false}" == "true" ]]; then
  [[ -f "$OSA_SCRIPTS_ROOT/plugins/compression/tar/pbzip2.zsh" ]] && source "$OSA_SCRIPTS_ROOT/plugins/compression/tar/pbzip2.zsh"
fi

# ==============================================================================
# CONFIGURATION INFORMATION
# ==============================================================================
# Scripts are loaded based on flags already in the environment from ~/.osaconfig
# OSA setup injects these flags - DO NOT source ~/.osaconfig in this script!
#
# This script uses relative paths from OSA_SCRIPTS_ROOT (the repo location)
# which is set at the top of this file using ${0:A:h}
#
# Available configuration flags:
#   OSA_SETUP_OH_MY_ZSH=true      # Oh My Zsh and p10k configuration
#   OSA_SETUP_HOMEBREW=true       # Homebrew utilities
#   OSA_SETUP_COCOAPODS=true      # CocoaPods tools and nuke commands
#   OSA_SETUP_ZSH_PLUGINS=true    # Additional zsh plugins
#   OSA_SETUP_GIT=true            # Git aliases
#   OSA_SETUP_SYMLINKS=true       # Symlink management
#   OSA_SETUP_ANDROID=true        # Android SDK, ADB, emulator tools
#   OSA_SETUP_MISE=true           # Mise version manager (covers multiple languages)
#
# Optional flags (with defaults to false):
#   OSA_SETUP_NODE=true           # Node.js specific tools (if not using mise)
#   OSA_SETUP_PYTHON=true         # Python/pyenv (if not using mise)
#   OSA_SETUP_RUBY=true           # Ruby/rbenv (if not using mise)
#   OSA_SETUP_JAVA=true           # Java/jenv (if not using mise)
#   OSA_SETUP_NVM=true            # NVM for Node.js
#   OSA_SETUP_FNM=true            # FNM for Node.js
#   OSA_SETUP_REACT_NATIVE=true   # React Native specific utilities
#   OSA_SETUP_VSCODE=true         # VS Code integration
#   OSA_SETUP_DIRENV=true         # Direnv support
#   OSA_SETUP_KEYCHAIN=true       # Keychain utilities
#   OSA_SETUP_NGROK=true          # Ngrok tunneling
#   OSA_SETUP_MAC_TOOLS=true      # macOS-specific browser/deletion utilities
#   OSA_SETUP_XCODE=true          # Xcode command utilities
#   OSA_SETUP_EGPU=true           # eGPU management
#   OSA_SETUP_COMPRESSION=true    # Compression utilities (pbzip2)
#
# These flags are set by the OSA installation wizard
# ==============================================================================

