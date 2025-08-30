#!/usr/bin/env python
"""Validation suite to ensure no mock data and real API usage."""

import ast
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from langchain_anthropic import ChatAnthropic
from app.service.config import get_settings_for_env

settings_for_env = get_settings_for_env()


class MockDataValidator:
    """Validate that no mock data exists in the system."""
    
    def __init__(self):
        self.violations = []
        self.files_checked = 0
        
    def validate_no_mock_data(self):
        """Scan codebase for mock data patterns."""
        print("🔍 MOCK DATA VALIDATION")
        print("="*60)
        
        # Directories to check
        dirs_to_check = [
            Path(__file__).parent.parent.parent / "app",
            Path(__file__).parent.parent  # tests directory
        ]
        
        mock_patterns = [
            "MagicMock",
            "AsyncMock", 
            "@patch",
            "unittest.mock",
            "return_value =",
            "side_effect ="
        ]
        
        for directory in dirs_to_check:
            for py_file in directory.rglob("*.py"):
                # Skip __pycache__ and test files
                if "__pycache__" in str(py_file) or "test_" in py_file.name:
                    continue
                    
                self.files_checked += 1
                with open(py_file, 'r') as f:
                    content = f.read()
                    
                for pattern in mock_patterns:
                    if pattern in content:
                        self.violations.append({
                            "file": str(py_file),
                            "pattern": pattern,
                            "severity": "HIGH"
                        })
        
        self._print_validation_results()
    
    def _print_validation_results(self):
        """Print validation results."""
        print(f"\nFiles Checked: {self.files_checked}")
        print(f"Mock Violations Found: {len(self.violations)}")
        
        if self.violations:
            print("\n❌ VIOLATIONS DETECTED:")
            for v in self.violations:
                print(f"  - {v['file']}: {v['pattern']}")
        else:
            print("\n✅ NO MOCK DATA DETECTED - SYSTEM IS CLEAN")


class RealAPIValidator:
    """Validate real API connectivity and usage."""
    
    async def validate_api_connectivity(self):
        """Test real API connectivity."""
        print("\n🌐 REAL API VALIDATION")
        print("="*60)
        
        try:
            # Initialize real LLM client
            llm = ChatAnthropic(
                api_key=settings_for_env.anthropic_api_key,
                model="claude-opus-4-1-20250805",
                temperature=0.1,
                max_tokens=100
            )
            
            # Make a real API call
            print("Testing Anthropic API connectivity...")
            response = await llm.ainvoke("Say 'API Connected' if you receive this.")
            
            # Validate response
            validations = [
                ("API Key Valid", bool(settings_for_env.anthropic_api_key)),
                ("Model Correct", "claude-opus-4-1-20250805" in str(llm)),
                ("Response Received", bool(response)),
                ("Content Generated", bool(response.content if hasattr(response, 'content') else response)),
                ("No Mock Response", "Mock" not in str(response))
            ]
            
            print("\n🎯 API Validation Results:")
            for check, passed in validations:
                status = "✅" if passed else "❌"
                print(f"  {status} {check}")
            
            return all(passed for _, passed in validations)
            
        except Exception as e:
            print(f"\n❌ API Validation Failed: {e}")
            return False


class VariationValidator:
    """Validate response variation (no hardcoded responses)."""
    
    async def validate_response_variation(self):
        """Test that responses vary (not hardcoded)."""
        print("\n🎲 RESPONSE VARIATION VALIDATION")
        print("="*60)
        
        llm = ChatAnthropic(
            api_key=settings_for_env.anthropic_api_key,
            model="claude-opus-4-1-20250805",
            temperature=0.5,
            max_tokens=100
        )
        
        # Make multiple calls with same prompt
        prompt = "Generate a random risk score between 0 and 100."
        responses = []
        
        print("Making multiple API calls to test variation...")
        for i in range(3):
            response = await llm.ainvoke(prompt)
            responses.append(response.content if hasattr(response, 'content') else str(response))
            print(f"  Call {i+1}: {responses[-1][:50]}...")
        
        # Check for variation
        unique_responses = len(set(responses))
        variation_score = unique_responses / len(responses)
        
        print(f"\nVariation Score: {variation_score:.2%}")
        print(f"Unique Responses: {unique_responses}/{len(responses)}")
        
        if variation_score > 0.5:
            print("✅ Responses show natural variation (not hardcoded)")
        else:
            print("⚠️ Low variation detected - possible issues")
        
        return variation_score > 0.5


async def main():
    """Run complete validation suite."""
    print("🔍 OLORIN VALIDATION SUITE")
    print("="*60)
    print("Validating: No Mock Data + Real API Usage")
    print("="*60)
    
    # Run validations
    mock_validator = MockDataValidator()
    mock_validator.validate_no_mock_data()
    
    api_validator = RealAPIValidator()
    api_valid = await api_validator.validate_api_connectivity()
    
    variation_validator = VariationValidator()
    variation_valid = await variation_validator.validate_response_variation()
    
    # Final summary
    print("\n" + "="*60)
    print("📋 VALIDATION SUMMARY")
    print("="*60)
    print(f"Mock Data Check: {'PASS ✅' if not mock_validator.violations else 'FAIL ❌'}")
    print(f"API Connectivity: {'PASS ✅' if api_valid else 'FAIL ❌'}")
    print(f"Response Variation: {'PASS ✅' if variation_valid else 'FAIL ❌'}")
    
    all_passed = not mock_validator.violations and api_valid and variation_valid
    if all_passed:
        print("\n🎆 ALL VALIDATIONS PASSED - SYSTEM USES REAL APIs")
    else:
        print("\n⚠️ SOME VALIDATIONS FAILED - REVIEW REQUIRED")
    
    return all_passed


if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)