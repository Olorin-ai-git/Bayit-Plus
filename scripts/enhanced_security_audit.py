#!/usr/bin/env python3
"""
Enhanced Olorin Security Audit Script
Advanced security scanning for the Olorin fraud detection platform.

Author: Claude Security Specialist
Date: 2025-08-29
"""

import os
import re
import sys
import json
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Tuple
import hashlib
import stat
import urllib.parse
from datetime import datetime


class EnhancedSecurityAuditor:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.findings = {
            'critical': [],
            'high': [],
            'medium': [],
            'low': []
        }
        
        # Enhanced credential patterns for better detection
        self.credential_patterns = [
            (r'(?i)password\s*[=:]\s*["\'][^"\']{8,}["\']', 'Password in configuration'),
            (r'(?i)secret\s*[=:]\s*["\'][^"\']{16,}["\']', 'Secret key in configuration'),
            (r'(?i)api[_-]?key\s*[=:]\s*["\'][^"\']{16,}["\']', 'API key in configuration'),
            (r'(?i)private[_-]?key\s*[=:]\s*["\'][^"\']+["\']', 'Private key in configuration'),
            (r'(?i)token\s*[=:]\s*["\'][^"\']{16,}["\']', 'Token in configuration'),
            (r'-----BEGIN[A-Z\s]+PRIVATE KEY-----', 'Private key content'),
            (r'[A-Za-z0-9+/]{40,}={0,2}', 'Base64 encoded potential secret'),
            (r'sk-[A-Za-z0-9]{32,}', 'OpenAI API key pattern'),
            (r'AIza[A-Za-z0-9_-]{35}', 'Google API key pattern'),
            (r'AKIA[0-9A-Z]{16}', 'AWS Access Key pattern'),
            (r'gh[pousr]_[A-Za-z0-9]{36}', 'GitHub token pattern'),
        ]
        
        # JWT secret detection patterns
        self.jwt_patterns = [
            (r'(?i)jwt[_-]?secret[_-]?key', 'JWT secret key reference'),
            (r'"your-secret-key-change-in-production"', 'Default JWT secret'),
            (r'"default-change-in-production"', 'Default encryption password'),
            (r'"default-salt-change"', 'Default encryption salt'),
        ]
        
        # Security vulnerability patterns
        self.vulnerability_patterns = [
            (r'(?i)eval\s*\(', 'Potential code injection via eval()'),
            (r'(?i)exec\s*\(', 'Potential code injection via exec()'),
            (r'(?i)shell=True', 'Shell injection risk in subprocess'),
            (r'(?i)pickle\.loads?', 'Insecure deserialization with pickle'),
            (r'(?i)yaml\.load\(', 'Unsafe YAML loading'),
            (r'(?i)\.format\([^)]*\{', 'Potential format string vulnerability'),
            (r'(?i)innerHTML\s*=', 'Potential XSS via innerHTML'),
            (r'(?i)dangerouslySetInnerHTML', 'React XSS risk'),
            (r'(?i)document\.write', 'DOM manipulation XSS risk'),
        ]
        
        # Configuration security patterns
        self.config_patterns = [
            (r'(?i)debug\s*[=:]\s*True', 'Debug mode enabled'),
            (r'(?i)cors.*allow_origins.*\*', 'CORS wildcard origins'),
            (r'(?i)ssl[_-]?verify\s*[=:]\s*False', 'SSL verification disabled'),
            (r'(?i)verify\s*[=:]\s*False', 'Certificate verification disabled'),
        ]
        
        # Exclude patterns (optimized for performance)
        self.exclude_patterns = [
            'node_modules', '.git', '__pycache__', '.tox', 'venv', '.venv',
            'env', 'htmlcov', 'coverage', '.pytest_cache', 'build', 'dist',
            '.mypy_cache', 'Gaia', '.cache', '.firebase', '.babel', '.rpt2_cache',
            '.next', '.nuxt', 'vendor', 'bower_components'
        ]

    def should_exclude(self, path: Path) -> bool:
        """Optimized exclusion check"""
        path_str = str(path).lower()
        return any(pattern in path_str for pattern in self.exclude_patterns)

    def is_binary_file(self, file_path: Path) -> bool:
        """Enhanced binary file detection"""
        try:
            # Check file extension first for performance
            binary_extensions = {'.exe', '.bin', '.so', '.dylib', '.dll', '.png', 
                               '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', 
                               '.tar', '.gz', '.bz2', '.woff', '.woff2', '.ttf'}
            
            if file_path.suffix.lower() in binary_extensions:
                return True
                
            # Sample-based binary detection for other files
            with open(file_path, 'rb') as f:
                chunk = f.read(1024)
            return b'\x00' in chunk[:512]  # Check first 512 bytes
        except (OSError, PermissionError):
            return True

    def scan_for_credentials_and_secrets(self) -> None:
        """Enhanced credential and secret scanning"""
        print("🔍 Scanning for exposed credentials and secrets...")
        
        scanned_files = 0
        
        # Prioritize configuration files
        config_files = list(self.project_root.rglob('*.env*')) + \
                      list(self.project_root.rglob('*config*')) + \
                      list(self.project_root.rglob('*.json')) + \
                      list(self.project_root.rglob('*.yaml')) + \
                      list(self.project_root.rglob('*.yml'))
        
        all_files = config_files + list(self.project_root.rglob('*'))
        
        for file_path in all_files:
            if not file_path.is_file() or self.should_exclude(file_path):
                continue
                
            if self.is_binary_file(file_path):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    
                scanned_files += 1
                if scanned_files % 100 == 0:
                    print(f"   Scanned {scanned_files} files...")
                
                # Check for credentials
                self._check_patterns(file_path, content, self.credential_patterns, 'critical')
                
                # Check for JWT secrets
                self._check_patterns(file_path, content, self.jwt_patterns, 'critical')
                
                # Check for vulnerabilities
                self._check_patterns(file_path, content, self.vulnerability_patterns, 'high')
                
                # Check for configuration issues
                self._check_patterns(file_path, content, self.config_patterns, 'medium')
                
            except (UnicodeDecodeError, PermissionError, OSError):
                continue
                
        print(f"   ✅ Scanned {scanned_files} files for credentials and secrets")

    def _check_patterns(self, file_path: Path, content: str, patterns: List[Tuple[str, str]], severity: str) -> None:
        """Check content against patterns and record findings"""
        for pattern, description in patterns:
            try:
                matches = re.findall(pattern, content, re.IGNORECASE | re.MULTILINE)
                if matches:
                    # Skip template/example files
                    if any(keyword in str(file_path).lower() 
                          for keyword in ['.example', 'template', 'sample', 'demo', 'test']):
                        continue
                        
                    # Get line numbers for better reporting
                    lines = content.split('\n')
                    match_lines = []
                    for i, line in enumerate(lines, 1):
                        if re.search(pattern, line, re.IGNORECASE):
                            match_lines.append(i)
                    
                    self.findings[severity].append({
                        'type': 'Security Vulnerability',
                        'file': str(file_path.relative_to(self.project_root)),
                        'description': description,
                        'pattern': pattern,
                        'matches': len(matches),
                        'lines': match_lines[:5],  # Limit to first 5 matches
                        'sample': matches[0][:100] if matches else None  # First 100 chars
                    })
            except re.error:
                continue  # Skip invalid regex patterns

    def scan_authentication_security(self) -> None:
        """Scan for authentication and authorization security issues"""
        print("🔍 Scanning authentication and authorization security...")
        
        auth_files = []
        for pattern in ['*auth*', '*security*', '*jwt*', '*session*']:
            auth_files.extend(self.project_root.rglob(f'**/{pattern}.py'))
            auth_files.extend(self.project_root.rglob(f'**/{pattern}.ts'))
            auth_files.extend(self.project_root.rglob(f'**/{pattern}.tsx'))
        
        for file_path in auth_files:
            if not file_path.is_file() or self.should_exclude(file_path):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                # Check for authentication weaknesses
                auth_issues = [
                    (r'fake_users_db|hardcoded.*password', 'Hardcoded user credentials'),
                    (r'SECRET_KEY.*=.*".*"', 'Hardcoded secret key'),
                    (r'password.*=.*"secret"', 'Default/weak password'),
                    (r'verify=False|ssl_verify=False', 'SSL verification disabled'),
                    (r'cors.*allow_origins.*\*', 'Permissive CORS configuration'),
                ]
                
                for pattern, description in auth_issues:
                    if re.search(pattern, content, re.IGNORECASE):
                        self.findings['critical'].append({
                            'type': 'Authentication Security',
                            'file': str(file_path.relative_to(self.project_root)),
                            'description': description,
                            'line_count': len(content.split('\n')),
                            'recommendation': self._get_auth_recommendation(description)
                        })
                        
            except (UnicodeDecodeError, PermissionError):
                continue

    def _get_auth_recommendation(self, description: str) -> str:
        """Get specific recommendations for authentication issues"""
        recommendations = {
            'Hardcoded user credentials': 'Implement proper database-backed user management',
            'Hardcoded secret key': 'Use environment variables or secrets manager',
            'Default/weak password': 'Implement password complexity requirements',
            'SSL verification disabled': 'Enable SSL verification for all external connections',
            'Permissive CORS configuration': 'Restrict CORS to specific domains'
        }
        return recommendations.get(description, 'Review and remediate security configuration')

    def scan_api_security(self) -> None:
        """Scan for API security issues"""
        print("🔍 Scanning API security configurations...")
        
        # Find API route files
        api_files = []
        for pattern in ['*router*', '*api*', '*endpoint*', '*route*']:
            api_files.extend(self.project_root.rglob(f'**/{pattern}.py'))
            api_files.extend(self.project_root.rglob(f'**/{pattern}.ts'))
        
        for file_path in api_files:
            if not file_path.is_file() or self.should_exclude(file_path):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                # Check for API security issues
                api_issues = []
                
                # Missing authentication
                if '@app.route' in content and 'auth' not in content.lower():
                    api_issues.append('Potential unauthenticated API endpoint')
                
                # Missing input validation
                if 'request.' in content and 'validator' not in content.lower():
                    api_issues.append('Missing input validation')
                
                # SQL injection risks
                if re.search(r'query.*%s|query.*format|query.*f"', content):
                    api_issues.append('Potential SQL injection vulnerability')
                
                for issue in api_issues:
                    self.findings['high'].append({
                        'type': 'API Security',
                        'file': str(file_path.relative_to(self.project_root)),
                        'description': issue,
                        'recommendation': self._get_api_recommendation(issue)
                    })
                    
            except (UnicodeDecodeError, PermissionError):
                continue

    def _get_api_recommendation(self, issue: str) -> str:
        """Get specific recommendations for API security issues"""
        recommendations = {
            'Potential unauthenticated API endpoint': 'Add authentication middleware or decorators',
            'Missing input validation': 'Implement Pydantic models or validation middleware',
            'Potential SQL injection vulnerability': 'Use parameterized queries or ORM'
        }
        return recommendations.get(issue, 'Review API security implementation')

    def scan_frontend_security(self) -> None:
        """Scan frontend for XSS and security issues"""
        print("🔍 Scanning frontend security...")
        
        frontend_files = []
        for ext in ['*.tsx', '*.ts', '*.jsx', '*.js']:
            frontend_files.extend(self.project_root.rglob(f'src/**/{ext}'))
        
        for file_path in frontend_files:
            if not file_path.is_file() or self.should_exclude(file_path):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                # Check for XSS vulnerabilities
                xss_patterns = [
                    (r'dangerouslySetInnerHTML', 'React XSS risk - dangerouslySetInnerHTML'),
                    (r'innerHTML\s*=', 'DOM XSS risk - innerHTML assignment'),
                    (r'document\.write', 'DOM XSS risk - document.write'),
                    (r'eval\s*\(', 'Code injection risk - eval()'),
                    (r'Function\s*\(.*\)', 'Dynamic code execution risk'),
                ]
                
                for pattern, description in xss_patterns:
                    if re.search(pattern, content):
                        self.findings['medium'].append({
                            'type': 'Frontend Security',
                            'file': str(file_path.relative_to(self.project_root)),
                            'description': description,
                            'recommendation': 'Use safe DOM manipulation methods'
                        })
                        
            except (UnicodeDecodeError, PermissionError):
                continue

    def scan_dependency_vulnerabilities(self) -> None:
        """Scan for vulnerable dependencies"""
        print("🔍 Scanning dependency vulnerabilities...")
        
        # Check package.json files
        package_files = list(self.project_root.rglob('package.json'))
        requirements_files = list(self.project_root.rglob('requirements*.txt')) + \
                           list(self.project_root.rglob('pyproject.toml'))
        
        vulnerable_packages = {
            # Known vulnerable npm packages (examples)
            'lodash': ['< 4.17.12', 'Prototype pollution vulnerability'],
            'axios': ['< 0.21.1', 'SSRF vulnerability'],
            'express': ['< 4.17.3', 'Various security issues'],
            
            # Known vulnerable Python packages (examples)
            'requests': ['< 2.20.0', 'Security vulnerabilities'],
            'urllib3': ['< 1.24.2', 'Certificate validation issues'],
            'flask': ['< 1.0', 'Various security issues'],
        }
        
        for file_path in package_files + requirements_files:
            if self.should_exclude(file_path):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                for package, (version_info, description) in vulnerable_packages.items():
                    if package in content:
                        self.findings['medium'].append({
                            'type': 'Dependency Vulnerability',
                            'file': str(file_path.relative_to(self.project_root)),
                            'description': f'{package}: {description}',
                            'recommendation': f'Update {package} to version {version_info}'
                        })
                        
            except (UnicodeDecodeError, PermissionError):
                continue

    def scan_infrastructure_security(self) -> None:
        """Scan infrastructure and deployment security"""
        print("🔍 Scanning infrastructure security...")
        
        # Check Docker files
        docker_files = list(self.project_root.rglob('Dockerfile*')) + \
                      list(self.project_root.rglob('docker-compose*.yml'))
        
        for file_path in docker_files:
            if self.should_exclude(file_path):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                docker_issues = [
                    (r'USER root', 'Container running as root user'),
                    (r'--privileged', 'Privileged container mode'),
                    (r'ADD http', 'Insecure ADD from HTTP'),
                    (r'COPY \. \.', 'Copying entire context'),
                ]
                
                for pattern, description in docker_issues:
                    if re.search(pattern, content, re.IGNORECASE):
                        self.findings['medium'].append({
                            'type': 'Infrastructure Security',
                            'file': str(file_path.relative_to(self.project_root)),
                            'description': description,
                            'recommendation': 'Follow Docker security best practices'
                        })
                        
            except (UnicodeDecodeError, PermissionError):
                continue

    def run_comprehensive_audit(self) -> Dict[str, Any]:
        """Run comprehensive security audit"""
        print("🔒 Starting Enhanced Olorin Security Audit...")
        print(f"📁 Project root: {self.project_root}")
        print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Run all security scans
        self.scan_for_credentials_and_secrets()
        self.scan_authentication_security()
        self.scan_api_security()
        self.scan_frontend_security()
        self.scan_dependency_vulnerabilities()
        self.scan_infrastructure_security()
        
        # Run original scans for completeness
        self.scan_git_status()
        self.scan_file_permissions()
        self.scan_gitignore_coverage()
        
        return self.findings

    def scan_git_status(self) -> None:
        """Check git status for tracked sensitive files"""
        print("🔍 Checking git tracking for sensitive files...")
        
        try:
            result = subprocess.run(['git', 'ls-files'], 
                                  cwd=self.project_root, 
                                  capture_output=True, 
                                  text=True,
                                  timeout=10)
            
            if result.returncode == 0:
                tracked_files = result.stdout.strip().split('\n')
                
                sensitive_patterns = [
                    '*.env', '*.key', '*.pem', '*.p12', '*credential*',
                    '*secret*', '__pycache__/', '*.pyc', 'ADMIN_CREDENTIALS*'
                ]
                
                for file_path in tracked_files:
                    if not file_path:
                        continue
                    
                    for pattern in sensitive_patterns:
                        if self.matches_pattern(file_path, pattern):
                            self.findings['critical'].append({
                                'type': 'Git Security',
                                'file': file_path,
                                'description': f'Sensitive file tracked in git: {pattern}',
                                'recommendation': 'Remove from git and add to .gitignore'
                            })
                            
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            print("   ⚠️  Git not available or timeout")

    def scan_file_permissions(self) -> None:
        """Check for insecure file permissions"""
        print("🔍 Checking file permissions...")
        
        sensitive_patterns = ['*.env*', '*.key', '*.pem', 'config/*']
        
        for pattern in sensitive_patterns:
            for file_path in self.project_root.rglob(pattern):
                if file_path.is_file() and not self.should_exclude(file_path):
                    try:
                        file_stat = file_path.stat()
                        
                        # Check if file is world-readable (readable by others)
                        if file_stat.st_mode & stat.S_IROTH:
                            self.findings['medium'].append({
                                'type': 'File Permissions',
                                'file': str(file_path.relative_to(self.project_root)),
                                'description': f'File is world-readable: {stat.filemode(file_stat.st_mode)}',
                                'recommendation': 'Change permissions to 600 or 640'
                            })
                            
                    except (OSError, PermissionError):
                        continue

    def scan_gitignore_coverage(self) -> None:
        """Check if .gitignore properly covers sensitive patterns"""
        print("🔍 Checking .gitignore coverage...")
        
        gitignore_files = list(self.project_root.rglob('.gitignore'))
        
        if not gitignore_files:
            self.findings['high'].append({
                'type': 'Configuration Security',
                'file': '.gitignore',
                'description': 'No .gitignore file found',
                'recommendation': 'Create comprehensive .gitignore file'
            })
            return
        
        for gitignore_path in gitignore_files:
            try:
                with open(gitignore_path, 'r') as f:
                    gitignore_content = f.read()
                    
                # Enhanced required patterns for security
                required_patterns = [
                    '*.env*', '*.key', '*.pem', '*.p12', '__pycache__/', 
                    '*.pyc', '*credential*', '*secret*', 'node_modules/',
                    '.DS_Store', '*.log', 'coverage/', '.pytest_cache/'
                ]
                
                missing_patterns = []
                for pattern in required_patterns:
                    if pattern not in gitignore_content:
                        missing_patterns.append(pattern)
                        
                if missing_patterns:
                    self.findings['medium'].append({
                        'type': 'Configuration Security',
                        'file': str(gitignore_path.relative_to(self.project_root)),
                        'description': 'Missing security patterns in .gitignore',
                        'missing_patterns': missing_patterns,
                        'recommendation': 'Add missing security patterns to .gitignore'
                    })
                    
            except (OSError, UnicodeDecodeError):
                self.findings['medium'].append({
                    'type': 'Configuration Security',
                    'file': str(gitignore_path.relative_to(self.project_root)),
                    'description': 'Could not read .gitignore file',
                    'recommendation': 'Check .gitignore file permissions and content'
                })

    def matches_pattern(self, file_path: str, pattern: str) -> bool:
        """Check if file path matches a glob-like pattern"""
        import fnmatch
        return fnmatch.fnmatch(file_path, pattern)

    def generate_detailed_report(self) -> str:
        """Generate comprehensive security audit report"""
        report_lines = []
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        report_lines.append("# ENHANCED OLORIN SECURITY AUDIT REPORT")
        report_lines.append(f"**Generated:** {current_time}")
        report_lines.append(f"**Project:** {self.project_root}")
        report_lines.append(f"**Auditor:** Enhanced Security Scanner v2.0")
        report_lines.append("")
        
        # Executive Summary
        total_issues = sum(len(issues) for issues in self.findings.values())
        report_lines.append("## EXECUTIVE SUMMARY")
        report_lines.append("")
        report_lines.append(f"**Total Security Issues:** {total_issues}")
        report_lines.append(f"- 🚨 **Critical:** {len(self.findings['critical'])} (Immediate action required)")
        report_lines.append(f"- ⚠️ **High:** {len(self.findings['high'])} (Action required within 24h)")
        report_lines.append(f"- 📋 **Medium:** {len(self.findings['medium'])} (Action required within 1 week)")
        report_lines.append(f"- ℹ️ **Low:** {len(self.findings['low'])} (Address during next sprint)")
        report_lines.append("")
        
        if self.findings['critical']:
            report_lines.append("🚨 **CRITICAL ISSUES REQUIRE IMMEDIATE ATTENTION!**")
            report_lines.append("")
        
        # Detailed findings by severity
        severity_icons = {
            'critical': '🚨',
            'high': '⚠️',
            'medium': '📋',
            'low': 'ℹ️'
        }
        
        for severity, issues in self.findings.items():
            if issues:
                icon = severity_icons.get(severity, '•')
                report_lines.append(f"## {icon} {severity.upper()} SEVERITY ISSUES")
                report_lines.append("")
                
                for i, issue in enumerate(issues, 1):
                    report_lines.append(f"### {i}. {issue['type']}")
                    report_lines.append(f"**File:** `{issue['file']}`")
                    report_lines.append(f"**Issue:** {issue['description']}")
                    
                    if 'recommendation' in issue:
                        report_lines.append(f"**Recommendation:** {issue['recommendation']}")
                    
                    if 'pattern' in issue:
                        report_lines.append(f"**Pattern:** `{issue['pattern']}`")
                    
                    if 'lines' in issue:
                        report_lines.append(f"**Lines:** {', '.join(map(str, issue['lines']))}")
                    
                    if 'matches' in issue:
                        report_lines.append(f"**Matches Found:** {issue['matches']}")
                    
                    if 'missing_patterns' in issue:
                        report_lines.append(f"**Missing Patterns:** {', '.join(issue['missing_patterns'])}")
                    
                    if 'sample' in issue and issue['sample']:
                        report_lines.append(f"**Sample:** `{issue['sample'][:50]}...`")
                        
                    report_lines.append("")
                    
                report_lines.append("")
        
        # Security recommendations
        if total_issues > 0:
            report_lines.append("## 🛠️ IMMEDIATE REMEDIATION STEPS")
            report_lines.append("")
            
            if self.findings['critical']:
                report_lines.append("### CRITICAL - Fix Immediately")
                report_lines.append("1. 🔒 Replace all default secrets with cryptographically secure values")
                report_lines.append("2. 🗃️ Remove hardcoded credentials and implement proper user management")
                report_lines.append("3. 🔐 Configure secure JWT secret keys using environment variables")
                report_lines.append("4. 🚫 Remove sensitive files from git tracking")
                report_lines.append("5. 🔄 Rotate any exposed API keys or secrets")
                report_lines.append("")
            
            if self.findings['high']:
                report_lines.append("### HIGH PRIORITY - Fix Within 24 Hours")
                report_lines.append("1. 🛡️ Implement comprehensive security headers")
                report_lines.append("2. 🚦 Configure proper CORS policies")
                report_lines.append("3. 📝 Add input validation to all API endpoints")
                report_lines.append("4. 🔍 Implement security event logging")
                report_lines.append("")
            
            report_lines.append("### SECURITY HARDENING CHECKLIST")
            report_lines.append("- [ ] Enable HTTPS enforcement")
            report_lines.append("- [ ] Implement rate limiting")
            report_lines.append("- [ ] Add authentication to all sensitive endpoints")
            report_lines.append("- [ ] Configure secure session management")
            report_lines.append("- [ ] Implement input validation and sanitization")
            report_lines.append("- [ ] Add comprehensive security headers")
            report_lines.append("- [ ] Enable security monitoring and alerting")
            report_lines.append("- [ ] Conduct penetration testing")
            report_lines.append("")
            
        else:
            report_lines.append("## ✅ SECURITY STATUS: GOOD")
            report_lines.append("No immediate security concerns found. Continue following security best practices.")
            report_lines.append("")
            
        report_lines.append("---")
        report_lines.append("**Next Audit Recommended:** 30 days")
        report_lines.append("**Security Contact:** security@olorin-platform.com")
        report_lines.append("")
            
        return "\n".join(report_lines)


def main():
    """Enhanced main entry point"""
    if len(sys.argv) > 1:
        project_root = sys.argv[1]
    else:
        project_root = os.getcwd()
    
    print("🔒 Enhanced Olorin Security Auditor v2.0")
    print("=" * 50)
    
    auditor = EnhancedSecurityAuditor(project_root)
    
    try:
        findings = auditor.run_comprehensive_audit()
        
        # Generate and save detailed report
        report = auditor.generate_detailed_report()
        report_path = Path(project_root) / 'ENHANCED_SECURITY_AUDIT_REPORT.md'
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print()
        print("=" * 50)
        print("📊 Enhanced Security Audit Complete!")
        print(f"📝 Detailed report: {report_path}")
        
        # Print executive summary
        total_issues = sum(len(issues) for issues in findings.values())
        if total_issues > 0:
            print(f"⚠️  SECURITY ISSUES FOUND: {total_issues}")
            print(f"   🚨 Critical: {len(findings['critical'])}")
            print(f"   ⚠️  High: {len(findings['high'])}")
            print(f"   📋 Medium: {len(findings['medium'])}")
            print(f"   ℹ️  Low: {len(findings['low'])}")
            
            if findings['critical']:
                print()
                print("🚨 CRITICAL SECURITY ISSUES REQUIRE IMMEDIATE ACTION!")
                print("   Review the report and implement fixes immediately.")
                sys.exit(1)
            elif findings['high']:
                print()
                print("⚠️  HIGH PRIORITY ISSUES NEED ATTENTION WITHIN 24H")
                sys.exit(2)
            else:
                print()
                print("📋 Medium/Low priority issues found - address during next sprint")
                sys.exit(0)
        else:
            print("✅ No security issues found - good security posture!")
            sys.exit(0)
            
    except KeyboardInterrupt:
        print("\n⏹️  Audit interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ Audit failed with error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()