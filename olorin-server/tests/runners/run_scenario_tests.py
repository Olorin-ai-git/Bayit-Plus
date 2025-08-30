#!/usr/bin/env python
"""Run fraud scenario tests with real API calls."""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from tests.fixtures.real_investigation_scenarios import RealScenarioGenerator
from tests.runners.run_autonomous_investigation_for_user import RealInvestigationRunner


class ScenarioTestRunner:
    """Run different fraud scenarios with real APIs."""
    
    def __init__(self):
        self.scenario_gen = RealScenarioGenerator()
        self.runner = RealInvestigationRunner()
        self.results = []
    
    async def run_all_scenarios(self):
        """Run all fraud scenario tests."""
        print("🎭 FRAUD SCENARIO TESTING WITH REAL APIs")
        print("="*60)
        
        scenarios = [
            ("account_takeover", self.scenario_gen.generate_account_takeover_scenario),
            ("payment_fraud", self.scenario_gen.generate_payment_fraud_scenario),
            ("identity_fraud", self.scenario_gen.generate_identity_fraud_scenario),
            ("money_laundering", self.scenario_gen.generate_money_laundering_scenario),
        ]
        
        for scenario_name, scenario_func in scenarios:
            print(f"\n🔍 Testing {scenario_name.replace('_', ' ').title()} Scenario")
            print("-"*40)
            
            # Generate real scenario data
            scenario_data = scenario_func()
            entity_id = scenario_data['entity_id']
            
            # Run investigation with real API
            result = await self.runner.run_investigation(entity_id)
            result['scenario'] = scenario_name
            result['scenario_data'] = scenario_data
            
            self.results.append(result)
            
            # Validate real response characteristics
            self._validate_real_response(result)
        
        self._print_final_report()
    
    def _validate_real_response(self, result: dict):
        """Validate that response is from real API."""
        validations = [
            ("API calls made", result.get('api_calls', 0) > 0),
            ("Cost incurred", result.get('total_cost', 0) > 0),
            ("Time taken", result.get('total_time', 0) > 1),
            ("No mock data", not result.get('real_api_validation', {}).get('mock_data', True)),
            ("Anthropic model used", 'claude' in str(result.get('real_api_validation', {}).get('model', '')).lower())
        ]
        
        print("\n🎯 Validation Results:")
        for check, passed in validations:
            status = "✅" if passed else "❌"
            print(f"  {status} {check}")
    
    def _print_final_report(self):
        """Print final test report."""
        print("\n" + "="*60)
        print("📋 SCENARIO TEST SUMMARY")
        print("="*60)
        print(f"Total Scenarios Tested: {len(self.results)}")
        print(f"Total API Calls: {sum(r.get('api_calls', 0) for r in self.results)}")
        print(f"Total Cost: ${sum(r.get('total_cost', 0) for r in self.results):.4f}")
        print(f"Average Time per Scenario: {sum(r.get('total_time', 0) for r in self.results) / len(self.results):.2f}s")
        print("\nScenario Results:")
        for result in self.results:
            status = "✅" if 'error' not in str(result) else "❌"
            print(f"  {status} {result['scenario']}: ${result.get('total_cost', 0):.4f}")


async def main():
    runner = ScenarioTestRunner()
    await runner.run_all_scenarios()


if __name__ == "__main__":
    asyncio.run(main())