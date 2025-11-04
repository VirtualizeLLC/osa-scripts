#!/usr/bin/env bash
# Test script for osa copilot audit-auto-approve

set -e

echo "🧪 Testing OSA Copilot Audit Tool"
echo "=================================="

cd "$(dirname "$0")/../.."

# Test 1: Safe patterns should pass
echo ""
echo "✅ Test 1: Safe patterns (should pass)"
echo "--------------------------------------"
if yarn cli copilot audit-auto-approve --settings-file commands/copilot/test-data/safe-patterns.json --allow-prefix "safe" --json | grep -q '"riskyPatterns":\[\]'; then
    echo "✅ Safe patterns correctly identified as safe"
else
    echo "❌ Safe patterns incorrectly flagged as risky"
    exit 1
fi

# Test 2: Dangerous rm patterns should fail
echo ""
echo "❌ Test 2: Dangerous rm patterns (should fail)"
echo "---------------------------------------------"
if yarn cli copilot audit-auto-approve --settings-file commands/copilot/test-data/dangerous-rm-patterns.json --allow-prefix "safe" --json | grep -q '"riskyPatterns":\[[^]]'; then
    echo "✅ Dangerous rm patterns correctly flagged as risky"
else
    echo "❌ Dangerous rm patterns not flagged"
    exit 1
fi

# Test 3: System privilege dangers should fail
echo ""
echo "❌ Test 3: System privilege dangers (should fail)"
echo "------------------------------------------------"
if yarn cli copilot audit-auto-approve --settings-file commands/copilot/test-data/system-privilege-dangers.json --allow-prefix "safe" --json | grep -q '"riskyPatterns":\[[^]]'; then
    echo "✅ System privilege dangers correctly flagged"
else
    echo "❌ System privilege dangers not flagged"
    exit 1
fi

# Test 4: Remote code injection should fail
echo ""
echo "❌ Test 4: Remote code injection (should fail)"
echo "---------------------------------------------"
if yarn cli copilot audit-auto-approve --settings-file commands/copilot/test-data/remote-code-injection.json --allow-prefix "safe" --json | grep -q '"riskyPatterns":\[[^]]'; then
    echo "✅ Remote code injection correctly flagged"
else
    echo "❌ Remote code injection not flagged"
    exit 1
fi

# Test 5: Sensitive access should fail
echo ""
echo "❌ Test 5: Sensitive access (should fail)"
echo "----------------------------------------"
if yarn cli copilot audit-auto-approve --settings-file commands/copilot/test-data/sensitive-access.json --allow-prefix "safe" --json | grep -q '"riskyPatterns":\[[^]]'; then
    echo "✅ Sensitive access correctly flagged"
else
    echo "❌ Sensitive access not flagged"
    exit 1
fi

# Test 6: Syntax validation should fail
echo ""
echo "❌ Test 6: Syntax validation (should fail)"
echo "-----------------------------------------"
if yarn cli copilot audit-auto-approve --settings-file commands/copilot/test-data/syntax-validation.json --allow-prefix "safe" --json | grep -q '"riskyPatterns":\[[^]]'; then
    echo "✅ Syntax validation correctly flagged issues"
else
    echo "❌ Syntax validation issues not flagged"
    exit 1
fi

# Test 7: Auto-scan mode
echo ""
echo "📊 Test 7: Auto-scan prefix health"
echo "----------------------------------"
yarn cli copilot audit-auto-approve --settings-file commands/copilot/test-data/dangerous-rm-patterns.json --scan-prefixes

echo ""
echo "🎉 All tests passed! The audit tool is working correctly."