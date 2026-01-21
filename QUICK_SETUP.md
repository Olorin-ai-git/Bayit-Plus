# Quick Security Setup - FIXED

**Time:** 5 minutes

## Issue Fixed ✅

The YAML syntax error has been fixed. Here's the corrected setup:

## Step-by-Step Setup

### 1. Add detect-secrets to your PATH

Add this line to your `~/.zshrc` file:

```bash
export PATH="/Users/olorin/Library/Python/3.9/bin:$PATH"
```

Then reload your shell:

```bash
source ~/.zshrc
```

**Or** just run this for the current session:

```bash
export PATH="/Users/olorin/Library/Python/3.9/bin:$PATH"
```

### 2. Verify tools are installed

```bash
which pre-commit
which detect-secrets
which gitleaks
```

If `gitleaks` is missing (optional):

```bash
brew install gitleaks
```

### 3. Install pre-commit hooks

```bash
cd /Users/olorin/Documents/olorin
pre-commit install --install-hooks
```

### 4. Create secrets baseline

```bash
detect-secrets scan > .secrets.baseline
```

### 5. Test pre-commit (optional - may take 1-2 minutes)

```bash
pre-commit run --all-files
```

Some hooks may fail on first run (formatting issues) - this is normal. They'll auto-fix the issues.

## Test Secret Detection

```bash
echo "mongodb+srv://user:password@host" > test-secret.txt
git add test-secret.txt
git commit -m "Test"
```

**Expected:** Pre-commit hook blocks the commit ✅

**Clean up:**

```bash
rm test-secret.txt
git reset HEAD
```

## Automated Setup Script

Or just run the setup script:

```bash
./SETUP_COMMANDS.sh
```

## Make PATH Permanent

To avoid adding PATH every time, add to `~/.zshrc`:

```bash
echo 'export PATH="/Users/olorin/Library/Python/3.9/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## What's Fixed

✅ YAML syntax error in .pre-commit-config.yaml (line 116)
✅ detect-secrets installed via pip3
✅ Deprecated stage names migrated
✅ Setup commands simplified for zsh

## Daily Use

Just commit normally:

```bash
git add .
git commit -m "Your changes"
```

Pre-commit runs automatically! No manual steps needed.

## If Pre-commit Fails

1. **Review the error messages** - they tell you what's wrong
2. **Fix the issues** - format code, remove secrets, etc.
3. **Try again** - commit again after fixing

To bypass (use sparingly):

```bash
git commit --no-verify -m "Your message"
```

## Support

- Quick issues: Check this file
- Full guide: `docs/SECURITY_SETUP.md`
- Secrets guide: `SECRETS.md`
