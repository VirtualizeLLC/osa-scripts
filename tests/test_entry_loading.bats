#!/usr/bin/env bats
# tests/test_entry_loading.bats - Tests for entry.zsh script loading

setup() {
  source tests/helpers.bash
  setup_test_env
}

teardown() {
  teardown_test_env
}

# Test entry.zsh exists
@test "entry.zsh should exist" {
  assert_file_exists "$OSA_SNIPPETS_REPO_ROOT/entry.zsh"
}

# Test entry.zsh is executable
@test "entry.zsh should be executable" {
  assert_file_executable "$OSA_SNIPPETS_REPO_ROOT/entry.zsh"
}

# Test entry.zsh has zsh shebang
@test "entry.zsh should have zsh shebang" {
  local first_line
  first_line=$(head -1 "$OSA_SNIPPETS_REPO_ROOT/entry.zsh")
  [[ "$first_line" == "#!/usr/bin/env zsh" ]]
}

# Test OSA_SCRIPTS_ROOT is set
@test "entry.zsh should set OSA_SCRIPTS_ROOT" {
  local output
  output=$(zsh -c "source $OSA_SNIPPETS_REPO_ROOT/entry.zsh 2>/dev/null && echo \$OSA_SCRIPTS_ROOT")
  [[ -n "$output" ]]
  [[ "$output" == "$OSA_SNIPPETS_REPO_ROOT" ]]
}

# Test Git aliases load when flag is true
@test "entry.zsh should load git aliases when OSA_SETUP_GIT=true" {
  local result
  result=$(
    OSA_SETUP_GIT=true \
    zsh -c "source $OSA_SNIPPETS_REPO_ROOT/entry.zsh 2>/dev/null && alias prune" 2>/dev/null
  )
  [[ "$result" == *"git fetch -p"* ]]
}

# Test Git aliases don't load when flag is false
@test "entry.zsh should not load git aliases when OSA_SETUP_GIT is not set" {
  local result
  result=$(
    zsh -c "source $OSA_SNIPPETS_REPO_ROOT/entry.zsh 2>/dev/null && alias prune" 2>&1 || true
  )
  [[ "$result" == *"not found"* || -z "$result" ]]
}

# Test NPM aliases load when flag is true
@test "entry.zsh should load npm aliases when OSA_SETUP_NODE=true" {
  local result
  result=$(
    OSA_SETUP_NODE=true \
    zsh -c "source $OSA_SNIPPETS_REPO_ROOT/entry.zsh 2>/dev/null && alias nr" 2>/dev/null
  )
  [[ "$result" == *"npm run"* ]]
}

# Test Yarn aliases load when flag is true
@test "entry.zsh should load yarn aliases when OSA_SETUP_NODE=true" {
  local result
  result=$(
    OSA_SETUP_NODE=true \
    zsh -c "source $OSA_SNIPPETS_REPO_ROOT/entry.zsh 2>/dev/null && alias y" 2>/dev/null
  )
  [[ "$result" == *"yarn"* ]]
}

# Test ANSI colors always load
@test "entry.zsh should always load ANSI colors" {
  local result
  result=$(
    zsh -c "source $OSA_SNIPPETS_REPO_ROOT/entry.zsh 2>/dev/null && declare -f ANSI" 2>/dev/null
  )
  [[ -n "$result" ]]
}

# Test multiple flags can be combined
@test "entry.zsh should load multiple aliases with combined flags" {
  local git_result npm_result
  git_result=$(
    OSA_SETUP_GIT=true OSA_SETUP_NODE=true \
    zsh -c "source $OSA_SNIPPETS_REPO_ROOT/entry.zsh 2>/dev/null && alias prune" 2>/dev/null
  )
  npm_result=$(
    OSA_SETUP_GIT=true OSA_SETUP_NODE=true \
    zsh -c "source $OSA_SNIPPETS_REPO_ROOT/entry.zsh 2>/dev/null && alias nr" 2>/dev/null
  )
  [[ "$git_result" == *"git fetch -p"* ]]
  [[ "$npm_result" == *"npm run"* ]]
}

# Test MISE flag loads node aliases
@test "entry.zsh should load node aliases when OSA_SETUP_MISE=true" {
  local result
  result=$(
    OSA_SETUP_MISE=true \
    zsh -c "source $OSA_SNIPPETS_REPO_ROOT/entry.zsh 2>/dev/null && alias nr" 2>/dev/null
  )
  [[ "$result" == *"npm run"* ]]
}
