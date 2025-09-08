# Pre-commit Hooks Troubleshooting Guide

**Author**: Gil Klainert  
**Created**: 2025-01-08  
**Version**: 1.0.0

Comprehensive troubleshooting guide for the pre-commit hooks system, covering common issues, debugging techniques, and resolution procedures.

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Common Issues](#common-issues)
- [Debug Procedures](#debug-procedures)
- [Error Categories](#error-categories)
- [Recovery Procedures](#recovery-procedures)
- [Performance Issues](#performance-issues)
- [Emergency Procedures](#emergency-procedures)

## Quick Diagnostics

### Run System Health Check

```bash
# Comprehensive diagnostics
./scripts/setup-hooks.sh doctor

# Quick validation
./scripts/validate-hooks.sh

# Basic pre-commit check
pre-commit --version && echo "✅ Pre-commit installed"
```

### Check Installation Status

```bash
# Verify hook files exist
ls -la .git/hooks/pre-commit .git/hooks/commit-msg .git/hooks/pre-push

# Check configuration validity
pre-commit validate-config

# Test mock detection
python3 scripts/git-hooks/detect-mock-data.py --help
```

## Common Issues

### 1. Installation Problems

#### Pre-commit Not Found

**Symptoms:**
```bash
$ pre-commit --version
command not found: pre-commit
```

**Diagnosis:**
```bash
# Check if installed in user directory
ls ~/.local/bin/pre-commit

# Check PATH
echo $PATH | grep -o ~/.local/bin
```

**Solutions:**
```bash
# Option 1: Add to PATH
export PATH="$HOME/.local/bin:$PATH"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

# Option 2: Reinstall
pip install --user pre-commit

# Option 3: System-wide install (if permissions allow)
sudo pip install pre-commit
```

#### Python Version Issues

**Symptoms:**
```bash
ModuleNotFoundError: No module named 'xyz'
SyntaxError: invalid syntax (Python 2.x running Python 3.x code)
```

**Diagnosis:**
```bash
# Check Python versions
python --version
python3 --version
which python3

# Check pre-commit Python version
pre-commit run --version
```

**Solutions:**
```bash
# Update .pre-commit-config.yaml
default_language_version:
  python: python3.11  # or your Python version

# Reinstall with correct Python
python3 -m pip install --user pre-commit

# Force hook reinstall
pre-commit clean
pre-commit install --install-hooks
```

### 2. Hook Execution Failures

#### Mock Detection Script Not Executable

**Symptoms:**
```bash
Permission denied: scripts/git-hooks/detect-mock-data.py
```

**Solutions:**
```bash
# Fix permissions
chmod +x scripts/git-hooks/detect-mock-data.py
chmod +x scripts/setup-hooks.sh
chmod +x scripts/validate-hooks.sh

# Verify permissions
ls -la scripts/git-hooks/detect-mock-data.py
```

#### Missing Dependencies

**Symptoms:**
```bash
ModuleNotFoundError: No module named 'yaml'
ImportError: No module named 'pathspec'
```

**Solutions:**
```bash
# Install required packages
pip install --user pyyaml pathspec jsonschema

# For development features
pip install --user matplotlib seaborn pandas

# Verify installation
python3 -c "import yaml, pathspec, jsonschema; print('✅ Dependencies OK')"
```

### 3. Configuration Issues

#### Invalid YAML Configuration

**Symptoms:**
```bash
yaml.scanner.ScannerError: mapping values are not allowed here
pre-commit validate-config fails
```

**Diagnosis:**
```bash
# Validate YAML syntax
python3 -c "
import yaml
try:
    with open('.pre-commit-config.yaml') as f:
        yaml.safe_load(f)
    print('✅ YAML valid')
except yaml.YAMLError as e:
    print(f'❌ YAML error: {e}')
"

# Check with yamllint if available
yamllint .pre-commit-config.yaml
```

**Solutions:**
```bash
# Common YAML fixes:
# 1. Fix indentation (use spaces, not tabs)
# 2. Quote strings with special characters
# 3. Check for trailing spaces
# 4. Validate list syntax

# Backup and reset to known good configuration
cp .pre-commit-config.yaml .pre-commit-config.yaml.backup
git checkout HEAD -- .pre-commit-config.yaml
```

#### File Pattern Issues

**Symptoms:**
```bash
re.error: invalid regular expression
Hook not running on expected files
```

**Diagnosis:**
```bash
# Test regex patterns
python3 -c "
import re
pattern = 'your-pattern-here'
try:
    re.compile(pattern)
    print(f'✅ Pattern valid: {pattern}')
except re.error as e:
    print(f'❌ Pattern invalid: {e}')
"
```

**Solutions:**
```bash
# Common pattern fixes:
files: '.*\.(py|js|ts)$'          # Escape dots
exclude: '.*/node_modules/.*'     # Use .* for wildcards

# Test patterns with real files
find . -name "*.py" | head -5 | while read file; do
    echo "$file" | grep -E "your-pattern"
done
```

### 4. Mock Detection Issues

#### False Positives

**Symptoms:**
```bash
Mock data detected in legitimate test files
Documentation examples flagged as violations
```

**Solutions:**
```bash
# 1. Update .mockignore
echo "test/fixtures/legitimate-data.json" >> .mockignore
echo "docs/examples/.*" >> .mockignore

# 2. Adjust exclusion patterns in .pre-commit-config.yaml
exclude: |
  (?x)^(
    .*/test/.*|
    .*/docs/examples/.*|
    .*\.test\..*
  )

# 3. Lower confidence threshold in mock-detection-config.yml
confidence_threshold: 0.8  # Reduce false positives
```

#### False Negatives

**Symptoms:**
```bash
Obvious mock data not detected
Known violations passing through
```

**Solutions:**
```bash
# 1. Test detection manually
python3 scripts/git-hooks/detect-mock-data.py \
  --directory . \
  --fail-on LOW \
  --verbose

# 2. Add custom patterns to mock-detection-config.yml
custom_patterns:
  - pattern: 'your-mock-pattern'
    description: 'Custom mock pattern'
    severity: 'CRITICAL'

# 3. Reduce confidence threshold
confidence_threshold: 0.5  # Catch more potential violations
```

### 5. Performance Issues

#### Slow Hook Execution

**Symptoms:**
```bash
Hooks taking > 30 seconds to complete
Timeout errors during execution
```

**Diagnosis:**
```bash
# Time individual hooks
time pre-commit run detect-mock-data --all-files
time pre-commit run black --all-files

# Profile with verbose output
pre-commit run --all-files --verbose
```

**Solutions:**
```bash
# 1. Optimize file patterns
files: 'src/.*\.(py|js|ts)$'  # Specific directories only
exclude: '.*/node_modules/.*|.*/build/.*'  # Exclude large dirs

# 2. Use staged files for commits
args: ['--staged']  # Only process staged files

# 3. Increase parallel workers
# In mock-detection-config.yml:
parallel_workers: 8  # Increase from default 4

# 4. Skip expensive hooks in development
SKIP=mypy,black pre-commit run --all-files
```

### 6. Git Integration Issues

#### Hooks Not Triggering

**Symptoms:**
```bash
Commits succeed without running hooks
No pre-commit output during git commit
```

**Diagnosis:**
```bash
# Check hook files exist and are executable
ls -la .git/hooks/pre-commit
cat .git/hooks/pre-commit

# Check git configuration
git config --get core.hooksPath
```

**Solutions:**
```bash
# Reinstall hooks
pre-commit uninstall
pre-commit install --install-hooks

# Force hook installation
pre-commit install --overwrite --install-hooks

# Check for custom hooks path
git config --unset core.hooksPath  # Reset to default
```

## Debug Procedures

### Enable Debug Logging

```bash
# Set environment variables
export PRE_COMMIT_COLOR=always
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Run with maximum verbosity
pre-commit run --all-files --verbose --show-diff-on-failure

# Debug specific hook
PRE_COMMIT_DEBUG=1 pre-commit run detect-mock-data --all-files
```

### Manual Hook Testing

```bash
# Test mock detection directly
python3 scripts/git-hooks/detect-mock-data.py \
  --directory . \
  --fail-on CRITICAL \
  --verbose \
  --output-json debug-report.json

# Examine output
cat debug-report.json | python3 -m json.tool
```

### File-by-File Debugging

```bash
# Test on specific files
echo 'mock_data = "test@example.com"' > test_file.py
python3 scripts/git-hooks/detect-mock-data.py --directory . --verbose
rm test_file.py

# Test file patterns
find . -name "*.py" | grep -E "your-pattern" | head -5
```

### Configuration Debugging

```bash
# Validate configuration step by step
python3 -c "
import yaml
with open('.pre-commit-config.yaml') as f:
    config = yaml.safe_load(f)
    print('Repos:', len(config['repos']))
    for repo in config['repos']:
        print(f'  - {repo.get(\"repo\", \"local\")}')
"

# Test individual hook configuration
pre-commit try-repo . detect-mock-data --verbose
```

## Error Categories

### Category A: Critical Blocking Errors

These prevent hooks from running at all:

1. **Installation Failures**
   - Pre-commit not installed
   - Python version incompatibility
   - Missing system dependencies

2. **Configuration Errors**
   - Invalid YAML syntax
   - Malformed hook definitions
   - Broken file patterns

**Resolution Priority**: IMMEDIATE

### Category B: Hook Execution Errors

These cause specific hooks to fail:

1. **Script Errors**
   - Permission denied
   - Missing Python modules
   - Runtime exceptions

2. **Pattern Matching Issues**
   - Regex compilation errors
   - File encoding problems
   - Path resolution failures

**Resolution Priority**: HIGH

### Category C: Quality Issues

These affect hook effectiveness:

1. **False Positives/Negatives**
   - Incorrect pattern matches
   - Configuration tuning needed
   - Whitelist adjustments required

2. **Performance Problems**
   - Slow execution times
   - Resource consumption
   - Timeout issues

**Resolution Priority**: MEDIUM

## Recovery Procedures

### Emergency Bypass

For critical situations requiring immediate commit:

```bash
# Method 1: Skip all hooks (use sparingly)
git commit --no-verify -m "emergency: critical fix"

# Method 2: Authorized emergency bypass
git commit -m "fix: critical security patch [EMERGENCY-BYPASS]"

# Method 3: Skip specific problematic hook
SKIP=detect-mock-data git commit -m "fix: bypass mock detection temporarily"
```

### Clean Slate Recovery

When hooks are completely broken:

```bash
# 1. Backup current state
cp .pre-commit-config.yaml .pre-commit-config.yaml.broken
cp .git/hooks/pre-commit .git/hooks/pre-commit.broken 2>/dev/null || true

# 2. Remove all hooks
pre-commit uninstall
rm -f .git/hooks/pre-commit .git/hooks/commit-msg .git/hooks/pre-push

# 3. Clean cache
pre-commit clean

# 4. Reinstall from scratch
./scripts/setup-hooks.sh install --force

# 5. Validate installation
./scripts/validate-hooks.sh
```

### Incremental Recovery

For partial failures:

```bash
# 1. Identify failing hook
pre-commit run --all-files 2>&1 | grep "FAILED"

# 2. Disable problematic hook temporarily
# Edit .pre-commit-config.yaml and comment out the failing hook

# 3. Test remaining hooks
pre-commit run --all-files

# 4. Fix the problematic hook
# Address the specific issue (permissions, dependencies, etc.)

# 5. Re-enable and test
# Uncomment the hook and test again
```

### Configuration Rollback

```bash
# 1. Identify last working commit
git log --oneline .pre-commit-config.yaml

# 2. Rollback configuration
git checkout HEAD~1 -- .pre-commit-config.yaml

# 3. Reinstall hooks with old configuration
pre-commit install --install-hooks --overwrite

# 4. Test functionality
pre-commit run --all-files

# 5. Gradually apply changes
# Make incremental changes and test each one
```

## Performance Issues

### Slow Execution Diagnosis

```bash
# Profile execution time
time pre-commit run --all-files

# Identify slow hooks
pre-commit run --all-files --verbose 2>&1 | grep -E "Running|Passed|Failed" | \
  while read line; do echo "$(date '+%H:%M:%S') $line"; done
```

### Memory Usage Issues

```bash
# Monitor memory usage
top -p $(pgrep -f pre-commit) &
pre-commit run --all-files
kill %1

# Check for memory leaks
valgrind --tool=memcheck python3 scripts/git-hooks/detect-mock-data.py \
  --directory small_test_dir --fail-on HIGH
```

### Optimization Strategies

1. **File Filtering**
   ```yaml
   # Be specific about files to process
   files: 'src/.*\.(py|js|ts)$'
   exclude: '.*/tests?/.*|.*/node_modules/.*'
   ```

2. **Parallel Processing**
   ```yaml
   # Allow parallel execution where safe
   require_serial: false
   ```

3. **Staged-Only Processing**
   ```yaml
   # Process only staged files for commits
   args: ['--staged', '--fail-on', 'CRITICAL']
   ```

## Emergency Procedures

### System Down Recovery

When the entire hook system fails:

```bash
#!/bin/bash
# Emergency recovery script

echo "🚨 EMERGENCY HOOK RECOVERY"
echo "========================="

# 1. Disable all hooks immediately
git config --global core.hooksPath /dev/null
echo "✅ Hooks disabled globally"

# 2. Allow critical commits
echo "You can now make critical commits with: git commit -m 'emergency fix'"

# 3. Recovery instructions
echo "To restore hooks later:"
echo "1. git config --global --unset core.hooksPath"
echo "2. ./scripts/setup-hooks.sh install --force"
echo "3. ./scripts/validate-hooks.sh"
```

### Partial Hook Disable

Disable only problematic hooks:

```bash
# Create SKIP environment variable
export SKIP="detect-mock-data,black,mypy"

# Or skip in individual commits
SKIP=detect-mock-data git commit -m "temporary bypass"
```

### Configuration Emergency Reset

```bash
# Reset to minimal working configuration
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
EOF

pre-commit install --install-hooks --overwrite
```

## Getting Help

### Self-Service Resources

1. **Run Diagnostics**
   ```bash
   ./scripts/setup-hooks.sh doctor
   ./scripts/validate-hooks.sh --verbose
   ```

2. **Check Documentation**
   - Configuration Guide: `docs/hooks/configuration-guide.md`
   - Mock Detection Guide: `docs/hooks/mock-detection-guide.md`

3. **Examine Logs**
   ```bash
   tail -f .hook-setup.log
   tail -f .hook-validation.log
   tail -f .mock-detection.log
   ```

### Community Support

1. **GitHub Issues**
   - Search existing issues
   - Create detailed bug report
   - Include diagnostic output

2. **Team Resources**
   - Internal documentation wiki
   - Team chat channels
   - Code review feedback

### Creating Bug Reports

Include this information:

```bash
# System information
uname -a
python3 --version
pre-commit --version
git --version

# Project information
pwd
git branch --show-current
git status --porcelain

# Error reproduction
# [exact commands that cause the error]

# Configuration files
cat .pre-commit-config.yaml
cat scripts/git-hooks/mock-detection-config.yml

# Error output
# [complete error messages and stack traces]
```

---

## Prevention Best Practices

1. **Regular Maintenance**
   ```bash
   # Weekly: Update hook versions
   pre-commit autoupdate
   
   # Monthly: Validate installation
   ./scripts/validate-hooks.sh
   
   # Quarterly: Review configuration
   ```

2. **Team Training**
   - Share troubleshooting procedures
   - Document common issues
   - Regular training sessions

3. **Monitoring**
   - Track hook execution times
   - Monitor error rates
   - Performance metrics

4. **Testing**
   - Test changes in feature branches
   - Validate before merging to main
   - Maintain rollback procedures

For immediate assistance with critical issues, contact the development team or create a GitHub issue with detailed diagnostics.