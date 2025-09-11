#!/usr/bin/env python3
"""
Critical Issues Validator

Direct validation of the critical issues identified:
1. Evidence strength should be 0.2-0.4, not 1.0 
2. Remove authoritative finalized risk score override
3. Fix f-string formatting with None values
4. Verify proper discordance detection and risk capping
"""

import os
import sys
from pathlib import Path
import re

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))


class CriticalIssuesValidator:
    """Validates critical issues without full system execution"""
    
    def __init__(self):
        self.issues_found = []
        self.fixes_validated = []
    
    def validate_all_issues(self):
        """Validate all critical issues"""
        print("🔍 VALIDATING CRITICAL ISSUES...")
        print("=" * 60)
        
        self.validate_evidence_strength_cap()
        self.validate_authoritative_override_removal()
        self.validate_f_string_formatting()
        self.validate_risk_fusion_logic()
        self.validate_float_conversion_safety()
        
        self.print_results()
    
    def validate_evidence_strength_cap(self):
        """Check evidence strength capping at 0.4"""
        print("\n1. EVIDENCE STRENGTH CAPPING")
        print("-" * 40)
        
        integration_file = project_root / "app/service/agent/integration_system.py"
        
        if integration_file.exists():
            with open(integration_file, 'r') as f:
                content = f.read()
            
            # Find the problematic line
            lines = content.split('\n')
            for line_num, line in enumerate(lines, 1):
                if "result.evidence_strength = min(1.0, sum(evidence_factors))" in line:
                    self.issues_found.append({
                        'file': 'integration_system.py',
                        'line': line_num,
                        'issue': 'Evidence strength capped at 1.0, should be 0.4',
                        'code': line.strip(),
                        'severity': 'CRITICAL'
                    })
                    print(f"❌ ISSUE FOUND: Line {line_num}")
                    print(f"   Code: {line.strip()}")
                    print(f"   Problem: Caps at 1.0, should cap at 0.4")
                    break
            else:
                print("✅ Evidence strength capping looks fixed")
                self.fixes_validated.append("Evidence strength capping")
        else:
            print("❌ integration_system.py not found")
    
    def validate_authoritative_override_removal(self):
        """Check for authoritative override removal"""
        print("\n2. AUTHORITATIVE OVERRIDE REMOVAL")
        print("-" * 40)
        
        base_file = project_root / "app/service/agent/orchestration/domain_agents/base.py"
        
        if base_file.exists():
            with open(base_file, 'r') as f:
                content = f.read()
            
            # Check for authoritative override
            lines = content.split('\n')
            for line_num, line in enumerate(lines, 1):
                if "computed_risk_score  # Computed score is authoritative" in line:
                    self.issues_found.append({
                        'file': 'domain_agents/base.py',
                        'line': line_num,
                        'issue': 'Authoritative risk score override bypasses fusion',
                        'code': line.strip(),
                        'severity': 'CRITICAL'
                    })
                    print(f"❌ ISSUE FOUND: Line {line_num}")
                    print(f"   Code: {line.strip()}")
                    print(f"   Problem: Bypasses risk fusion logic")
                    break
                    
                if "computed_risk_score=computed_risk_score  # FORCE LLM" in line:
                    self.issues_found.append({
                        'file': 'domain_agents/base.py', 
                        'line': line_num,
                        'issue': 'Forces LLM to echo computed score',
                        'code': line.strip(),
                        'severity': 'CRITICAL'
                    })
                    print(f"❌ ISSUE FOUND: Line {line_num}")
                    print(f"   Code: {line.strip()}")
                    print(f"   Problem: Forces LLM echoing")
                    break
            else:
                print("✅ Authoritative override appears to be removed")
                self.fixes_validated.append("Authoritative override removal")
        else:
            print("❌ base.py not found")
    
    def validate_f_string_formatting(self):
        """Check for unsafe f-string formatting with None values"""
        print("\n3. F-STRING FORMATTING SAFETY")
        print("-" * 40)
        
        validation_file = project_root / "app/service/agent/enhanced_validation.py"
        
        if validation_file.exists():
            with open(validation_file, 'r') as f:
                content = f.read()
            
            # Check for risky f-string patterns
            lines = content.split('\n')
            risky_patterns = []
            
            for line_num, line in enumerate(lines, 1):
                # Look for f-strings with risk values and .2f formatting
                if (('f"' in line or "f'" in line) and 
                    ('risk' in line.lower()) and 
                    (':.2f' in line)):
                    
                    # Check if it's the specific problematic lines
                    if ('Initial=' in line and 'Final=' in line and 'Delta=' in line):
                        # Check if there's null safety
                        if 'if' not in line and 'or' not in line:
                            risky_patterns.append((line_num, line.strip()))
            
            if risky_patterns:
                for line_num, line in risky_patterns:
                    self.issues_found.append({
                        'file': 'enhanced_validation.py',
                        'line': line_num,
                        'issue': 'Unsafe f-string formatting with potential None values',
                        'code': line,
                        'severity': 'HIGH'
                    })
                    print(f"❌ RISKY PATTERN: Line {line_num}")
                    print(f"   Code: {line}")
                    print(f"   Problem: Could fail if risk values are None")
            else:
                print("✅ F-string formatting appears safe")
                self.fixes_validated.append("F-string formatting safety")
        else:
            print("❌ enhanced_validation.py not found")
    
    def validate_risk_fusion_logic(self):
        """Check for proper risk fusion without forced overrides"""
        print("\n4. RISK FUSION LOGIC")
        print("-" * 40)
        
        # Check for discordance detection patterns
        files_to_check = [
            "app/service/agent/enhanced_validation.py",
            "app/service/agent/orchestration/domain_agents/base.py",
            "app/service/agent/evidence_analyzer.py"
        ]
        
        discordance_found = False
        risk_capping_found = False
        
        for file_path in files_to_check:
            full_path = project_root / file_path
            if full_path.exists():
                with open(full_path, 'r') as f:
                    content = f.read()
                
                # Look for discordance detection
                if 'discordance' in content.lower():
                    discordance_found = True
                    print(f"✅ Discordance detection found in {file_path}")
                
                # Look for risk capping at 0.4
                if '0.4' in content and ('cap' in content.lower() or 'min(' in content or 'max(' in content):
                    risk_capping_found = True
                    print(f"✅ Risk capping at 0.4 found in {file_path}")
        
        if not discordance_found:
            self.issues_found.append({
                'file': 'Multiple',
                'line': 'N/A',
                'issue': 'No discordance detection implemented',
                'code': 'Missing discordance logic',
                'severity': 'HIGH'
            })
            print("❌ No discordance detection found")
        
        if not risk_capping_found:
            self.issues_found.append({
                'file': 'Multiple',
                'line': 'N/A', 
                'issue': 'No risk capping at 0.4 for high discordance',
                'code': 'Missing risk capping logic',
                'severity': 'HIGH'
            })
            print("❌ No risk capping at 0.4 found")
        
        if discordance_found and risk_capping_found:
            self.fixes_validated.append("Risk fusion with discordance detection")
    
    def validate_float_conversion_safety(self):
        """Check for float conversion safety"""
        print("\n5. FLOAT CONVERSION SAFETY")
        print("-" * 40)
        
        # Search for float() calls that might be unsafe
        files_to_check = [
            "app/service/agent/enhanced_validation.py",
            "app/service/agent/autonomous_orchestrator.py",
            "app/service/agent/integration_system.py"
        ]
        
        unsafe_conversions = []
        
        for file_path in files_to_check:
            full_path = project_root / file_path
            if full_path.exists():
                with open(full_path, 'r') as f:
                    lines = f.readlines()
                
                for line_num, line in enumerate(lines, 1):
                    if 'float(' in line:
                        # Check if it's in a try/catch or has safety checks
                        line_context = line.strip()
                        if ('try:' not in line and 'except' not in line_context and 
                            'if' not in line_context and 'or 0' not in line_context):
                            # Look for potentially unsafe patterns
                            if ('response_data[' in line or 'get(' in line or 'None' in line):
                                unsafe_conversions.append((file_path, line_num, line_context))
        
        if unsafe_conversions:
            for file_path, line_num, line in unsafe_conversions:
                self.issues_found.append({
                    'file': file_path,
                    'line': line_num,
                    'issue': 'Potentially unsafe float conversion',
                    'code': line,
                    'severity': 'MEDIUM'
                })
                print(f"⚠️  POTENTIAL ISSUE: {file_path}:{line_num}")
                print(f"   Code: {line}")
        else:
            print("✅ Float conversions appear safe")
            self.fixes_validated.append("Float conversion safety")
    
    def print_results(self):
        """Print validation results"""
        print("\n" + "=" * 60)
        print("CRITICAL ISSUES VALIDATION RESULTS")
        print("=" * 60)
        
        print(f"\n✅ FIXES VALIDATED: {len(self.fixes_validated)}")
        for fix in self.fixes_validated:
            print(f"   • {fix}")
        
        print(f"\n❌ ISSUES FOUND: {len(self.issues_found)}")
        for issue in self.issues_found:
            print(f"\n   {issue['severity']}: {issue['issue']}")
            print(f"   File: {issue['file']} (Line {issue['line']})")
            print(f"   Code: {issue['code']}")
        
        if len(self.issues_found) == 0:
            print("\n🎉 ALL CRITICAL ISSUES APPEAR TO BE FIXED!")
            print("✅ System validation: PASSED")
        else:
            print(f"\n⚠️  {len(self.issues_found)} CRITICAL ISSUES REMAIN")
            print("❌ System validation: FAILED")
            
            print("\nIMMEDIATE FIXES REQUIRED:")
            critical_issues = [i for i in self.issues_found if i['severity'] == 'CRITICAL']
            for issue in critical_issues:
                print(f"1. Fix {issue['file']} line {issue['line']}: {issue['issue']}")
        
        print("=" * 60)


def main():
    """Main validation execution"""
    validator = CriticalIssuesValidator()
    validator.validate_all_issues()


if __name__ == "__main__":
    main()