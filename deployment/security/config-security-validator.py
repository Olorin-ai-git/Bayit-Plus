#!/usr/bin/env python3
"""
Configuration Security Validator
Infrastructure security baseline validation and configuration drift detection
Part of Phase 5: Security & Compliance Automation

Author: Gil Klainert
Date: 2025-09-06
"""

import os
import sys
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from datetime import datetime
import yaml

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class ConfigIssue:
    """Configuration security issue"""
    file_path: str
    issue_type: str
    severity: str
    title: str
    description: str
    recommendation: str
    current_value: Optional[str] = None
    expected_value: Optional[str] = None
    rule_id: str = ""

@dataclass
class ValidationResult:
    """Configuration validation result"""
    project_path: str
    scan_timestamp: datetime
    total_issues: int
    critical_issues: int
    high_issues: int
    medium_issues: int
    low_issues: int
    files_validated: int
    issues: List[ConfigIssue]
    status: str

class ConfigSecurityValidator:
    """Security configuration validator for multiple file types"""
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path or "deployment/security/config-validation-rules.yaml"
        self.validation_rules = self._load_validation_rules()
        
    def _load_validation_rules(self) -> Dict:
        """Load security validation rules"""
        default_rules = {
            'docker': {
                'security_checks': [
                    {
                        'rule_id': 'DOC001',
                        'check': 'non_root_user',
                        'severity': 'HIGH',
                        'description': 'Container should run as non-root user',
                        'pattern': r'USER\s+(?!root\s)',
                        'required': True
                    },
                    {
                        'rule_id': 'DOC002',
                        'check': 'no_hardcoded_secrets',
                        'severity': 'CRITICAL',
                        'description': 'No hardcoded secrets in Dockerfile',
                        'pattern': r'(password|secret|key|token)\s*=',
                        'required': False,
                        'should_not_match': True
                    },
                    {
                        'rule_id': 'DOC003',
                        'check': 'health_check',
                        'severity': 'MEDIUM',
                        'description': 'Health check should be defined',
                        'pattern': r'HEALTHCHECK',
                        'required': True
                    }
                ]
            },
            'github_actions': {
                'security_checks': [
                    {
                        'rule_id': 'GHA001',
                        'check': 'secrets_usage',
                        'severity': 'HIGH',
                        'description': 'Secrets should use GitHub secrets syntax',
                        'pattern': r'\$\{\{\s*secrets\.',
                        'context_pattern': r'(password|key|token|secret)'
                    },
                    {
                        'rule_id': 'GHA002',
                        'check': 'pinned_actions',
                        'severity': 'MEDIUM',
                        'description': 'Actions should be pinned to specific versions',
                        'pattern': r'uses:\s*[^@\n]+@v?\d+\.\d+\.\d+',
                        'context': 'uses:'
                    },
                    {
                        'rule_id': 'GHA003',
                        'check': 'no_inline_scripts',
                        'severity': 'LOW',
                        'description': 'Avoid inline scripts in workflows',
                        'pattern': r'run:\s*\|',
                        'max_occurrences': 3
                    }
                ]
            },
            'firebase': {
                'security_checks': [
                    {
                        'rule_id': 'FB001',
                        'check': 'security_headers',
                        'severity': 'HIGH',
                        'description': 'Security headers should be configured',
                        'required_keys': ['X-Content-Type-Options', 'X-Frame-Options']
                    },
                    {
                        'rule_id': 'FB002',
                        'check': 'https_redirect',
                        'severity': 'HIGH',
                        'description': 'HTTPS redirect should be enabled',
                        'required_config': {'redirects': [{'type': 'https'}]}
                    }
                ]
            },
            'environment': {
                'security_checks': [
                    {
                        'rule_id': 'ENV001',
                        'check': 'no_production_debug',
                        'severity': 'HIGH',
                        'description': 'Debug mode should be disabled in production',
                        'production_vars': ['DEBUG', 'NODE_ENV'],
                        'forbidden_values': {'DEBUG': ['true', '1'], 'NODE_ENV': ['development']}
                    },
                    {
                        'rule_id': 'ENV002',
                        'check': 'secure_defaults',
                        'severity': 'MEDIUM',
                        'description': 'Secure defaults should be used',
                        'secure_vars': {
                            'CORS_ALLOW_ALL_ORIGINS': 'false',
                            'SSL_VERIFY': 'true',
                            'SECURE_COOKIES': 'true'
                        }
                    }
                ]
            }
        }
        
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r') as f:
                    user_rules = yaml.safe_load(f)
                    default_rules.update(user_rules)
            except Exception as e:
                logger.warning(f"Failed to load validation rules: {e}, using defaults")
                
        return default_rules
    
    def validate_project(self, project_path: str) -> ValidationResult:
        """Validate project configuration security"""
        logger.info(f"Starting configuration security validation for: {project_path}")
        start_time = datetime.now()
        
        if not os.path.exists(project_path):
            return self._create_error_result(project_path, "Project path does not exist")
        
        all_issues = []
        files_validated = 0
        
        try:
            # Validate Docker configurations
            docker_issues, docker_files = self._validate_docker_configs(project_path)
            all_issues.extend(docker_issues)
            files_validated += docker_files
            
            # Validate GitHub Actions workflows
            gha_issues, gha_files = self._validate_github_actions(project_path)
            all_issues.extend(gha_issues)
            files_validated += gha_files
            
            # Validate Firebase configuration
            firebase_issues, firebase_files = self._validate_firebase_config(project_path)
            all_issues.extend(firebase_issues)
            files_validated += firebase_files
            
            # Validate environment configurations
            env_issues, env_files = self._validate_environment_configs(project_path)
            all_issues.extend(env_issues)
            files_validated += env_files
            
            # Calculate severity counts
            severity_counts = self._calculate_severity_counts(all_issues)
            
            result = ValidationResult(
                project_path=project_path,
                scan_timestamp=start_time,
                total_issues=len(all_issues),
                critical_issues=severity_counts.get('CRITICAL', 0),
                high_issues=severity_counts.get('HIGH', 0),
                medium_issues=severity_counts.get('MEDIUM', 0),
                low_issues=severity_counts.get('LOW', 0),
                files_validated=files_validated,
                issues=sorted(all_issues, key=lambda x: self._severity_weight(x.severity), reverse=True),
                status='completed'
            )
            
            logger.info(f"Configuration validation completed - Found {len(all_issues)} issues in {files_validated} files")
            return result
            
        except Exception as e:
            logger.error(f"Configuration validation failed: {str(e)}")
            return self._create_error_result(project_path, str(e))
    
    def _validate_docker_configs(self, project_path: str) -> Tuple[List[ConfigIssue], int]:
        """Validate Docker configurations"""
        issues = []
        files_count = 0
        
        # Find all Dockerfile and docker-compose files
        docker_files = []
        for root, dirs, files in os.walk(project_path):
            for file in files:
                if file.lower() in ['dockerfile', 'docker-compose.yml', 'docker-compose.yaml'] or file.lower().startswith('dockerfile.'):
                    docker_files.append(os.path.join(root, file))
        
        for docker_file in docker_files:
            files_count += 1
            try:
                with open(docker_file, 'r') as f:
                    content = f.read()
                
                file_issues = self._check_docker_security_rules(docker_file, content)
                issues.extend(file_issues)
                
            except Exception as e:
                logger.warning(f"Failed to validate Docker file {docker_file}: {e}")
        
        return issues, files_count
    
    def _check_docker_security_rules(self, file_path: str, content: str) -> List[ConfigIssue]:
        """Check Docker file against security rules"""
        issues = []
        rules = self.validation_rules['docker']['security_checks']
        
        for rule in rules:
            rule_issues = self._apply_docker_rule(file_path, content, rule)
            issues.extend(rule_issues)
        
        return issues
    
    def _apply_docker_rule(self, file_path: str, content: str, rule: Dict) -> List[ConfigIssue]:
        """Apply a single Docker security rule"""
        issues = []
        
        import re
        pattern = rule.get('pattern', '')
        
        if rule.get('should_not_match'):
            # Rule should NOT match (e.g., no hardcoded secrets)
            matches = re.finditer(pattern, content, re.IGNORECASE | re.MULTILINE)
            for match in matches:
                issues.append(ConfigIssue(
                    file_path=file_path,
                    issue_type='docker_security',
                    severity=rule['severity'],
                    title=rule['description'],
                    description=f"Found prohibited pattern: {match.group()}",
                    recommendation=f"Remove or secure the matched content",
                    current_value=match.group(),
                    rule_id=rule['rule_id']
                ))
        elif rule.get('required'):
            # Rule should match (e.g., non-root user required)
            if not re.search(pattern, content, re.IGNORECASE | re.MULTILINE):
                issues.append(ConfigIssue(
                    file_path=file_path,
                    issue_type='docker_security',
                    severity=rule['severity'],
                    title=rule['description'],
                    description=f"Missing required configuration: {rule['check']}",
                    recommendation=f"Add the required configuration matching pattern: {pattern}",
                    rule_id=rule['rule_id']
                ))
        
        return issues
    
    def _validate_github_actions(self, project_path: str) -> Tuple[List[ConfigIssue], int]:
        """Validate GitHub Actions workflows"""
        issues = []
        files_count = 0
        
        workflows_dir = os.path.join(project_path, '.github', 'workflows')
        if not os.path.exists(workflows_dir):
            return issues, files_count
        
        for file_name in os.listdir(workflows_dir):
            if file_name.endswith(('.yml', '.yaml')):
                workflow_file = os.path.join(workflows_dir, file_name)
                files_count += 1
                
                try:
                    with open(workflow_file, 'r') as f:
                        content = f.read()
                    
                    file_issues = self._check_github_actions_rules(workflow_file, content)
                    issues.extend(file_issues)
                    
                except Exception as e:
                    logger.warning(f"Failed to validate workflow {workflow_file}: {e}")
        
        return issues, files_count
    
    def _check_github_actions_rules(self, file_path: str, content: str) -> List[ConfigIssue]:
        """Check GitHub Actions file against security rules"""
        issues = []
        rules = self.validation_rules['github_actions']['security_checks']
        
        import re
        
        for rule in rules:
            if rule['check'] == 'secrets_usage':
                # Check for hardcoded secrets vs GitHub secrets syntax
                secret_patterns = re.finditer(rule['context_pattern'], content, re.IGNORECASE)
                for match in secret_patterns:
                    line = content[:match.start()].count('\n') + 1
                    context_line = content.split('\n')[line-1] if line <= len(content.split('\n')) else ""
                    
                    if not re.search(rule['pattern'], context_line, re.IGNORECASE):
                        issues.append(ConfigIssue(
                            file_path=file_path,
                            issue_type='github_actions_security',
                            severity=rule['severity'],
                            title=rule['description'],
                            description=f"Line {line}: Potential hardcoded secret usage",
                            recommendation="Use GitHub secrets syntax: ${{ secrets.SECRET_NAME }}",
                            current_value=context_line.strip(),
                            rule_id=rule['rule_id']
                        ))
        
        return issues
    
    def _validate_firebase_config(self, project_path: str) -> Tuple[List[ConfigIssue], int]:
        """Validate Firebase configuration"""
        issues = []
        files_count = 0
        
        firebase_config_path = os.path.join(project_path, 'firebase.json')
        if not os.path.exists(firebase_config_path):
            return issues, files_count
        
        files_count = 1
        
        try:
            with open(firebase_config_path, 'r') as f:
                config = json.load(f)
            
            file_issues = self._check_firebase_security_rules(firebase_config_path, config)
            issues.extend(file_issues)
            
        except Exception as e:
            logger.warning(f"Failed to validate Firebase config: {e}")
        
        return issues, files_count
    
    def _check_firebase_security_rules(self, file_path: str, config: Dict) -> List[ConfigIssue]:
        """Check Firebase configuration against security rules"""
        issues = []
        rules = self.validation_rules['firebase']['security_checks']
        
        for rule in rules:
            if rule['check'] == 'security_headers':
                hosting_config = config.get('hosting', {})
                headers = hosting_config.get('headers', [])
                
                required_headers = set(rule['required_keys'])
                configured_headers = set()
                
                for header_config in headers:
                    if 'headers' in header_config:
                        configured_headers.update(header_config['headers'].keys())
                
                missing_headers = required_headers - configured_headers
                
                for missing_header in missing_headers:
                    issues.append(ConfigIssue(
                        file_path=file_path,
                        issue_type='firebase_security',
                        severity=rule['severity'],
                        title=rule['description'],
                        description=f"Missing security header: {missing_header}",
                        recommendation=f"Add {missing_header} header to Firebase hosting configuration",
                        rule_id=rule['rule_id']
                    ))
        
        return issues
    
    def _validate_environment_configs(self, project_path: str) -> Tuple[List[ConfigIssue], int]:
        """Validate environment configurations"""
        issues = []
        files_count = 0
        
        env_files = [
            '.env', '.env.production', '.env.staging',
            'deployment/production.yaml', 'deployment/staging.yaml'
        ]
        
        for env_file in env_files:
            env_path = os.path.join(project_path, env_file)
            if os.path.exists(env_path):
                files_count += 1
                
                try:
                    if env_file.endswith('.yaml'):
                        with open(env_path, 'r') as f:
                            env_data = yaml.safe_load(f).get('env', {})
                    else:
                        env_data = self._parse_env_file(env_path)
                    
                    file_issues = self._check_environment_security_rules(env_path, env_data)
                    issues.extend(file_issues)
                    
                except Exception as e:
                    logger.warning(f"Failed to validate environment file {env_path}: {e}")
        
        return issues, files_count
    
    def _parse_env_file(self, file_path: str) -> Dict[str, str]:
        """Parse .env file into dictionary"""
        env_vars = {}
        
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
        
        return env_vars
    
    def _check_environment_security_rules(self, file_path: str, env_data: Dict) -> List[ConfigIssue]:
        """Check environment configuration against security rules"""
        issues = []
        rules = self.validation_rules['environment']['security_checks']
        
        for rule in rules:
            if rule['check'] == 'no_production_debug':
                if 'production' in file_path.lower():
                    for var, forbidden_vals in rule['forbidden_values'].items():
                        if var in env_data and env_data[var] in forbidden_vals:
                            issues.append(ConfigIssue(
                                file_path=file_path,
                                issue_type='environment_security',
                                severity=rule['severity'],
                                title=rule['description'],
                                description=f"Production environment has {var}={env_data[var]}",
                                recommendation=f"Set {var} to secure value for production",
                                current_value=env_data[var],
                                expected_value="false" if var == 'DEBUG' else "production",
                                rule_id=rule['rule_id']
                            ))
            
            elif rule['check'] == 'secure_defaults':
                for var, expected_val in rule['secure_vars'].items():
                    if var in env_data and env_data[var] != expected_val:
                        issues.append(ConfigIssue(
                            file_path=file_path,
                            issue_type='environment_security',
                            severity=rule['severity'],
                            title=rule['description'],
                            description=f"Insecure value for {var}: {env_data[var]}",
                            recommendation=f"Set {var} to {expected_val} for security",
                            current_value=env_data[var],
                            expected_value=expected_val,
                            rule_id=rule['rule_id']
                        ))
        
        return issues
    
    def _calculate_severity_counts(self, issues: List[ConfigIssue]) -> Dict[str, int]:
        """Calculate counts by severity"""
        counts = {}
        for issue in issues:
            counts[issue.severity] = counts.get(issue.severity, 0) + 1
        return counts
    
    def _severity_weight(self, severity: str) -> int:
        """Get severity weight for sorting"""
        weights = {'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1}
        return weights.get(severity, 0)
    
    def _create_error_result(self, project_path: str, error_msg: str) -> ValidationResult:
        """Create error validation result"""
        return ValidationResult(
            project_path=project_path,
            scan_timestamp=datetime.now(),
            total_issues=0,
            critical_issues=0,
            high_issues=0,
            medium_issues=0,
            low_issues=0,
            files_validated=0,
            issues=[],
            status=f'error: {error_msg}'
        )
    
    def evaluate_security_gate(self, result: ValidationResult) -> Tuple[bool, str]:
        """Evaluate if configuration passes security gate"""
        if result.status.startswith('error'):
            return False, f"Validation failed: {result.status}"
        
        if result.critical_issues > 0:
            return False, f"Critical configuration issues found: {result.critical_issues}"
        
        if result.high_issues > 5:
            return False, f"Too many high severity issues: {result.high_issues} (max: 5)"
        
        return True, "Configuration security validation passed"
    
    def generate_report(self, result: ValidationResult, output_path: str) -> None:
        """Generate configuration security report"""
        report = {
            'validation_summary': {
                'project_path': result.project_path,
                'scan_timestamp': result.scan_timestamp.isoformat(),
                'files_validated': result.files_validated,
                'total_issues': result.total_issues,
                'severity_breakdown': {
                    'critical': result.critical_issues,
                    'high': result.high_issues,
                    'medium': result.medium_issues,
                    'low': result.low_issues
                },
                'status': result.status
            },
            'configuration_issues': [
                {
                    'file_path': issue.file_path,
                    'issue_type': issue.issue_type,
                    'severity': issue.severity,
                    'rule_id': issue.rule_id,
                    'title': issue.title,
                    'description': issue.description,
                    'recommendation': issue.recommendation,
                    'current_value': issue.current_value,
                    'expected_value': issue.expected_value
                } for issue in result.issues[:100]  # Limit to top 100
            ]
        }
        
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Configuration security report saved to: {output_path}")

def main():
    """Main execution function"""
    if len(sys.argv) < 2:
        print("Usage: config-security-validator.py <project_path> [output_path]")
        sys.exit(1)
    
    project_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else f"config-validation-report-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    # Initialize validator
    validator = ConfigSecurityValidator()
    
    # Perform validation
    result = validator.validate_project(project_path)
    
    # Evaluate security gate
    passed, message = validator.evaluate_security_gate(result)
    
    # Generate report
    validator.generate_report(result, output_path)
    
    # Print summary
    print(f"\n=== Configuration Security Validation Results ===")
    print(f"Project: {project_path}")
    print(f"Files Validated: {result.files_validated}")
    print(f"Total Issues: {result.total_issues}")
    print(f"Critical: {result.critical_issues}, High: {result.high_issues}, Medium: {result.medium_issues}, Low: {result.low_issues}")
    print(f"Security Gate: {'PASSED' if passed else 'FAILED'}")
    print(f"Message: {message}")
    print(f"Report: {output_path}")
    
    # Exit with appropriate code
    sys.exit(0 if passed else 1)

if __name__ == "__main__":
    main()