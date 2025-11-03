#!/usr/bin/env zsh
# tests/run-tests.zsh - Simple test runner script

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TESTS_DIR="$REPO_ROOT/tests"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        OSA Snippets Tests - Running Test Suite             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if bats is installed
if ! command -v bats &>/dev/null; then
  echo "Installing bats-core..."
  if command -v brew &>/dev/null; then
    brew install bats-core
  else
    echo "Error: bats not found and brew not available"
    echo "Please install bats manually: https://github.com/bats-core/bats-core"
    exit 1
  fi
fi

# Run tests
echo "Running test suite..."
echo ""

if bats "$TESTS_DIR"/*.bats; then
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║                  ✓ All Tests Passed!                       ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Test coverage includes:"
  echo "  • Script loading and sourcing"
  echo "  • Configuration flag handling"
  echo "  • Function availability and execution"
  echo "  • Alias definitions and functionality"
  echo "  • Error handling and edge cases"
  echo ""
  exit 0
else
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║              ✗ Some Tests Failed                           ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Run tests with verbose output:"
  echo "  bats --verbose tests/"
  echo ""
  exit 1
fi
