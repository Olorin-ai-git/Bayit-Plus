#!/usr/bin/env python3
"""
Secrets Scanner
GitLeaks integration for secrets detection and credential security
Part of Phase 5: Security & Compliance Automation

Author: Gil Klainert
Date: 2025-09-06
"""

import os
import sys
import json
import subprocess
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set
from dataclasses import dataclass
from datetime import datetime
import yaml
import re

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class SecretMatch:
    """Detected secret information"""
    file_path: str
    line_number: int
    rule_id: str
    secret_type: str
    description: str
    match: str  # Redacted match
    start_line: int
    end_line: int
    start_column: int
    end_column: int
    entropy: Optional[float]
    commit_hash: Optional[str]
    author: Optional[str]

@dataclass
class ScanResult:
    """Secrets scan result"""
    project_path: str
    scan_timestamp: datetime
    total_secrets: int
    high_entropy_secrets: int
    api_keys: int
    passwords: int
    tokens: int
    certificates: int
    database_urls: int
    secrets: List[SecretMatch]
    scan_duration: float
    files_scanned: int
    status: str

class SecretsScanner:
    """GitLeaks-based secrets detection scanner"""
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path or "deployment/security/secrets-config.yaml"
        self.config = self._load_config()
        self.gitleaks_path = self._find_gitleaks()
        
    def _load_config(self) -> Dict:
        """Load secrets scanner configuration"""
        default_config = {
            'gitleaks': {
                'config_file': None,  # Use default GitLeaks config
                'no_git': True,      # Scan without requiring git repo
                'max_target_megabytes': 512,
                'timeout': 300
            },
            'exclusions': {
                'files': [
                    '*.lock', '*.min.js', '*.min.css', 
                    'node_modules/*', 'dist/*', 'build/*',
                    '*.pyc', '__pycache__/*', '.git/*'
                ],
                'extensions': ['.log', '.tmp', '.bak'],
                'directories': ['node_modules', '.git', 'dist', 'build', '__pycache__']
            },
            'false_positives': {
                'ignore_test_secrets': True,
                'ignore_example_secrets': True,
                'whitelist_patterns': [
                    'test_key_123',
                    'example_secret',
                    'fake_token',
                    'placeholder_password'
                ]
            },
            'entropy_threshold': 4.5,
            'security_thresholds': {
                'total_secrets': 0,      # No secrets allowed in production
                'high_entropy': 0,       # No high entropy secrets
                'api_keys': 0,          # No API keys
                'database_urls': 0      # No database URLs
            }
        }
        
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r') as f:
                    user_config = yaml.safe_load(f)
                    default_config.update(user_config)
            except Exception as e:
                logger.warning(f"Failed to load config: {e}, using defaults")
                
        return default_config
    
    def _find_gitleaks(self) -> str:
        """Find GitLeaks executable"""
        gitleaks_paths = ['/usr/local/bin/gitleaks', '/usr/bin/gitleaks', 'gitleaks']
        
        for path in gitleaks_paths:
            try:
                result = subprocess.run([path, 'version'], 
                                      capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    logger.info(f"Found GitLeaks at: {path}")
                    return path
            except (subprocess.TimeoutExpired, FileNotFoundError):
                continue
                
        logger.warning("GitLeaks not found, attempting to install...")
        self._install_gitleaks()
        return 'gitleaks'
    
    def _install_gitleaks(self) -> None:
        """Install GitLeaks if not found"""
        try:
            # Try to install via package manager
            if os.system('which apt-get > /dev/null 2>&1') == 0:
                logger.info("Installing GitLeaks via apt-get...")
                os.system('sudo apt-get update && sudo apt-get install -y gitleaks')
            elif os.system('which brew > /dev/null 2>&1') == 0:
                logger.info("Installing GitLeaks via Homebrew...")
                os.system('brew install gitleaks')
            else:
                logger.error("Unable to install GitLeaks automatically")
        except Exception as e:
            logger.error(f"GitLeaks installation failed: {e}")
    
    def scan_directory(self, project_path: str) -> ScanResult:
        """Scan directory for secrets"""
        logger.info(f"Starting secrets scan for: {project_path}")
        start_time = datetime.now()
        
        if not os.path.exists(project_path):
            return self._create_error_result(project_path, "Project path does not exist")
        
        try:
            # Build GitLeaks command
            cmd = [
                self.gitleaks_path,
                'detect',
                '--source', project_path,
                '--report-format', 'json',
                '--report-path', '/tmp/gitleaks-report.json',
                '--no-banner'
            ]
            
            if self.config['gitleaks']['no_git']:
                cmd.append('--no-git')
            
            if self.config['gitleaks']['config_file']:
                cmd.extend(['--config', self.config['gitleaks']['config_file']])
            
            # Execute scan
            result = subprocess.run(cmd, capture_output=True, text=True, 
                                  timeout=self.config['gitleaks']['timeout'])
            
            # GitLeaks returns non-zero when secrets found, so we check the report file
            secrets = []
            if os.path.exists('/tmp/gitleaks-report.json'):
                secrets = self._parse_gitleaks_report('/tmp/gitleaks-report.json')
                os.remove('/tmp/gitleaks-report.json')
            
            # Filter false positives
            filtered_secrets = self._filter_false_positives(secrets)
            
            # Calculate metrics
            metrics = self._calculate_secret_metrics(filtered_secrets)
            duration = (datetime.now() - start_time).total_seconds()
            files_scanned = self._count_scanned_files(project_path)
            
            scan_result = ScanResult(
                project_path=project_path,
                scan_timestamp=start_time,
                total_secrets=len(filtered_secrets),
                high_entropy_secrets=metrics['high_entropy'],
                api_keys=metrics['api_keys'],
                passwords=metrics['passwords'],
                tokens=metrics['tokens'],
                certificates=metrics['certificates'],
                database_urls=metrics['database_urls'],
                secrets=filtered_secrets,
                scan_duration=duration,
                files_scanned=files_scanned,
                status='completed'
            )
            
            logger.info(f"Secrets scan completed in {duration:.2f}s - Found {len(filtered_secrets)} secrets")
            return scan_result
            
        except subprocess.TimeoutExpired:
            logger.error(f"Secrets scan timeout after {self.config['gitleaks']['timeout']}s")
            return self._create_error_result(project_path, "Scan timeout")
        except Exception as e:
            logger.error(f"Secrets scan failed: {str(e)}")
            return self._create_error_result(project_path, str(e))
    
    def _parse_gitleaks_report(self, report_path: str) -> List[SecretMatch]:
        """Parse GitLeaks JSON report"""
        secrets = []
        
        try:
            with open(report_path, 'r') as f:
                report_data = json.load(f)
            
            if isinstance(report_data, list):
                for finding in report_data:
                    secret = SecretMatch(
                        file_path=finding.get('File', ''),
                        line_number=finding.get('StartLine', 0),
                        rule_id=finding.get('RuleID', ''),
                        secret_type=self._classify_secret_type(finding.get('RuleID', '')),
                        description=finding.get('Description', ''),
                        match=self._redact_secret(finding.get('Secret', '')),
                        start_line=finding.get('StartLine', 0),
                        end_line=finding.get('EndLine', 0),
                        start_column=finding.get('StartColumn', 0),
                        end_column=finding.get('EndColumn', 0),
                        entropy=finding.get('Entropy', 0.0),
                        commit_hash=finding.get('Commit', ''),
                        author=finding.get('Author', '')
                    )
                    secrets.append(secret)
                    
        except Exception as e:
            logger.error(f"Failed to parse GitLeaks report: {e}")
        
        return secrets
    
    def _classify_secret_type(self, rule_id: str) -> str:
        """Classify secret type based on GitLeaks rule ID"""
        rule_lower = rule_id.lower()
        
        if 'api' in rule_lower or 'key' in rule_lower:
            return 'api_key'
        elif 'password' in rule_lower or 'pass' in rule_lower:
            return 'password'
        elif 'token' in rule_lower or 'jwt' in rule_lower:
            return 'token'
        elif 'cert' in rule_lower or 'private' in rule_lower or 'rsa' in rule_lower:
            return 'certificate'
        elif 'database' in rule_lower or 'db' in rule_lower or 'postgres' in rule_lower or 'mysql' in rule_lower:
            return 'database_url'
        elif 'aws' in rule_lower or 'gcp' in rule_lower or 'azure' in rule_lower:
            return 'cloud_credential'
        else:
            return 'generic_secret'
    
    def _redact_secret(self, secret: str) -> str:
        """Redact secret value for safe logging"""
        if not secret or len(secret) < 4:
            return '[REDACTED]'
        
        # Show first 2 and last 2 characters
        return f"{secret[:2]}{'*' * (len(secret) - 4)}{secret[-2:]}"
    
    def _filter_false_positives(self, secrets: List[SecretMatch]) -> List[SecretMatch]:
        """Filter out known false positives"""
        filtered = []
        
        for secret in secrets:
            if self._is_false_positive(secret):
                continue
            
            if self._is_test_or_example(secret.file_path):
                if self.config['false_positives']['ignore_test_secrets']:
                    continue
            
            if self._matches_whitelist_pattern(secret.match):
                continue
                
            filtered.append(secret)
        
        return filtered
    
    def _is_false_positive(self, secret: SecretMatch) -> bool:
        """Check if secret is a known false positive"""
        # Check entropy threshold
        if secret.entropy and secret.entropy < self.config['entropy_threshold']:
            return True
        
        # Check for common false positive patterns
        false_positive_patterns = [
            r'example\.com',
            r'localhost',
            r'127\.0\.0\.1',
            r'test.*test',
            r'fake.*fake',
            r'placeholder',
            r'your.*here'
        ]
        
        for pattern in false_positive_patterns:
            if re.search(pattern, secret.match.lower()):
                return True
        
        return False
    
    def _is_test_or_example(self, file_path: str) -> bool:
        """Check if file is a test or example file"""
        test_indicators = [
            'test', 'spec', 'example', 'sample', 
            'demo', 'mock', '__test__', '__spec__'
        ]
        
        path_lower = file_path.lower()
        return any(indicator in path_lower for indicator in test_indicators)
    
    def _matches_whitelist_pattern(self, secret_match: str) -> bool:
        """Check if secret matches whitelist patterns"""
        whitelist = self.config['false_positives']['whitelist_patterns']
        
        for pattern in whitelist:
            if pattern.lower() in secret_match.lower():
                return True
        
        return False
    
    def _calculate_secret_metrics(self, secrets: List[SecretMatch]) -> Dict[str, int]:
        """Calculate metrics by secret type"""
        metrics = {
            'high_entropy': 0,
            'api_keys': 0,
            'passwords': 0,
            'tokens': 0,
            'certificates': 0,
            'database_urls': 0
        }
        
        for secret in secrets:
            if secret.entropy and secret.entropy > self.config['entropy_threshold']:
                metrics['high_entropy'] += 1
            
            if secret.secret_type == 'api_key':
                metrics['api_keys'] += 1
            elif secret.secret_type == 'password':
                metrics['passwords'] += 1
            elif secret.secret_type == 'token':
                metrics['tokens'] += 1
            elif secret.secret_type == 'certificate':
                metrics['certificates'] += 1
            elif secret.secret_type == 'database_url':
                metrics['database_urls'] += 1
        
        return metrics
    
    def _count_scanned_files(self, project_path: str) -> int:
        """Count number of files that would be scanned"""
        count = 0
        
        for root, dirs, files in os.walk(project_path):
            # Skip excluded directories
            dirs[:] = [d for d in dirs if not self._is_excluded_directory(d)]
            
            for file in files:
                if not self._is_excluded_file(file):
                    count += 1
        
        return count
    
    def _is_excluded_directory(self, dir_name: str) -> bool:
        """Check if directory should be excluded"""
        excluded_dirs = self.config['exclusions']['directories']
        return any(excluded in dir_name for excluded in excluded_dirs)
    
    def _is_excluded_file(self, file_name: str) -> bool:
        """Check if file should be excluded"""
        excluded_files = self.config['exclusions']['files']
        excluded_extensions = self.config['exclusions']['extensions']
        
        # Check file patterns
        for pattern in excluded_files:
            if pattern.replace('*', '') in file_name:
                return True
        
        # Check extensions
        for ext in excluded_extensions:
            if file_name.endswith(ext):
                return True
        
        return False
    
    def _create_error_result(self, project_path: str, error_msg: str) -> ScanResult:
        """Create error scan result"""
        return ScanResult(
            project_path=project_path,
            scan_timestamp=datetime.now(),
            total_secrets=0,
            high_entropy_secrets=0,
            api_keys=0,
            passwords=0,
            tokens=0,
            certificates=0,
            database_urls=0,
            secrets=[],
            scan_duration=0.0,
            files_scanned=0,
            status=f'error: {error_msg}'
        )
    
    def evaluate_security_gate(self, result: ScanResult) -> Tuple[bool, str]:
        """Evaluate if secrets scan passes security gate"""
        thresholds = self.config['security_thresholds']
        
        if result.status.startswith('error'):
            return False, f"Scan failed: {result.status}"
        
        if result.total_secrets > thresholds['total_secrets']:
            return False, f"Total secrets found: {result.total_secrets} (max: {thresholds['total_secrets']})"
        
        if result.high_entropy_secrets > thresholds['high_entropy']:
            return False, f"High entropy secrets: {result.high_entropy_secrets} (max: {thresholds['high_entropy']})"
            
        if result.api_keys > thresholds['api_keys']:
            return False, f"API keys found: {result.api_keys} (max: {thresholds['api_keys']})"
            
        if result.database_urls > thresholds['database_urls']:
            return False, f"Database URLs found: {result.database_urls} (max: {thresholds['database_urls']})"
        
        return True, "No secrets detected - Security gate passed"
    
    def generate_report(self, result: ScanResult, output_path: str) -> None:
        """Generate secrets scan report"""
        report = {
            'scan_summary': {
                'project_path': result.project_path,
                'scan_timestamp': result.scan_timestamp.isoformat(),
                'total_secrets': result.total_secrets,
                'files_scanned': result.files_scanned,
                'secret_breakdown': {
                    'high_entropy_secrets': result.high_entropy_secrets,
                    'api_keys': result.api_keys,
                    'passwords': result.passwords,
                    'tokens': result.tokens,
                    'certificates': result.certificates,
                    'database_urls': result.database_urls
                },
                'scan_duration': result.scan_duration,
                'status': result.status
            },
            'secrets_found': [
                {
                    'file_path': secret.file_path,
                    'line_number': secret.line_number,
                    'rule_id': secret.rule_id,
                    'secret_type': secret.secret_type,
                    'description': secret.description,
                    'redacted_match': secret.match,
                    'entropy': secret.entropy,
                    'location': {
                        'start_line': secret.start_line,
                        'end_line': secret.end_line,
                        'start_column': secret.start_column,
                        'end_column': secret.end_column
                    }
                } for secret in result.secrets[:50]  # Limit to top 50
            ]
        }
        
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Secrets scan report saved to: {output_path}")
    
    def scan_firebase_secrets(self, project_path: str) -> Dict[str, any]:
        """Validate Firebase Secrets configuration"""
        firebase_config_path = os.path.join(project_path, 'firebase.json')
        
        if not os.path.exists(firebase_config_path):
            return {'status': 'no_firebase_config', 'issues': []}
        
        try:
            with open(firebase_config_path, 'r') as f:
                firebase_config = json.load(f)
            
            issues = []
            
            # Check for hardcoded secrets in firebase.json
            config_str = json.dumps(firebase_config)
            potential_secrets = re.findall(r'["\']([A-Za-z0-9+/]{20,})["\']', config_str)
            
            for secret in potential_secrets:
                if len(secret) > 32:  # Likely a secret
                    issues.append({
                        'type': 'potential_secret_in_config',
                        'file': 'firebase.json',
                        'secret': self._redact_secret(secret)
                    })
            
            return {'status': 'scanned', 'issues': issues}
            
        except Exception as e:
            return {'status': 'error', 'error': str(e), 'issues': []}

def main():
    """Main execution function"""
    if len(sys.argv) < 2:
        print("Usage: secrets-scanner.py <project_path> [output_path]")
        sys.exit(1)
    
    project_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else f"secrets-report-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    # Initialize scanner
    scanner = SecretsScanner()
    
    # Perform scan
    result = scanner.scan_directory(project_path)
    
    # Evaluate security gate
    passed, message = scanner.evaluate_security_gate(result)
    
    # Generate report
    scanner.generate_report(result, output_path)
    
    # Scan Firebase secrets
    firebase_result = scanner.scan_firebase_secrets(project_path)
    
    # Print summary
    print(f"\n=== Secrets Scan Results ===")
    print(f"Project: {project_path}")
    print(f"Files Scanned: {result.files_scanned}")
    print(f"Total Secrets: {result.total_secrets}")
    print(f"High Entropy: {result.high_entropy_secrets}, API Keys: {result.api_keys}")
    print(f"Passwords: {result.passwords}, Tokens: {result.tokens}")
    print(f"Certificates: {result.certificates}, Database URLs: {result.database_urls}")
    print(f"Security Gate: {'PASSED' if passed else 'FAILED'}")
    print(f"Message: {message}")
    print(f"Firebase Config: {firebase_result['status']}")
    print(f"Report: {output_path}")
    
    # Exit with appropriate code
    sys.exit(0 if passed and firebase_result['status'] != 'error' else 1)

if __name__ == "__main__":
    main()