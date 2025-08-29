#!/usr/bin/env python3
"""
Quick Security Validation Script for Olorin
Tests critical security configurations and identifies immediate risks.

Author: Claude Security Specialist
Date: 2025-08-29
"""

import os
import re
import json
from pathlib import Path
from typing import Dict, List, Any

class QuickSecurityValidator:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.critical_issues = []
        self.high_issues = []
        self.recommendations = []
    
    def validate_jwt_secrets(self) -> None:
        """Check for default/hardcoded JWT secrets."""
        print("🔍 Checking JWT secret configuration...")
        
        security_config_file = self.project_root / "olorin-server" / "app" / "security" / "config.py"
        if security_config_file.exists():
            content = security_config_file.read_text()
            
            # Check for default secrets
            default_patterns = [
                "your-secret-key-change-in-production",
                "default-change-in-production",
                "default-salt-change"
            ]
            
            for pattern in default_patterns:
                if pattern in content:
                    self.critical_issues.append({
                        "type": "Default JWT Secret",
                        "file": str(security_config_file.relative_to(self.project_root)),
                        "issue": f"Found default secret: {pattern}",
                        "risk": "CRITICAL - Authentication can be completely bypassed",
                        "fix": "Generate cryptographically secure secrets using openssl rand -base64 64"
                    })
        
        auth_file = self.project_root / "olorin-server" / "app" / "security" / "auth.py"
        if auth_file.exists():
            content = auth_file.read_text()
            if "your-secret-key-change-in-production" in content:
                self.critical_issues.append({
                    "type": "Hardcoded JWT Secret",
                    "file": str(auth_file.relative_to(self.project_root)),
                    "issue": "Hardcoded default JWT secret in auth.py",
                    "risk": "CRITICAL - Authentication bypass possible",
                    "fix": "Use environment variable for JWT_SECRET_KEY"
                })
    
    def validate_user_management(self) -> None:
        """Check for hardcoded user databases."""
        print("🔍 Checking user management security...")
        
        auth_file = self.project_root / "olorin-server" / "app" / "security" / "auth.py"
        if auth_file.exists():
            content = auth_file.read_text()
            
            if "fake_users_db" in content:
                self.critical_issues.append({
                    "type": "Hardcoded User Database",
                    "file": str(auth_file.relative_to(self.project_root)),
                    "issue": "Using hardcoded fake user database with default passwords",
                    "risk": "CRITICAL - Unauthorized access with known credentials",
                    "fix": "Implement database-backed user management with proper password hashing"
                })
            
            # Check for identical password hashes
            if "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW" in content:
                self.critical_issues.append({
                    "type": "Identical Password Hashes",
                    "file": str(auth_file.relative_to(self.project_root)),
                    "issue": "All demo users use the same password hash",
                    "risk": "HIGH - Same password for multiple accounts",
                    "fix": "Generate unique passwords and salts for each user"
                })
    
    def validate_cors_config(self) -> None:
        """Check CORS configuration."""
        print("🔍 Checking CORS configuration...")
        
        middleware_file = self.project_root / "olorin-server" / "app" / "service" / "middleware" / "middleware_config.py"
        if middleware_file.exists():
            content = middleware_file.read_text()
            
            if "allow_credentials=True" in content and "localhost" in content:
                self.high_issues.append({
                    "type": "Permissive CORS Configuration",
                    "file": str(middleware_file.relative_to(self.project_root)),
                    "issue": "CORS allows credentials with localhost origins",
                    "risk": "HIGH - Potential for cross-origin attacks",
                    "fix": "Restrict CORS origins based on environment"
                })
    
    def validate_environment_files(self) -> None:
        """Check for exposed environment files."""
        print("🔍 Checking for exposed environment files...")
        
        # Check for .env files
        env_files = list(self.project_root.rglob("*.env*"))
        for env_file in env_files:
            if env_file.name != ".env.example":
                # Check if it's in .gitignore
                gitignore_file = env_file.parent / ".gitignore"
                if gitignore_file.exists():
                    gitignore_content = gitignore_file.read_text()
                    if "*.env" not in gitignore_content:
                        self.high_issues.append({
                            "type": "Environment File Not Ignored",
                            "file": str(env_file.relative_to(self.project_root)),
                            "issue": "Environment file may not be properly git-ignored",
                            "risk": "HIGH - Potential secret exposure in version control",
                            "fix": "Add *.env* to .gitignore and remove from git history"
                        })
    
    def validate_input_validation(self) -> None:
        """Check for input validation implementation."""
        print("🔍 Checking input validation...")
        
        # Look for API route files
        route_files = list(self.project_root.rglob("*router*.py"))
        has_validation = False
        
        for route_file in route_files:
            if "olorin-server" in str(route_file):
                content = route_file.read_text()
                if "pydantic" in content.lower() or "validator" in content.lower():
                    has_validation = True
                    break
        
        if not has_validation:
            self.high_issues.append({
                "type": "Missing Input Validation",
                "file": "API Routes",
                "issue": "No comprehensive input validation framework detected",
                "risk": "HIGH - Susceptible to injection attacks, XSS, data corruption",
                "fix": "Implement Pydantic models for all API inputs with validation"
            })
    
    def validate_security_headers(self) -> None:
        """Check security headers implementation."""
        print("🔍 Checking security headers...")
        
        auth_file = self.project_root / "olorin-server" / "app" / "security" / "auth.py"
        if auth_file.exists():
            content = auth_file.read_text()
            
            # Check for basic security headers
            required_headers = [
                "X-Content-Type-Options",
                "X-Frame-Options", 
                "Strict-Transport-Security",
                "Content-Security-Policy"
            ]
            
            missing_headers = []
            for header in required_headers:
                if header not in content:
                    missing_headers.append(header)
            
            if missing_headers:
                self.high_issues.append({
                    "type": "Missing Security Headers",
                    "file": str(auth_file.relative_to(self.project_root)),
                    "issue": f"Missing security headers: {', '.join(missing_headers)}",
                    "risk": "MEDIUM - Increased risk of XSS, clickjacking, MITM attacks",
                    "fix": "Add comprehensive security headers to all responses"
                })
    
    def validate_frontend_security(self) -> None:
        """Check frontend security implementation."""
        print("🔍 Checking frontend security...")
        
        # Check for security utilities
        security_utils = self.project_root / "olorin-front" / "src" / "utils" / "security.ts"
        if not security_utils.exists():
            self.high_issues.append({
                "type": "Missing Frontend Security Utils",
                "file": "Frontend",
                "issue": "No frontend security utilities implemented",
                "risk": "MEDIUM - Frontend vulnerable to XSS, CSRF, session attacks",
                "fix": "Implement frontend security utilities with input validation and XSS protection"
            })
        
        # Check Firebase configuration
        firebase_config = self.project_root / "olorin-front" / "src" / "firebase.ts"
        if firebase_config.exists():
            content = firebase_config.read_text()
            if "process.env.REACT_APP_FIREBASE_API_KEY || ''" in content:
                # Check if there's proper validation
                if "validateFirebaseConfig" not in content:
                    self.recommendations.append({
                        "type": "Firebase Config Validation",
                        "file": str(firebase_config.relative_to(self.project_root)),
                        "suggestion": "Add Firebase configuration validation",
                        "benefit": "Prevent runtime errors with missing environment variables"
                    })
    
    def run_validation(self) -> Dict[str, Any]:
        """Run all security validations."""
        print("🔒 Quick Security Validation for Olorin")
        print("=" * 50)
        
        self.validate_jwt_secrets()
        self.validate_user_management()
        self.validate_cors_config()
        self.validate_environment_files()
        self.validate_input_validation()
        self.validate_security_headers()
        self.validate_frontend_security()
        
        return {
            "critical_issues": self.critical_issues,
            "high_issues": self.high_issues,
            "recommendations": self.recommendations
        }
    
    def generate_report(self, results: Dict[str, Any]) -> str:
        """Generate security validation report."""
        lines = []
        
        lines.append("# OLORIN SECURITY VALIDATION REPORT")
        lines.append(f"Generated: {os.popen('date').read().strip()}")
        lines.append("")
        
        # Summary
        critical_count = len(results["critical_issues"])
        high_count = len(results["high_issues"])
        total_issues = critical_count + high_count
        
        lines.append("## SECURITY STATUS")
        if critical_count > 0:
            lines.append("🚨 **CRITICAL SECURITY ISSUES DETECTED**")
        elif high_count > 0:
            lines.append("⚠️  **HIGH PRIORITY SECURITY ISSUES DETECTED**")
        else:
            lines.append("✅ **NO CRITICAL SECURITY ISSUES DETECTED**")
        
        lines.append("")
        lines.append(f"**Issues Found:** {total_issues}")
        lines.append(f"- 🚨 Critical: {critical_count}")
        lines.append(f"- ⚠️  High: {high_count}")
        lines.append(f"- 💡 Recommendations: {len(results['recommendations'])}")
        lines.append("")
        
        # Critical Issues
        if results["critical_issues"]:
            lines.append("## 🚨 CRITICAL ISSUES - FIX IMMEDIATELY")
            lines.append("")
            for i, issue in enumerate(results["critical_issues"], 1):
                lines.append(f"### {i}. {issue['type']}")
                lines.append(f"**File:** `{issue['file']}`")
                lines.append(f"**Issue:** {issue['issue']}")
                lines.append(f"**Risk:** {issue['risk']}")
                lines.append(f"**Fix:** {issue['fix']}")
                lines.append("")
        
        # High Issues
        if results["high_issues"]:
            lines.append("## ⚠️ HIGH PRIORITY ISSUES")
            lines.append("")
            for i, issue in enumerate(results["high_issues"], 1):
                lines.append(f"### {i}. {issue['type']}")
                lines.append(f"**File:** `{issue['file']}`")
                lines.append(f"**Issue:** {issue['issue']}")
                lines.append(f"**Risk:** {issue['risk']}")
                lines.append(f"**Fix:** {issue['fix']}")
                lines.append("")
        
        # Recommendations
        if results["recommendations"]:
            lines.append("## 💡 RECOMMENDATIONS")
            lines.append("")
            for i, rec in enumerate(results["recommendations"], 1):
                lines.append(f"### {i}. {rec['type']}")
                lines.append(f"**File:** `{rec['file']}`")
                lines.append(f"**Suggestion:** {rec['suggestion']}")
                lines.append(f"**Benefit:** {rec['benefit']}")
                lines.append("")
        
        # Next Steps
        if total_issues > 0:
            lines.append("## 🛠️ IMMEDIATE NEXT STEPS")
            lines.append("")
            if critical_count > 0:
                lines.append("**URGENT - Within 2 Hours:**")
                lines.append("1. 🔑 Generate new JWT secrets using `openssl rand -base64 64`")
                lines.append("2. 🗃️ Replace hardcoded user database with proper implementation")
                lines.append("3. 🔒 Update all default credentials immediately")
                lines.append("")
            
            lines.append("**High Priority - Within 24 Hours:**")
            lines.append("1. 🛡️ Implement comprehensive input validation")
            lines.append("2. 🌐 Configure environment-specific CORS policies")
            lines.append("3. 📋 Add security headers to all API responses")
            lines.append("4. 🔍 Implement security event logging")
            lines.append("")
            
            lines.append("**Reference:** See SECURITY_IMPLEMENTATION_GUIDE.md for detailed instructions")
        else:
            lines.append("## ✅ SECURITY STATUS: GOOD")
            lines.append("Continue following security best practices and conduct regular audits.")
        
        lines.append("")
        lines.append("---")
        lines.append("**Next Validation:** 7 days")
        lines.append("**Full Security Audit:** 30 days")
        
        return "\n".join(lines)


def main():
    import sys
    
    project_root = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    
    validator = QuickSecurityValidator(project_root)
    results = validator.run_validation()
    
    # Generate report
    report = validator.generate_report(results)
    
    # Save report
    report_path = Path(project_root) / "SECURITY_VALIDATION_REPORT.md"
    with open(report_path, 'w') as f:
        f.write(report)
    
    print()
    print("=" * 50)
    print(f"📊 Validation Complete!")
    print(f"📝 Report: {report_path}")
    
    # Print summary
    critical_count = len(results["critical_issues"])
    high_count = len(results["high_issues"])
    
    if critical_count > 0:
        print(f"🚨 CRITICAL: {critical_count} issues require immediate attention!")
        sys.exit(1)
    elif high_count > 0:
        print(f"⚠️  HIGH: {high_count} issues need attention within 24h")
        sys.exit(2)
    else:
        print("✅ No critical security issues found")
        sys.exit(0)


if __name__ == "__main__":
    main()