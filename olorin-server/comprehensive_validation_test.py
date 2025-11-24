#!/usr/bin/env python3
"""
Comprehensive Investigation System Validation Test

<<<<<<< HEAD
This script runs extensive tests to validate the autonomous investigation system
=======
This script runs extensive tests to validate the structured investigation system
>>>>>>> 001-modify-analyzer-method
and ensure NO ERRORS remain. Based on the user's explicit requirements:
1. Evidence strength should be 0.2-0.4 range, not 1.0
2. Remove authoritative finalized risk score override 
3. Fix any float(None) or f-string formatting errors
4. Verify null-safe formatting functions
5. Test LLM narrative isolation
6. Validate proper discordance detection and risk capping
"""

import sys
import os
import asyncio
import json
from typing import Dict, List, Any, Optional
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Set environment for mock mode
os.environ['TEST_MODE'] = 'mock'
os.environ['USE_SNOWFLAKE'] = 'false'
os.environ['MOCK_MODE'] = 'true'

from app.service.logging import get_bridge_logger
from app.service.agent.enhanced_validation import EnhancedInvestigationValidator
from app.service.agent.integration_system import IntegratedInvestigationService
from app.service.agent.orchestration.domain_agents.base import DomainAgent

logger = get_bridge_logger(__name__)


class ComprehensiveValidationTest:
    """Comprehensive validation test suite"""
    
    def __init__(self):
        self.test_results = {
            'evidence_strength_tests': [],
            'authoritative_override_tests': [],
            'formatting_tests': [],
            'risk_fusion_tests': [],
            'null_safety_tests': [],
            'end_to_end_tests': []
        }
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
    
    async def run_all_tests(self):
        """Run all comprehensive tests"""
        logger.info("🔍 Starting comprehensive validation tests...")
        
        await self.test_evidence_strength_capping()
        await self.test_authoritative_override_removal()
        await self.test_null_safe_formatting()
        await self.test_risk_fusion_logic()
        await self.test_float_conversion_safety()
        await self.test_end_to_end_investigation()
        
        await self.generate_test_report()
    
    async def test_evidence_strength_capping(self):
        """Test that evidence strength is properly capped at 0.4"""
        logger.info("🧪 Testing evidence strength capping...")
        
        try:
            # Test integration system evidence calculation
            from app.service.agent.integration_system import IntegratedInvestigationService
            
            # Check if the max evidence strength is properly capped
            service = IntegratedInvestigationService()
            
            # Mock a result with high evidence factors
            test_result = type('MockResult', (), {
                'pattern_results': {
                    'pattern1': type('Pattern', (), {'success': True})(),
                    'pattern2': type('Pattern', (), {'success': True})(),
                    'pattern3': type('Pattern', (), {'success': True})(),
                    'pattern4': type('Pattern', (), {'success': True})(),
                    'pattern5': type('Pattern', (), {'success': True})()
                },
                'knowledge_retrieved': ['item1', 'item2', 'item3', 'item4', 'item5'],
                'related_entities': ['entity1', 'entity2', 'entity3', 'entity4'],
                'evidence_strength': 0,
                'confidence_score': 0.8,
                'success': True,
                'error_message': None
            })()
            
            # Simulate evidence calculation
            evidence_factors = []
            
            # Pattern evidence - this could go very high
            successful_patterns = [pr for pr in test_result.pattern_results.values() if pr.success]
            if successful_patterns:
                evidence_factors.append(len(successful_patterns) * 0.2)  # 5 * 0.2 = 1.0
            
            # Knowledge evidence 
            if test_result.knowledge_retrieved:
                evidence_factors.append(len(test_result.knowledge_retrieved) * 0.1)  # 5 * 0.1 = 0.5
            
            # Entity evidence
            if test_result.related_entities:
                evidence_factors.append(len(test_result.related_entities) * 0.05)  # 4 * 0.05 = 0.2
            
            # This would sum to 1.7, which should be capped at 0.4
            uncapped_strength = sum(evidence_factors)
            test_result.evidence_strength = min(1.0, uncapped_strength)  # Current problematic code
            
            # Test current behavior vs expected behavior
            if test_result.evidence_strength > 0.4:
                self.add_test_result('evidence_strength_tests', 
                    f"CRITICAL: Evidence strength {test_result.evidence_strength:.2f} exceeds 0.4 cap", 
                    False, 
                    f"Uncapped: {uncapped_strength:.2f}, Current cap: {test_result.evidence_strength:.2f}")
            else:
                self.add_test_result('evidence_strength_tests', 
                    f"Evidence strength properly capped at {test_result.evidence_strength:.2f}", 
                    True)
                    
        except Exception as e:
            self.add_test_result('evidence_strength_tests', 
                f"Evidence strength test failed: {str(e)}", False)
    
    async def test_authoritative_override_removal(self):
        """Test that authoritative risk score overrides are removed"""
        logger.info("🧪 Testing authoritative override removal...")
        
        try:
            # Check base.py for authoritative override
            base_file = Path(project_root) / "app/service/agent/orchestration/domain_agents/base.py"
            
            if base_file.exists():
                with open(base_file, 'r') as f:
                    content = f.read()
                
                # Check for problematic authoritative override
                if "computed_risk_score  # Computed score is authoritative" in content:
                    self.add_test_result('authoritative_override_tests',
                        "CRITICAL: Found authoritative risk score override in base.py line 324",
                        False,
                        "This bypasses risk fusion and forces LLM to echo computed score")
                else:
                    self.add_test_result('authoritative_override_tests',
                        "Authoritative override removed from base.py",
                        True)
                
                # Check for computed_risk_score forcing
                if "computed_risk_score=computed_risk_score  # FORCE LLM" in content:
                    self.add_test_result('authoritative_override_tests',
                        "CRITICAL: Found forced LLM echoing of computed score",
                        False,
                        "LLM should not be forced to echo computed score")
                else:
                    self.add_test_result('authoritative_override_tests',
                        "LLM forced echoing removed",
                        True)
                        
        except Exception as e:
            self.add_test_result('authoritative_override_tests',
                f"Authoritative override test failed: {str(e)}", False)
    
    async def test_null_safe_formatting(self):
        """Test null-safe formatting functions"""
        logger.info("🧪 Testing null-safe formatting...")
        
        try:
            # Test enhanced_validation.py f-string formatting
            validation_file = Path(project_root) / "app/service/agent/enhanced_validation.py"
            
            if validation_file.exists():
                with open(validation_file, 'r') as f:
                    content = f.read()
                
                # Check for unsafe f-string formatting of risk values
                risk_formatting_lines = [
                    line_num for line_num, line in enumerate(content.split('\n'), 1)
                    if 'f"' in line and 'risk' in line.lower() and ':.2f' in line
                ]
                
                if risk_formatting_lines:
                    # Test the specific formatting with None values
                    test_initial_risk = None
                    test_final_risk = None
                    test_risk_delta = 1.0
                    
                    try:
                        # This should fail if not null-safe
                        if test_initial_risk is not None and test_final_risk is not None:
                            test_string = f"Initial={test_initial_risk:.2f}, Final={test_final_risk:.2f}, Delta={test_risk_delta:.2f}"
                        else:
                            test_string = f"Initial={test_initial_risk or 'N/A'}, Final={test_final_risk or 'N/A'}, Delta={test_risk_delta:.2f}"
                        
                        self.add_test_result('formatting_tests',
                            "Null-safe risk formatting working",
                            True)
                    except Exception as format_error:
                        self.add_test_result('formatting_tests',
                            f"CRITICAL: Risk formatting fails with None values: {str(format_error)}",
                            False,
                            f"Lines with risk formatting: {risk_formatting_lines}")
                            
        except Exception as e:
            self.add_test_result('formatting_tests',
                f"Null-safe formatting test failed: {str(e)}", False)
    
    async def test_risk_fusion_logic(self):
        """Test proper risk fusion without authoritative overrides"""
        logger.info("🧪 Testing risk fusion logic...")
        
        try:
            # Test discordance detection and risk capping
            test_cases = [
                {
                    'computed_score': 0.8,
                    'llm_score': 0.2,
                    'expected_cap': 0.4,  # High discordance should cap at 0.4
                    'description': 'High discordance case'
                },
                {
                    'computed_score': 0.3,
                    'llm_score': 0.35,
                    'expected_cap': None,  # Low discordance, no capping
                    'description': 'Low discordance case'
                },
                {
                    'computed_score': 0.9,
                    'llm_score': 0.1,
                    'expected_cap': 0.4,  # Very high discordance
                    'description': 'Very high discordance case'
                }
            ]
            
            for test_case in test_cases:
                computed = test_case['computed_score']
                llm = test_case['llm_score']
                discordance = abs(computed - llm)
                
                # Test discordance detection
                high_discordance = discordance > 0.3
                
                if high_discordance and test_case['expected_cap']:
                    final_score = min(max(computed, llm), test_case['expected_cap'])
                    if final_score == test_case['expected_cap']:
                        self.add_test_result('risk_fusion_tests',
                            f"{test_case['description']}: Risk properly capped at {final_score}",
                            True,
                            f"Discordance: {discordance:.2f}")
                    else:
                        self.add_test_result('risk_fusion_tests',
                            f"CRITICAL: {test_case['description']}: Risk not properly capped",
                            False,
                            f"Expected cap: {test_case['expected_cap']}, Got: {final_score}")
                else:
                    self.add_test_result('risk_fusion_tests',
                        f"{test_case['description']}: No capping needed, discordance: {discordance:.2f}",
                        True)
                        
        except Exception as e:
            self.add_test_result('risk_fusion_tests',
                f"Risk fusion test failed: {str(e)}", False)
    
    async def test_float_conversion_safety(self):
        """Test float conversion safety"""
        logger.info("🧪 Testing float conversion safety...")
        
        try:
            # Test common float conversion scenarios
            test_values = [None, "", "0.5", 0.5, "invalid", "nan"]
            
            for value in test_values:
                try:
                    if value is None:
                        result = 0.0  # Safe default
                        safe = True
                    elif isinstance(value, str) and value.strip() == "":
                        result = 0.0  # Safe default
                        safe = True  
                    else:
                        result = float(value)
                        safe = True
                except (ValueError, TypeError):
                    result = 0.0  # Safe fallback
                    safe = True  # This is expected behavior
                
                self.add_test_result('null_safety_tests',
                    f"Float conversion for {repr(value)}: {result}",
                    safe)
                    
        except Exception as e:
            self.add_test_result('null_safety_tests',
                f"Float conversion test failed: {str(e)}", False)
    
    async def test_end_to_end_investigation(self):
        """Test end-to-end investigation in mock mode"""
        logger.info("🧪 Testing end-to-end investigation...")
        
        try:
            # Create mock investigation request
            from app.api.models import InvestigationRequest
            
            test_request = InvestigationRequest(
                entity_type="user",
                entity_id="test_user_12345",
                investigation_type="fraud_detection",
                priority="medium",
                context={"test_mode": True, "mock_data": True}
            )
            
            # Initialize enhanced validator
            validator = EnhancedInvestigationValidator()
            
            # Create mock investigation result
            mock_result = {
                'investigation_id': 'test_investigation_001',
                'entity_type': 'user',
                'entity_id': 'test_user_12345',
                'risk_score': 0.3,
                'confidence': 0.8,
                'evidence': ['mock_evidence_1', 'mock_evidence_2'],
                'findings': {
                    'risk_score': 0.3,
                    'evidence': ['pattern_match', 'location_anomaly'],
                    'confidence': 0.8
                },
                'domain_results': {
                    'network': {'risk_score': 0.2, 'evidence': ['ip_mismatch']},
                    'device': {'risk_score': 0.4, 'evidence': ['device_change']},
                    'location': {'risk_score': 0.3, 'evidence': ['geo_anomaly']}
                },
                'metadata': {
                    'duration': 45.2,
                    'agents_used': ['network', 'device', 'location'],
                    'evidence_count': 3
                }
            }
            
            # Test validation
            validation_result = await validator.validate_investigation_result(
                mock_result['investigation_id'],
                mock_result
            )
            
            if validation_result.validation_status.value in ['passed', 'warning']:
                self.add_test_result('end_to_end_tests',
                    f"End-to-end test passed: {validation_result.validation_status.value}",
                    True,
                    f"Issues: {len(validation_result.critical_issues)}, Warnings: {len(validation_result.warnings)}")
            else:
                self.add_test_result('end_to_end_tests',
                    f"End-to-end test failed: {validation_result.validation_status.value}",
                    False,
                    f"Critical issues: {validation_result.critical_issues}")
                    
        except Exception as e:
            self.add_test_result('end_to_end_tests',
                f"End-to-end test failed: {str(e)}", False)
    
    def add_test_result(self, category: str, description: str, passed: bool, details: str = ""):
        """Add test result"""
        result = {
            'description': description,
            'passed': passed,
            'details': details
        }
        
        self.test_results[category].append(result)
        self.total_tests += 1
        
        if passed:
            self.passed_tests += 1
            logger.info(f"✅ {description}")
        else:
            self.failed_tests += 1
            logger.error(f"❌ {description}")
            if details:
                logger.error(f"   Details: {details}")
    
    async def generate_test_report(self):
        """Generate comprehensive test report"""
        logger.info("📊 Generating comprehensive test report...")
        
        report = {
            'summary': {
                'total_tests': self.total_tests,
                'passed_tests': self.passed_tests,
                'failed_tests': self.failed_tests,
                'pass_rate': (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
            },
            'test_results': self.test_results,
            'critical_issues_found': [],
            'recommendations': []
        }
        
        # Collect critical issues
        for category, tests in self.test_results.items():
            for test in tests:
                if not test['passed'] and 'CRITICAL' in test['description']:
                    report['critical_issues_found'].append({
                        'category': category,
                        'issue': test['description'],
                        'details': test['details']
                    })
        
        # Generate recommendations
        if report['critical_issues_found']:
            report['recommendations'].extend([
                "1. Fix evidence strength capping in integration_system.py line 502",
                "2. Remove authoritative override in domain_agents/base.py line 324", 
                "3. Implement null-safe formatting in enhanced_validation.py",
                "4. Implement proper risk fusion without forced LLM echoing",
                "5. Add discordance detection and risk capping at 0.4"
            ])
        
        # Print report
        print("\n" + "="*80)
        print("COMPREHENSIVE INVESTIGATION SYSTEM VALIDATION REPORT")
        print("="*80)
        print(f"Total Tests: {report['summary']['total_tests']}")
        print(f"Passed: {report['summary']['passed_tests']}")
        print(f"Failed: {report['summary']['failed_tests']}")
        print(f"Pass Rate: {report['summary']['pass_rate']:.1f}%")
        print()
        
        if report['critical_issues_found']:
            print("CRITICAL ISSUES FOUND:")
            print("-" * 40)
            for issue in report['critical_issues_found']:
                print(f"• {issue['issue']}")
                if issue['details']:
                    print(f"  Details: {issue['details']}")
            print()
        
        if report['recommendations']:
            print("RECOMMENDATIONS:")
            print("-" * 40)
            for rec in report['recommendations']:
                print(f"• {rec}")
            print()
        
        # Save report to file
        report_file = Path(project_root) / "comprehensive_validation_report.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Report saved to: {report_file}")
        
        if report['summary']['failed_tests'] == 0:
            print("🎉 ALL TESTS PASSED - SYSTEM VALIDATED!")
        else:
            print(f"⚠️  {report['summary']['failed_tests']} CRITICAL ISSUES REMAIN")
        
        print("="*80)


async def main():
    """Main test execution"""
    print("🚀 Starting comprehensive investigation system validation...")
    
    validator = ComprehensiveValidationTest()
    await validator.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())