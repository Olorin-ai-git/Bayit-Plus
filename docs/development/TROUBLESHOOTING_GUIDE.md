# Pre-Commit Hooks Troubleshooting Guide

**Version**: 1.0.0  
**Author**: Gil Klainert  
**Created**: 2025-01-08  
**Last Updated**: 2025-01-08  

## Overview

This comprehensive troubleshooting guide helps resolve common issues with the Olorin pre-commit hook system that enforces **ZERO TOLERANCE for mock data**. The guide is organized by problem category with specific solutions, diagnostic commands, and prevention strategies.

## Table of Contents

- [Quick Diagnostic Commands](#quick-diagnostic-commands)
- [Installation Issues](#installation-issues)
- [Runtime Issues](#runtime-issues)
- [Performance Issues](#performance-issues)
- [Configuration Issues](#configuration-issues)
- [Integration Issues](#integration-issues)
- [False Positive Management](#false-positive-management)
- [Emergency Procedures](#emergency-procedures)
- [Advanced Troubleshooting](#advanced-troubleshooting)

## Quick Diagnostic Commands

Before diving into specific issues, run these diagnostic commands to understand your system state:

### System Health Check

```bash
# Complete system diagnostic
./scripts/setup-hooks.sh test --comprehensive --verbose

# Expected output sections:
# ✅ Environment validation
# ✅ Hook installation status  
# ✅ Configuration validation
# ✅ Pattern compilation
# ✅ Performance benchmark
# ✅ Integration test
```

### Essential Status Commands

```bash
# Check hook installation
ls -la .git/hooks/pre-commit*
cat .git/hooks/pre-commit

# Verify script permissions  
ls -la scripts/setup-hooks.sh
ls -la scripts/git-hooks/detect-mock-data.py

# Test configuration
python3 -c "import yaml; yaml.safe_load(open('scripts/git-hooks/mock-detection-config.yml'))"

# Verify dependencies
python3 -c "import yaml, re, threading, json"
pre-commit --version

# Check git configuration
git config --list | grep -E "(hooks|core)"
```

### Log File Locations

```bash
# Hook setup logs
tail -f .hook-setup.log

# Detection execution logs  
tail -f .mock-detection.log

# Violation logs
tail -f .mock-violations.log

# Performance logs
tail -f .hook-performance.log
```

## Installation Issues

### Issue: Permission Denied Errors

**Symptoms**:
```bash
./scripts/setup-hooks.sh install
-bash: ./scripts/setup-hooks.sh: Permission denied
```

**Root Cause**: Script files lack execute permissions

**Solution**:
```bash
# Fix script permissions
chmod +x scripts/setup-hooks.sh
chmod +x scripts/git-hooks/detect-mock-data.py
chmod +x scripts/git-hooks/pre-commit-hook.sh
chmod +x scripts/git-hooks/validate-system.py

# Fix directory permissions if needed
chmod 755 scripts/git-hooks/

# Verify permissions
ls -la scripts/setup-hooks.sh
ls -la scripts/git-hooks/
```

**Prevention**:
- Always clone repository with proper permissions
- Add permission check to setup script
- Include permission verification in CI/CD

### Issue: Python Version Conflicts

**Symptoms**:
```bash
Error: Python 3.11+ required, found 3.9
ModuleNotFoundError: No module named 'yaml'
```

**Root Cause**: Incompatible Python version or missing dependencies

**Diagnosis**:
```bash
# Check Python version
python3 --version
which python3

# Check available Python versions
ls /usr/bin/python*
ls /usr/local/bin/python*

# Check module availability
python3 -c "import sys; print(sys.path)"
python3 -c "import yaml" 2>&1 || echo "yaml module missing"
```

**Solution Option 1: Use pyenv (Recommended)**:
```bash
# Install pyenv if not present
curl https://pyenv.run | bash

# Install Python 3.11
pyenv install 3.11.7
pyenv global 3.11.7

# Restart shell and verify
python3 --version

# Install dependencies
pip3 install pyyaml pre-commit
```

**Solution Option 2: Virtual Environment**:
```bash
# Create virtual environment with system Python 3.11
python3.11 -m venv hook-venv
source hook-venv/bin/activate

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install pyyaml pre-commit

# Update setup script to use virtual environment
export PYTHON_PATH="$(pwd)/hook-venv/bin/python"
./scripts/setup-hooks.sh install
```

**Solution Option 3: System Package Manager**:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3.11 python3.11-pip python3-yaml

# macOS with Homebrew
brew install python@3.11
pip3.11 install pyyaml pre-commit

# CentOS/RHEL
sudo yum install python3.11 python3-pip
pip3.11 install pyyaml pre-commit
```

### Issue: Git Configuration Problems

**Symptoms**:
```bash
Error: Git user configuration not found
fatal: not a git repository
```

**Root Cause**: Git not configured properly or not in a Git repository

**Diagnosis**:
```bash
# Check if in git repository
git status

# Check git configuration
git config --list
git config user.name
git config user.email

# Check git hooks path
git config core.hooksPath
```

**Solution**:
```bash
# Configure git user (if missing)
git config --global user.name "Your Name"
git config --global user.email "your.email@company.com"

# Initialize git repository (if not a repo)
git init
git add .
git commit -m "Initial commit"

# Reset hooks path (if misconfigured)
git config core.hooksPath .git/hooks

# Verify configuration
git config --list | grep -E "(user|core.hooks)"
```

### Issue: Pre-commit Framework Installation

**Symptoms**:
```bash
pre-commit: command not found
ImportError: No module named 'pre_commit'
```

**Root Cause**: Pre-commit framework not installed or not in PATH

**Solution**:
```bash
# Install pre-commit via pip
pip3 install pre-commit

# Verify installation
pre-commit --version
which pre-commit

# If still not found, check PATH
echo $PATH
export PATH="$HOME/.local/bin:$PATH"

# Make PATH change permanent
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Alternative installation methods
# Via system package manager
sudo apt install pre-commit  # Ubuntu/Debian
brew install pre-commit       # macOS

# Via conda
conda install -c conda-forge pre-commit
```

## Runtime Issues

### Issue: Hooks Not Executing

**Symptoms**:
```bash
# Commits succeed without any hook output
git add file.py
git commit -m "test commit"
[main abc1234] test commit  # No hook messages
```

**Root Cause**: Hooks not installed or disabled

**Diagnosis**:
```bash
# Check if hooks exist
ls -la .git/hooks/
cat .git/hooks/pre-commit

# Check git hooks configuration
git config core.hooksPath

# Check for emergency bypass
ls -la .emergency-bypass
cat .emergency-bypass 2>/dev/null || echo "No bypass active"

# Test hook execution manually
.git/hooks/pre-commit
```

**Solution**:
```bash
# Reinstall hooks
./scripts/setup-hooks.sh install --force

# Reset git hooks path
git config core.hooksPath .git/hooks

# Remove any emergency bypass
rm -f .emergency-bypass

# Test installation
./scripts/setup-hooks.sh test

# Verify with test commit
echo "test" > test-file.txt
git add test-file.txt
git commit -m "test: verify hooks working"
git reset --soft HEAD~1  # Undo test commit
git reset test-file.txt
rm test-file.txt
```

### Issue: Hook Execution Failures

**Symptoms**:
```bash
Mock Data Detection Hook ────────────────────────────────────
Traceback (most recent call last):
  File "scripts/git-hooks/detect-mock-data.py", line 1, in <module>
    import yaml
ModuleNotFoundError: No module named 'yaml'
```

**Root Cause**: Missing dependencies or environment issues

**Diagnosis**:
```bash
# Test Python environment used by hooks
which python3
python3 --version
python3 -c "import yaml, re, threading, json"

# Check script syntax
python3 -m py_compile scripts/git-hooks/detect-mock-data.py

# Check configuration file
python3 -c "
import yaml
with open('scripts/git-hooks/mock-detection-config.yml') as f:
    config = yaml.safe_load(f)
    print('Configuration loaded successfully')
"
```

**Solution**:
```bash
# Install missing dependencies
pip3 install pyyaml

# If using virtual environment, activate it first
source hook-venv/bin/activate
pip install pyyaml

# Update shebang in hook scripts if needed
sed -i '1s|^#!/usr/bin/env python3|#!/usr/bin/env python3.11|' scripts/git-hooks/detect-mock-data.py

# Reinstall hooks with correct Python path
export PYTHON_PATH="$(which python3)"
./scripts/setup-hooks.sh install --force
```

### Issue: False Positive Detections

**Symptoms**:
```bash
❌ FAILED - Mock data violations detected:

File: tests/test_user_service.py
Line 15: user_data = create_test_user()
         Pattern: test.*user (HIGH)
         Severity: HIGH - Blocks commit
```

**Root Cause**: Legitimate test code triggering detection patterns

**Diagnosis**:
```bash
# Check if file should be excluded
cat scripts/git-hooks/.mockignore | grep -E "(test|spec)"

# Verify file path patterns
echo "tests/test_user_service.py" | grep -E "test.*\.py$"

# Check detection configuration
grep -A10 -B10 "exclusions:" scripts/git-hooks/mock-detection-config.yml
```

**Solution Option 1: Add to Exclusions**:
```bash
# Add file to .mockignore
echo "tests/test_user_service.py" >> scripts/git-hooks/.mockignore

# Or add pattern-based exclusion
echo "tests/**/test_*.py" >> scripts/git-hooks/.mockignore

# Update hooks configuration
./scripts/setup-hooks.sh update
```

**Solution Option 2: Configure Pattern Exclusions**:
```yaml
# Edit scripts/git-hooks/mock-detection-config.yml
detection:
  exclusions:
    directories:
      - "test/"
      - "tests/"
      - "__tests__/"
    files:
      - "*.test.py"
      - "*.spec.py"
      - "*_test.py"
    patterns:
      - "test_.*\.py$"
      - ".*_test\.py$"
      - ".*\.test\."
```

**Solution Option 3: Adjust Pattern Sensitivity**:
```yaml
# Lower severity for test-related patterns
detection:
  patterns:
    high:
      - "test.*user"  # Move from critical to high
    medium:
      - "create.*test"  # Move from high to medium
```

## Performance Issues

### Issue: Slow Hook Execution

**Symptoms**:
```bash
Mock Data Detection Hook ────────────────────────────────────
🔍 Scanning 150 files for mock data patterns...
⏱️  Processing taking longer than expected (45+ seconds)
```

**Root Cause**: Suboptimal configuration for large repositories or limited resources

**Diagnosis**:
```bash
# Run performance benchmark
./scripts/setup-hooks.sh benchmark

# Check system resources
top -p $(pgrep -f detect-mock-data.py)
free -h
nproc

# Profile hook execution
time ./scripts/git-hooks/detect-mock-data.py --profile src/

# Check file count and sizes
find . -name "*.py" -o -name "*.js" -o -name "*.ts" | wc -l
find . -name "*.py" -o -name "*.js" -o -name "*.ts" -exec wc -l {} + | tail -1
```

**Solution Option 1: Optimize Thread Configuration**:
```yaml
# Edit scripts/git-hooks/mock-detection-config.yml
performance:
  thread_count: 8              # Increase for more CPU cores
  max_threads: 12             # Set reasonable upper limit
  timeout: 60                 # Increase timeout
  
  # Enable parallel processing
  parallel_processing: true
  batch_size: 200            # Larger batches for better throughput
```

**Solution Option 2: Implement File Size Limits**:
```yaml
performance:
  max_file_size: 5242880      # 5MB limit (down from 10MB)
  skip_large_files: true      # Skip instead of failing
  
  # Enable streaming for large files
  streaming_mode: true
  chunk_size: 1048576        # 1MB chunks
```

**Solution Option 3: Enable Caching**:
```yaml
performance:
  enable_caching: true        # Cache results
  cache_size: 2000           # Increase cache size
  cache_ttl: 7200            # 2 hour TTL
  
  # Enable persistent caching
  persistent_cache: true
  cache_file: ".hook-cache.json"
```

**Solution Option 4: Reduce Pattern Complexity**:
```bash
# Profile pattern performance
python3 -c "
import re
import time
patterns = ['mock.*data', 'fake.*user', 'dummy.*test']
test_text = 'This is a sample text with mock data'

for pattern in patterns:
    compiled = re.compile(pattern, re.IGNORECASE)
    start = time.time()
    for _ in range(10000):
        compiled.search(test_text)
    end = time.time()
    print(f'{pattern}: {end-start:.4f}s')
"

# Optimize slow patterns in configuration
```

### Issue: High Memory Usage

**Symptoms**:
```bash
# System becomes unresponsive during hook execution
# Out of memory errors
MemoryError: Unable to allocate memory for pattern matching
```

**Root Cause**: Large files or inefficient memory usage

**Diagnosis**:
```bash
# Monitor memory usage
ps aux | grep detect-mock-data.py
pmap $(pgrep detect-mock-data.py)

# Check for large files
find . -name "*.py" -o -name "*.js" -size +10M

# Profile memory usage
python3 -m memory_profiler scripts/git-hooks/detect-mock-data.py file.py
```

**Solution**:
```yaml
# Configure memory limits
performance:
  memory_limit: 512           # 512MB total limit
  max_memory_per_thread: 128  # 128MB per thread
  
  # Enable memory optimization
  streaming_mode: true        # Stream large files
  garbage_collection: true   # Force GC
  
  # Reduce thread count if needed
  thread_count: 2            # Lower thread count
  batch_size: 25            # Smaller batches
```

## Configuration Issues

### Issue: Invalid YAML Configuration

**Symptoms**:
```bash
yaml.scanner.ScannerError: while parsing a block mapping
  in "mock-detection-config.yml", line 10, column 3
expected <block end>, but found '<block mapping start>'
```

**Root Cause**: Syntax errors in YAML configuration file

**Diagnosis**:
```bash
# Validate YAML syntax
python3 -c "
import yaml
try:
    with open('scripts/git-hooks/mock-detection-config.yml') as f:
        yaml.safe_load(f)
    print('YAML is valid')
except yaml.YAMLError as e:
    print(f'YAML error: {e}')
"

# Use online YAML validator or yamllint
pip3 install yamllint
yamllint scripts/git-hooks/mock-detection-config.yml
```

**Solution**:
```bash
# Common YAML fixes:

# 1. Fix indentation (use spaces, not tabs)
sed 's/\t/  /g' scripts/git-hooks/mock-detection-config.yml > temp.yml
mv temp.yml scripts/git-hooks/mock-detection-config.yml

# 2. Quote strings with special characters
# Change: pattern: test.*data
# To:     pattern: "test.*data"

# 3. Fix list syntax
# Wrong:
# patterns:
# - pattern1
# - pattern2

# Correct:
# patterns:
#   - pattern1
#   - pattern2

# 4. Validate after fixing
python3 -c "
import yaml
with open('scripts/git-hooks/mock-detection-config.yml') as f:
    config = yaml.safe_load(f)
print('Configuration loaded successfully')
"
```

### Issue: Pattern Compilation Errors

**Symptoms**:
```bash
re.error: bad escape \d at position 5
Pattern compilation failed: invalid.*\d{
```

**Root Cause**: Invalid regular expression patterns in configuration

**Diagnosis**:
```bash
# Test pattern compilation
python3 -c "
import re
import yaml

with open('scripts/git-hooks/mock-detection-config.yml') as f:
    config = yaml.safe_load(f)

patterns = config['detection']['patterns']
for severity, pattern_list in patterns.items():
    print(f'Testing {severity} patterns:')
    for pattern in pattern_list:
        try:
            re.compile(pattern, re.IGNORECASE)
            print(f'  ✅ {pattern}')
        except re.error as e:
            print(f'  ❌ {pattern}: {e}')
"
```

**Solution**:
```bash
# Fix common regex issues:

# 1. Escape backslashes
# Wrong: \d+
# Right: \\d+

# 2. Fix unescaped special characters
# Wrong: test.data
# Right: test\.data

# 3. Balance parentheses and brackets
# Wrong: test(data
# Right: test\(data or test(data)

# 4. Use raw strings in configuration (quote with single quotes)
detection:
  patterns:
    critical:
      - 'test\.data\d+'
      - 'mock\w*data'

# 5. Validate patterns using the pattern manager
python3 scripts/admin/pattern-management.py validate --config scripts/git-hooks/mock-detection-config.yml
```

### Issue: Missing Configuration Files

**Symptoms**:
```bash
FileNotFoundError: [Errno 2] No such file or directory: 'scripts/git-hooks/mock-detection-config.yml'
```

**Root Cause**: Configuration files missing or in wrong location

**Solution**:
```bash
# Check if files exist
ls -la scripts/git-hooks/mock-detection-config.yml
ls -la scripts/git-hooks/.mockignore

# Restore from backup if available
ls -la backups/hook-system-*/

# Or recreate configuration
./scripts/setup-hooks.sh install --reset-config

# Verify restoration
./scripts/setup-hooks.sh test --config-only
```

## Integration Issues

### Issue: CI/CD Integration Failures

**Symptoms**:
```bash
# GitHub Actions failure
Error: The process 'python3' failed with exit code 1
scripts/git-hooks/detect-mock-data.py: Permission denied
```

**Root Cause**: Environment differences between local and CI/CD

**Diagnosis**:
```bash
# Check CI environment
echo "Python version: $(python3 --version)"
echo "Working directory: $(pwd)"
echo "User: $(whoami)"
echo "PATH: $PATH"

# Check file permissions
ls -la scripts/git-hooks/detect-mock-data.py
```

**Solution for GitHub Actions**:
```yaml
# Add to workflow
- name: Setup Hook Environment
  run: |
    chmod +x scripts/git-hooks/detect-mock-data.py
    pip3 install pyyaml
    
- name: Run Mock Data Detection  
  env:
    CI_MODE: true
    HOOK_TIMEOUT: 300
  run: |
    python3 scripts/git-hooks/detect-mock-data.py \
      --config scripts/git-hooks/mock-detection-config.yml \
      --ci-mode \
      --timeout 300 \
      src/
```

**Solution for Jenkins**:
```groovy
pipeline {
  stages {
    stage('Setup') {
      steps {
        sh '''
          chmod +x scripts/git-hooks/detect-mock-data.py
          pip3 install --user pyyaml
          export PATH="$HOME/.local/bin:$PATH"
        '''
      }
    }
    
    stage('Mock Data Detection') {
      environment {
        CI_MODE = 'true'
        PYTHONPATH = "${env.WORKSPACE}/scripts"
      }
      steps {
        sh '''
          export PATH="$HOME/.local/bin:$PATH"
          python3 scripts/git-hooks/detect-mock-data.py \
            --config scripts/git-hooks/mock-detection-config.yml \
            --format jenkins \
            src/
        '''
      }
    }
  }
}
```

### Issue: IDE Integration Problems

**Symptoms**:
```bash
# VS Code not showing hook violations
# PyCharm not recognizing hook configuration
```

**Root Cause**: IDE not configured for hook integration

**Solution for VS Code**:
```json
// .vscode/settings.json
{
  "python.defaultInterpreterPath": "python3",
  "python.terminal.activateEnvironment": true,
  
  // Configure problem matcher for hook output
  "problemMatchers": [
    {
      "name": "mock-data-detection",
      "pattern": {
        "regexp": "^(.*):(\\d+):\\s+(.*?)\\s+\\((CRITICAL|HIGH|MEDIUM|LOW)\\)$",
        "file": 1,
        "line": 2, 
        "message": 3,
        "severity": 4
      }
    }
  ]
}

// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Check Mock Data",
      "type": "shell",
      "command": "python3",
      "args": [
        "scripts/git-hooks/detect-mock-data.py",
        "--config", "scripts/git-hooks/mock-detection-config.yml", 
        "${file}"
      ],
      "problemMatcher": "$mock-data-detection",
      "group": "test"
    }
  ]
}
```

**Solution for PyCharm**:
```bash
# Add external tool in PyCharm:
# File → Settings → Tools → External Tools → Add

# Tool settings:
Name: Mock Data Check
Description: Check file for mock data violations
Program: python3
Arguments: scripts/git-hooks/detect-mock-data.py --config scripts/git-hooks/mock-detection-config.yml $FilePath$
Working directory: $ProjectFileDir$
```

## False Positive Management

### Issue: Legitimate Test Files Flagged

**Symptoms**:
```bash
❌ File: tests/unit/test_fraud_detector.py
Line 25: mock_transaction_data = {...}
Pattern: mock.*data (CRITICAL)
```

**Root Cause**: Test files not properly excluded from scanning

**Solution Hierarchy**:

#### 1. Directory-Level Exclusions (Preferred)
```yaml
# scripts/git-hooks/mock-detection-config.yml
detection:
  exclusions:
    directories:
      - "test/"
      - "tests/"
      - "__tests__/"
      - "spec/"
      - "**/test/"
      - "**/tests/"
```

#### 2. File Pattern Exclusions
```yaml
detection:
  exclusions:
    files:
      - "*.test.py"
      - "*.spec.py"  
      - "*_test.py"
      - "test_*.py"
      - "*.test.js"
      - "*.spec.js"
```

#### 3. Content-Based Exclusions
```yaml
detection:
  exclusions:
    patterns:
      - ".*test.*mock.*"     # Allow mock in test contexts
      - ".*spec.*fake.*"     # Allow fake in spec contexts
      - ".*fixture.*dummy.*" # Allow dummy in fixture contexts
```

#### 4. File-Specific Exclusions (.mockignore)
```bash
# Add specific files to scripts/git-hooks/.mockignore
tests/unit/test_fraud_detector.py
tests/integration/test_investigation_flow.py
src/test_data/legitimate_test_fixture.json
```

### Issue: Documentation Examples Flagged

**Symptoms**:
```bash
❌ File: docs/api/examples.md
Line 45: ```json
{"example_data": "sample value"}
```
Pattern: example.*data (MEDIUM)
```

**Solution**:
```yaml
# Configure exclusions for documentation
detection:
  exclusions:
    directories:
      - "docs/"
      - "documentation/"
      - "examples/"
    
    files:
      - "README.md"
      - "*.example.*"
      - "*.sample.*"
      
    # Allow examples in documentation context
    context_exclusions:
      - pattern: "example.*data"
        contexts: ["docs", "readme", "markdown"]
```

### Issue: Configuration Template Files

**Symptoms**:
```bash
❌ File: config/database.template.yml  
Line 10: host: "localhost"
         username: "sample_user"
Pattern: sample.*user (HIGH)
```

**Solution**:
```bash
# Add template exclusions
echo "config/*.template.*" >> scripts/git-hooks/.mockignore
echo "config/*.example.*" >> scripts/git-hooks/.mockignore
echo "templates/" >> scripts/git-hooks/.mockignore

# Or configure pattern-based exclusions
detection:
  exclusions:
    patterns:
      - ".*template.*"
      - ".*\.example\."
      - "config/.*sample.*"
```

## Emergency Procedures

### Issue: Critical Production Deployment Blocked

**Scenario**: Production deployment blocked by hook violation during critical incident

**Emergency Bypass Procedure**:
```bash
# Step 1: Assess the situation
echo "🚨 EMERGENCY BYPASS REQUEST"
echo "Incident ID: $(date +%Y%m%d-%H%M%S)"
echo "Requester: $(whoami)"
echo "Reason: Critical production deployment"

# Step 2: Document the bypass
./scripts/admin/emergency-bypass.sh request \
  "Critical production deployment - Security incident response" \
  2 \
  "$(whoami)" \
  "INC-$(date +%Y%m%d-%H%M%S)"

# Step 3: Get approval (if required)
# Contact admin team for bypass approval
# Use bypass token provided by admin

# Step 4: Apply temporary bypass (with approval)
git commit --no-verify -m "emergency: Critical security patch deployment"

# Step 5: Immediate follow-up
# Create issue for post-incident cleanup
# Schedule violation remediation
# Document in incident report
```

### Issue: Mass False Positive Event

**Scenario**: Pattern update causes widespread false positives blocking all development

**Mass Remediation Procedure**:
```bash
# Step 1: Identify the problematic pattern
./scripts/setup-hooks.sh test --debug | grep "Pattern matched:"

# Step 2: Temporarily disable pattern
cp scripts/git-hooks/mock-detection-config.yml scripts/git-hooks/mock-detection-config.yml.backup

python3 -c "
import yaml
with open('scripts/git-hooks/mock-detection-config.yml') as f:
    config = yaml.safe_load(f)

# Remove problematic pattern temporarily
problematic_pattern = 'test.*user'  # Replace with actual pattern
for severity in config['detection']['patterns']:
    if problematic_pattern in config['detection']['patterns'][severity]:
        config['detection']['patterns'][severity].remove(problematic_pattern)
        print(f'Removed {problematic_pattern} from {severity}')

with open('scripts/git-hooks/mock-detection-config.yml', 'w') as f:
    yaml.dump(config, f)
"

# Step 3: Update hooks across team
./scripts/admin/distribute-config-updates.sh emergency-fix

# Step 4: Analyze and fix pattern
./scripts/admin/analyze-pattern-issues.sh problematic_pattern

# Step 5: Deploy corrected pattern
# After testing, deploy corrected pattern
./scripts/admin/distribute-config-updates.sh corrected-pattern
```

### Issue: Complete Hook System Failure

**Scenario**: Hook system completely non-functional, blocking all commits

**System Recovery Procedure**:
```bash
# Step 1: Immediate assessment
./scripts/admin/system-recovery.sh diagnose

# Step 2: Create system backup
./scripts/admin/system-recovery.sh backup

# Step 3: Attempt automated repair
./scripts/admin/system-recovery.sh repair

# Step 4: If repair fails, restore from backup
LATEST_BACKUP=$(ls -t backups/hook-system-* | head -1)
./scripts/admin/system-recovery.sh restore "$LATEST_BACKUP"

# Step 5: If restore fails, emergency reinstall
./scripts/setup-hooks.sh install --emergency --reset-all

# Step 6: Validate recovery
./scripts/setup-hooks.sh test --comprehensive

# Step 7: Team notification
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🔄 Hook system recovery completed. All developers can resume normal operations."}' \
  "$SLACK_WEBHOOK_URL"
```

## Advanced Troubleshooting

### Deep System Analysis

#### Hook Execution Tracing

```bash
# Enable detailed tracing
export HOOK_DEBUG=1
export HOOK_TRACE=1

# Trace hook execution
strace -f -o hook-trace.log git commit -m "test"

# Analyze trace output
grep -E "(open|read|write|exec)" hook-trace.log | grep -v "/proc"

# Profile Python execution
python3 -m cProfile -o hook-profile.prof scripts/git-hooks/detect-mock-data.py test-file.py

# Analyze profile
python3 -c "
import pstats
stats = pstats.Stats('hook-profile.prof')
stats.sort_stats('cumulative')
stats.print_stats(20)
"
```

#### Network and I/O Analysis

```bash
# Monitor file I/O
iotop -p $(pgrep detect-mock-data.py)

# Network connections (if using remote config)
netstat -p | grep python3

# Disk usage analysis
du -sh scripts/git-hooks/
df -h .

# Memory mapping analysis
pmap -x $(pgrep detect-mock-data.py)
```

#### Advanced Debugging Techniques

```python
#!/usr/bin/env python3
# debug-hook-execution.py

import sys
import os
import logging
import traceback
from pathlib import Path

# Add scripts to path
sys.path.insert(0, str(Path(__file__).parent / 'scripts'))

# Configure debug logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('hook-debug.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

try:
    # Import and test hook components
    from git_hooks.detect_mock_data import MockDataDetector
    
    logger.info("Starting debug session")
    
    # Test detector initialization
    detector = MockDataDetector()
    logger.info("Detector initialized successfully")
    
    # Test configuration loading
    detector.load_config('scripts/git-hooks/mock-detection-config.yml')
    logger.info("Configuration loaded successfully")
    
    # Test pattern compilation
    patterns = detector.get_compiled_patterns()
    logger.info(f"Compiled {len(patterns)} patterns")
    
    # Test file scanning
    test_file = sys.argv[1] if len(sys.argv) > 1 else 'README.md'
    results = detector.scan_file(test_file)
    logger.info(f"Scan completed: {len(results.violations)} violations found")
    
    for violation in results.violations:
        logger.info(f"Violation: {violation.line}:{violation.pattern} ({violation.severity})")
        
except Exception as e:
    logger.error(f"Debug session failed: {e}")
    logger.error(traceback.format_exc())
    sys.exit(1)
```

### Performance Profiling and Optimization

#### Custom Performance Monitor

```python
#!/usr/bin/env python3
# performance-monitor.py

import time
import psutil
import threading
import json
from datetime import datetime
from pathlib import Path

class HookPerformanceMonitor:
    def __init__(self, output_file='hook-performance-analysis.json'):
        self.output_file = output_file
        self.monitoring = False
        self.metrics = []
        
    def start_monitoring(self, target_pid=None):
        """Start monitoring hook process performance"""
        self.monitoring = True
        self.target_pid = target_pid or self._find_hook_process()
        
        monitor_thread = threading.Thread(target=self._monitor_loop)
        monitor_thread.daemon = True
        monitor_thread.start()
        
    def _find_hook_process(self):
        """Find running hook process"""
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                cmdline = ' '.join(proc.info['cmdline'] or [])
                if 'detect-mock-data.py' in cmdline:
                    return proc.info['pid']
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return None
        
    def _monitor_loop(self):
        """Main monitoring loop"""
        if not self.target_pid:
            return
            
        try:
            process = psutil.Process(self.target_pid)
            start_time = time.time()
            
            while self.monitoring and process.is_running():
                metrics = {
                    'timestamp': datetime.now().isoformat(),
                    'elapsed_time': time.time() - start_time,
                    'cpu_percent': process.cpu_percent(),
                    'memory_mb': process.memory_info().rss / 1024 / 1024,
                    'threads': process.num_threads(),
                    'open_files': len(process.open_files()),
                    'io_counters': process.io_counters()._asdict() if hasattr(process, 'io_counters') else {}
                }
                
                self.metrics.append(metrics)
                time.sleep(0.1)  # 100ms sampling
                
        except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
            self.monitoring = False
            
    def stop_monitoring(self):
        """Stop monitoring and save results"""
        self.monitoring = False
        
        # Save metrics to file
        with open(self.output_file, 'w') as f:
            json.dump({
                'monitoring_session': {
                    'start_time': self.metrics[0]['timestamp'] if self.metrics else None,
                    'end_time': self.metrics[-1]['timestamp'] if self.metrics else None,
                    'total_samples': len(self.metrics)
                },
                'metrics': self.metrics,
                'analysis': self._analyze_metrics()
            }, f, indent=2)
            
    def _analyze_metrics(self):
        """Analyze collected metrics"""
        if not self.metrics:
            return {}
            
        cpu_values = [m['cpu_percent'] for m in self.metrics]
        memory_values = [m['memory_mb'] for m in self.metrics]
        
        return {
            'duration_seconds': self.metrics[-1]['elapsed_time'],
            'avg_cpu_percent': sum(cpu_values) / len(cpu_values),
            'max_cpu_percent': max(cpu_values),
            'avg_memory_mb': sum(memory_values) / len(memory_values),
            'peak_memory_mb': max(memory_values),
            'memory_growth_mb': memory_values[-1] - memory_values[0] if len(memory_values) > 1 else 0
        }

# Usage example
if __name__ == '__main__':
    monitor = HookPerformanceMonitor()
    
    print("Starting performance monitoring...")
    monitor.start_monitoring()
    
    # Run hook system
    import subprocess
    result = subprocess.run([
        'python3', 'scripts/git-hooks/detect-mock-data.py',
        '--config', 'scripts/git-hooks/mock-detection-config.yml',
        'src/'
    ], capture_output=True, text=True)
    
    monitor.stop_monitoring()
    
    print(f"Hook execution completed with exit code: {result.returncode}")
    print(f"Performance analysis saved to: {monitor.output_file}")
```

---

## Getting Additional Help

### Internal Support Channels

1. **Immediate Help**: #dev-tools Slack channel
2. **Complex Issues**: devops-team@olorin.com  
3. **System-wide Problems**: Create GitHub issue with `pre-commit-hooks` label
4. **Emergency Support**: Page on-call DevOps engineer

### External Resources

- [Git Hooks Documentation](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [Pre-commit Framework](https://pre-commit.com/)
- [Python Regex Documentation](https://docs.python.org/3/library/re.html)
- [YAML Syntax Guide](https://yaml.org/spec/1.2/spec.html)

### Information to Include When Seeking Help

When reporting issues, always include:

```bash
# System information
uname -a
python3 --version
git --version

# Hook system status
./scripts/setup-hooks.sh test --verbose > system-status.txt 2>&1

# Recent logs
tail -100 .hook-setup.log > recent-logs.txt
tail -100 .mock-violations.log >> recent-logs.txt

# Configuration
cat scripts/git-hooks/mock-detection-config.yml > current-config.yml
```

---

## Summary

This troubleshooting guide covers the most common issues encountered with the Olorin pre-commit hook system. The system enforces **ZERO TOLERANCE for mock data** while providing comprehensive diagnostic and recovery procedures to minimize disruption to development workflows.

For issues not covered in this guide, follow the escalation procedures to get expert assistance from the DevOps team.

---

*This troubleshooting guide is maintained by the Olorin DevOps team and updated based on real-world support cases. If you encounter new issues or have suggestions for improvement, please contribute to the documentation.*