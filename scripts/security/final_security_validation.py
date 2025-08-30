#!/usr/bin/env python3
"""
Final Security Validation Script for Olorin Platform
Comprehensive security check before production deployment
"""

import os
import re
import json
import hashlib
import subprocess
from pathlib import Path
from typing import List, Dict, Tuple, Any
from datetime import datetime
# import yaml  # Not needed for current functionality

class SecurityValidator:
    """Comprehensive security validation for production deployment"""
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.issues = []
        self.warnings = []
        self.recommendations = []
        
    def log_issue(self, severity: str, category: str, message: str, file_path: str = None):
        """Log a security issue"""
        issue = {
            'severity': severity,
            'category': category,
            'message': message,
            'file': file_path,
            'timestamp': datetime.now().isoformat()
        }
        
        if severity == 'CRITICAL':
            self.issues.append(issue)
        elif severity == 'HIGH':
            self.warnings.append(issue)
        else:
            self.recommendations.append(issue)
    
    def scan_hardcoded_secrets(self) -> None:
        """Scan for hardcoded secrets and credentials"""
        print("🔍 Scanning for hardcoded secrets...")
        
        # Patterns for potential secrets
        secret_patterns = [
            (r'password\s*[=:]\s*["\'](?!.*\$|\{)[^"\']{3,}["\']', 'Hardcoded password'),
            (r'secret\s*[=:]\s*["\'](?!.*\$|\{)[^"\']{8,}["\']', 'Hardcoded secret'),
            (r'api[_-]?key\s*[=:]\s*["\'](?!.*\$|\{)[^"\']{8,}["\']', 'Hardcoded API key'),
            (r'token\s*[=:]\s*["\'](?!.*\$|\{)[^"\']{8,}["\']', 'Hardcoded token'),
            (r'jwt[_-]?secret\s*[=:]\s*["\'](?!.*\$|\{)[^"\']{8,}["\']', 'Hardcoded JWT secret'),
            (r'your-secret-key-change-in-production', 'Default secret key'),
            (r'default-change-in-production', 'Default production secret'),
            (r'default-salt-change', 'Default salt placeholder'),
            (r'sk-[a-zA-Z0-9]{48}', 'OpenAI API key pattern'),
            (r'AIza[0-9A-Za-z\\-_]{35}', 'Google API key pattern'),
            (r'pk_[a-zA-Z0-9]{24}', 'Stripe public key pattern'),
            (r'sk_[a-zA-Z0-9]{24}', 'Stripe secret key pattern'),
        ]
        
        exclude_dirs = {'.git', 'node_modules', '__pycache__', '.pytest_cache', 'htmlcov', 'dist', 'build', '.tox', '.venv', 'venv', 'Gaia'}
        exclude_files = {'enhanced_security_audit.py', 'security_validation.py', 'final_security_validation.py', 'FINAL_SECURITY_VALIDATION_REPORT.json'}
        
        for file_path in self.project_root.rglob('*'):
            if (file_path.is_file() and 
                not any(exclude_dir in file_path.parts for exclude_dir in exclude_dirs) and
                file_path.name not in exclude_files):
                if file_path.suffix in ['.py', '.js', '.ts', '.tsx', '.yaml', '.yml', '.json', '.env', '.conf']:
                    try:
                        content = file_path.read_text(encoding='utf-8')
                        for pattern, description in secret_patterns:
                            matches = re.finditer(pattern, content, re.IGNORECASE)
                            for match in matches:
                                line_num = content[:match.start()].count('\n') + 1
                                self.log_issue(
                                    'CRITICAL', 
                                    'Hardcoded Secrets',
                                    f"{description} found at line {line_num}: {match.group()[:50]}...",
                                    str(file_path.relative_to(self.project_root))
                                )
                    except (UnicodeDecodeError, PermissionError):
                        continue
    
    def validate_environment_files(self) -> None:
        """Validate environment file security"""
        print("🔍 Validating environment files...")
        
        # Check for environment files that shouldn't exist
        dangerous_env_files = ['.env', '.env.production', '.env.local']
        
        for env_file in dangerous_env_files:
            env_path = self.project_root / env_file
            if env_path.exists():
                self.log_issue(
                    'CRITICAL',
                    'Environment Security',
                    f"Environment file {env_file} exists and may contain secrets",
                    env_file
                )
        
        # Check if .env files are properly ignored
        gitignore_path = self.project_root / '.gitignore'
        if gitignore_path.exists():
            gitignore_content = gitignore_path.read_text()
            if '.env' not in gitignore_content and '*.env' not in gitignore_content:
                self.log_issue(
                    'HIGH',
                    'Git Security',
                    ".env files are not properly ignored in .gitignore",
                    '.gitignore'
                )
    
    def check_git_history(self) -> None:
        """Check git history for leaked secrets"""
        print("🔍 Checking git history for leaked secrets...")
        
        try:
            # Get list of all files that have been committed
            result = subprocess.run(['git', 'log', '--name-only', '--pretty=format:', '--all'], 
                                  capture_output=True, text=True, cwd=self.project_root)
            
            if result.returncode == 0:
                committed_files = set(result.stdout.split('\n'))
                
                # Check for dangerous files in git history
                dangerous_patterns = ['.env', 'secret.', 'password.', 'credential.', 'private_key', 'api_key']
                
                for file in committed_files:
                    if file and not any(ignore in file.lower() for ignore in ['node_modules', 'test', 'dist']):
                        if any(pattern in file.lower() for pattern in dangerous_patterns):
                            self.log_issue(
                                'HIGH',
                                'Git History Security',
                                f"Potentially sensitive file found in git history: {file}",
                                file
                            )
        except Exception as e:
            self.log_issue(
                'MEDIUM',
                'Git History Security',
                f"Could not scan git history: {str(e)}"
            )
    
    def validate_configuration_security(self) -> None:
        """Validate security configuration files"""
        print("🔍 Validating security configurations...")
        
        # Check backend security configuration
        backend_security_files = [
            'app/security/config.py',
            'app/security/auth.py', 
            'app/security/encryption.py'
        ]
        
        for security_file in backend_security_files:
            file_path = self.project_root / 'olorin-server' / security_file
            if file_path.exists():
                content = file_path.read_text()
                
                # Check for hardcoded defaults
                if 'your-secret-key' in content or 'default-change-in-production' in content:
                    self.log_issue(
                        'CRITICAL',
                        'Configuration Security',
                        f"Default secrets still present in {security_file}",
                        security_file
                    )
                
                # Check for proper environment variable usage
                if 'os.getenv(' not in content:
                    self.log_issue(
                        'HIGH',
                        'Configuration Security',
                        f"No environment variable usage detected in {security_file}",
                        security_file
                    )
    
    def validate_docker_security(self) -> None:
        """Validate Docker configuration security"""
        print("🔍 Validating Docker security...")
        
        dockerfile_paths = list(self.project_root.rglob('Dockerfile*'))
        
        for dockerfile in dockerfile_paths:
            content = dockerfile.read_text()
            
            # Check for secrets in Dockerfile
            if re.search(r'ENV.*(?:PASSWORD|SECRET|KEY|TOKEN).*=.*[^$]', content):
                self.log_issue(
                    'CRITICAL',
                    'Docker Security',
                    f"Hardcoded secrets found in {dockerfile.name}",
                    str(dockerfile.relative_to(self.project_root))
                )
            
            # Check for running as root
            if 'USER root' in content or not re.search(r'USER\s+(?!root)', content):
                self.log_issue(
                    'MEDIUM',
                    'Docker Security',
                    f"Container may be running as root in {dockerfile.name}",
                    str(dockerfile.relative_to(self.project_root))
                )
    
    def validate_dependency_security(self) -> None:
        """Check for known vulnerable dependencies"""
        print("🔍 Checking dependency security...")
        
        # Check Python dependencies
        pyproject_files = list(self.project_root.rglob('pyproject.toml'))
        for pyproject in pyproject_files:
            try:
                result = subprocess.run(['pip', 'list', '--outdated', '--format=json'], 
                                      capture_output=True, text=True)
                if result.returncode == 0:
                    outdated = json.loads(result.stdout)
                    if outdated:
                        self.log_issue(
                            'MEDIUM',
                            'Dependency Security',
                            f"Found {len(outdated)} outdated Python packages",
                            str(pyproject.relative_to(self.project_root))
                        )
            except:
                pass
        
        # Check Node.js dependencies
        package_json_files = list(self.project_root.rglob('package.json'))
        for package_json in package_json_files:
            # Skip node_modules
            if 'node_modules' in str(package_json):
                continue
                
            try:
                result = subprocess.run(['npm', 'audit', '--json'], 
                                      capture_output=True, text=True, cwd=package_json.parent)
                if result.returncode != 0:
                    audit_data = json.loads(result.stdout)
                    if 'vulnerabilities' in audit_data:
                        vulns = audit_data['vulnerabilities']
                        if vulns:
                            critical = sum(1 for v in vulns.values() if v.get('severity') == 'critical')
                            high = sum(1 for v in vulns.values() if v.get('severity') == 'high')
                            
                            if critical > 0:
                                self.log_issue(
                                    'CRITICAL',
                                    'Dependency Security',
                                    f"Found {critical} critical NPM vulnerabilities",
                                    str(package_json.relative_to(self.project_root))
                                )
                            elif high > 0:
                                self.log_issue(
                                    'HIGH',
                                    'Dependency Security',
                                    f"Found {high} high-severity NPM vulnerabilities",
                                    str(package_json.relative_to(self.project_root))
                                )
            except:
                pass
    
    def validate_cors_configuration(self) -> None:
        """Validate CORS configuration security"""
        print("🔍 Validating CORS configuration...")
        
        middleware_files = list(self.project_root.rglob('*middleware*.py'))
        
        for middleware_file in middleware_files:
            content = middleware_file.read_text()
            
            # Check for overly permissive CORS
            if 'allow_origins=["*"]' in content or "allow_origins=['*']" in content:
                self.log_issue(
                    'CRITICAL',
                    'CORS Security',
                    "Overly permissive CORS configuration - allows all origins",
                    str(middleware_file.relative_to(self.project_root))
                )
            
            # Check for localhost in production CORS
            if 'localhost' in content and 'production' in content:
                self.log_issue(
                    'HIGH',
                    'CORS Security',
                    "Localhost origins may be enabled in production",
                    str(middleware_file.relative_to(self.project_root))
                )
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive security report"""
        total_issues = len(self.issues) + len(self.warnings) + len(self.recommendations)
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'project': 'Olorin Fraud Detection Platform',
            'scan_type': 'Final Security Validation',
            'summary': {
                'total_issues': total_issues,
                'critical_issues': len(self.issues),
                'high_priority_issues': len(self.warnings),
                'recommendations': len(self.recommendations),
                'security_status': 'PASS' if len(self.issues) == 0 else 'FAIL'
            },
            'issues': {
                'critical': self.issues,
                'high': self.warnings,
                'recommendations': self.recommendations
            }
        }
        
        return report
    
    def run_full_scan(self) -> Dict[str, Any]:
        """Run comprehensive security validation"""
        print("🚀 Starting comprehensive security validation...")
        print("=" * 60)
        
        self.scan_hardcoded_secrets()
        self.validate_environment_files()
        self.check_git_history()
        self.validate_configuration_security()
        self.validate_docker_security()
        self.validate_dependency_security()
        self.validate_cors_configuration()
        
        return self.generate_report()


def main():
    """Main function to run security validation"""
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    validator = SecurityValidator(project_root)
    report = validator.run_full_scan()
    
    print("\n" + "=" * 60)
    print("🔒 SECURITY VALIDATION REPORT")
    print("=" * 60)
    
    print(f"📊 Summary:")
    print(f"  Total Issues: {report['summary']['total_issues']}")
    print(f"  🚨 Critical: {report['summary']['critical_issues']}")
    print(f"  ⚠️  High Priority: {report['summary']['high_priority_issues']}")
    print(f"  💡 Recommendations: {report['summary']['recommendations']}")
    print(f"  Status: {report['summary']['security_status']}")
    
    if report['issues']['critical']:
        print(f"\n🚨 CRITICAL ISSUES (Must Fix Before Production):")
        for issue in report['issues']['critical']:
            print(f"  • {issue['category']}: {issue['message']}")
            if issue['file']:
                print(f"    📁 File: {issue['file']}")
    
    if report['issues']['high']:
        print(f"\n⚠️ HIGH PRIORITY ISSUES:")
        for issue in report['issues']['high']:
            print(f"  • {issue['category']}: {issue['message']}")
            if issue['file']:
                print(f"    📁 File: {issue['file']}")
    
    if report['issues']['recommendations']:
        print(f"\n💡 RECOMMENDATIONS:")
        for issue in report['issues']['recommendations']:
            print(f"  • {issue['category']}: {issue['message']}")
    
    # Save detailed report
    report_path = os.path.join(project_root, 'FINAL_SECURITY_VALIDATION_REPORT.json')
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Detailed report saved to: {report_path}")
    
    if report['summary']['security_status'] == 'PASS':
        print("\n✅ SECURITY VALIDATION PASSED - Ready for production deployment!")
        return 0
    else:
        print(f"\n❌ SECURITY VALIDATION FAILED - {report['summary']['critical_issues']} critical issues must be fixed!")
        return 1


if __name__ == "__main__":
    exit(main())