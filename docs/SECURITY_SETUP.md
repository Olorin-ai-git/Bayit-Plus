# Security Setup Guide

## Overview

This guide helps you set up the security infrastructure for Bayit-Plus development.

## Prerequisites

- Python 3.11+ (for backend development)
- Node.js 18+ (for frontend development)
- Git 2.30+ (for pre-commit hooks)
- Homebrew (macOS) or equivalent package manager

## Initial Setup

### 1. Install Pre-commit Framework

```bash
# macOS
brew install pre-commit

# Or using pip
pip install pre-commit

# Or using pipx (recommended for global tools)
pipx install pre-commit
```

### 2. Install Security Scanning Tools

```bash
# Install git-secrets (prevents committing secrets)
brew install git-secrets

# Install detect-secrets (Yelp's secret scanner)
pip install detect-secrets

# Install gitleaks (secret scanner)
brew install gitleaks

# Install TruffleHog (secret scanner)
brew install trufflesecurity/trufflehog/trufflehog
```

### 3. Initialize Pre-commit Hooks

```bash
cd /Users/olorin/Documents/olorin

# Install pre-commit hooks
pre-commit install

# Install commit-msg hook (for commit message validation)
pre-commit install --hook-type commit-msg

# Run on all files to test
pre-commit run --all-files
```

### 4. Create Secrets Baseline

```bash
# Scan current repository and create baseline
detect-secrets scan --baseline .secrets.baseline

# Audit the baseline (mark false positives)
detect-secrets audit .secrets.baseline
```

### 5. Configure Git Secrets

```bash
cd /Users/olorin/Documents/olorin

# Initialize git-secrets
git secrets --install

# Add patterns from our custom file
while IFS= read -r pattern; do
  [[ "$pattern" =~ ^#.*$ ]] || [[ -z "$pattern" ]] && continue
  git secrets --add "$pattern"
done < .git-secrets-patterns

# Register git-secrets hooks
git secrets --register-aws  # Add AWS patterns (if needed in future)
```

### 6. Test Security Setup

```bash
# Test pre-commit hooks
echo "mongodb+srv://user:password@cluster.mongodb.net" > test-secret.txt
git add test-secret.txt
git commit -m "Test secret detection"
# Should FAIL and prevent commit

# Clean up test file
rm test-secret.txt
git reset HEAD

# Test on all files
pre-commit run --all-files

# Should see output like:
# ✅ no-commit-to-branch
# ✅ check-case-conflict
# ✅ detect-private-key
# ✅ check-env-files
# ✅ check-secret-patterns
```

## Daily Development Workflow

### Before First Commit

1. **Copy environment templates:**
   ```bash
   cp backend/.env.example backend/.env
   cp web/.env.example web/.env
   # Fill in your local development values (never commit these)
   ```

2. **Verify .env files are gitignored:**
   ```bash
   git check-ignore backend/.env
   # Should output: backend/.env
   ```

### Making Commits

1. **Stage your changes:**
   ```bash
   git add <files>
   ```

2. **Pre-commit hooks run automatically:**
   - Secret detection
   - Code formatting (Black, Prettier)
   - Linting (Flake8, ESLint)
   - YAML/JSON validation

3. **Fix any issues:**
   ```bash
   # If hooks fail, review the output
   # Fix the issues and try again
   git add <fixed-files>
   git commit -m "Your message"
   ```

4. **Hooks pass, commit succeeds:**
   ```bash
   ✅ All checks passed
   [main abc1234] Your commit message
   ```

### If You Accidentally Commit a Secret

**STOP! Do not push!**

```bash
# If secret is in most recent commit (not pushed)
git reset --soft HEAD~1  # Undo commit, keep changes
# Remove the secret from the file
git add <file>
git commit -m "Your message"

# If already pushed, immediately:
1. Rotate the exposed secret in the service provider
2. Contact security team
3. Follow git history cleanup procedure (see SECRETS.md)
```

## Security Checklist

### For Developers

- [ ] Pre-commit hooks installed and working
- [ ] Local .env files created from .env.example
- [ ] Never commit .env files (verified with git check-ignore)
- [ ] Use test/sandbox credentials for local development
- [ ] Know the secret rotation schedule (see SECRETS.md)
- [ ] Understand incident response procedure

### For Code Reviewers

- [ ] No .env files in PR
- [ ] No hardcoded secrets in code changes
- [ ] Configuration uses environment variables
- [ ] .env.example updated if new secrets added
- [ ] Secret Manager updated for new production secrets
- [ ] cloudbuild.yaml updated with new secret bindings

### For DevOps/Security

- [ ] All production secrets in GCP Secret Manager
- [ ] IAM permissions follow least-privilege principle
- [ ] Secret rotation schedule documented and followed
- [ ] Audit logs reviewed monthly
- [ ] Security scanning enabled in CI/CD
- [ ] Incident response plan tested

## Updating Security Configuration

### Adding a New Secret

1. **Add to backend config:**
   ```python
   # backend/app/core/config.py
   class Settings(BaseSettings):
       NEW_SECRET: str = Field(..., description="Description")
   ```

2. **Add to .env.example:**
   ```bash
   # backend/.env.example
   NEW_SECRET=your-secret-value-here
   ```

3. **Add to GCP Secret Manager:**
   ```bash
   gcloud secrets create NEW_SECRET \
     --data-file=<(echo -n "production-value") \
     --project=bayit-plus
   ```

4. **Update cloudbuild.yaml:**
   ```yaml
   --set-secrets=\
     NEW_SECRET=new-secret:latest,\
     # ... other secrets
   ```

5. **Update .git-secrets-patterns (if needed):**
   ```bash
   # Add pattern to detect this secret type
   echo "new-secret-pattern-regex" >> .git-secrets-patterns
   ```

### Adding a New Secret Detection Pattern

1. **Add to .git-secrets-patterns:**
   ```bash
   # .git-secrets-patterns
   new-service-api-key-[a-zA-Z0-9]{32}
   ```

2. **Add to .gitleaks.toml:**
   ```toml
   [[rules]]
   id = "new-service-api-key"
   description = "New Service API key"
   regex = '''new-service-api-key-[a-zA-Z0-9]{32}'''
   tags = ["new-service", "api-key"]
   ```

3. **Reinstall git-secrets patterns:**
   ```bash
   git secrets --add 'new-service-api-key-[a-zA-Z0-9]{32}'
   ```

## Troubleshooting

### Pre-commit hooks not running

```bash
# Reinstall hooks
pre-commit uninstall
pre-commit install

# Check hook installation
ls -la .git/hooks/
# Should see pre-commit symlink
```

### Pre-commit hook fails on clean files

```bash
# Update hooks to latest version
pre-commit autoupdate

# Clear cache and rerun
pre-commit clean
pre-commit run --all-files
```

### Git secrets blocking valid code

If git-secrets blocks a commit that doesn't actually contain secrets:

1. **Review the pattern that triggered:**
   ```bash
   git secrets --list
   ```

2. **Remove overly broad pattern:**
   ```bash
   git secrets --remove-provider 'git secrets --aws-provider'
   ```

3. **Use --allowed pattern (last resort):**
   ```bash
   git secrets --add --allowed 'false-positive-pattern'
   ```

### Detect-secrets baseline update

After legitimate changes that trigger false positives:

```bash
# Update baseline with new findings
detect-secrets scan --baseline .secrets.baseline

# Audit to mark false positives
detect-secrets audit .secrets.baseline
```

## CI/CD Integration

### GitHub Actions

Security scanning runs automatically on:
- Every push to main/develop
- Every pull request
- Weekly scheduled scan (Mondays 9am UTC)

**Workflows:**
- `.github/workflows/security-scan.yml` - Secret scanning, dependency audit

**View results:**
- GitHub Actions tab → Security Scan workflow
- Security tab → Code scanning alerts

### Manual Security Scan

```bash
# Run TruffleHog locally
trufflehog filesystem . --json

# Run GitLeaks locally
gitleaks detect --source . --verbose

# Run detect-secrets
detect-secrets scan
```

## Security Monitoring

### Regular Audits

**Weekly:**
- Review security scan results in CI/CD
- Check for new dependency vulnerabilities

**Monthly:**
- Review GCP Secret Manager access logs
- Audit IAM permissions for Secret Manager
- Check for unused secrets

**Quarterly:**
- Rotate API keys according to schedule
- Review and update secret detection patterns
- Security team penetration testing

### Incident Response

See `SECRETS.md` for detailed incident response procedures.

**Quick reference:**
1. Identify exposed secret
2. Rotate immediately (within 1 hour)
3. Review access logs for unauthorized usage
4. Document incident
5. Root cause analysis
6. Update security controls

## Best Practices Reminder

### ✅ DO

- Use pre-commit hooks on every commit
- Keep .env files local (never commit)
- Use test credentials for development
- Rotate secrets on schedule
- Report security concerns immediately
- Review security scan results weekly
- Use Secret Manager for production
- Validate configuration at startup

### ❌ DON'T

- Never bypass pre-commit hooks with --no-verify
- Never commit .env files
- Never hardcode secrets in code
- Never use production secrets locally
- Never share secrets via email/Slack/screenshots
- Never grant broad Secret Manager access
- Never ignore security scan failures
- Never use world-readable permissions on credential files

## Additional Resources

- **Main documentation:** `SECRETS.md`
- **Configuration:** `backend/app/core/config.py`
- **Cloud Build:** `backend/cloudbuild.yaml`
- **Pre-commit config:** `.pre-commit-config.yaml`
- **GitLeaks config:** `.gitleaks.toml`
- **Security patterns:** `.git-secrets-patterns`

## Support

- **Security issues:** security@bayit.com
- **DevOps support:** devops@bayit.com
- **Emergency:** On-call security team (PagerDuty)

---

Last updated: 2026-01-20
