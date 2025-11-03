#!/usr/bin/env bash
# tests/helpers.bash - Shared test utilities for osa-snippets tests

# Get the repo root (parent of tests directory)
OSA_SNIPPETS_REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Create a temporary test directory for each test
export TEST_TEMP_DIR=""
export TEST_LOG=""
export MOCK_HOME=""

# Setup test environment
setup_test_env() {
  TEST_TEMP_DIR=$(mktemp -d)
  TEST_LOG="$TEST_TEMP_DIR/test.log"
  MOCK_HOME="$TEST_TEMP_DIR/home"
  
  mkdir -p "$MOCK_HOME"
  
  export TEST_TEMP_DIR TEST_LOG MOCK_HOME
}

# Cleanup test environment
teardown_test_env() {
  if [[ -n "$TEST_TEMP_DIR" && -d "$TEST_TEMP_DIR" ]]; then
    rm -rf "$TEST_TEMP_DIR"
  fi
}

# Mock implementations
# ====================

# Mock source - logs sourcing instead of actually executing
mock_source() {
  local file="$1"
  {
    echo "MOCK_SOURCE: source $file"
  } >> "$TEST_LOG"
  return 0
}

# Test assertion helpers
# ======================

# Assert that a file exists
assert_file_exists() {
  local file="$1"
  local message="${2:-File should exist: $file}"
  
  if [[ ! -f "$file" ]]; then
    echo "FAIL: $message"
    return 1
  fi
}

# Assert that a file is executable
assert_file_executable() {
  local file="$1"
  local message="${2:-File should be executable: $file}"
  
  if [[ ! -x "$file" ]]; then
    echo "FAIL: $message"
    return 1
  fi
}

# Assert that a string matches a pattern
assert_match() {
  local pattern="$1"
  local string="$2"
  local message="${3:-Expected match: $pattern in $string}"
  
  if [[ ! "$string" =~ $pattern ]]; then
    echo "FAIL: $message"
    echo "  Pattern: $pattern"
    echo "  Got: $string"
    return 1
  fi
}

# Assert that output contains a substring
assert_output_contains() {
  local expected="$1"
  local output="$2"
  
  if [[ ! "$output" =~ $expected ]]; then
    echo "FAIL: Expected output to contain: $expected"
    echo "Got: $output"
    return 1
  fi
}

# Assert that a function is defined
assert_function_defined() {
  local func_name="$1"
  
  if ! declare -f "$func_name" > /dev/null; then
    echo "FAIL: Function not defined: $func_name"
    return 1
  fi
}

# Assert that an alias is defined
assert_alias_defined() {
  local alias_name="$1"
  
  if ! alias "$alias_name" &>/dev/null; then
    echo "FAIL: Alias not defined: $alias_name"
    return 1
  fi
}

# Create test config file
create_test_config() {
  local config_content="$1"
  local config_path="${2:-$MOCK_HOME/.osaconfig}"
  
  mkdir -p "$(dirname "$config_path")"
  echo "$config_content" > "$config_path"
}

# Source a script with configuration flags
source_with_config() {
  local script="$1"
  local flags="$2"
  
  # Export configuration flags
  eval "$flags"
  
  # Source the script
  source "$script"
}

# Get test log contents
get_test_log() {
  cat "$TEST_LOG" 2>/dev/null || echo ""
}

# Clear test log
clear_test_log() {
  : > "$TEST_LOG"
}

# Print test environment info
print_test_env() {
  echo "=== Test Environment ==="
  echo "OSA_SNIPPETS_REPO_ROOT: $OSA_SNIPPETS_REPO_ROOT"
  echo "TEST_TEMP_DIR: $TEST_TEMP_DIR"
  echo "MOCK_HOME: $MOCK_HOME"
  echo "TEST_LOG: $TEST_LOG"
  echo "=== Test Log ==="
  cat "$TEST_LOG" 2>/dev/null || echo "(empty)"
}

# Export all functions for use in bats tests
export -f setup_test_env teardown_test_env
export -f mock_source
export -f assert_file_exists assert_file_executable assert_match assert_output_contains
export -f assert_function_defined assert_alias_defined
export -f get_test_log clear_test_log print_test_env
export -f create_test_config source_with_config
