#!/usr/bin/env python3
"""
Code Security Analyzer
SAST (Static Application Security Testing) with Bandit and ESLint Security
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
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import yaml

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class SecurityIssue:
    """Security issue found in code"""
    file_path: str
    line_number: int
    column: Optional[int]
    severity: str
    issue_type: str
    rule_id: str
    message: str
    confidence: Optional[str]
    cwe_id: Optional[str]
    
@dataclass
class AnalysisResult:
    """Code security analysis result"""
    project_path: str
    scan_timestamp: datetime
    total_issues: int
    critical_issues: int
    high_issues: int
    medium_issues: int
    low_issues: int
    issues: List[SecurityIssue]
    scan_duration: float
    tools_used: List[str]
    status: str

class CodeSecurityAnalyzer:
    """SAST tool for Python and JavaScript/TypeScript security analysis"""
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path or "deployment/security/sast-config.yaml"
        self.config = self._load_config()
        self.tools_available = self._check_tool_availability()
        
    def _load_config(self) -> Dict:
        """Load SAST configuration"""
        default_config = {
            'python': {
                'enabled': True,
                'tool': 'bandit',
                'exclusions': ['test_*', '*_test.py', '*/tests/*'],
                'severity_levels': ['HIGH', 'MEDIUM', 'LOW'],
                'confidence_levels': ['HIGH', 'MEDIUM', 'LOW']
            },
            'javascript': {
                'enabled': True,
                'tool': 'eslint',
                'config': '.eslintrc-security.js',
                'exclusions': ['node_modules', 'dist', 'build', '*.test.js', '*.spec.js']
            },
            'security_thresholds': {
                'critical': 0,
                'high': 3,
                'medium': 10,
                'total': 25
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
    
    def _check_tool_availability(self) -> Dict[str, bool]:
        """Check which security tools are available"""
        tools = {}
        
        # Check Bandit for Python
        try:
            result = subprocess.run(['bandit', '--version'], 
                                  capture_output=True, text=True, timeout=10)
            tools['bandit'] = result.returncode == 0
            logger.info(f"Bandit available: {tools['bandit']}")
        except (subprocess.TimeoutExpired, FileNotFoundError):
            tools['bandit'] = False
            logger.warning("Bandit not found")
        
        # Check ESLint for JavaScript/TypeScript
        try:
            result = subprocess.run(['npx', 'eslint', '--version'], 
                                  capture_output=True, text=True, timeout=10)
            tools['eslint'] = result.returncode == 0
            logger.info(f"ESLint available: {tools['eslint']}")
        except (subprocess.TimeoutExpired, FileNotFoundError):
            tools['eslint'] = False
            logger.warning("ESLint not found")
        
        return tools
    
    def analyze_project(self, project_path: str) -> AnalysisResult:
        """Analyze project for security issues"""
        logger.info(f"Starting security analysis for: {project_path}")
        start_time = datetime.now()
        
        if not os.path.exists(project_path):
            return self._create_error_result(project_path, "Project path does not exist")
        
        all_issues = []
        tools_used = []
        
        try:
            # Analyze Python files
            if self.config['python']['enabled'] and self.tools_available.get('bandit'):
                python_issues = self._analyze_python(project_path)
                all_issues.extend(python_issues)
                tools_used.append('bandit')
            
            # Analyze JavaScript/TypeScript files
            if self.config['javascript']['enabled'] and self.tools_available.get('eslint'):
                js_issues = self._analyze_javascript(project_path)
                all_issues.extend(js_issues)
                tools_used.append('eslint')
            
            # Calculate metrics
            severity_counts = self._calculate_severity_counts(all_issues)
            duration = (datetime.now() - start_time).total_seconds()
            
            result = AnalysisResult(
                project_path=project_path,
                scan_timestamp=start_time,
                total_issues=len(all_issues),
                critical_issues=severity_counts.get('CRITICAL', 0),
                high_issues=severity_counts.get('HIGH', 0),
                medium_issues=severity_counts.get('MEDIUM', 0),
                low_issues=severity_counts.get('LOW', 0),
                issues=sorted(all_issues, key=lambda x: self._severity_weight(x.severity), reverse=True),
                scan_duration=duration,
                tools_used=tools_used,
                status='completed'
            )
            
            logger.info(f"Analysis completed in {duration:.2f}s - Found {len(all_issues)} issues")
            return result
            
        except Exception as e:
            logger.error(f"Analysis failed: {str(e)}")
            return self._create_error_result(project_path, str(e))
    
    def _analyze_python(self, project_path: str) -> List[SecurityIssue]:
        """Analyze Python files with Bandit"""
        issues = []
        
        try:
            cmd = [
                'bandit',
                '-r', project_path,
                '-f', 'json',
                '-ll',  # Low severity and low confidence minimum
            ]
            
            # Add exclusions
            for exclusion in self.config['python']['exclusions']:
                cmd.extend(['--exclude', exclusion])
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            # Bandit returns non-zero when issues found, so don't check return code
            if result.stdout:
                bandit_data = json.loads(result.stdout)
                
                for bandit_issue in bandit_data.get('results', []):
                    issue = SecurityIssue(
                        file_path=bandit_issue['filename'],
                        line_number=bandit_issue['line_number'],
                        column=bandit_issue.get('col_offset'),
                        severity=bandit_issue['issue_severity'],
                        issue_type='security',
                        rule_id=bandit_issue['test_id'],
                        message=bandit_issue['issue_text'],
                        confidence=bandit_issue['issue_confidence'],
                        cwe_id=bandit_issue.get('cwe', {}).get('id')
                    )
                    issues.append(issue)
            
        except subprocess.TimeoutExpired:
            logger.error("Bandit analysis timeout")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Bandit output: {e}")
        except Exception as e:
            logger.error(f"Bandit analysis failed: {e}")
        
        return issues
    
    def _analyze_javascript(self, project_path: str) -> List[SecurityIssue]:
        """Analyze JavaScript/TypeScript files with ESLint Security"""
        issues = []
        
        try:
            # Create security-focused ESLint config if not exists
            eslint_config_path = os.path.join(project_path, '.eslintrc-security.js')
            if not os.path.exists(eslint_config_path):
                self._create_eslint_security_config(eslint_config_path)
            
            cmd = [
                'npx', 'eslint',
                project_path,
                '--config', eslint_config_path,
                '--format', 'json',
                '--ext', '.js,.jsx,.ts,.tsx'
            ]
            
            # Add exclusions
            for exclusion in self.config['javascript']['exclusions']:
                cmd.extend(['--ignore-pattern', exclusion])
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.stdout:
                eslint_data = json.loads(result.stdout)
                
                for file_result in eslint_data:
                    file_path = file_result['filePath']
                    
                    for message in file_result.get('messages', []):
                        # Filter for security-related rules
                        rule_id = message.get('ruleId', '')
                        if self._is_security_rule(rule_id):
                            severity = self._map_eslint_severity(message.get('severity', 1))
                            
                            issue = SecurityIssue(
                                file_path=file_path,
                                line_number=message.get('line', 0),
                                column=message.get('column', 0),
                                severity=severity,
                                issue_type='security',
                                rule_id=rule_id,
                                message=message.get('message', ''),
                                confidence='MEDIUM',  # ESLint doesn't provide confidence
                                cwe_id=None
                            )
                            issues.append(issue)
            
        except subprocess.TimeoutExpired:
            logger.error("ESLint analysis timeout")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse ESLint output: {e}")
        except Exception as e:
            logger.error(f"ESLint analysis failed: {e}")
        
        return issues
    
    def _create_eslint_security_config(self, config_path: str) -> None:
        """Create ESLint security configuration"""
        config_content = '''module.exports = {
    "env": {
        "browser": true,
        "es2021": true,
        "node": true
    },
    "extends": [
        "eslint:recommended",
        "@typescript-eslint/recommended"
    ],
    "plugins": [
        "security",
        "@typescript-eslint"
    ],
    "rules": {
        "security/detect-object-injection": "error",
        "security/detect-non-literal-regexp": "error",
        "security/detect-unsafe-regex": "error",
        "security/detect-buffer-noassert": "error",
        "security/detect-child-process": "error",
        "security/detect-disable-mustache-escape": "error",
        "security/detect-eval-with-expression": "error",
        "security/detect-new-buffer": "error",
        "security/detect-no-csrf-before-method-override": "error",
        "security/detect-possible-timing-attacks": "error",
        "security/detect-pseudoRandomBytes": "error",
        "no-eval": "error",
        "no-implied-eval": "error",
        "no-script-url": "error",
        "@typescript-eslint/no-explicit-any": "warn"
    }
};'''
        
        with open(config_path, 'w') as f:
            f.write(config_content)
    
    def _is_security_rule(self, rule_id: str) -> bool:
        """Check if ESLint rule is security-related"""
        security_rules = [
            'security/', 'no-eval', 'no-implied-eval', 'no-script-url',
            'no-danger', 'no-innerHTML', '@typescript-eslint/no-explicit-any'
        ]
        return any(rule in rule_id for rule in security_rules)
    
    def _map_eslint_severity(self, eslint_severity: int) -> str:
        """Map ESLint severity to our severity levels"""
        severity_map = {
            1: 'LOW',      # Warning
            2: 'HIGH'      # Error
        }
        return severity_map.get(eslint_severity, 'MEDIUM')
    
    def _calculate_severity_counts(self, issues: List[SecurityIssue]) -> Dict[str, int]:
        """Calculate counts by severity"""
        counts = {}
        for issue in issues:
            counts[issue.severity] = counts.get(issue.severity, 0) + 1
        return counts
    
    def _severity_weight(self, severity: str) -> int:
        """Get severity weight for sorting"""
        weights = {'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1}
        return weights.get(severity, 0)
    
    def _create_error_result(self, project_path: str, error_msg: str) -> AnalysisResult:
        """Create error analysis result"""
        return AnalysisResult(
            project_path=project_path,
            scan_timestamp=datetime.now(),
            total_issues=0,
            critical_issues=0,
            high_issues=0,
            medium_issues=0,
            low_issues=0,
            issues=[],
            scan_duration=0.0,
            tools_used=[],
            status=f'error: {error_msg}'
        )
    
    def evaluate_security_gate(self, result: AnalysisResult) -> Tuple[bool, str]:
        """Evaluate if code passes security gate"""
        thresholds = self.config['security_thresholds']
        
        if result.status.startswith('error'):
            return False, f"Analysis failed: {result.status}"
        
        if result.critical_issues > thresholds['critical']:
            return False, f"Critical issues: {result.critical_issues} (max: {thresholds['critical']})"
        
        if result.high_issues > thresholds['high']:
            return False, f"High severity issues: {result.high_issues} (max: {thresholds['high']})"
            
        if result.medium_issues > thresholds['medium']:
            return False, f"Medium severity issues: {result.medium_issues} (max: {thresholds['medium']})"
            
        if result.total_issues > thresholds['total']:
            return False, f"Total issues: {result.total_issues} (max: {thresholds['total']})"
        
        return True, "Security gate passed"
    
    def generate_report(self, result: AnalysisResult, output_path: str) -> None:
        """Generate security analysis report"""
        report = {
            'analysis_summary': {
                'project_path': result.project_path,
                'scan_timestamp': result.scan_timestamp.isoformat(),
                'total_issues': result.total_issues,
                'severity_breakdown': {
                    'critical': result.critical_issues,
                    'high': result.high_issues,
                    'medium': result.medium_issues,
                    'low': result.low_issues
                },
                'tools_used': result.tools_used,
                'scan_duration': result.scan_duration,
                'status': result.status
            },
            'security_issues': [
                {
                    'file': issue.file_path,
                    'line': issue.line_number,
                    'column': issue.column,
                    'severity': issue.severity,
                    'rule_id': issue.rule_id,
                    'message': issue.message,
                    'confidence': issue.confidence,
                    'cwe_id': issue.cwe_id
                } for issue in result.issues[:100]  # Limit to top 100
            ]
        }
        
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Security analysis report saved to: {output_path}")

def main():
    """Main execution function"""
    if len(sys.argv) < 2:
        print("Usage: code-security-analyzer.py <project_path> [output_path]")
        sys.exit(1)
    
    project_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else f"sast-report-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    # Initialize analyzer
    analyzer = CodeSecurityAnalyzer()
    
    # Perform analysis
    result = analyzer.analyze_project(project_path)
    
    # Evaluate security gate
    passed, message = analyzer.evaluate_security_gate(result)
    
    # Generate report
    analyzer.generate_report(result, output_path)
    
    # Print summary
    print(f"\n=== Code Security Analysis Results ===")
    print(f"Project: {project_path}")
    print(f"Tools Used: {', '.join(result.tools_used)}")
    print(f"Total Issues: {result.total_issues}")
    print(f"Critical: {result.critical_issues}, High: {result.high_issues}, Medium: {result.medium_issues}, Low: {result.low_issues}")
    print(f"Security Gate: {'PASSED' if passed else 'FAILED'}")
    print(f"Message: {message}")
    print(f"Report: {output_path}")
    
    # Exit with appropriate code
    sys.exit(0 if passed else 1)

if __name__ == "__main__":
    main()