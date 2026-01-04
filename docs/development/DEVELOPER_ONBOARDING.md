# Developer Onboarding - Pre-Commit Hooks

**Version**: 1.0.0  
**Author**: Gil Klainert  
**Created**: 2025-01-08  
**Last Updated**: 2025-01-08  

## Welcome to the Olorin Development Team

This guide will help you set up the pre-commit hook system that enforces our **ZERO TOLERANCE policy for mock data**. This system is essential for maintaining the integrity of our enterprise fraud detection platform.

## Pre-Onboarding Checklist

Before you begin, ensure you have completed these prerequisites:

- [ ] **System Access**: Valid access to the Olorin Git repository
- [ ] **Development Environment**: Python 3.11+, Git 2.20+, and your preferred IDE
- [ ] **Team Introduction**: Attended orientation session covering mock data policy
- [ ] **Documentation Access**: Read the [executive overview](PRE_COMMIT_HOOKS_SETUP.md#executive-overview)
- [ ] **Account Setup**: Configured Git with your name and email
- [ ] **SSH Keys**: Set up SSH keys for secure repository access

## Quick Setup (5 Minutes)

### Step 1: Repository Setup

```bash
# Clone the repository (if not already done)
git clone git@github.com:olorin/olorin.git
cd olorin

# Verify you're on the correct branch
git branch -a
git checkout main

# Verify project structure
ls -la scripts/setup-hooks.sh
```

### Step 2: Automated Installation

Execute the one-command setup:

```bash
# Run the comprehensive setup
./scripts/setup-hooks.sh install --onboarding

# Expected output:
🚀 Olorin Developer Onboarding - Pre-Commit Hooks
==================================================
✅ Environment validation complete
✅ Pre-commit hooks installed
✅ Mock detection engine active
✅ Configuration validated
✅ System integration complete
🎉 Welcome to the team! You're ready to develop safely.
```

### Step 3: Installation Verification

Verify everything is working correctly:

```bash
# Run comprehensive validation
./scripts/setup-hooks.sh test --verbose

# Expected validation results:
🔍 Hook System Validation Report
================================
✅ Git hooks directory: CONFIGURED
✅ Mock detection engine: OPERATIONAL (45.2 files/sec)
✅ Pre-commit framework: ACTIVE
✅ Configuration files: VALID
✅ Pattern matching: FUNCTIONAL (248 patterns loaded)
✅ Exclusion rules: ACTIVE (15 directories, 23 files)
✅ Performance benchmark: PASSED
✅ Integration test: SUCCESSFUL
```

## Your First Commit Test

Test the system with a safe practice commit:

### Step 1: Create Test Change

```bash
# Create a safe test file
echo "# Developer Onboarding Test - $(date)" > ONBOARDING_TEST.md
echo "Hello from $(git config user.name)!" >> ONBOARDING_TEST.md
```

### Step 2: Stage and Commit

```bash
# Stage the file
git add ONBOARDING_TEST.md

# Attempt commit (hooks will run automatically)
git commit -m "onboard: Test pre-commit hooks for new developer"
```

### Step 3: Observe Hook Execution

You should see this output:

```
Mock Data Detection Hook ────────────────────────────────────────
🔍 Scanning staged files for mock data violations...
📊 Processing 1 file(s) with 248 detection patterns
⚡ Processed 1 files in 0.02s (50.0 files/sec)
✅ PASSED - No mock data detected

Security Pattern Scan ───────────────────────────────────────────
🔒 Scanning for security violations...
✅ No hardcoded credentials detected
✅ No sensitive information found

Code Quality Checks ─────────────────────────────────────────────
✅ Trailing whitespace: CLEAN
✅ YAML syntax: VALID
✅ File encoding: UTF-8
✅ Line endings: LF

🎉 All pre-commit hooks passed! Commit proceeding...
[main abc1234] onboard: Test pre-commit hooks for new developer
 1 file changed, 2 insertions(+)
 create mode 100644 ONBOARDING_TEST.md
```

### Step 4: Clean Up Test

```bash
# Remove the test file
git rm ONBOARDING_TEST.md
git commit -m "cleanup: Remove onboarding test file"
```

## Understanding Hook Behavior

### What Triggers the Hooks

Pre-commit hooks run automatically during these Git operations:

- **`git commit`**: Primary trigger, scans staged files
- **`git merge`**: Scans files involved in merge conflicts
- **`git rebase`**: Scans files during rebase operations
- **`git cherry-pick`**: Scans cherry-picked changes

### Hook Execution Sequence

When you commit, hooks execute in this order:

1. **Mock Data Detection** (CRITICAL)
   - Scans all staged files
   - Applies 248+ detection patterns
   - Blocks commit if violations found

2. **Security Scanning** (HIGH)
   - Checks for hardcoded credentials
   - Scans for sensitive data patterns
   - Validates encryption usage

3. **Code Quality** (MEDIUM)
   - Validates syntax and formatting
   - Checks file encodings
   - Enforces line ending standards

4. **Documentation Validation** (LOW)
   - Validates markdown syntax
   - Checks for broken links
   - Ensures documentation completeness

### Success vs. Failure Scenarios

#### ✅ Successful Commit Example

```bash
# Good: Clean code with no violations
echo "def calculate_fraud_score(data):" > fraud_calc.py
echo "    return analyze_patterns(data)" >> fraud_calc.py

git add fraud_calc.py
git commit -m "feat: Add fraud score calculation function"

# Output: All hooks pass, commit succeeds
```

#### ❌ Failed Commit Example

```bash
# Bad: Code contains mock data
echo "test_data = {'mockdata': 'fake_account'}" > bad_code.py

git add bad_code.py
git commit -m "test: Add test data"

# Output:
Mock Data Detection Hook ────────────────────────────────────────
❌ FAILED - Mock data violations detected:

File: bad_code.py
Line 1: test_data = {'mockdata': 'fake_account'}
         Pattern: mockdata (CRITICAL)
         Severity: CRITICAL - Blocks commit

🚫 Commit aborted due to mock data violations
Fix the violations above and retry your commit.
```

## Common Development Workflows

### Feature Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/user-authentication

# 2. Develop your feature (hooks run on each commit)
echo "# User authentication module" > auth.py
git add auth.py
git commit -m "feat: Initialize user authentication module"

# 3. Continue development with safe commits
echo "def authenticate_user(credentials):" >> auth.py
echo "    return validate_credentials(credentials)" >> auth.py
git add auth.py
git commit -m "feat: Add user authentication function"

# 4. Final validation before push
./scripts/setup-hooks.sh test
git push origin feature/user-authentication
```

### Bug Fix Workflow

```bash
# 1. Create bugfix branch
git checkout -b bugfix/investigation-memory-leak

# 2. Identify and fix the issue
# Make your changes...
git add .
git commit -m "fix: Resolve memory leak in investigation module"

# 3. Test fix doesn't introduce new issues
./scripts/setup-hooks.sh test --comprehensive
git push origin bugfix/investigation-memory-leak
```

### Hotfix Workflow

```bash
# 1. Create hotfix from main
git checkout main
git checkout -b hotfix/critical-security-patch

# 2. Apply minimal fix
# Make necessary changes...
git add .
git commit -m "hotfix: Patch critical security vulnerability"

# 3. Emergency validation
./scripts/setup-hooks.sh test --fast
git push origin hotfix/critical-security-patch
```

## Working with Legitimate Test Data

Sometimes you need to work with test data for legitimate purposes. Here's how to do it correctly:

### Test File Naming Conventions

Use these patterns for test files to avoid false positives:

```bash
# ✅ Good test file names (automatically excluded)
test_user_authentication.py       # Starts with 'test_'
auth_module.test.js               # Contains '.test.'
user_spec.py                      # Contains 'spec'
integration.test.ts               # Contains '.test.'

# ❌ Bad test file names (will trigger detection)
user_mockdata.py                 # Contains 'mockdata'
fake_authentication.py           # Contains 'fake'
dummy_users.json                # Contains 'dummy'
```

### Using Test Fixtures

Place test fixtures in designated directories:

```bash
# ✅ Correct test fixture locations (auto-excluded)
test/fixtures/user_data.json
tests/data/sample_transactions.json
spec/fixtures/investigation_cases.yaml

# ❌ Incorrect locations (will be scanned)
src/user_data.json              # In source directory
lib/sample_data.py              # In library directory
```

### Test Data Best Practices

#### Use Real-Structure, Anonymized Data

```python
# ✅ Good: Real structure, anonymized content
test_user = {
    "id": "usr_1234567890abcdef",
    "email": "john.doe.test@example.com",
    "account_type": "premium",
    "created_at": "2023-01-01T00:00:00Z"
}

# ❌ Bad: Obviously fake data
mock_user = {
    "id": "fake123",
    "email": "dummy@mockdata.com",
    "account_type": "test_account"
}
```

#### Use Realistic Value Patterns

```python
# ✅ Good: Realistic patterns
transaction_data = {
    "amount": 1250.00,
    "currency": "USD",
    "merchant": "Coffee Shop Downtown",
    "category": "food_and_drink"
}

# ❌ Bad: Obvious test patterns
transaction_data = {
    "amount": 999999.99,
    "currency": "FAKE",
    "merchant": "Test Store",
    "category": "mock_category"
}
```

### Adding Custom Exclusions

If you need to work with files that trigger false positives:

#### Project-Level Exclusions

Edit `.mockignore` file:

```bash
# Add to scripts/git-hooks/.mockignore
integration/test_data/
docs/examples/api_samples/
config/development/*.example.json
```

#### Pattern-Specific Exclusions

Edit `mock-detection-config.yml`:

```yaml
detection:
  exclusions:
    patterns:
      - ".*integration.*test.*"      # Integration test patterns
      - ".*example.*data.*"          # Example data files
      - ".*\\.fixture\\."            # Fixture files
```

## IDE Integration Setup

### Visual Studio Code

#### Required Extensions

Install these extensions for optimal development experience:

```json
// .vscode/extensions.json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.flake8",
    "ms-vscode.vscode-json", 
    "redhat.vscode-yaml",
    "eamodio.gitlens",
    "ms-python.black-formatter"
  ]
}
```

#### Workspace Settings

Configure VS Code settings:

```json
// .vscode/settings.json
{
  "python.defaultInterpreterPath": "python3",
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "git.enableCommitSigning": true,
  "git.allowForcePush": false,
  "editor.formatOnSave": true,
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true
}
```

#### Debugging Configuration

Set up debugging for hook development:

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Mock Detection",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/scripts/git-hooks/detect-mock-data.py",
      "args": ["--file", "${file}", "--verbose"],
      "console": "integratedTerminal"
    }
  ]
}
```

#### Tasks for Common Operations

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Validate Pre-commit Hooks",
      "type": "shell",
      "command": "./scripts/setup-hooks.sh",
      "args": ["test"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "Install Hooks",
      "type": "shell", 
      "command": "./scripts/setup-hooks.sh",
      "args": ["install"],
      "group": "build"
    },
    {
      "label": "Update Hook Configuration",
      "type": "shell",
      "command": "./scripts/setup-hooks.sh", 
      "args": ["update"],
      "group": "build"
    }
  ]
}
```

### PyCharm/IntelliJ Setup

#### Git Integration Settings

1. Go to **File → Settings → Version Control → Git**
2. Configure these settings:
   - ✅ Enable "Use credential helper"
   - ✅ Enable "Update branches information"
   - ✅ Enable "Warn if CRLF line separators are about to be committed"

#### External Tools Configuration

1. Go to **File → Settings → Tools → External Tools**
2. Add these tools:

**Hook Validation Tool**:
- Name: `Validate Hooks`
- Program: `./scripts/setup-hooks.sh`
- Arguments: `test`
- Working directory: `$ProjectFileDir$`

**Hook Installation Tool**:
- Name: `Install Hooks`
- Program: `./scripts/setup-hooks.sh`
- Arguments: `install`
- Working directory: `$ProjectFileDir$`

#### Code Inspection Configuration

1. Go to **File → Settings → Editor → Inspections**
2. Enable Python inspections:
   - ✅ Python → Code quality tools → Flake8
   - ✅ Python → Naming conventions
   - ✅ Python → Unused code

### Vim/Neovim Integration

Add to your `.vimrc` or `init.vim`:

```vim
" Pre-commit hook integration
nnoremap <leader>hv :!./scripts/setup-hooks.sh test<CR>
nnoremap <leader>hi :!./scripts/setup-hooks.sh install<CR>
nnoremap <leader>hu :!./scripts/setup-hooks.sh update<CR>

" Git integration with hooks
nnoremap <leader>gc :Git commit --verbose<CR>
nnoremap <leader>gp :Git push<CR>

" Auto-format on save
autocmd BufWritePre *.py execute ':Black'
```

## Troubleshooting Common Issues

### Installation Issues

#### Problem: Permission Denied

```bash
# Symptom
./scripts/setup-hooks.sh install
bash: ./scripts/setup-hooks.sh: Permission denied

# Solution
chmod +x scripts/setup-hooks.sh
chmod +x scripts/git-hooks/*.py
chmod +x scripts/git-hooks/*.sh
```

#### Problem: Python Version Conflicts

```bash
# Symptom
Error: Python 3.11+ required, found 3.9

# Solution
# Install Python 3.11 using pyenv
curl https://pyenv.run | bash
pyenv install 3.11.7
pyenv global 3.11.7

# Verify installation
python3 --version
```

#### Problem: Git Configuration Issues

```bash
# Symptom
Error: Git user configuration not found

# Solution
git config --global user.name "Your Name"
git config --global user.email "your.email@company.com"

# Verify configuration
git config --list | grep -E "(user.name|user.email)"
```

### Runtime Issues

#### Problem: Hooks Not Running

```bash
# Symptom
Commits succeed without hook output

# Diagnosis
ls -la .git/hooks/
cat .git/hooks/pre-commit

# Solution
./scripts/setup-hooks.sh install --force
./scripts/setup-hooks.sh test
```

#### Problem: False Positive Detection

```bash
# Symptom
Hook blocks legitimate test file

# Temporary bypass (emergency only)
git commit --no-verify -m "emergency: Bypass hooks for urgent fix"

# Permanent solution
# Add file to exclusions
echo "path/to/your/file.py" >> scripts/git-hooks/.mockignore
./scripts/setup-hooks.sh update
```

#### Problem: Slow Hook Execution

```bash
# Symptom
Hooks take more than 30 seconds to run

# Diagnosis
./scripts/setup-hooks.sh benchmark

# Solution
# Edit performance settings
vim scripts/git-hooks/mock-detection-config.yml

# Adjust these values:
performance:
  thread_count: 6          # Increase for more CPU cores
  max_file_size: 5242880   # Reduce to skip large files
  enable_caching: true     # Enable result caching
```

### Integration Issues

#### Problem: IDE Not Recognizing Hooks

```bash
# Solution
# Refresh Git configuration in your IDE
git config --list | grep -E "core\."

# For VS Code specifically
Command Palette → "Developer: Reload Window"

# For PyCharm specifically
File → Invalidate Caches and Restart
```

#### Problem: CI/CD Failures

```bash
# Symptom
Hooks pass locally but fail in CI/CD

# Solution
# Check CI environment
export CI_MODE=true
./scripts/setup-hooks.sh install --ci-mode
./scripts/setup-hooks.sh test --comprehensive
```

## Getting Help

### First Line of Support

1. **Check Documentation**: Review this guide and [PRE_COMMIT_HOOKS_SETUP.md](PRE_COMMIT_HOOKS_SETUP.md)
2. **Self-Diagnosis**: Run `./scripts/setup-hooks.sh test --verbose`
3. **Review Logs**: Check `.hook-setup.log` for error details

### Team Support Channels

- **Slack**: #dev-tools channel for immediate help
- **Email**: devops-team@olorin.com for complex issues
- **Issues**: Create GitHub issue with label `pre-commit-hooks`
- **Office Hours**: DevOps office hours every Tuesday 2-3 PM

### Escalation Process

1. **Level 1**: Self-service using documentation and tools
2. **Level 2**: Team support via Slack or email  
3. **Level 3**: DevOps team direct assistance
4. **Level 4**: Senior engineering team involvement

### Emergency Bypass (Use Sparingly)

In genuine emergencies only:

```bash
# Temporary bypass for critical fixes
git commit --no-verify -m "emergency: Critical security patch"

# Immediately after emergency, fix the issue properly
./scripts/setup-hooks.sh test
git commit -m "fix: Resolve mock data violations from emergency commit"
```

**⚠️ Warning**: Emergency bypasses are logged and reviewed. Use only for genuine production emergencies.

## Best Practices for New Developers

### Development Workflow

1. **Always pull before starting work**:
   ```bash
   git pull origin main
   ./scripts/setup-hooks.sh update
   ```

2. **Create focused, small commits**:
   - One logical change per commit
   - Clear, descriptive commit messages
   - Test each commit independently

3. **Use feature branches for all work**:
   ```bash
   git checkout -b feature/your-feature-name
   # Do your work
   git push origin feature/your-feature-name
   ```

### Code Quality Standards

1. **Follow naming conventions**:
   - Use descriptive variable names
   - Avoid abbreviations and acronyms
   - Follow PEP 8 for Python, ESLint for JavaScript

2. **Write comprehensive tests**:
   - Unit tests for all new functions
   - Integration tests for new features
   - End-to-end tests for user workflows

3. **Document your code**:
   - Docstrings for all functions and classes
   - README updates for new features
   - Architecture documentation for complex changes

### Security Consciousness

1. **Never commit sensitive data**:
   - API keys, passwords, tokens
   - Database connection strings
   - Personal information

2. **Use environment variables**:
   ```python
   # ✅ Good
   api_key = os.environ.get('API_KEY')
   
   # ❌ Bad
   api_key = 'sk-1234567890abcdef'
   ```

3. **Validate inputs**:
   - Always sanitize user input
   - Use parameterized queries
   - Validate file uploads

## Next Steps

### Week 1 Goals

- [ ] Complete hook installation and validation
- [ ] Make your first 5 commits successfully
- [ ] Configure your IDE integration
- [ ] Join #dev-tools Slack channel
- [ ] Attend next team standup

### Month 1 Goals

- [ ] Contribute to 3 different modules
- [ ] Submit your first pull request
- [ ] Complete security training
- [ ] Mentor another new developer
- [ ] Suggest improvement to documentation

### Ongoing Development

- [ ] Subscribe to hook system updates
- [ ] Participate in code reviews
- [ ] Contribute to team knowledge base
- [ ] Attend monthly DevOps meetings
- [ ] Maintain local development environment

## Additional Resources

### Documentation References

- [Technical Reference Guide](MOCK_DETECTION_REFERENCE.md)
- [Administrator's Guide](HOOKS_ADMINISTRATION.md)
- [Troubleshooting Guide](TROUBLESHOOTING_GUIDE.md)
- [Configuration Guide](../hooks/configuration-guide.md)

### Training Materials

- **Video Tutorial**: "Pre-commit Hooks Walkthrough" (30 minutes)
- **Interactive Guide**: Online hook simulator at `/training/hooks`
- **Best Practices**: Team coding standards document
- **Security Training**: Mandatory security awareness course

### External Resources

- [Pre-commit Framework Documentation](https://pre-commit.com/)
- [Git Hooks Tutorial](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [Python Style Guide](https://pep8.org/)
- [Security Best Practices](https://owasp.org/www-project-top-ten/)

---

## Welcome to the Team! 🎉

You're now equipped with the knowledge and tools to develop safely within the Olorin fraud detection platform. Remember:

- **Zero tolerance for mock data** - the hooks are your safety net
- **Ask questions early and often** - the team is here to help
- **Quality over speed** - we'd rather have correct code than fast code
- **Security is everyone's responsibility** - stay vigilant

Welcome aboard, and happy coding!

---

*This onboarding guide is maintained by the Olorin DevOps team. If you notice any gaps or have suggestions for improvement, please let us know via #dev-tools or create an issue.*