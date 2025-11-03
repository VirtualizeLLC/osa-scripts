# OSA Snippets Tests

This directory contains automated tests for the osa-snippets repository.

## Testing Approach

Tests verify that:

1. **Scripts Load Correctly** - All shell scripts have proper shebang and syntax
2. **Configuration Flags Work** - Scripts load based on OSA_SETUP_* flags
3. **Aliases Are Defined** - Aliases and functions are properly defined when loaded
4. **Functions Execute** - Functions can be called and produce expected output
5. **Error Handling** - Scripts handle missing files and invalid inputs gracefully

## Running Tests

### Setup

```bash
# Install test dependencies
brew install bats-core

# Or on Linux:
sudo apt-get install bats
```

### Run All Tests

```bash
cd /Users/fre/dev/osa-snippets
bats tests/
```

### Run Specific Test File

```bash
bats tests/test_entry_loading.bats
```

### Run with Verbose Output

```bash
bats --verbose tests/
```

### Use Make

```bash
cd tests
make test              # Run all tests
make test-verbose      # Run with verbose output
make test-entry        # Run only entry loading tests
make lint              # Check shell syntax
make install-deps      # Install dependencies
```

### Watch Mode (re-run on changes)

```bash
# Using entr (brew install entr)
cd tests && make test-watch
```

## Test Files

- `test_entry_loading.bats` - entry.zsh loading, flag handling, alias definition
- `helpers.bash` - Shared test utilities and assertion functions

## Test Structure

Each test file includes:

1. **Setup** - Initialize test environment
2. **Teardown** - Clean up temp files
3. **Tests** - Individual test cases with clear naming

### Example Test

```bash
@test "entry.zsh should load git aliases when OSA_SETUP_GIT=true" {
  local result
  result=$(
    OSA_SETUP_GIT=true \
    zsh -c "source $OSA_SNIPPETS_REPO_ROOT/entry.zsh 2>/dev/null && alias prune" 2>/dev/null
  )
  [[ "$result" == *"git fetch -p"* ]]
}
```

## Adding New Tests

1. Create new `.bats` file in `tests/` directory
2. Source helpers at the top: `source tests/helpers.bash`
3. Use `setup()` and `teardown()` for initialization/cleanup
4. Use `@test "description"` for each test case
5. Use assertion helpers from helpers.bash
6. Test both positive (flag enabled) and negative (flag disabled) cases

## Assertion Helpers

From `helpers.bash`:

- `assert_file_exists FILE` - Verify file exists
- `assert_file_executable FILE` - Verify file is executable
- `assert_match PATTERN STRING` - Verify string matches regex
- `assert_output_contains EXPECTED OUTPUT` - Verify substring in output
- `assert_function_defined FUNC` - Verify function is defined
- `assert_alias_defined ALIAS` - Verify alias is defined
- `create_test_config CONFIG_CONTENT` - Create test config file
- `source_with_config SCRIPT FLAGS` - Source script with flags

## CI/CD Integration

Tests run automatically on:

- Push to main or develop branches
- Pull requests to main or develop branches

See `.github/workflows/test.yml` for CI configuration.

## Known Limitations

- Tests run in subshells to avoid polluting test environment
- Some aliases may require additional tools to be installed
- Function output may vary based on environment variables

## Resources

- [BATS Documentation](https://github.com/bats-core/bats-core)
- [BATS Tutorial](https://github.com/bats-core/bats-core/wiki/Background:-What-is-BATS%3F)
- [Shell Script Testing Best Practices](https://github.com/bats-core/bats-core/wiki/Background:-Bash-Testing-Best-Practices)

