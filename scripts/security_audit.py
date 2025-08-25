#!/usr/bin/env python3
"""
Olorin Security Audit Script
Scans for security vulnerabilities, exposed credentials, and insecure configurations.

Author: Gil Klainert
Date: 2025-08-25
"""

import os
import re
import sys
import json
import subprocess
from pathlib import Path
from typing import List, Dict, Any
import hashlib
import stat


class SecurityAuditor:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.findings = {
            'critical': [],
            'high': [],
            'medium': [],
            'low': []
        }
        
        # Patterns for sensitive data detection
        self.credential_patterns = [
            (r'password\s*=\s*["\'][^"\']+["\']', 'Password in config'),
            (r'secret\s*=\s*["\'][^"\']+["\']', 'Secret in config'),
            (r'api[_-]?key\s*=\s*["\'][^"\']+["\']', 'API key in config'),
            (r'private[_-]?key\s*=\s*["\'][^"\']+["\']', 'Private key in config'),
            (r'token\s*=\s*["\'][^"\']+["\']', 'Token in config'),
            (r'-----BEGIN.*PRIVATE KEY-----', 'Private key content'),
            (r'[A-Za-z0-9]{32,}', 'Potential secret/hash (32+ chars)'),
        ]
        
        # File patterns that should never contain credentials
        self.sensitive_file_patterns = [
            '*.key', '*.pem', '*.p12', '*.jks',
            'credentials.txt', 'secrets.txt', 'passwords.txt',
            '*credential*', '*secret*', 'ADMIN_CREDENTIALS*'
        ]
        
        # Exclude patterns for large repos/dependencies
        self.exclude_patterns = [
            'node_modules', '.git', '__pycache__', '.tox',
            'venv', '.venv', 'env', 'htmlcov', 'coverage',
            '.pytest_cache', 'build', 'dist', '.mypy_cache',
            'Gaia', '.cache', '.firebase', '.babel', '.rpt2_cache'
        ]

    def should_exclude(self, path: Path) -> bool:
        """Check if path should be excluded from scanning"""
        path_str = str(path)
        for pattern in self.exclude_patterns:
            if pattern in path_str:
                return True
        return False

    def scan_for_credentials(self) -> None:
        """Scan for exposed credentials in source files"""
        print("🔍 Scanning for exposed credentials...")
        
        for file_path in self.project_root.rglob('*'):
            if file_path.is_file() and not self.should_exclude(file_path):
                try:
                    # Skip binary files
                    if self.is_binary_file(file_path):
                        continue
                        
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        
                    for pattern, description in self.credential_patterns:
                        matches = re.findall(pattern, content, re.IGNORECASE)
                        if matches:
                            # Skip if in .env.example or similar template files
                            if '.example' in str(file_path) or 'template' in str(file_path):
                                continue
                                
                            self.findings['critical'].append({
                                'type': 'Exposed Credential',
                                'file': str(file_path.relative_to(self.project_root)),
                                'description': description,
                                'matches': len(matches)
                            })
                            
                except (UnicodeDecodeError, PermissionError):
                    continue

    def scan_for_sensitive_files(self) -> None:
        """Scan for sensitive files that should not exist"""
        print("🔍 Scanning for sensitive files...")
        
        for pattern in self.sensitive_file_patterns:
            for file_path in self.project_root.rglob(pattern):
                if not self.should_exclude(file_path) and file_path.is_file():
                    self.findings['high'].append({
                        'type': 'Sensitive File',
                        'file': str(file_path.relative_to(self.project_root)),
                        'description': f'Potentially sensitive file: {pattern}',
                        'size': file_path.stat().st_size
                    })

    def scan_git_status(self) -> None:
        """Check git status for tracked sensitive files"""
        print("🔍 Checking git status for sensitive files...")
        
        try:
            result = subprocess.run(['git', 'ls-files'], 
                                  cwd=self.project_root, 
                                  capture_output=True, 
                                  text=True)
            
            if result.returncode == 0:
                tracked_files = result.stdout.strip().split('\n')
                
                for file_path in tracked_files:
                    if not file_path:
                        continue
                        
                    # Check for Python cache files
                    if '__pycache__' in file_path or file_path.endswith('.pyc'):
                        self.findings['medium'].append({
                            'type': 'Git Tracking Issue',
                            'file': file_path,
                            'description': 'Python cache file tracked in git',
                            'recommendation': 'Remove from git with: git rm --cached'
                        })
                    
                    # Check for potential sensitive files
                    for pattern in self.sensitive_file_patterns:
                        if self.matches_pattern(file_path, pattern):
                            self.findings['critical'].append({
                                'type': 'Git Tracking Issue',
                                'file': file_path,
                                'description': f'Sensitive file tracked in git: {pattern}',
                                'recommendation': 'Remove from git and add to .gitignore'
                            })
                            
        except subprocess.CalledProcessError:
            print("⚠️  Not a git repository or git not available")

    def scan_file_permissions(self) -> None:
        """Check for insecure file permissions"""
        print("🔍 Checking file permissions...")
        
        sensitive_dirs = ['config/', '.env*', '*.key', '*.pem']
        
        for pattern in sensitive_dirs:
            for file_path in self.project_root.rglob(pattern):
                if file_path.is_file() and not self.should_exclude(file_path):
                    try:
                        file_stat = file_path.stat()
                        file_mode = stat.filemode(file_stat.st_mode)
                        
                        # Check if file is world-readable
                        if file_stat.st_mode & stat.S_IROTH:
                            self.findings['medium'].append({
                                'type': 'File Permissions',
                                'file': str(file_path.relative_to(self.project_root)),
                                'description': f'File is world-readable: {file_mode}',
                                'recommendation': 'Change permissions to 600 or 640'
                            })
                            
                    except (OSError, PermissionError):
                        continue

    def scan_gitignore_coverage(self) -> None:
        """Check if .gitignore properly covers sensitive patterns"""
        print("🔍 Checking .gitignore coverage...")
        
        gitignore_path = self.project_root / '.gitignore'
        if not gitignore_path.exists():
            self.findings['high'].append({
                'type': 'Configuration Issue',
                'file': '.gitignore',
                'description': 'No .gitignore file found',
                'recommendation': 'Create comprehensive .gitignore file'
            })
            return
            
        try:
            with open(gitignore_path, 'r') as f:
                gitignore_content = f.read()
                
            # Required patterns for security
            required_patterns = [
                '*.env', '*.key', '*.pem', '__pycache__/', '*.pyc',
                '*credential*', '*secret*', 'ADMIN_CREDENTIALS*'
            ]
            
            missing_patterns = []
            for pattern in required_patterns:
                if pattern not in gitignore_content:
                    missing_patterns.append(pattern)
                    
            if missing_patterns:
                self.findings['medium'].append({
                    'type': 'Configuration Issue',
                    'file': '.gitignore',
                    'description': 'Missing security patterns in .gitignore',
                    'missing_patterns': missing_patterns,
                    'recommendation': 'Add missing patterns to .gitignore'
                })
                
        except (OSError, UnicodeDecodeError):
            self.findings['medium'].append({
                'type': 'Configuration Issue',
                'file': '.gitignore',
                'description': 'Could not read .gitignore file',
                'recommendation': 'Check .gitignore file permissions and content'
            })

    def is_binary_file(self, file_path: Path) -> bool:
        """Check if file is binary"""
        try:
            with open(file_path, 'rb') as f:
                chunk = f.read(1024)
            return b'\x00' in chunk
        except (OSError, PermissionError):
            return True

    def matches_pattern(self, file_path: str, pattern: str) -> bool:
        """Check if file path matches a glob-like pattern"""
        import fnmatch
        return fnmatch.fnmatch(file_path, pattern)

    def run_audit(self) -> Dict[str, Any]:
        """Run complete security audit"""
        print("🔒 Starting Olorin Security Audit...")
        print(f"📁 Project root: {self.project_root}")
        print()
        
        self.scan_for_credentials()
        self.scan_for_sensitive_files()
        self.scan_git_status()
        self.scan_file_permissions()
        self.scan_gitignore_coverage()
        
        return self.findings

    def generate_report(self) -> str:
        """Generate security audit report"""
        report_lines = []
        report_lines.append("# OLORIN SECURITY AUDIT REPORT")
        report_lines.append(f"Generated: {os.popen('date').read().strip()}")
        report_lines.append(f"Project: {self.project_root}")
        report_lines.append("")
        
        # Summary
        total_issues = sum(len(issues) for issues in self.findings.values())
        report_lines.append(f"## SUMMARY")
        report_lines.append(f"Total Issues Found: {total_issues}")
        report_lines.append(f"- Critical: {len(self.findings['critical'])}")
        report_lines.append(f"- High: {len(self.findings['high'])}")  
        report_lines.append(f"- Medium: {len(self.findings['medium'])}")
        report_lines.append(f"- Low: {len(self.findings['low'])}")
        report_lines.append("")
        
        # Detailed findings
        for severity, issues in self.findings.items():
            if issues:
                report_lines.append(f"## {severity.upper()} SEVERITY ISSUES")
                report_lines.append("")
                
                for i, issue in enumerate(issues, 1):
                    report_lines.append(f"### {i}. {issue['type']}")
                    report_lines.append(f"**File:** {issue['file']}")
                    report_lines.append(f"**Description:** {issue['description']}")
                    
                    if 'recommendation' in issue:
                        report_lines.append(f"**Recommendation:** {issue['recommendation']}")
                    
                    if 'matches' in issue:
                        report_lines.append(f"**Matches:** {issue['matches']}")
                    
                    if 'missing_patterns' in issue:
                        report_lines.append(f"**Missing Patterns:** {', '.join(issue['missing_patterns'])}")
                        
                    report_lines.append("")
                    
                report_lines.append("")
        
        # Remediation recommendations
        if total_issues > 0:
            report_lines.append("## IMMEDIATE ACTIONS REQUIRED")
            report_lines.append("")
            
            if self.findings['critical']:
                report_lines.append("### CRITICAL - Immediate Action Required")
                report_lines.append("1. Review all exposed credentials immediately")
                report_lines.append("2. Remove sensitive files from git tracking")
                report_lines.append("3. Rotate any exposed API keys or passwords")
                report_lines.append("4. Add sensitive patterns to .gitignore")
                report_lines.append("")
            
            if self.findings['high']:
                report_lines.append("### HIGH - Action Required Within 24h")
                report_lines.append("1. Secure or remove sensitive files")
                report_lines.append("2. Review file permissions")
                report_lines.append("3. Update .gitignore if missing")
                report_lines.append("")
            
            report_lines.append("### PREVENTION MEASURES")
            report_lines.append("1. Implement pre-commit hooks for credential scanning")
            report_lines.append("2. Use environment variables for all sensitive configuration")
            report_lines.append("3. Regular security audits (weekly)")
            report_lines.append("4. Developer security training")
            report_lines.append("")
        else:
            report_lines.append("## ✅ NO SECURITY ISSUES FOUND")
            report_lines.append("The codebase appears to be secure with no immediate concerns.")
            report_lines.append("")
            
        return "\n".join(report_lines)


def main():
    """Main entry point"""
    if len(sys.argv) > 1:
        project_root = sys.argv[1]
    else:
        project_root = os.getcwd()
    
    auditor = SecurityAuditor(project_root)
    findings = auditor.run_audit()
    
    # Generate and save report
    report = auditor.generate_report()
    report_path = Path(project_root) / 'SECURITY_AUDIT_REPORT.md'
    
    with open(report_path, 'w') as f:
        f.write(report)
    
    print()
    print(f"📊 Security audit complete!")
    print(f"📝 Report saved to: {report_path}")
    
    # Print summary
    total_issues = sum(len(issues) for issues in findings.values())
    if total_issues > 0:
        print(f"⚠️  Found {total_issues} security issues:")
        print(f"   Critical: {len(findings['critical'])}")
        print(f"   High: {len(findings['high'])}")
        print(f"   Medium: {len(findings['medium'])}")
        print(f"   Low: {len(findings['low'])}")
        
        if findings['critical']:
            print()
            print("🚨 CRITICAL ISSUES REQUIRE IMMEDIATE ATTENTION!")
            sys.exit(1)
    else:
        print("✅ No security issues found!")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())