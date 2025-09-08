# Pre-Commit Hooks Setup Guide

**Version**: 1.0.0  
**Author**: Gil Klainert  
**Created**: 2025-01-08  
**Last Updated**: 2025-01-08  

## Executive Overview

The Olorin enterprise fraud detection platform implements a comprehensive pre-commit hook system to enforce the **ABSOLUTE PROHIBITION against mock data** throughout the codebase. This system is critical for maintaining data integrity, compliance standards, and preventing the introduction of fabricated data that could compromise fraud detection algorithms and regulatory compliance.

### Why Pre-Commit Hooks Are Critical for Olorin

**Fraud Detection Integrity**: Mock data contamination can lead to false positives, skewed ML models, and compromised detection algorithms that could result in financial losses and regulatory violations.

**Compliance Requirements**: Enterprise fraud detection systems must maintain clean, verifiable data chains. Mock data introduces audit trail gaps and compliance risks.

**Financial Impact Prevention**: Automated enforcement prevents costly production incidents, data cleanup operations, and regulatory penalties.

**Development Quality**: Ensures all team members follow consistent data handling practices from the earliest development stages.

## Quick Start Guide (5 Minutes)

### Prerequisites Verification

Before installation, verify your development environment:

```bash
# Verify Python 3.11+ is available
python3 --version

# Verify Git is properly configured
git --version
git config --list | grep -E "(user.name|user.email)"

# Verify project structure
ls -la scripts/setup-hooks.sh
```

### Single Command Installation

Execute the complete installation with one command:

```bash
# From project root directory
./scripts/setup-hooks.sh install
```

**Expected Output**:
```
🔧 Installing Pre-Commit Hooks System...
✅ Git hooks directory created
✅ Mock detection script installed
✅ Configuration files validated
✅ Pre-commit framework configured
✅ System validation completed
🎉 Pre-commit hooks successfully installed!

Next steps:
1. Test the installation: ./scripts/setup-hooks.sh test
2. Review configuration: docs/development/PRE_COMMIT_HOOKS_SETUP.md
3. Integrate with your IDE: See IDE Integration section
```

### Installation Validation

Verify the installation with automated testing:

```bash
# Run system validation
./scripts/setup-hooks.sh test

# Expected validation output
✅ Mock detection engine: OPERATIONAL
✅ Configuration files: VALID
✅ Git hooks: INSTALLED
✅ Pre-commit framework: ACTIVE
✅ Performance benchmark: 45+ files/sec
```

### First Commit Test

Test the hooks with your next commit:

```bash
# Make a small change
echo "# Test change" >> README.md

# Commit to trigger hooks
git add README.md
git commit -m "test: Validate pre-commit hooks"

# Expected hook execution
Mock Data Detection Hook ────────────────────────────────────────
- Scanning 1 file(s) for mock data patterns...
- Processed 1 files in 0.02s (50.0 files/sec)
- Status: ✅ PASSED - No mock data detected

Other Quality Hooks ─────────────────────────────────────────────
✅ Trailing whitespace check
✅ YAML syntax validation
✅ Python syntax validation
✅ Security pattern scan

🎉 All hooks passed! Commit proceeding...
```

## Detailed Installation Guide

### Step 1: Environment Preparation

#### System Requirements

- **Operating System**: macOS, Linux, or Windows with WSL2
- **Python**: Version 3.11 or higher
- **Git**: Version 2.20 or higher
- **Disk Space**: Minimum 50MB for hook system and dependencies
- **Memory**: 512MB available RAM during installation

#### Dependency Installation

Install required Python packages:

```bash
# Install pre-commit framework globally
pip3 install pre-commit

# Verify installation
pre-commit --version
```

#### Project Structure Verification

Ensure your project has the correct structure:

```
olorin/
├── scripts/
│   ├── setup-hooks.sh              # Main installation script
│   ├── validate-hooks.sh           # Validation utilities
│   └── git-hooks/                  # Hook implementation
│       ├── detect-mock-data.py     # Core detection engine
│       ├── mock-detection-config.yml
│       ├── .mockignore
│       └── pre-commit-hook.sh
├── .pre-commit-config.yaml         # Pre-commit configuration
├── .pre-commit-hooks.yaml          # Hook definitions
└── docs/development/               # This documentation
```

### Step 2: Installation Execution

#### Standard Installation

Run the installation script with detailed output:

```bash
# Navigate to project root
cd /path/to/olorin

# Execute installation with verbose logging
./scripts/setup-hooks.sh install --verbose

# Monitor installation log
tail -f .hook-setup.log
```

#### Installation Process Details

The installation script performs these operations:

1. **Environment Validation**
   - Verifies Python 3.11+ availability
   - Checks Git configuration
   - Validates project structure
   - Tests write permissions

2. **Core Component Installation**
   - Copies hook scripts to `.git/hooks/`
   - Installs mock detection engine
   - Configures detection patterns
   - Sets up exclusion rules

3. **Pre-Commit Framework Setup**
   - Installs pre-commit dependencies
   - Configures hook execution order
   - Sets up automatic updates
   - Enables repository-wide enforcement

4. **Configuration Validation**
   - Tests YAML configuration syntax
   - Validates pattern definitions
   - Verifies exclusion rules
   - Benchmarks performance

5. **System Integration**
   - Integrates with existing Git workflow
   - Configures CI/CD compatibility
   - Sets up logging and monitoring
   - Enables audit trail generation

### Step 3: Configuration Customization

#### Basic Configuration

Edit the main configuration file:

```bash
# Open configuration in your preferred editor
vim scripts/git-hooks/mock-detection-config.yml

# Basic configuration structure
detection:
  patterns:
    critical:
      - "mockdata"
      - "mock_data"
      - "testdata"
    high:
      - "fake"
      - "dummy"
      - "sample"
  
  file_types:
    - "*.py"
    - "*.js"
    - "*.ts"
    - "*.json"
  
  exclusions:
    directories:
      - "node_modules/"
      - ".git/"
      - "build/"
    files:
      - "*.test.*"
      - "*.spec.*"

performance:
  max_file_size: 10485760  # 10MB
  thread_count: 4
  timeout: 30

logging:
  level: "INFO"
  audit_enabled: true
  performance_tracking: true
```

#### Pattern Customization

Add project-specific mock data patterns:

```yaml
# Custom patterns for Olorin fraud detection
detection:
  patterns:
    critical:
      - "fraudulent.*data"
      - "synthetic.*transactions"
      - "mock.*investigation"
    high:
      - "test.*case.*data"
      - "simulation.*results"
      - "artificial.*evidence"
    medium:
      - "placeholder.*value"
      - "temporary.*data"
      - "draft.*content"
```

#### Exclusion Management

Configure legitimate file exclusions:

```yaml
detection:
  exclusions:
    directories:
      - "test/fixtures/"          # Test data directories
      - "docs/examples/"          # Documentation examples  
      - "scripts/testing/"        # Testing utilities
    files:
      - "*.test.py"               # Unit tests
      - "*.spec.ts"               # TypeScript specs
      - "*mock*.test.*"           # Mock-related tests
      - "package-lock.json"       # Generated files
    patterns:
      - "^test.*mock.*"           # Test mock patterns
      - ".*\.example\."           # Example files
      - ".*\.template\."          # Template files
```

### Step 4: IDE Integration

#### VS Code Integration

Configure VS Code for seamless hook integration:

1. **Install VS Code Extensions**:
   ```json
   // .vscode/extensions.json
   {
     "recommendations": [
       "ms-python.python",
       "ms-vscode.vscode-json",
       "redhat.vscode-yaml"
     ]
   }
   ```

2. **Configure Settings**:
   ```json
   // .vscode/settings.json
   {
     "python.linting.enabled": true,
     "python.linting.pylintEnabled": false,
     "python.linting.flake8Enabled": true,
     "git.enableCommitSigning": true,
     "git.allowForcePush": false
   }
   ```

3. **Set Up Tasks**:
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
           "reveal": "always"
         }
       }
     ]
   }
   ```

#### PyCharm Integration

Configure PyCharm for hook compatibility:

1. **Git Integration Settings**:
   - File → Settings → Version Control → Git
   - Enable "Use commit message template"
   - Set "Path to Git executable" to system Git
   - Enable "Auto-update if push of the current branch was rejected"

2. **External Tools Setup**:
   - File → Settings → Tools → External Tools
   - Add tool: Name: "Validate Hooks", Program: `./scripts/setup-hooks.sh`, Arguments: `test`

3. **Code Inspection Setup**:
   - File → Settings → Editor → Inspections
   - Enable "Python → Code quality tools → Flake8"
   - Configure custom inspection patterns for mock data

#### Command Line Integration

Set up shell aliases for common operations:

```bash
# Add to your ~/.bashrc or ~/.zshrc
alias validate-hooks='./scripts/setup-hooks.sh test'
alias install-hooks='./scripts/setup-hooks.sh install'
alias update-hooks='./scripts/setup-hooks.sh update'
alias hook-status='./scripts/setup-hooks.sh status'

# Git aliases for hook-aware operations
git config --global alias.safe-commit 'commit --verify'
git config --global alias.hook-status '!./scripts/setup-hooks.sh status'
```

## Configuration Options

### Detection Sensitivity Levels

Configure detection sensitivity based on your development phase:

#### Development Phase Configuration

```yaml
# Strict enforcement during active development
detection:
  sensitivity: "strict"
  fail_on_warning: true
  patterns:
    critical:
      weight: 10
      action: "block"
    high:
      weight: 7
      action: "block"
    medium:
      weight: 5
      action: "warn"
    low:
      weight: 3
      action: "log"
```

#### Testing Phase Configuration

```yaml
# Balanced approach during testing
detection:
  sensitivity: "balanced"
  fail_on_warning: false
  allow_test_patterns: true
  patterns:
    critical:
      weight: 10
      action: "block"
    high:
      weight: 7
      action: "warn"
    medium:
      weight: 5
      action: "log"
```

#### Production Release Configuration

```yaml
# Maximum enforcement for production releases
detection:
  sensitivity: "maximum"
  fail_on_warning: true
  fail_on_medium: true
  zero_tolerance_mode: true
  audit_all_files: true
```

### Performance Tuning

Optimize hook performance for your repository size:

#### Small Repository (< 1000 files)

```yaml
performance:
  thread_count: 2
  max_file_size: 5242880      # 5MB
  batch_size: 50
  timeout: 15
  memory_limit: 256           # MB
```

#### Medium Repository (1000-10000 files)

```yaml
performance:
  thread_count: 4
  max_file_size: 10485760     # 10MB
  batch_size: 100
  timeout: 30
  memory_limit: 512           # MB
  enable_caching: true
```

#### Large Repository (> 10000 files)

```yaml
performance:
  thread_count: 8
  max_file_size: 20971520     # 20MB
  batch_size: 200
  timeout: 60
  memory_limit: 1024          # MB
  enable_caching: true
  enable_indexing: true
  parallel_processing: true
```

### Logging and Monitoring

Configure comprehensive logging for audit and compliance:

```yaml
logging:
  level: "INFO"
  audit_enabled: true
  audit_file: ".mock-detection-audit.log"
  
  performance_tracking: true
  performance_file: ".hook-performance.log"
  
  violation_reporting: true
  violation_file: ".mock-violations.log"
  
  integration_logging: true
  integration_file: ".hook-integration.log"

  # Structured logging for enterprise monitoring
  structured_format: true
  include_metadata: true
  include_stack_trace: true
  include_file_content_hash: true
```

## Team Integration Guide

### New Team Member Setup

#### Automated Onboarding Script

Create a team onboarding script:

```bash
#!/bin/bash
# scripts/onboard-developer.sh

echo "🚀 Olorin Developer Onboarding - Pre-Commit Hooks"
echo "================================================"

# Verify prerequisites
echo "1. Verifying prerequisites..."
python3 --version || { echo "❌ Python 3.11+ required"; exit 1; }
git --version || { echo "❌ Git required"; exit 1; }

# Install hooks
echo "2. Installing pre-commit hooks..."
./scripts/setup-hooks.sh install || { echo "❌ Hook installation failed"; exit 1; }

# Run validation
echo "3. Running system validation..."
./scripts/setup-hooks.sh test || { echo "❌ Validation failed"; exit 1; }

# Create test commit
echo "4. Testing hook functionality..."
echo "# Onboarding test - $(date)" > .onboard-test
git add .onboard-test
git commit -m "test: Validate pre-commit hooks during onboarding" || {
  echo "❌ Test commit failed"
  rm -f .onboard-test
  exit 1
}

# Cleanup
git reset --soft HEAD~1
git reset .onboard-test
rm -f .onboard-test

echo "✅ Onboarding complete! Pre-commit hooks are active."
echo "📚 Read the documentation: docs/development/PRE_COMMIT_HOOKS_SETUP.md"
```

#### Team Configuration Standardization

Distribute standardized configuration:

```bash
# scripts/sync-team-config.sh
#!/bin/bash

echo "🔄 Syncing team configuration..."

# Update hook configuration from central source
cp config/team/mock-detection-config.yml scripts/git-hooks/
cp config/team/.mockignore scripts/git-hooks/
cp config/team/.pre-commit-config.yaml .

# Refresh hook installation
./scripts/setup-hooks.sh update

echo "✅ Team configuration synchronized"
```

### Workflow Integration

#### Pull Request Integration

Configure automatic hook validation in pull requests:

```yaml
# .github/workflows/pr-validation.yml
name: PR Validation - Pre-commit Hooks

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  validate-hooks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
          
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          
      - name: Install dependencies
        run: |
          pip install pre-commit
          
      - name: Install pre-commit hooks
        run: |
          ./scripts/setup-hooks.sh install
          
      - name: Run pre-commit validation
        run: |
          pre-commit run --all-files
          
      - name: Validate mock detection
        run: |
          ./scripts/setup-hooks.sh test
```

#### Continuous Integration Integration

Ensure hooks work in CI/CD environments:

```bash
# scripts/ci-setup-hooks.sh
#!/bin/bash
# CI/CD environment hook setup

set -euo pipefail

echo "🏗️ CI/CD Pre-commit Hook Setup"
echo "==============================="

# Install in CI mode (non-interactive)
export CI_MODE=true
export HOOK_INSTALL_MODE=ci

# Install hooks with CI optimizations
./scripts/setup-hooks.sh install --ci-mode

# Run comprehensive validation
./scripts/setup-hooks.sh test --comprehensive

# Generate CI report
./scripts/setup-hooks.sh report --format=ci > hook-validation-report.txt

echo "✅ CI/CD hook setup complete"
```

## Advanced Configuration

### Custom Pattern Development

Create custom detection patterns for specific needs:

```yaml
# Advanced pattern configuration
detection:
  custom_patterns:
    olorin_specific:
      patterns:
        - "investigation.*mock"
        - "fraud.*simulation"
        - "evidence.*fake"
        - "witness.*dummy"
      severity: "critical"
      description: "Olorin-specific fraud detection patterns"
      
    financial_data:
      patterns:
        - "account.*fake"
        - "transaction.*mock"
        - "balance.*dummy"
        - "payment.*test.*(?!.*spec)"
      severity: "high"
      description: "Financial data integrity patterns"
      
    compliance_data:
      patterns:
        - "audit.*fake"
        - "regulation.*mock"
        - "compliance.*dummy"
        - "report.*fabricated"
      severity: "critical"
      description: "Compliance data integrity patterns"
```

### Integration with External Tools

#### Sonarqube Integration

```yaml
# .sonar/sonar-scanner.properties
sonar.python.coverage.reportPaths=coverage.xml
sonar.python.xunit.reportPath=pytest-report.xml

# Custom rules for mock data detection
sonar.issue.ignore.multicriteria=e1
sonar.issue.ignore.multicriteria.e1.ruleKey=python:S1481
sonar.issue.ignore.multicriteria.e1.resourceKey=**/*mock*

# Hook validation in SonarQube
sonar.custom.rules.plugin=mock-detection-plugin
```

#### Slack Integration

Configure Slack notifications for hook violations:

```bash
# scripts/notify-violations.sh
#!/bin/bash

if [[ -n "${SLACK_WEBHOOK_URL}" ]]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🚨 Mock Data Violation Detected in ${GITHUB_REPOSITORY}\"}" \
        "${SLACK_WEBHOOK_URL}"
fi
```

### Performance Optimization

#### Memory Usage Optimization

```yaml
performance:
  memory_optimization:
    enabled: true
    max_memory_per_thread: 128  # MB
    garbage_collection: true
    memory_profiling: false     # Enable for debugging
    
  file_processing:
    streaming_mode: true        # Process large files in chunks
    chunk_size: 1048576        # 1MB chunks
    buffer_size: 65536         # 64KB buffer
    
  caching:
    enabled: true
    cache_size: 1000           # Number of cached results
    cache_ttl: 3600           # 1 hour TTL
    persistent_cache: false    # Don't persist across sessions
```

#### CPU Usage Optimization

```yaml
performance:
  cpu_optimization:
    thread_pool_size: "auto"   # Auto-detect CPU cores
    max_threads: 8            # Cap for safety
    thread_priority: "normal"  # normal, high, low
    
  pattern_matching:
    compiled_patterns: true    # Pre-compile regex patterns
    parallel_matching: true   # Match patterns in parallel
    pattern_caching: true     # Cache compiled patterns
    
  io_optimization:
    async_file_reading: true   # Async I/O operations
    batch_file_reading: true  # Read files in batches
    memory_mapped_io: false   # Use for very large files
```

## Monitoring and Reporting

### Audit Trail Generation

Configure comprehensive audit trails:

```yaml
audit:
  enabled: true
  file: ".mock-detection-audit.log"
  format: "structured"        # json, structured, plain
  
  include:
    - timestamp
    - user_info
    - file_path
    - violation_type
    - violation_severity
    - pattern_matched
    - file_hash
    - git_commit_info
    
  retention:
    max_size: 10485760        # 10MB
    max_age_days: 90
    compression: true
    
  export:
    enabled: true
    formats: ["json", "csv"]
    schedule: "daily"
```

### Performance Monitoring

Track hook performance over time:

```yaml
monitoring:
  performance:
    enabled: true
    metrics:
      - execution_time
      - files_processed
      - violations_found
      - memory_usage
      - cpu_usage
      
  reporting:
    daily_summary: true
    weekly_trends: true
    monthly_analytics: true
    
  alerts:
    slow_execution_threshold: 30  # seconds
    high_memory_threshold: 512   # MB
    violation_spike_threshold: 10 # violations per day
```

### Compliance Reporting

Generate compliance reports for audits:

```bash
# scripts/generate-compliance-report.sh
#!/bin/bash

echo "📊 Generating Compliance Report"
echo "==============================="

# Collect audit data
./scripts/setup-hooks.sh audit --format=json > audit-data.json

# Generate compliance metrics
python3 scripts/compliance-metrics.py \
    --input audit-data.json \
    --output compliance-report.html \
    --format html \
    --period "last-30-days"

echo "✅ Compliance report generated: compliance-report.html"
```

## Troubleshooting Common Issues

### Installation Problems

#### Permission Issues

```bash
# Problem: Permission denied errors during installation
# Solution: Fix repository permissions
sudo chown -R $(whoami) .git/
chmod +x scripts/setup-hooks.sh
chmod +x scripts/git-hooks/*.py
chmod +x scripts/git-hooks/*.sh
```

#### Python Environment Issues

```bash
# Problem: Python version conflicts
# Solution: Use virtual environment
python3 -m venv hook-venv
source hook-venv/bin/activate
pip install pre-commit pyyaml

# Update installation script
export PYTHON_PATH="$(pwd)/hook-venv/bin/python"
./scripts/setup-hooks.sh install
```

### Performance Issues

#### Slow Hook Execution

```yaml
# Problem: Hooks taking too long to execute
# Solution: Optimize configuration
performance:
  thread_count: 6            # Increase for more CPU cores
  max_file_size: 5242880     # Reduce for faster processing
  enable_caching: true       # Enable result caching
  skip_large_files: true     # Skip files > max_file_size
```

#### Memory Usage Issues

```yaml
# Problem: High memory usage during scanning
# Solution: Reduce memory footprint
performance:
  streaming_mode: true       # Process files in streams
  batch_size: 25            # Smaller batches
  memory_limit: 256         # Explicit memory limit
  garbage_collection: true  # Force garbage collection
```

### Integration Issues

#### CI/CD Integration Problems

```bash
# Problem: Hooks failing in CI/CD environment
# Solution: Configure CI-specific settings
export CI_MODE=true
export HOOK_TIMEOUT=60
export HOOK_MEMORY_LIMIT=512

# Use CI-optimized configuration
./scripts/setup-hooks.sh install --ci-mode
```

#### IDE Integration Issues

```bash
# Problem: IDE not recognizing hooks
# Solution: Refresh IDE Git configuration
git config --list | grep -E "core\."
git config core.hooksPath .git/hooks

# Restart IDE and refresh Git status
```

## Security Considerations

### Hook Security

Ensure hook scripts are secure:

```bash
# Verify hook script integrity
sha256sum scripts/git-hooks/detect-mock-data.py
sha256sum scripts/git-hooks/pre-commit-hook.sh

# Check for malicious modifications
git log --oneline scripts/git-hooks/
git show HEAD:scripts/git-hooks/detect-mock-data.py | sha256sum
```

### Access Control

Configure appropriate access controls:

```bash
# Restrict hook modification permissions
chmod 755 scripts/git-hooks/
chmod 644 scripts/git-hooks/*.yml
chmod 755 scripts/git-hooks/*.py
chmod 755 scripts/git-hooks/*.sh

# Prevent unauthorized modifications
git config receive.denyNonFastForwards true
git config receive.denyDeleteCurrentBranch warn
```

## Support and Maintenance

### Getting Help

- **Documentation**: `/docs/development/` directory
- **Issue Tracking**: GitHub Issues with label `pre-commit-hooks`
- **Team Chat**: #dev-tools channel for immediate assistance
- **Code Review**: Request review from DevOps team for configuration changes

### Regular Maintenance

#### Weekly Tasks

```bash
# Update hook dependencies
./scripts/setup-hooks.sh update

# Review violation reports
cat .mock-violations.log | grep "$(date -d '7 days ago' '+%Y-%m-%d')"

# Performance check
./scripts/setup-hooks.sh benchmark
```

#### Monthly Tasks

```bash
# Generate compliance report
./scripts/generate-compliance-report.sh

# Review and update patterns
vim scripts/git-hooks/mock-detection-config.yml

# Team training review
./scripts/validate-team-setup.sh
```

### Version Updates

Stay current with hook system updates:

```bash
# Check for updates
./scripts/setup-hooks.sh version

# Update to latest version
git pull origin main
./scripts/setup-hooks.sh update --force

# Validate after update
./scripts/setup-hooks.sh test --comprehensive
```

---

## Next Steps

After completing the setup:

1. **Read Developer Onboarding Guide**: [DEVELOPER_ONBOARDING.md](DEVELOPER_ONBOARDING.md)
2. **Configure Team Settings**: [HOOKS_ADMINISTRATION.md](HOOKS_ADMINISTRATION.md)
3. **Review Technical Reference**: [MOCK_DETECTION_REFERENCE.md](MOCK_DETECTION_REFERENCE.md)
4. **Set Up Monitoring**: [Configuration Guide](../hooks/configuration-guide.md)
5. **Join Training Session**: Contact DevOps team for hands-on training

**Questions or Issues?**
- 📧 Email: devops-team@olorin.com
- 💬 Slack: #dev-tools
- 🐛 Issues: [GitHub Issues](https://github.com/olorin/olorin/issues)

---

*This documentation is maintained by the Olorin DevOps team and updated regularly to reflect best practices and system changes.*