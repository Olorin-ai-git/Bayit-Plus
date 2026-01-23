#!/bin/bash
# Quick setup commands for Bayit-Plus security
# Run these commands one by one

echo "=== Bayit-Plus Security Setup ==="
echo ""

# Step 1: Add detect-secrets to PATH
echo "Step 1: Adding detect-secrets to PATH..."
# Use configured Python bin path or detect from environment
PYTHON_BIN_PATH="${PYTHON_BIN_PATH:-${HOME}/Library/Python/3.9/bin}"
export PATH="${PYTHON_BIN_PATH}:$PATH"
echo "✅ PATH updated (using: ${PYTHON_BIN_PATH})"
echo ""

# Step 2: Verify tools are installed
echo "Step 2: Verifying tools..."
if command -v pre-commit &> /dev/null; then
    echo "✅ pre-commit: $(which pre-commit)"
else
    echo "❌ pre-commit not found. Run: brew install pre-commit"
fi

if command -v detect-secrets &> /dev/null; then
    echo "✅ detect-secrets: $(which detect-secrets)"
else
    echo "❌ detect-secrets not found (but should be in PATH now)"
fi

if command -v gitleaks &> /dev/null; then
    echo "✅ gitleaks: $(which gitleaks)"
else
    echo "⚠️  gitleaks not found. Run: brew install gitleaks (optional)"
fi
echo ""

# Step 3: Install pre-commit hooks
echo "Step 3: Installing pre-commit hooks..."
pre-commit install --install-hooks
echo "✅ Hooks installed"
echo ""

# Step 4: Create secrets baseline
echo "Step 4: Creating secrets baseline..."
detect-secrets scan --baseline .secrets.baseline
echo "✅ Baseline created"
echo ""

# Step 5: Test setup
echo "Step 5: Testing pre-commit hooks..."
echo "Running pre-commit on all files (this may take a minute)..."
pre-commit run --all-files || echo "Some hooks may need fixing - this is normal on first run"
echo ""

echo "=== Setup Complete! ==="
echo ""
echo "To make PATH permanent, add this to your ~/.zshrc:"
echo '  export PATH="/Users/olorin/Library/Python/3.9/bin:$PATH"'
echo ""
echo "Then run: source ~/.zshrc"
echo ""
echo "Test your setup:"
echo '  echo "mongodb+srv://user:pass@host" > test.txt'
echo '  git add test.txt'
echo '  git commit -m "Test"'
echo '  # Should be blocked by pre-commit'
echo '  rm test.txt'
echo '  git reset HEAD'
