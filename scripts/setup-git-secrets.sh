#!/bin/bash
# Setup git-secrets for Bayit-Plus
# Configures git-secrets with custom patterns to prevent secret commits

set -e  # Exit on error

echo "Setting up git-secrets for Bayit-Plus..."

# Check if git-secrets is installed
if ! command -v git-secrets &> /dev/null; then
    echo "❌ git-secrets is not installed."
    echo "Install it with: brew install git-secrets"
    exit 1
fi

# Initialize git-secrets
echo "Initializing git-secrets..."
git secrets --install --force 2>&1 || true  # Don't fail if already installed

echo "Adding secret detection patterns..."

# Function to safely add pattern
add_pattern() {
    local pattern="$1"
    if git secrets --add "$pattern" 2>&1; then
        echo "  ✅ Added: ${pattern:0:50}..."
    else
        echo "  ⚠️  Failed to add: ${pattern:0:50}..."
    fi
}

# Function to safely add allowed pattern
add_allowed() {
    local pattern="$1"
    if git secrets --add --allowed "$pattern" 2>&1; then
        echo "  ✅ Allowed: ${pattern:0:50}..."
    else
        echo "  ⚠️  Failed to allow: ${pattern:0:50}..."
    fi
}

# OpenAI API Keys
add_pattern 'sk-[a-zA-Z0-9]{48}'
add_pattern 'sk-proj-[a-zA-Z0-9_-]{32,}'

# Anthropic API Keys
add_pattern 'sk-ant-[a-zA-Z0-9\-_]{32,}'

# MongoDB Connection Strings with Credentials
add_pattern 'mongodb\+srv://[^:]+:[^@]+@'

# Stripe Secret Keys
add_pattern 'sk_live_[a-zA-Z0-9]{24,}'
add_pattern 'sk_test_[a-zA-Z0-9]{24,}'
add_pattern 'rk_live_[a-zA-Z0-9]{24,}'
add_pattern 'whsec_[a-zA-Z0-9]{32,}'

# Google API Keys
add_pattern 'AIza[a-zA-Z0-9_-]{35}'

# Generic API Keys
add_pattern 'api[_-]?key["\s:=]+[a-zA-Z0-9_-]{20,}'
add_pattern 'apikey["\s:=]+[a-zA-Z0-9_-]{20,}'

# OAuth Client Secrets
add_pattern 'client[_-]?secret["\s:=]+[a-zA-Z0-9_-]{20,}'

# JWT Tokens
add_pattern 'eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*'

# Passwords in URLs or connection strings
add_pattern '://[^:]+:[^@\s]+@'

# Common secret environment variables
add_pattern 'SECRET_KEY["\s:=]+.{32,}'
add_pattern 'PASSWORD["\s:=]+[^\s]{8,}'

# AWS Keys (if used in future)
add_pattern 'AKIA[0-9A-Z]{16}'

# Generic Bearer tokens
add_pattern '[Bb]earer\s+[a-zA-Z0-9_-]{20,}'

# Slack tokens
add_pattern 'xox[baprs]-[a-zA-Z0-9-]{10,}'

# GitHub tokens
add_pattern 'gh[pousr]_[a-zA-Z0-9]{36,}'

# Twilio credentials
add_pattern 'SK[a-z0-9]{32}'
add_pattern 'AC[a-z0-9]{32}'

# SendGrid
add_pattern 'SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}'

# Sentry DSN
add_pattern 'https://[a-f0-9]{32}@[a-z0-9-]+\.ingest\.sentry\.io/[0-9]+'

# Project-specific patterns (historical secrets)
add_pattern 'Jersey1973!'
add_pattern 'preprdakyres3AVWXWEiZESQdOnynrcYt9h9wwfR'
add_pattern 'AIzaSyDo-Ti4luY_uDTnNfHNHXLhPwIm0ynDbLM'

echo ""
echo "Adding allowed patterns (false positives)..."

# Add allowed patterns (false positives)
add_allowed 'test-secret-key-minimum-32-chars-long'
add_allowed 'test-api-key'
add_allowed 'mock-'
add_allowed 'fake-'
add_allowed 'example-'
add_allowed 'sk_test_'
add_allowed 'pk_test_'
add_allowed '\.env\.example'
add_allowed 'YOUR_.*_HERE'
add_allowed 'PLACEHOLDER'

echo ""
echo "✅ git-secrets configured successfully!"
echo ""
echo "Configuration summary:"
echo "  Total patterns: $(git secrets --list | grep -c '^' || echo '0')"
echo "  Hooks installed: $(ls -1 .git/hooks/pre-commit .git/hooks/commit-msg 2>/dev/null | wc -l)"
echo ""
echo "Test the setup with:"
echo "  echo 'mongodb+srv://user:password@host' > test-secret.txt"
echo "  git add test-secret.txt"
echo "  git commit -m 'Test'"
echo "  # Should be blocked by git-secrets"
echo "  rm test-secret.txt"
echo "  git reset HEAD"
echo ""
echo "To scan all files manually:"
echo "  git secrets --scan"
