# Pre-Commit Hooks Administration Guide

**Version**: 1.0.0  
**Author**: Gil Klainert  
**Created**: 2025-01-08  
**Last Updated**: 2025-01-08  

## Executive Summary

This guide provides comprehensive administration procedures for the Olorin pre-commit hook system, designed to enforce the **ZERO TOLERANCE policy for mock data** across the enterprise fraud detection platform. System administrators will find deployment procedures, monitoring guidelines, compliance reporting, and emergency protocols.

## System Overview

### Architecture Components

The pre-commit hook system consists of these critical components:

```
Hook System Architecture
├── Core Detection Engine (detect-mock-data.py)
├── Configuration Management (mock-detection-config.yml)
├── Installation System (setup-hooks.sh)
├── Validation Framework (validate-system.py)
├── CI/CD Integration (.github/workflows/)
├── Monitoring & Reporting (audit logs, metrics)
└── Emergency Procedures (bypass protocols)
```

### Enterprise Integration Points

- **Git Repository Management**: Integrated with all development repositories
- **CI/CD Pipelines**: GitHub Actions, Jenkins, GitLab CI integration
- **Monitoring Systems**: Slack notifications, email alerts, dashboard integration
- **Compliance Reporting**: Automated audit trail generation
- **Emergency Response**: Bypass procedures for critical situations

## Team-Wide Deployment

### Mass Deployment Strategy

#### Phase 1: Pilot Deployment (Week 1)

Deploy to core development team first:

```bash
#!/bin/bash
# scripts/admin/pilot-deployment.sh

PILOT_USERS=("alice" "bob" "charlie" "david")
DEPLOYMENT_LOG="pilot-deployment.log"

echo "🚀 Starting Pilot Deployment - $(date)" | tee -a "$DEPLOYMENT_LOG"

for user in "${PILOT_USERS[@]}"; do
    echo "Deploying to user: $user" | tee -a "$DEPLOYMENT_LOG"
    
    # Send deployment notification
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🔧 Pre-commit hooks deployment starting for @$user\"}" \
        "$SLACK_WEBHOOK_URL"
    
    # Deploy hooks (user-specific process)
    ./scripts/deploy-to-user.sh "$user" >> "$DEPLOYMENT_LOG" 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Deployment successful for $user" | tee -a "$DEPLOYMENT_LOG"
    else
        echo "❌ Deployment failed for $user" | tee -a "$DEPLOYMENT_LOG"
        # Alert admin team
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 Hook deployment FAILED for @$user - requires admin attention\"}" \
            "$SLACK_ADMIN_WEBHOOK"
    fi
    
    # Brief pause between deployments
    sleep 5
done

echo "📊 Pilot Deployment Complete - $(date)" | tee -a "$DEPLOYMENT_LOG"
```

#### Phase 2: Full Team Deployment (Week 2-3)

Deploy to entire development organization:

```bash
#!/bin/bash
# scripts/admin/mass-deployment.sh

# Load team configuration
source config/team-config.sh

echo "🌍 Starting Mass Deployment - $(date)"
echo "Target: $TOTAL_DEVELOPERS developers across $TEAM_COUNT teams"

# Create deployment batches
create_deployment_batches() {
    local batch_size=5
    local batch_count=0
    
    while IFS= read -r developer; do
        BATCH_${batch_count}+=("$developer")
        if [ ${#BATCH_${batch_count}[@]} -eq $batch_size ]; then
            ((batch_count++))
        fi
    done < team-roster.txt
    
    echo "Created $((batch_count + 1)) deployment batches"
}

# Deploy to each batch with monitoring
deploy_batch() {
    local batch_name=$1
    local batch_users=("${@:2}")
    
    echo "📦 Deploying batch: $batch_name (${#batch_users[@]} users)"
    
    # Parallel deployment with monitoring
    for user in "${batch_users[@]}"; do
        deploy_to_user "$user" &
        DEPLOY_PIDS+=($!)
    done
    
    # Wait for batch completion
    for pid in "${DEPLOY_PIDS[@]}"; do
        wait $pid
        if [ $? -ne 0 ]; then
            FAILED_DEPLOYMENTS+=("$user")
        fi
    done
    
    # Report batch results
    generate_batch_report "$batch_name" "${batch_users[@]}"
}

# Execute mass deployment
create_deployment_batches
for batch in $(seq 0 $batch_count); do
    deploy_batch "batch_$batch" "${BATCH_${batch}[@]}"
    
    # Wait between batches to prevent system overload
    echo "⏳ Waiting 5 minutes before next batch..."
    sleep 300
done

echo "✅ Mass deployment complete. Check reports for any failures."
```

#### Phase 3: Validation and Compliance (Week 4)

Verify deployment success across all teams:

```bash
#!/bin/bash
# scripts/admin/deployment-validation.sh

echo "🔍 Validating Enterprise-Wide Deployment"
echo "========================================"

# Create validation report
VALIDATION_REPORT="deployment-validation-$(date +%Y%m%d).html"

cat > "$VALIDATION_REPORT" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Olorin Hook System - Deployment Validation Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        .metric { margin: 10px 0; }
    </style>
</head>
<body>
    <h1>🔍 Hook System Deployment Validation</h1>
    <p><strong>Generated:</strong> $(date)</p>
    <p><strong>Scope:</strong> Enterprise-wide validation</p>
EOF

# Validate each team
total_users=0
successful_deployments=0
failed_deployments=0

while IFS= read -r team; do
    echo "Validating team: $team"
    team_report=$(validate_team_deployment "$team")
    
    # Parse team results
    team_total=$(echo "$team_report" | grep "Total:" | cut -d: -f2)
    team_success=$(echo "$team_report" | grep "Success:" | cut -d: -f2)
    team_failed=$(echo "$team_report" | grep "Failed:" | cut -d: -f2)
    
    # Update totals
    ((total_users += team_total))
    ((successful_deployments += team_success))
    ((failed_deployments += team_failed))
    
    # Add to HTML report
    cat >> "$VALIDATION_REPORT" << EOF
    <div class="metric">
        <h3>Team: $team</h3>
        <p class="success">✅ Successful: $team_success</p>
        <p class="error">❌ Failed: $team_failed</p>
        <p>📊 Coverage: $((team_success * 100 / team_total))%</p>
    </div>
EOF

done < teams.txt

# Calculate overall metrics
success_rate=$((successful_deployments * 100 / total_users))

# Complete HTML report
cat >> "$VALIDATION_REPORT" << EOF
    <div style="border: 2px solid #007bff; padding: 20px; margin-top: 30px;">
        <h2>📊 Overall Deployment Metrics</h2>
        <div class="metric">Total Developers: $total_users</div>
        <div class="metric success">Successful Deployments: $successful_deployments</div>
        <div class="metric error">Failed Deployments: $failed_deployments</div>
        <div class="metric">Success Rate: $success_rate%</div>
    </div>
</body>
</html>
EOF

echo "📄 Validation report generated: $VALIDATION_REPORT"

# Send summary to admin team
send_admin_notification "deployment-validation" "$success_rate" "$failed_deployments"
```

### Automated User Setup

Create automated setup for new team members:

```bash
#!/bin/bash
# scripts/admin/auto-user-setup.sh

setup_new_user() {
    local username=$1
    local team=$2
    local email=$3
    
    echo "🚀 Setting up pre-commit hooks for new user: $username"
    
    # Create user-specific configuration
    USER_CONFIG_DIR="config/users/$username"
    mkdir -p "$USER_CONFIG_DIR"
    
    # Generate personalized configuration
    cat > "$USER_CONFIG_DIR/hook-config.yml" << EOF
user:
  name: "$username"
  team: "$team"
  email: "$email"
  setup_date: "$(date -Iseconds)"
  
configuration:
  inherit_from: "team-default"
  customizations:
    notification_level: "standard"
    performance_mode: "balanced"
    
compliance:
  audit_enabled: true
  reporting_enabled: true
  team_notifications: true
EOF
    
    # Send welcome notification
    send_welcome_notification "$username" "$email" "$team"
    
    # Add to team roster
    echo "$username,$team,$email,$(date)" >> "team-roster.csv"
    
    # Generate setup instructions
    generate_user_setup_guide "$username" "$team"
    
    echo "✅ User setup complete for $username"
}

# Integration with HR systems
process_new_hires() {
    # Check for new hires from HR API/CSV
    NEW_HIRES=$(curl -s -H "Authorization: Bearer $HR_API_TOKEN" \
                "$HR_API_URL/new-developers" | jq -r '.[] | .username')
    
    for hire in $NEW_HIRES; do
        user_info=$(get_user_info "$hire")
        team=$(echo "$user_info" | jq -r '.team')
        email=$(echo "$user_info" | jq -r '.email')
        
        setup_new_user "$hire" "$team" "$email"
    done
}

# Schedule daily execution
# Add to crontab: 0 9 * * * /path/to/auto-user-setup.sh process_new_hires
```

## CI/CD Pipeline Configuration

### GitHub Actions Integration

Configure organization-wide enforcement:

```yaml
# .github/workflows/enterprise-hook-enforcement.yml
name: Enterprise Mock Data Enforcement

on:
  push:
    branches: [ main, develop, 'feature/*', 'bugfix/*', 'hotfix/*' ]
  pull_request:
    branches: [ main, develop ]

jobs:
  mock-data-enforcement:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    
    strategy:
      matrix:
        check-type: [mock-detection, security-scan, compliance-audit]
        
    steps:
    - name: Checkout Repository
      uses: actions/checkout@v4
      with:
        fetch-depth: 0
        
    - name: Setup Python Environment
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
        cache: 'pip'
        
    - name: Install Hook Dependencies
      run: |
        pip install pre-commit pyyaml
        
    - name: Install Pre-commit Hooks
      run: |
        ./scripts/setup-hooks.sh install --ci-mode
        
    - name: Run Mock Data Detection
      if: matrix.check-type == 'mock-detection'
      run: |
        ./scripts/setup-hooks.sh test --comprehensive --format=github
        
    - name: Run Security Scan
      if: matrix.check-type == 'security-scan'
      run: |
        ./scripts/security/scan-secrets.sh --all-files --format=github
        
    - name: Run Compliance Audit
      if: matrix.check-type == 'compliance-audit'
      run: |
        ./scripts/admin/compliance-check.sh --pull-request --format=github
        
    - name: Generate Enforcement Report
      if: always()
      run: |
        ./scripts/admin/generate-ci-report.sh "${{ matrix.check-type }}" > enforcement-report.json
        
    - name: Upload Enforcement Report
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: enforcement-report-${{ matrix.check-type }}
        path: enforcement-report.json
        
    - name: Notify Admin Team on Failure
      if: failure()
      uses: 8398a7/action-slack@v3
      with:
        status: failure
        webhook_url: ${{ secrets.SLACK_ADMIN_WEBHOOK }}
        text: "🚨 Mock data enforcement failed in ${{ github.repository }} - ${{ matrix.check-type }}"

  compliance-summary:
    needs: mock-data-enforcement
    runs-on: ubuntu-latest
    if: always()
    
    steps:
    - name: Download All Reports
      uses: actions/download-artifact@v3
      
    - name: Generate Compliance Summary
      run: |
        python scripts/admin/generate-compliance-summary.py \
          --reports enforcement-report-*/*.json \
          --output compliance-summary.html \
          --format html
          
    - name: Archive Compliance Data
      run: |
        # Store compliance data in central repository
        curl -X POST \
          -H "Authorization: Bearer ${{ secrets.COMPLIANCE_API_TOKEN }}" \
          -H "Content-Type: application/json" \
          -d @compliance-summary.json \
          "${{ secrets.COMPLIANCE_API_URL }}/submit"
```

### Jenkins Pipeline Integration

For organizations using Jenkins:

```groovy
// Jenkinsfile.hooks
pipeline {
    agent any
    
    environment {
        PYTHON_VERSION = '3.11'
        HOOK_TIMEOUT = '300'
        COMPLIANCE_MODE = 'enterprise'
    }
    
    stages {
        stage('Environment Setup') {
            steps {
                script {
                    sh '''
                        python3 --version
                        pip install pre-commit pyyaml
                        ./scripts/setup-hooks.sh install --ci-mode
                    '''
                }
            }
        }
        
        stage('Parallel Enforcement') {
            parallel {
                stage('Mock Data Detection') {
                    steps {
                        script {
                            sh '''
                                ./scripts/setup-hooks.sh test --comprehensive \
                                    --format=jenkins \
                                    --output=mock-detection-results.xml
                            '''
                        }
                        publishTestResults testResultsPattern: 'mock-detection-results.xml'
                    }
                }
                
                stage('Security Scanning') {
                    steps {
                        script {
                            sh '''
                                ./scripts/security/scan-secrets.sh --all-files \
                                    --format=jenkins \
                                    --output=security-scan-results.xml
                            '''
                        }
                        publishTestResults testResultsPattern: 'security-scan-results.xml'
                    }
                }
                
                stage('Compliance Audit') {
                    steps {
                        script {
                            sh '''
                                ./scripts/admin/compliance-check.sh \
                                    --comprehensive \
                                    --format=jenkins \
                                    --output=compliance-audit-results.xml
                            '''
                        }
                        publishTestResults testResultsPattern: 'compliance-audit-results.xml'
                    }
                }
            }
        }
        
        stage('Compliance Reporting') {
            steps {
                script {
                    sh '''
                        ./scripts/admin/generate-compliance-report.sh \
                            --format=html \
                            --output=compliance-report.html
                    '''
                }
                publishHTML([
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: '.',
                    reportFiles: 'compliance-report.html',
                    reportName: 'Compliance Report'
                ])
            }
        }
    }
    
    post {
        always {
            script {
                // Archive all reports
                archiveArtifacts artifacts: '*.xml,*.html,*.json', fingerprint: true
                
                // Send notifications
                if (currentBuild.currentResult == 'FAILURE') {
                    slackSend(
                        channel: '#compliance-alerts',
                        color: 'danger',
                        message: "🚨 Hook enforcement failed in ${env.JOB_NAME} - ${env.BUILD_NUMBER}"
                    )
                }
            }
        }
        
        success {
            slackSend(
                channel: '#dev-notifications',
                color: 'good',
                message: "✅ Hook enforcement passed for ${env.JOB_NAME} - ${env.BUILD_NUMBER}"
            )
        }
    }
}
```

### GitLab CI Integration

For GitLab environments:

```yaml
# .gitlab-ci.yml
variables:
  PYTHON_VERSION: "3.11"
  PIP_CACHE_DIR: "$CI_PROJECT_DIR/.cache/pip"

cache:
  paths:
    - .cache/pip/

stages:
  - setup
  - enforcement
  - reporting
  - compliance

setup-hooks:
  stage: setup
  image: python:3.11-slim
  script:
    - pip install pre-commit pyyaml
    - ./scripts/setup-hooks.sh install --ci-mode
  artifacts:
    paths:
      - .git/hooks/
      - scripts/git-hooks/
    expire_in: 1 hour

mock-data-detection:
  stage: enforcement
  image: python:3.11-slim
  dependencies:
    - setup-hooks
  script:
    - ./scripts/setup-hooks.sh test --comprehensive --format=gitlab
  artifacts:
    reports:
      junit: mock-detection-report.xml
    paths:
      - mock-detection-report.xml
    expire_in: 1 week

security-scanning:
  stage: enforcement
  image: python:3.11-slim
  dependencies:
    - setup-hooks
  script:
    - ./scripts/security/scan-secrets.sh --all-files --format=gitlab
  artifacts:
    reports:
      junit: security-scan-report.xml
    paths:
      - security-scan-report.xml
    expire_in: 1 week

compliance-audit:
  stage: enforcement
  image: python:3.11-slim
  dependencies:
    - setup-hooks
  script:
    - ./scripts/admin/compliance-check.sh --comprehensive --format=gitlab
  artifacts:
    reports:
      junit: compliance-audit-report.xml
    paths:
      - compliance-audit-report.xml
    expire_in: 1 week

generate-compliance-report:
  stage: reporting
  image: python:3.11-slim
  dependencies:
    - mock-data-detection
    - security-scanning
    - compliance-audit
  script:
    - ./scripts/admin/generate-compliance-report.sh --format=html
  artifacts:
    paths:
      - compliance-report.html
    expire_in: 1 month

submit-compliance-data:
  stage: compliance
  image: python:3.11-slim
  dependencies:
    - generate-compliance-report
  script:
    - ./scripts/admin/submit-compliance-data.sh
  only:
    - main
    - develop
```

## Policy Configuration and Updates

### Centralized Configuration Management

Create a centralized configuration distribution system:

```bash
#!/bin/bash
# scripts/admin/config-management.sh

CONFIG_REPO="git@github.com:olorin/hook-configurations.git"
CONFIG_DIR="config/centralized"

# Centralized configuration structure
initialize_config_repo() {
    git clone "$CONFIG_REPO" "$CONFIG_DIR"
    cd "$CONFIG_DIR"
    
    # Create directory structure
    mkdir -p {teams,environments,policies,patterns}
    
    # Base configuration
    cat > policies/base-policy.yml << EOF
# Olorin Base Mock Data Detection Policy
# Version: 1.0.0
# Effective: $(date -Iseconds)

policy:
  name: "olorin-base-mock-detection"
  version: "1.0.0"
  effective_date: "$(date -Iseconds)"
  
  enforcement:
    level: "strict"
    zero_tolerance: true
    emergency_bypass: false
    
  detection:
    patterns:
      critical:
        - "mockdata"
        - "mock_data"
        - "fake_data"
        - "dummy_data"
        - "testdata"
        - "sample_data"
      
      high:
        - "fake"
        - "dummy" 
        - "mock"
        - "test.*data"
        - "artificial.*data"
        
      medium:
        - "placeholder"
        - "temporary.*data"
        - "draft.*content"
        
    file_types:
      - "*.py"
      - "*.js"
      - "*.ts"
      - "*.json"
      - "*.yaml"
      - "*.yml"
      - "*.sql"
      
    exclusions:
      directories:
        - "test/"
        - "tests/"
        - "spec/"
        - "__tests__/"
        - "node_modules/"
        - ".git/"
        - "build/"
        - "dist/"
        
      files:
        - "*.test.*"
        - "*.spec.*"
        - "*.example.*"
        - "*.template.*"
        
  compliance:
    audit_enabled: true
    reporting_required: true
    retention_days: 365
    
  notifications:
    slack_enabled: true
    email_enabled: true
    escalation_enabled: true
EOF

    # Team-specific configurations
    for team in frontend backend devops security; do
        cat > "teams/$team-policy.yml" << EOF
# Team: $team
# Inherits from: base-policy
# Custom settings for $team team

inherit_from: "../policies/base-policy.yml"

team:
  name: "$team"
  contact: "$team-lead@olorin.com"
  
customizations:
  # Team-specific pattern additions
  additional_patterns:
    critical: []
    high: []
    medium: []
    
  # Team-specific exclusions
  additional_exclusions:
    directories: []
    files: []
    
  # Performance settings
  performance:
    thread_count: 4
    timeout: 30
    
  # Notification settings
  notifications:
    team_channel: "#$team-alerts"
    escalation_timeout: 60
EOF
    done
    
    git add .
    git commit -m "Initial centralized configuration setup"
    git push origin main
}

# Distribute configuration updates
distribute_config_updates() {
    local config_version=$1
    local teams=("frontend" "backend" "devops" "security")
    
    echo "📦 Distributing configuration update: $config_version"
    
    cd "$CONFIG_DIR"
    git pull origin main
    
    # Validate configuration before distribution
    ./scripts/validate-config.py policies/base-policy.yml
    if [ $? -ne 0 ]; then
        echo "❌ Configuration validation failed. Aborting distribution."
        return 1
    fi
    
    # Distribute to all repositories
    while IFS= read -r repo; do
        echo "Updating repository: $repo"
        
        # Clone repository
        TEMP_DIR=$(mktemp -d)
        git clone "$repo" "$TEMP_DIR"
        cd "$TEMP_DIR"
        
        # Copy new configuration
        cp "$CONFIG_DIR/policies/base-policy.yml" scripts/git-hooks/mock-detection-config.yml
        
        # Get team name from repository
        team=$(basename "$repo" .git | cut -d- -f2)
        if [[ " ${teams[@]} " =~ " $team " ]]; then
            # Apply team-specific configuration
            python3 "$CONFIG_DIR/scripts/merge-config.py" \
                scripts/git-hooks/mock-detection-config.yml \
                "$CONFIG_DIR/teams/$team-policy.yml" \
                --output scripts/git-hooks/mock-detection-config.yml
        fi
        
        # Update hooks
        ./scripts/setup-hooks.sh update --force
        
        # Commit changes
        git add .
        git commit -m "config: Update to policy version $config_version"
        git push origin main
        
        # Cleanup
        cd - && rm -rf "$TEMP_DIR"
        
    done < repository-list.txt
    
    echo "✅ Configuration distribution complete"
}

# Monitor configuration compliance
monitor_config_compliance() {
    echo "📊 Monitoring Configuration Compliance"
    
    COMPLIANCE_REPORT="config-compliance-$(date +%Y%m%d).json"
    
    cat > "$COMPLIANCE_REPORT" << EOF
{
  "report_date": "$(date -Iseconds)",
  "policy_version": "$(get_current_policy_version)",
  "repositories": [
EOF
    
    first=true
    while IFS= read -r repo; do
        if [ "$first" = false ]; then
            echo "," >> "$COMPLIANCE_REPORT"
        fi
        first=false
        
        repo_compliance=$(check_repo_compliance "$repo")
        echo "    $repo_compliance" >> "$COMPLIANCE_REPORT"
        
    done < repository-list.txt
    
    cat >> "$COMPLIANCE_REPORT" << EOF
  ],
  "summary": {
    "total_repositories": $(wc -l < repository-list.txt),
    "compliant_repositories": $(grep -c '"compliant": true' "$COMPLIANCE_REPORT"),
    "non_compliant_repositories": $(grep -c '"compliant": false' "$COMPLIANCE_REPORT")
  }
}
EOF
    
    echo "📄 Compliance report generated: $COMPLIANCE_REPORT"
    
    # Send to compliance system
    curl -X POST \
        -H "Authorization: Bearer $COMPLIANCE_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d @"$COMPLIANCE_REPORT" \
        "$COMPLIANCE_API_URL/config-compliance"
}
```

### Pattern Management

Manage detection patterns centrally:

```python
#!/usr/bin/env python3
# scripts/admin/pattern-management.py

import yaml
import json
import argparse
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

class PatternManager:
    def __init__(self, config_path: str):
        self.config_path = Path(config_path)
        self.load_patterns()
        
    def load_patterns(self):
        """Load current pattern configuration"""
        with open(self.config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        self.patterns = self.config.get('detection', {}).get('patterns', {})
        
    def add_pattern(self, pattern: str, severity: str, description: str = None):
        """Add a new detection pattern"""
        if severity not in self.patterns:
            self.patterns[severity] = []
            
        # Validate pattern is valid regex
        try:
            re.compile(pattern)
        except re.error as e:
            raise ValueError(f"Invalid regex pattern '{pattern}': {e}")
            
        # Check for duplicates
        if pattern in self.patterns[severity]:
            print(f"⚠️ Pattern '{pattern}' already exists in {severity} category")
            return False
            
        self.patterns[severity].append(pattern)
        
        # Add metadata if provided
        if description:
            metadata = self.config.get('metadata', {})
            if 'pattern_descriptions' not in metadata:
                metadata['pattern_descriptions'] = {}
            metadata['pattern_descriptions'][pattern] = {
                'description': description,
                'added_date': datetime.now().isoformat(),
                'severity': severity
            }
            self.config['metadata'] = metadata
            
        self.save_patterns()
        print(f"✅ Added pattern '{pattern}' to {severity} category")
        return True
        
    def remove_pattern(self, pattern: str, severity: str = None):
        """Remove a detection pattern"""
        removed = False
        
        if severity:
            # Remove from specific severity level
            if severity in self.patterns and pattern in self.patterns[severity]:
                self.patterns[severity].remove(pattern)
                removed = True
        else:
            # Remove from all severity levels
            for sev in self.patterns:
                if pattern in self.patterns[sev]:
                    self.patterns[sev].remove(pattern)
                    removed = True
                    
        if removed:
            # Remove metadata
            metadata = self.config.get('metadata', {})
            if 'pattern_descriptions' in metadata and pattern in metadata['pattern_descriptions']:
                del metadata['pattern_descriptions'][pattern]
                
            self.save_patterns()
            print(f"✅ Removed pattern '{pattern}'")
            return True
        else:
            print(f"⚠️ Pattern '{pattern}' not found")
            return False
            
    def bulk_import_patterns(self, patterns_file: str):
        """Import patterns from JSON/YAML file"""
        patterns_path = Path(patterns_file)
        
        if patterns_path.suffix.lower() in ['.yml', '.yaml']:
            with open(patterns_path, 'r') as f:
                new_patterns = yaml.safe_load(f)
        elif patterns_path.suffix.lower() == '.json':
            with open(patterns_path, 'r') as f:
                new_patterns = json.load(f)
        else:
            raise ValueError("Unsupported file format. Use JSON or YAML.")
            
        imported_count = 0
        for severity, pattern_list in new_patterns.get('patterns', {}).items():
            for pattern_info in pattern_list:
                if isinstance(pattern_info, str):
                    pattern = pattern_info
                    description = None
                else:
                    pattern = pattern_info.get('pattern')
                    description = pattern_info.get('description')
                    
                if self.add_pattern(pattern, severity, description):
                    imported_count += 1
                    
        print(f"✅ Imported {imported_count} patterns")
        
    def export_patterns(self, output_file: str, format_type: str = 'yaml'):
        """Export patterns to file"""
        output_path = Path(output_file)
        
        export_data = {
            'export_date': datetime.now().isoformat(),
            'patterns': self.patterns,
            'metadata': self.config.get('metadata', {})
        }
        
        if format_type.lower() == 'yaml':
            with open(output_path, 'w') as f:
                yaml.dump(export_data, f, default_flow_style=False)
        elif format_type.lower() == 'json':
            with open(output_path, 'w') as f:
                json.dump(export_data, f, indent=2)
        else:
            raise ValueError("Unsupported format. Use 'yaml' or 'json'.")
            
        print(f"✅ Patterns exported to {output_file}")
        
    def validate_patterns(self) -> List[Dict]:
        """Validate all patterns are valid regex"""
        issues = []
        
        for severity, pattern_list in self.patterns.items():
            for pattern in pattern_list:
                try:
                    re.compile(pattern)
                except re.error as e:
                    issues.append({
                        'pattern': pattern,
                        'severity': severity,
                        'error': str(e)
                    })
                    
        return issues
        
    def generate_pattern_report(self) -> Dict:
        """Generate comprehensive pattern report"""
        report = {
            'generation_date': datetime.now().isoformat(),
            'pattern_counts': {},
            'pattern_list': self.patterns,
            'validation_issues': self.validate_patterns()
        }
        
        # Count patterns by severity
        for severity, pattern_list in self.patterns.items():
            report['pattern_counts'][severity] = len(pattern_list)
            
        report['total_patterns'] = sum(report['pattern_counts'].values())
        
        return report
        
    def save_patterns(self):
        """Save patterns back to configuration file"""
        self.config['detection']['patterns'] = self.patterns
        
        with open(self.config_path, 'w') as f:
            yaml.dump(self.config, f, default_flow_style=False)

def main():
    parser = argparse.ArgumentParser(description='Manage mock data detection patterns')
    parser.add_argument('--config', required=True, help='Path to configuration file')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Add pattern command
    add_parser = subparsers.add_parser('add', help='Add a new pattern')
    add_parser.add_argument('pattern', help='Regex pattern to add')
    add_parser.add_argument('severity', choices=['critical', 'high', 'medium', 'low'], 
                           help='Pattern severity level')
    add_parser.add_argument('--description', help='Pattern description')
    
    # Remove pattern command
    remove_parser = subparsers.add_parser('remove', help='Remove a pattern')
    remove_parser.add_argument('pattern', help='Pattern to remove')
    remove_parser.add_argument('--severity', choices=['critical', 'high', 'medium', 'low'],
                              help='Specific severity level to remove from')
    
    # Import patterns command
    import_parser = subparsers.add_parser('import', help='Import patterns from file')
    import_parser.add_argument('file', help='JSON/YAML file containing patterns')
    
    # Export patterns command
    export_parser = subparsers.add_parser('export', help='Export patterns to file')
    export_parser.add_argument('file', help='Output file path')
    export_parser.add_argument('--format', choices=['yaml', 'json'], default='yaml',
                              help='Output format')
    
    # Validate patterns command
    validate_parser = subparsers.add_parser('validate', help='Validate all patterns')
    
    # Report command
    report_parser = subparsers.add_parser('report', help='Generate pattern report')
    report_parser.add_argument('--output', help='Output file for report')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
        
    manager = PatternManager(args.config)
    
    if args.command == 'add':
        manager.add_pattern(args.pattern, args.severity, args.description)
    elif args.command == 'remove':
        manager.remove_pattern(args.pattern, args.severity)
    elif args.command == 'import':
        manager.bulk_import_patterns(args.file)
    elif args.command == 'export':
        manager.export_patterns(args.file, args.format)
    elif args.command == 'validate':
        issues = manager.validate_patterns()
        if issues:
            print("❌ Pattern validation issues found:")
            for issue in issues:
                print(f"  - {issue['severity']}: '{issue['pattern']}' - {issue['error']}")
        else:
            print("✅ All patterns are valid")
    elif args.command == 'report':
        report = manager.generate_pattern_report()
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(report, f, indent=2)
            print(f"📄 Report saved to {args.output}")
        else:
            print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
```

## Monitoring and Compliance Reporting

### Real-Time Monitoring Dashboard

Create monitoring dashboard for hook system health:

```python
#!/usr/bin/env python3
# scripts/admin/monitoring-dashboard.py

import json
import time
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from flask import Flask, render_template, jsonify
import plotly.graph_objs as go
import plotly.utils

app = Flask(__name__)

class HookMonitor:
    def __init__(self, db_path: str = "hook-monitoring.db"):
        self.db_path = db_path
        self.init_database()
        
    def init_database(self):
        """Initialize monitoring database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS hook_executions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                repository TEXT,
                user_name TEXT,
                files_scanned INTEGER,
                violations_found INTEGER,
                execution_time REAL,
                status TEXT,
                commit_hash TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS violations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                repository TEXT,
                file_path TEXT,
                pattern TEXT,
                severity TEXT,
                line_number INTEGER,
                user_name TEXT,
                commit_hash TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS system_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                metric_name TEXT,
                metric_value REAL,
                repository TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def record_execution(self, data: dict):
        """Record hook execution"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO hook_executions 
            (repository, user_name, files_scanned, violations_found, 
             execution_time, status, commit_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('repository'),
            data.get('user_name'),
            data.get('files_scanned', 0),
            data.get('violations_found', 0),
            data.get('execution_time', 0.0),
            data.get('status', 'unknown'),
            data.get('commit_hash')
        ))
        
        conn.commit()
        conn.close()
        
    def record_violation(self, data: dict):
        """Record violation details"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO violations 
            (repository, file_path, pattern, severity, line_number, 
             user_name, commit_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('repository'),
            data.get('file_path'),
            data.get('pattern'),
            data.get('severity'),
            data.get('line_number', 0),
            data.get('user_name'),
            data.get('commit_hash')
        ))
        
        conn.commit()
        conn.close()
        
    def get_dashboard_data(self) -> dict:
        """Get data for monitoring dashboard"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get recent metrics
        cursor.execute('''
            SELECT COUNT(*) as total_executions,
                   AVG(execution_time) as avg_execution_time,
                   SUM(violations_found) as total_violations
            FROM hook_executions 
            WHERE timestamp > datetime('now', '-24 hours')
        ''')
        daily_stats = cursor.fetchone()
        
        # Get violations by severity
        cursor.execute('''
            SELECT severity, COUNT(*) as count
            FROM violations 
            WHERE timestamp > datetime('now', '-24 hours')
            GROUP BY severity
        ''')
        violations_by_severity = dict(cursor.fetchall())
        
        # Get execution trend
        cursor.execute('''
            SELECT DATE(timestamp) as date, COUNT(*) as count
            FROM hook_executions 
            WHERE timestamp > datetime('now', '-7 days')
            GROUP BY DATE(timestamp)
            ORDER BY date
        ''')
        execution_trend = cursor.fetchall()
        
        # Get top violating repositories
        cursor.execute('''
            SELECT repository, COUNT(*) as violations
            FROM violations 
            WHERE timestamp > datetime('now', '-24 hours')
            GROUP BY repository
            ORDER BY violations DESC
            LIMIT 10
        ''')
        top_violating_repos = cursor.fetchall()
        
        conn.close()
        
        return {
            'daily_stats': {
                'total_executions': daily_stats[0] or 0,
                'avg_execution_time': daily_stats[1] or 0,
                'total_violations': daily_stats[2] or 0
            },
            'violations_by_severity': violations_by_severity,
            'execution_trend': execution_trend,
            'top_violating_repos': top_violating_repos
        }

monitor = HookMonitor()

@app.route('/')
def dashboard():
    """Main monitoring dashboard"""
    return render_template('dashboard.html')

@app.route('/api/dashboard-data')
def api_dashboard_data():
    """API endpoint for dashboard data"""
    data = monitor.get_dashboard_data()
    
    # Create execution trend chart
    if data['execution_trend']:
        dates, counts = zip(*data['execution_trend'])
        trend_chart = go.Figure(data=go.Scatter(
            x=dates,
            y=counts,
            mode='lines+markers',
            name='Hook Executions'
        ))
        trend_chart.update_layout(
            title='Hook Executions - 7 Day Trend',
            xaxis_title='Date',
            yaxis_title='Executions'
        )
        data['trend_chart'] = json.dumps(trend_chart, cls=plotly.utils.PlotlyJSONEncoder)
    
    # Create violations by severity chart
    if data['violations_by_severity']:
        severities = list(data['violations_by_severity'].keys())
        counts = list(data['violations_by_severity'].values())
        severity_chart = go.Figure(data=go.Bar(x=severities, y=counts))
        severity_chart.update_layout(
            title='Violations by Severity - Last 24 Hours',
            xaxis_title='Severity',
            yaxis_title='Count'
        )
        data['severity_chart'] = json.dumps(severity_chart, cls=plotly.utils.PlotlyJSONEncoder)
    
    return jsonify(data)

@app.route('/api/record-execution', methods=['POST'])
def api_record_execution():
    """API endpoint to record hook execution"""
    from flask import request
    data = request.get_json()
    monitor.record_execution(data)
    return jsonify({'status': 'recorded'})

@app.route('/api/record-violation', methods=['POST'])
def api_record_violation():
    """API endpoint to record violation"""
    from flask import request
    data = request.get_json()
    monitor.record_violation(data)
    return jsonify({'status': 'recorded'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
```

### Automated Compliance Reporting

Generate comprehensive compliance reports:

```python
#!/usr/bin/env python3
# scripts/admin/compliance-reporting.py

import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
import pandas as pd
from jinja2 import Template
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

class ComplianceReporter:
    def __init__(self, db_path: str = "hook-monitoring.db"):
        self.db_path = db_path
        
    def generate_daily_report(self) -> dict:
        """Generate daily compliance report"""
        conn = sqlite3.connect(self.db_path)
        
        # Query data for last 24 hours
        yesterday = datetime.now() - timedelta(days=1)
        
        # Hook execution metrics
        execution_df = pd.read_sql_query('''
            SELECT repository, user_name, COUNT(*) as executions,
                   AVG(execution_time) as avg_time,
                   SUM(violations_found) as total_violations
            FROM hook_executions 
            WHERE timestamp > ?
            GROUP BY repository, user_name
        ''', conn, params=(yesterday,))
        
        # Violation details
        violation_df = pd.read_sql_query('''
            SELECT repository, file_path, severity, COUNT(*) as count
            FROM violations 
            WHERE timestamp > ?
            GROUP BY repository, file_path, severity
        ''', conn, params=(yesterday,))
        
        conn.close()
        
        # Calculate compliance metrics
        total_executions = execution_df['executions'].sum()
        total_violations = execution_df['total_violations'].sum()
        compliance_rate = ((total_executions - total_violations) / total_executions * 100) if total_executions > 0 else 100
        
        # Top violating repositories
        repo_violations = violation_df.groupby('repository')['count'].sum().sort_values(ascending=False)
        
        # Severity breakdown
        severity_breakdown = violation_df.groupby('severity')['count'].sum()
        
        return {
            'report_date': datetime.now().isoformat(),
            'period': 'Daily (24 hours)',
            'metrics': {
                'total_executions': int(total_executions),
                'total_violations': int(total_violations),
                'compliance_rate': round(compliance_rate, 2),
                'avg_execution_time': round(execution_df['avg_time'].mean(), 3)
            },
            'top_violating_repos': repo_violations.head(10).to_dict(),
            'severity_breakdown': severity_breakdown.to_dict(),
            'repository_details': execution_df.to_dict('records'),
            'violation_details': violation_df.to_dict('records')
        }
        
    def generate_weekly_report(self) -> dict:
        """Generate weekly compliance report"""
        conn = sqlite3.connect(self.db_path)
        
        # Query data for last 7 days
        week_ago = datetime.now() - timedelta(days=7)
        
        # Daily trend data
        daily_trend_df = pd.read_sql_query('''
            SELECT DATE(timestamp) as date,
                   COUNT(*) as executions,
                   SUM(violations_found) as violations,
                   AVG(execution_time) as avg_time
            FROM hook_executions 
            WHERE timestamp > ?
            GROUP BY DATE(timestamp)
            ORDER BY date
        ''', conn, params=(week_ago,))
        
        # User activity
        user_activity_df = pd.read_sql_query('''
            SELECT user_name, 
                   COUNT(*) as commits,
                   SUM(violations_found) as violations,
                   AVG(execution_time) as avg_time
            FROM hook_executions 
            WHERE timestamp > ?
            GROUP BY user_name
            ORDER BY commits DESC
        ''', conn, params=(week_ago,))
        
        # Repository compliance scores
        repo_compliance_df = pd.read_sql_query('''
            SELECT repository,
                   COUNT(*) as executions,
                   SUM(violations_found) as violations,
                   (COUNT(*) - SUM(violations_found)) * 100.0 / COUNT(*) as compliance_score
            FROM hook_executions 
            WHERE timestamp > ?
            GROUP BY repository
            ORDER BY compliance_score DESC
        ''', conn, params=(week_ago,))
        
        conn.close()
        
        return {
            'report_date': datetime.now().isoformat(),
            'period': 'Weekly (7 days)',
            'daily_trend': daily_trend_df.to_dict('records'),
            'user_activity': user_activity_df.to_dict('records'),
            'repository_compliance': repo_compliance_df.to_dict('records'),
            'summary': {
                'total_commits': int(user_activity_df['commits'].sum()),
                'total_violations': int(user_activity_df['violations'].sum()),
                'avg_compliance_score': round(repo_compliance_df['compliance_score'].mean(), 2),
                'most_active_user': user_activity_df.iloc[0]['user_name'] if not user_activity_df.empty else 'N/A',
                'best_compliance_repo': repo_compliance_df.iloc[0]['repository'] if not repo_compliance_df.empty else 'N/A'
            }
        }
        
    def generate_html_report(self, report_data: dict, template_path: str) -> str:
        """Generate HTML report from data"""
        with open(template_path, 'r') as f:
            template = Template(f.read())
            
        return template.render(report=report_data)
        
    def send_report_email(self, report_html: str, recipients: list, subject: str):
        """Send report via email"""
        smtp_server = "smtp.company.com"  # Configure your SMTP server
        smtp_port = 587
        username = "hooks-system@olorin.com"
        password = "your-email-password"  # Use environment variable
        
        msg = MIMEMultipart()
        msg['From'] = username
        msg['To'] = ', '.join(recipients)
        msg['Subject'] = subject
        
        msg.attach(MIMEText(report_html, 'html'))
        
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(username, password)
        text = msg.as_string()
        server.sendmail(username, recipients, text)
        server.quit()

def main():
    reporter = ComplianceReporter()
    
    # Generate daily report
    daily_data = reporter.generate_daily_report()
    daily_html = reporter.generate_html_report(daily_data, 'templates/daily_report.html')
    
    # Save report
    report_file = f"reports/daily-compliance-{datetime.now().strftime('%Y%m%d')}.html"
    Path("reports").mkdir(exist_ok=True)
    with open(report_file, 'w') as f:
        f.write(daily_html)
    
    # Send to admin team
    admin_emails = [
        "devops-team@olorin.com",
        "compliance@olorin.com",
        "security@olorin.com"
    ]
    
    reporter.send_report_email(
        daily_html,
        admin_emails,
        f"Daily Hook Compliance Report - {datetime.now().strftime('%Y-%m-%d')}"
    )
    
    print(f"✅ Daily compliance report generated and sent: {report_file}")

if __name__ == '__main__':
    main()
```

## Emergency Procedures

### Emergency Bypass Protocol

For critical production situations:

```bash
#!/bin/bash
# scripts/admin/emergency-bypass.sh

set -euo pipefail

# Emergency bypass configuration
BYPASS_LOG="/var/log/olorin/hook-bypass.log"
ADMIN_APPROVAL_REQUIRED=true
MAX_BYPASS_DURATION_HOURS=4
NOTIFICATION_WEBHOOK="https://hooks.slack.com/services/xxx/yyy/zzz"

log_emergency() {
    local level=$1
    shift
    echo "[$(date -Iseconds)] [$level] $*" | tee -a "$BYPASS_LOG"
}

request_emergency_bypass() {
    local reason="$1"
    local duration_hours="$2"
    local requester="$3"
    local incident_id="$4"
    
    log_emergency "INFO" "Emergency bypass requested by $requester"
    log_emergency "INFO" "Reason: $reason"
    log_emergency "INFO" "Duration: $duration_hours hours"
    log_emergency "INFO" "Incident ID: $incident_id"
    
    # Validate duration
    if [ "$duration_hours" -gt "$MAX_BYPASS_DURATION_HOURS" ]; then
        log_emergency "ERROR" "Bypass duration exceeds maximum allowed ($MAX_BYPASS_DURATION_HOURS hours)"
        return 1
    fi
    
    # Generate bypass token
    BYPASS_TOKEN=$(openssl rand -hex 16)
    BYPASS_EXPIRY=$(date -d "+${duration_hours} hours" -Iseconds)
    
    # Create bypass configuration
    cat > ".emergency-bypass" << EOF
{
    "bypass_token": "$BYPASS_TOKEN",
    "expiry": "$BYPASS_EXPIRY",
    "reason": "$reason",
    "requester": "$requester",
    "incident_id": "$incident_id",
    "approved": false,
    "created": "$(date -Iseconds)"
}
EOF
    
    # Send notification for approval
    send_admin_notification "emergency_bypass_request" "$reason" "$requester" "$incident_id"
    
    if [ "$ADMIN_APPROVAL_REQUIRED" = true ]; then
        echo "🔒 Emergency bypass requested. Waiting for admin approval..."
        echo "Bypass token: $BYPASS_TOKEN"
        echo "Use: ./scripts/admin/emergency-bypass.sh approve $BYPASS_TOKEN"
        return 2  # Waiting for approval
    else
        # Auto-approve (dangerous - only for extreme emergencies)
        approve_emergency_bypass "$BYPASS_TOKEN" "auto-approved"
    fi
}

approve_emergency_bypass() {
    local bypass_token="$1"
    local approver="$2"
    
    if [ ! -f ".emergency-bypass" ]; then
        log_emergency "ERROR" "No pending bypass request found"
        return 1
    fi
    
    # Validate token
    local stored_token=$(jq -r '.bypass_token' .emergency-bypass)
    if [ "$bypass_token" != "$stored_token" ]; then
        log_emergency "ERROR" "Invalid bypass token provided"
        return 1
    fi
    
    # Update bypass configuration
    jq --arg approver "$approver" --arg timestamp "$(date -Iseconds)" \
        '.approved = true | .approver = $approver | .approved_at = $timestamp' \
        .emergency-bypass > .emergency-bypass.tmp
    mv .emergency-bypass.tmp .emergency-bypass
    
    # Configure git to skip hooks temporarily
    git config core.hooksPath /dev/null
    
    # Set environment variable for scripts
    export OLORIN_EMERGENCY_BYPASS=true
    export OLORIN_BYPASS_TOKEN="$bypass_token"
    
    log_emergency "WARNING" "Emergency bypass APPROVED by $approver"
    log_emergency "WARNING" "Hooks are DISABLED until $(jq -r '.expiry' .emergency-bypass)"
    
    # Schedule automatic re-enabling
    local expiry_epoch=$(date -d "$(jq -r '.expiry' .emergency-bypass)" +%s)
    echo "$(whoami) && cd $(pwd) && ./scripts/admin/emergency-bypass.sh disable $bypass_token" | at -t "$(date -d @$expiry_epoch +%Y%m%d%H%M)"
    
    # Send notifications
    send_admin_notification "emergency_bypass_approved" "$(jq -r '.reason' .emergency-bypass)" "$approver"
    
    echo "🚨 EMERGENCY BYPASS ACTIVE 🚨"
    echo "Hooks are disabled until: $(jq -r '.expiry' .emergency-bypass)"
    echo "Token: $bypass_token"
}

disable_emergency_bypass() {
    local bypass_token="$1"
    
    if [ ! -f ".emergency-bypass" ]; then
        log_emergency "INFO" "No active bypass found"
        return 0
    fi
    
    # Validate token
    local stored_token=$(jq -r '.bypass_token' .emergency-bypass)
    if [ "$bypass_token" != "$stored_token" ]; then
        log_emergency "ERROR" "Invalid bypass token for disable operation"
        return 1
    fi
    
    # Re-enable hooks
    git config core.hooksPath .git/hooks
    unset OLORIN_EMERGENCY_BYPASS
    unset OLORIN_BYPASS_TOKEN
    
    # Archive bypass record
    ARCHIVE_FILE="bypass-records/$(date +%Y%m%d-%H%M%S)-bypass.json"
    mkdir -p bypass-records
    mv .emergency-bypass "$ARCHIVE_FILE"
    
    log_emergency "INFO" "Emergency bypass DISABLED"
    log_emergency "INFO" "Hooks re-enabled and fully operational"
    
    # Validate hooks are working
    if ./scripts/setup-hooks.sh test --quiet; then
        log_emergency "INFO" "Hook system validation: PASSED"
        send_admin_notification "emergency_bypass_disabled" "success"
    else
        log_emergency "ERROR" "Hook system validation: FAILED"
        send_admin_notification "emergency_bypass_disabled" "validation_failed"
    fi
    
    echo "✅ Emergency bypass disabled. Hooks are active."
}

send_admin_notification() {
    local event_type="$1"
    local details="$2"
    local user="$3"
    local incident="$4"
    
    local message=""
    case "$event_type" in
        "emergency_bypass_request")
            message="🚨 EMERGENCY BYPASS REQUESTED\n\nReason: $details\nRequester: $user\nIncident: $incident\n\nApproval required: \`./scripts/admin/emergency-bypass.sh approve [token]\`"
            ;;
        "emergency_bypass_approved")
            message="⚠️ EMERGENCY BYPASS APPROVED\n\nReason: $details\nApprover: $user\n\n🔥 HOOKS ARE DISABLED 🔥"
            ;;
        "emergency_bypass_disabled")
            if [ "$details" = "success" ]; then
                message="✅ Emergency bypass disabled successfully\n\nHooks are re-enabled and operational"
            else
                message="❌ Emergency bypass disabled but validation failed\n\nManual intervention required"
            fi
            ;;
    esac
    
    if [ -n "$NOTIFICATION_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$NOTIFICATION_WEBHOOK"
    fi
}

show_bypass_status() {
    if [ -f ".emergency-bypass" ]; then
        echo "🚨 EMERGENCY BYPASS ACTIVE"
        echo "========================="
        jq . .emergency-bypass
        
        local expiry=$(jq -r '.expiry' .emergency-bypass)
        local now=$(date -Iseconds)
        
        if [[ "$expiry" < "$now" ]]; then
            echo "⚠️ BYPASS HAS EXPIRED - DISABLING"
            local token=$(jq -r '.bypass_token' .emergency-bypass)
            disable_emergency_bypass "$token"
        else
            echo "Time remaining: $((($(date -d "$expiry" +%s) - $(date +%s)) / 3600)) hours"
        fi
    else
        echo "✅ No active emergency bypass"
        echo "Hook system is fully operational"
    fi
}

# Main command handling
case "${1:-status}" in
    "request")
        if [ $# -lt 4 ]; then
            echo "Usage: $0 request 'reason' duration_hours requester [incident_id]"
            exit 1
        fi
        request_emergency_bypass "$2" "$3" "$4" "${5:-none}"
        ;;
    "approve")
        if [ $# -lt 2 ]; then
            echo "Usage: $0 approve bypass_token [approver]"
            exit 1
        fi
        approve_emergency_bypass "$2" "${3:-$(whoami)}"
        ;;
    "disable")
        if [ $# -lt 2 ]; then
            echo "Usage: $0 disable bypass_token"
            exit 1
        fi
        disable_emergency_bypass "$2"
        ;;
    "status")
        show_bypass_status
        ;;
    *)
        echo "Usage: $0 {request|approve|disable|status}"
        echo ""
        echo "Commands:"
        echo "  request 'reason' hours requester [incident] - Request emergency bypass"
        echo "  approve token [approver]                     - Approve pending bypass"
        echo "  disable token                                - Disable active bypass"
        echo "  status                                       - Show bypass status"
        exit 1
        ;;
esac
```

### System Recovery Procedures

Recovery procedures for various failure scenarios:

```bash
#!/bin/bash
# scripts/admin/system-recovery.sh

RECOVERY_LOG="/var/log/olorin/hook-recovery.log"

log_recovery() {
    echo "[$(date -Iseconds)] $*" | tee -a "$RECOVERY_LOG"
}

diagnose_system() {
    log_recovery "🔍 Starting system diagnosis..."
    
    local issues=()
    
    # Check git hooks directory
    if [ ! -d ".git/hooks" ]; then
        issues+=("missing_git_hooks_dir")
    fi
    
    # Check hook scripts
    if [ ! -f ".git/hooks/pre-commit" ]; then
        issues+=("missing_pre_commit_hook")
    fi
    
    # Check script permissions
    if [ ! -x "scripts/setup-hooks.sh" ]; then
        issues+=("setup_script_not_executable")
    fi
    
    # Check configuration files
    if [ ! -f "scripts/git-hooks/mock-detection-config.yml" ]; then
        issues+=("missing_configuration")
    fi
    
    # Check Python dependencies
    if ! python3 -c "import yaml, re" 2>/dev/null; then
        issues+=("missing_python_dependencies")
    fi
    
    # Check pre-commit framework
    if ! pre-commit --version >/dev/null 2>&1; then
        issues+=("pre_commit_not_installed")
    fi
    
    # Test hook execution
    if ! ./scripts/setup-hooks.sh test --quiet 2>/dev/null; then
        issues+=("hook_execution_failure")
    fi
    
    if [ ${#issues[@]} -eq 0 ]; then
        log_recovery "✅ System diagnosis complete: No issues found"
        return 0
    else
        log_recovery "❌ System diagnosis complete: ${#issues[@]} issues found"
        printf '%s\n' "${issues[@]}"
        return 1
    fi
}

repair_system() {
    log_recovery "🔧 Starting system repair..."
    
    local repair_count=0
    
    # Repair git hooks directory
    if [ ! -d ".git/hooks" ]; then
        log_recovery "Repairing: Creating git hooks directory"
        mkdir -p .git/hooks
        ((repair_count++))
    fi
    
    # Repair script permissions
    if [ ! -x "scripts/setup-hooks.sh" ]; then
        log_recovery "Repairing: Setting script permissions"
        chmod +x scripts/setup-hooks.sh
        chmod +x scripts/git-hooks/*.py
        chmod +x scripts/git-hooks/*.sh
        ((repair_count++))
    fi
    
    # Install missing dependencies
    if ! python3 -c "import yaml, re" 2>/dev/null; then
        log_recovery "Repairing: Installing Python dependencies"
        pip3 install pyyaml
        ((repair_count++))
    fi
    
    if ! pre-commit --version >/dev/null 2>&1; then
        log_recovery "Repairing: Installing pre-commit framework"
        pip3 install pre-commit
        ((repair_count++))
    fi
    
    # Reinstall hooks
    log_recovery "Repairing: Reinstalling hook system"
    ./scripts/setup-hooks.sh install --force
    ((repair_count++))
    
    log_recovery "✅ System repair complete: $repair_count repairs performed"
    
    # Validate repair
    if ./scripts/setup-hooks.sh test --quiet; then
        log_recovery "✅ System validation: PASSED"
        return 0
    else
        log_recovery "❌ System validation: FAILED - Manual intervention required"
        return 1
    fi
}

backup_system() {
    log_recovery "💾 Creating system backup..."
    
    local backup_dir="backups/hook-system-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup configuration files
    cp -r scripts/git-hooks/ "$backup_dir/"
    cp .pre-commit-config.yaml "$backup_dir/" 2>/dev/null || true
    cp .pre-commit-hooks.yaml "$backup_dir/" 2>/dev/null || true
    
    # Backup git hooks
    cp -r .git/hooks/ "$backup_dir/git-hooks-backup/" 2>/dev/null || true
    
    # Create backup manifest
    cat > "$backup_dir/backup-manifest.json" << EOF
{
    "backup_date": "$(date -Iseconds)",
    "backup_type": "hook-system",
    "git_commit": "$(git rev-parse HEAD)",
    "components": [
        "git-hooks-scripts",
        "configuration-files",
        "git-hooks-directory"
    ]
}
EOF
    
    log_recovery "✅ System backup created: $backup_dir"
    echo "$backup_dir"
}

restore_system() {
    local backup_dir="$1"
    
    if [ ! -d "$backup_dir" ]; then
        log_recovery "❌ Backup directory not found: $backup_dir"
        return 1
    fi
    
    log_recovery "📥 Restoring system from backup: $backup_dir"
    
    # Restore configuration files
    cp -r "$backup_dir"/git-hooks/ scripts/
    cp "$backup_dir"/.pre-commit-config.yaml . 2>/dev/null || true
    cp "$backup_dir"/.pre-commit-hooks.yaml . 2>/dev/null || true
    
    # Restore git hooks
    if [ -d "$backup_dir/git-hooks-backup" ]; then
        cp -r "$backup_dir/git-hooks-backup"/* .git/hooks/ 2>/dev/null || true
    fi
    
    # Fix permissions
    chmod +x scripts/setup-hooks.sh
    chmod +x scripts/git-hooks/*.py
    chmod +x scripts/git-hooks/*.sh
    
    # Reinstall to ensure consistency
    ./scripts/setup-hooks.sh install --force
    
    if ./scripts/setup-hooks.sh test --quiet; then
        log_recovery "✅ System restore complete and validated"
        return 0
    else
        log_recovery "❌ System restore failed validation"
        return 1
    fi
}

# Main recovery commands
case "${1:-diagnose}" in
    "diagnose")
        diagnose_system
        ;;
    "repair")
        repair_system
        ;;
    "backup")
        backup_system
        ;;
    "restore")
        if [ $# -lt 2 ]; then
            echo "Usage: $0 restore backup_directory"
            exit 1
        fi
        restore_system "$2"
        ;;
    "full-recovery")
        log_recovery "🚑 Starting full system recovery..."
        
        # Create backup first
        backup_dir=$(backup_system)
        
        # Diagnose issues
        if ! diagnose_system; then
            log_recovery "Issues found, attempting repair..."
            repair_system
        fi
        
        log_recovery "✅ Full recovery procedure complete"
        ;;
    *)
        echo "Usage: $0 {diagnose|repair|backup|restore|full-recovery}"
        echo ""
        echo "Commands:"
        echo "  diagnose       - Diagnose system issues"
        echo "  repair         - Attempt automatic repair"
        echo "  backup         - Create system backup"
        echo "  restore dir    - Restore from backup"
        echo "  full-recovery  - Complete recovery procedure"
        exit 1
        ;;
esac
```

## Support and Maintenance

### Regular Maintenance Tasks

Create scheduled maintenance procedures:

```bash
#!/bin/bash
# scripts/admin/maintenance.sh

MAINTENANCE_LOG="/var/log/olorin/hook-maintenance.log"

log_maintenance() {
    echo "[$(date -Iseconds)] $*" | tee -a "$MAINTENANCE_LOG"
}

daily_maintenance() {
    log_maintenance "🔄 Starting daily maintenance..."
    
    # Update pattern definitions
    ./scripts/admin/pattern-management.py validate --config scripts/git-hooks/mock-detection-config.yml
    
    # Clean old log files
    find . -name "*.hook-setup.log*" -mtime +7 -delete
    find . -name "*.mock-violations.log*" -mtime +30 -delete
    
    # Generate daily compliance report
    ./scripts/admin/compliance-reporting.py daily
    
    # Update hook statistics
    ./scripts/admin/update-statistics.sh
    
    log_maintenance "✅ Daily maintenance complete"
}

weekly_maintenance() {
    log_maintenance "📅 Starting weekly maintenance..."
    
    # Update pre-commit framework
    pip3 install --upgrade pre-commit
    
    # Validate all team configurations
    ./scripts/admin/validate-team-configs.sh
    
    # Generate weekly compliance report
    ./scripts/admin/compliance-reporting.py weekly
    
    # Backup configuration files
    ./scripts/admin/system-recovery.sh backup
    
    # Performance optimization analysis
    ./scripts/admin/performance-analysis.sh
    
    log_maintenance "✅ Weekly maintenance complete"
}

monthly_maintenance() {
    log_maintenance "📆 Starting monthly maintenance..."
    
    # Update Python dependencies
    pip3 install --upgrade pyyaml requests
    
    # Archive old audit logs
    ./scripts/admin/archive-logs.sh
    
    # Generate monthly compliance report
    ./scripts/admin/compliance-reporting.py monthly
    
    # Review and update patterns
    ./scripts/admin/pattern-review.sh
    
    # Team training compliance check
    ./scripts/admin/training-compliance-check.sh
    
    log_maintenance "✅ Monthly maintenance complete"
}

# Schedule maintenance tasks
case "${1:-daily}" in
    "daily")
        daily_maintenance
        ;;
    "weekly")
        weekly_maintenance
        ;;
    "monthly")
        monthly_maintenance
        ;;
    *)
        echo "Usage: $0 {daily|weekly|monthly}"
        exit 1
        ;;
esac
```

---

## Summary

This administration guide provides comprehensive procedures for enterprise deployment and management of the Olorin pre-commit hook system. Key capabilities include:

- **Mass Deployment**: Automated installation across development teams
- **CI/CD Integration**: GitHub Actions, Jenkins, and GitLab CI support
- **Policy Management**: Centralized configuration and pattern distribution
- **Monitoring**: Real-time dashboard and compliance reporting
- **Emergency Procedures**: Bypass protocols and system recovery
- **Maintenance**: Automated daily, weekly, and monthly procedures

The system ensures **zero tolerance for mock data** while providing enterprise-grade management, monitoring, and emergency response capabilities essential for a fraud detection platform.

---

*This administration guide is maintained by the Olorin DevOps team. For questions or support, contact devops-team@olorin.com or join #dev-tools on Slack.*