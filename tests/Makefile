#!/usr/bin/env make
# Tests Makefile - Convenient test running for osa-snippets

.PHONY: test test-verbose test-entry test-watch install-deps lint ci help

help:
	@echo "OSA Snippets Test Commands"
	@echo "=========================="
	@echo ""
	@echo "make install-deps    Install test dependencies (bats-core)"
	@echo "make test            Run all tests"
	@echo "make test-verbose    Run tests with verbose output"
	@echo "make test-entry      Run only entry.zsh tests"
	@echo "make test-watch      Re-run tests on file changes (requires entr)"
	@echo "make lint            Check shell script syntax"
	@echo "make ci              Run full CI pipeline (lint + test)"
	@echo ""

# Test runner commands
test:
	@command -v bats >/dev/null || (echo "Error: bats not installed. Run: make install-deps"; exit 1)
	bats tests/test_*.bats

test-verbose:
	@command -v bats >/dev/null || (echo "Error: bats not installed. Run: make install-deps"; exit 1)
	bats --verbose tests/test_*.bats

test-entry:
	@command -v bats >/dev/null || (echo "Error: bats not installed. Run: make install-deps"; exit 1)
	bats --verbose tests/test_entry_loading.bats

test-watch:
	@command -v entr >/dev/null || (echo "Error: entr not installed. Run: brew install entr"; exit 1)
	@command -v bats >/dev/null || (echo "Error: bats not installed. Run: make install-deps"; exit 1)
	@echo "Watching tests/ and plugins/ for changes..."
	@ls tests/*.bats plugins/**/*.zsh entry.zsh 2>/dev/null | entr -c make test

# Installation
install-deps:
	@echo "Installing test dependencies..."
	@if command -v brew &>/dev/null; then \
		brew install bats-core || true; \
		echo "✓ bats-core installed (or already present)"; \
	elif command -v apt-get &>/dev/null; then \
		sudo apt-get update && sudo apt-get install -y bats || true; \
		echo "✓ bats installed (or already present)"; \
	else \
		echo "Error: Neither brew nor apt-get found. Please install bats manually."; \
		exit 1; \
	fi

# Linting
lint:
	@echo "Checking shell script syntax..."
	@bash -n ../entry.zsh
	@for file in ../aliases/**/*.zsh; do \
		bash -n "$$file" && echo "✓ $$file"; \
	done
	@for file in ../plugins/**/*.zsh; do \
		bash -n "$$file" && echo "✓ $$file"; \
	done
	@echo "✓ All scripts are syntactically valid"

# CI/CD commands
ci: install-deps lint test
	@echo "✓ CI checks passed"

# View test files
view-test-entry:
	less tests/test_entry_loading.bats

view-helpers:
	less tests/helpers.bash
