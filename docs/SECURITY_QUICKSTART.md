# Security Setup - Quick Start Guide

**Time required:** 10 minutes

This guide gets you up and running with the essential security tools for Bayit-Plus development.

## Prerequisites

- macOS with Homebrew installed
- Python 3.11+ installed
- Access to the Bayit-Plus repository

## Quick Setup (3 Commands)

### 1. Install Tools (2 minutes)

```bash
# Install pre-commit and security tools
brew install pre-commit gitleaks
pip install detect-secrets
```

### 2. Initialize Pre-commit Hooks (1 minute)

```bash
cd /Users/olorin/Documents/Bayit-Plus

# Install pre-commit hooks
pre-commit install

# Run on all files to test (takes ~1 minute)
pre-commit run --all-files
```

### 3. Create Secrets Baseline (2 minutes)

```bash
# Scan for existing secrets and create baseline
detect-secrets scan --baseline .secrets.baseline

# Audit to mark false positives (optional - can skip for now)
detect-secrets audit .secrets.baseline
```

## ✅ You're Done!

Your local environment is now protected. The pre-commit hooks will automatically:

- ✅ Block commits with secrets
- ✅ Format code (Black, Prettier)
- ✅ Run linters (Flake8)
- ✅ Validate YAML/JSON files
- ✅ Detect private keys

## Test Your Setup (1 minute)

```bash
# This should be BLOCKED by pre-commit hooks
echo "mongodb+srv://user:password@host" > test-secret.txt
git add test-secret.txt
git commit -m "Test"

# Expected result: Pre-commit hook blocks the commit
# Error message: "Detected secrets in staged files"

# Clean up
rm test-secret.txt
git reset HEAD
```

If the commit was blocked, you're all set! ✅

## Optional: git-secrets (Additional Protection)

For additional protection when pre-commit is bypassed (e.g., `git commit --no-verify`):

```bash
# Run the setup script
./scripts/setup-git-secrets.sh
```

This adds git-level secret detection as a second layer of defense.

## What Happens Next?

### Every Commit

Pre-commit hooks automatically run before each commit:

```bash
git commit -m "Your changes"
# Pre-commit runs automatically:
#   ✅ check-secrets
#   ✅ detect-private-key
#   ✅ black (format Python)
#   ✅ prettier (format JS/TS)
#   ✅ flake8 (lint Python)
#   ✅ check-yaml
#   ... and more
```

### Every Push to GitHub

CI/CD security scans run automatically:

- TruffleHog secret scanning
- GitLeaks pattern detection
- Dependency vulnerability scanning (pip-audit, npm audit)
- Code quality analysis (Bandit, Semgrep)
- Configuration validation

## Troubleshooting

### Pre-commit hook fails

```bash
# Update hooks to latest version
pre-commit autoupdate

# Clear cache and rerun
pre-commit clean
pre-commit run --all-files
```

### "Command not found: pre-commit"

```bash
# Ensure Homebrew installed it
brew install pre-commit

# Or use pip
pip install pre-commit
```

### Hook blocks legitimate code

If a hook incorrectly blocks valid code:

```bash
# Skip hooks ONLY if absolutely necessary
git commit --no-verify -m "Your message"

# ⚠️ Use sparingly - defeats the security protection
```

Then report the false positive to the team so we can update the configuration.

## Daily Workflow

### Starting a New Feature

1. **Create your branch:**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Copy environment template (first time only):**
   ```bash
   cp backend/.env.example backend/.env
   # Fill in your local development values
   ```

3. **Develop normally** - hooks run automatically on commit

### Making Commits

Just commit normally:

```bash
git add .
git commit -m "Add new feature"
# Hooks run automatically ✅
```

If hooks fail, fix the issues and try again:

```bash
# Fix the issues (format code, remove secrets, etc.)
git add .
git commit -m "Add new feature"
# Should pass now ✅
```

## Need More Details?

See the comprehensive guides:

- **Full setup guide:** `docs/SECURITY_SETUP.md`
- **Secrets management:** `SECRETS.md`
- **Security review:** `docs/SECURITY_REVIEW_SUMMARY.md`

## Support

- Security issues: security@bayit.com
- DevOps support: devops@bayit.com
- Documentation issues: File a GitHub issue

---

**Setup time:** ~10 minutes
**Protection level:** Excellent ✅
**Maintenance:** Automatic
