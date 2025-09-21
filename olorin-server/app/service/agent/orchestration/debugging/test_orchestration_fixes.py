"""
Test Orchestration Fixes

Test script to validate that the orchestration routing fixes work correctly
and ensure investigations progress through all phases properly.
"""

import asyncio
import os
import json
from typing import Dict, Any
from datetime import datetime

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import InvestigationState, create_initial_state
from app.service.agent.orchestration.hybrid.intelligent_router import IntelligentRouter
from app.service.agent.orchestration.hybrid.ai_confidence_engine import AIConfidenceEngine
from app.service.agent.orchestration.hybrid.safety import AdvancedSafetyManager
from app.service.agent.orchestration.debugging.orchestration_debugger import debug_failed_investigation

logger = get_bridge_logger(__name__)


class OrchestrationTestSuite:
    """
    Test suite for validating orchestration fixes.
    """
    
    def __init__(self):
        self.test_results = {}
        self.confidence_engine = AIConfidenceEngine()
        self.safety_manager = AdvancedSafetyManager()
        self.router = IntelligentRouter(self.confidence_engine, self.safety_manager)
    
    async def run_comprehensive_tests(self) -> Dict[str, Any]:
        """
        Run comprehensive tests to validate orchestration fixes.
        
        Returns:
            Test results and validation status
        """
        
        logger.info("🧪 Starting Orchestration Fix Validation Tests")
        
        test_results = {
            "test_timestamp": datetime.now().isoformat(),
            "tests": {},
            "overall_status": "pending"
        }
        
        # Test 1: Routing Logic Validation
        test_results["tests"]["routing_logic"] = await self._test_routing_logic()
        
        # Test 2: State Transition Flow
        test_results["tests"]["state_transitions"] = await self._test_state_transitions()
        
        # Test 3: Domain Agent Triggering
        test_results["tests"]["domain_triggering"] = await self._test_domain_agent_triggering()
        
        # Test 4: Tool Results to Domain Flow
        test_results["tests"]["tool_to_domain_flow"] = await self._test_tool_to_domain_flow()
        
        # Test 5: Sequential Domain Execution
        test_results["tests"]["sequential_domains"] = await self._test_sequential_domain_execution()
        
        # Calculate overall status
        test_results["overall_status"] = self._calculate_overall_status(test_results["tests"])
        
        # Log results
        self._log_test_results(test_results)
        
        return test_results
    
    async def _test_routing_logic(self) -> Dict[str, Any]:
        """Test routing logic improvements."""
        
        logger.info("🧪 Test 1: Routing Logic Validation")
        
        test_result = {
            "test_name": "routing_logic",
            "status": "pending",
            "subtests": {},
            "issues_found": [],
            "fixes_validated": []
        }
        
        # Subtest 1: Tool results trigger domain analysis
        state_with_tool_results = create_initial_state(
            investigation_id="test_routing_001",
            entity_id="192.168.1.100",
            entity_type="ip"
        )
        
        # Simulate state after tool execution
        state_with_tool_results.update({
            "snowflake_data": {"test": "data"},
            "snowflake_completed": True,
            "tool_results": {
                "threat_intelligence": {"result": "test"},
                "ip_reputation": {"result": "test"}
            },
            "domain_findings": {},  # No domains analyzed yet
            "domains_completed": []
        })
        
        routing_decision = await self.router.get_hybrid_routing_decision(state_with_tool_results)
        
        # Validate that routing goes to domain agent
        if routing_decision["next_node"].endswith("_agent"):
            test_result["subtests"]["tool_to_domain"] = {
                "status": "passed",
                "next_node": routing_decision["next_node"],
                "reasoning": routing_decision["reasoning"]
            }
            test_result["fixes_validated"].append("Tool results now correctly trigger domain analysis")
        else:
            test_result["subtests"]["tool_to_domain"] = {
                "status": "failed",
                "next_node": routing_decision["next_node"],
                "expected": "*_agent",
                "reasoning": routing_decision["reasoning"]
            }
            test_result["issues_found"].append("Tool results still not triggering domain analysis")
        
        # Subtest 2: Sequential domain progression
        state_with_partial_domains = state_with_tool_results.copy()
        state_with_partial_domains.update({
            "domain_findings": {"network": {"result": "test"}},
            "domains_completed": ["network"]
        })
        
        routing_decision_2 = await self.router.get_hybrid_routing_decision(state_with_partial_domains)
        
        if routing_decision_2["next_node"] in ["device_agent", "location_agent", "logs_agent", "authentication_agent", "risk_agent"]:
            test_result["subtests"]["sequential_progression"] = {
                "status": "passed",
                "next_node": routing_decision_2["next_node"]
            }
            test_result["fixes_validated"].append("Sequential domain progression working correctly")
        else:
            test_result["subtests"]["sequential_progression"] = {
                "status": "failed",
                "next_node": routing_decision_2["next_node"],
                "expected": "next_domain_agent"
            }
            test_result["issues_found"].append("Sequential domain progression broken")
        
        # Determine overall test status
        passed_subtests = sum(1 for subtest in test_result["subtests"].values() if subtest["status"] == "passed")
        total_subtests = len(test_result["subtests"])
        
        if passed_subtests == total_subtests:
            test_result["status"] = "passed"
        elif passed_subtests > 0:
            test_result["status"] = "partial"
        else:
            test_result["status"] = "failed"
        
        return test_result
    
    async def _test_state_transitions(self) -> Dict[str, Any]:
        """Test state transition correctness."""
        
        logger.info("🧪 Test 2: State Transition Flow")
        
        test_result = {
            "test_name": "state_transitions",
            "status": "pending",
            "phase_transitions": [],
            "issues_found": [],
            "fixes_validated": []
        }
        
        # Test phase progression
        phases = [
            {
                "phase": "initialization",
                "state": {"current_phase": "initialization", "snowflake_completed": False},
                "expected_next": "fraud_investigation"
            },
            {
                "phase": "snowflake_analysis",
                "state": {"current_phase": "snowflake_analysis", "snowflake_completed": True, "tool_results": {}},
                "expected_next": "fraud_investigation"
            },
            {
                "phase": "tool_execution",
                "state": {"current_phase": "tool_execution", "snowflake_completed": True, "tool_results": {"test": "data"}, "domain_findings": {}},
                "expected_next": "*_agent"
            }
        ]
        
        for phase_test in phases:
            state = create_initial_state("test_transitions", "192.168.1.100")
            state.update(phase_test["state"])
            
            routing_decision = await self.router.get_hybrid_routing_decision(state)
            
            phase_result = {
                "phase": phase_test["phase"],
                "expected": phase_test["expected_next"],
                "actual": routing_decision["next_node"],
                "status": "pending"
            }
            
            if phase_test["expected_next"] == "*_agent":
                if routing_decision["next_node"].endswith("_agent"):
                    phase_result["status"] = "passed"
                else:
                    phase_result["status"] = "failed"
            elif routing_decision["next_node"] == phase_test["expected_next"]:
                phase_result["status"] = "passed"
            else:
                phase_result["status"] = "failed"
            
            test_result["phase_transitions"].append(phase_result)
        
        # Calculate overall status
        passed_phases = sum(1 for phase in test_result["phase_transitions"] if phase["status"] == "passed")
        total_phases = len(test_result["phase_transitions"])
        
        if passed_phases == total_phases:
            test_result["status"] = "passed"
            test_result["fixes_validated"].append("All phase transitions working correctly")
        elif passed_phases > 0:
            test_result["status"] = "partial"
            test_result["issues_found"].append(f"Only {passed_phases}/{total_phases} phase transitions working")
        else:
            test_result["status"] = "failed"
            test_result["issues_found"].append("Phase transitions completely broken")
        
        return test_result
    
    async def _test_domain_agent_triggering(self) -> Dict[str, Any]:
        """Test that domain agents are properly triggered."""
        
        logger.info("🧪 Test 3: Domain Agent Triggering")
        
        test_result = {
            "test_name": "domain_triggering",
            "status": "pending",
            "domain_tests": {},
            "issues_found": [],
            "fixes_validated": []
        }
        
        # Test each domain agent triggering
        domains = ["network", "device", "location", "logs", "authentication", "risk"]
        
        for i, domain in enumerate(domains):
            # Create state with previous domains completed
            state = create_initial_state("test_domain_trigger", "192.168.1.100")
            state.update({
                "snowflake_data": {"test": "data"},
                "snowflake_completed": True,
                "tool_results": {"test_tool": {"result": "data"}},
                "domain_findings": {prev_domain: {"result": "test"} for prev_domain in domains[:i]},
                "domains_completed": domains[:i]
            })
            
            routing_decision = await self.router.get_hybrid_routing_decision(state)
            
            expected_agent = f"{domain}_agent"
            
            test_result["domain_tests"][domain] = {
                "expected": expected_agent,
                "actual": routing_decision["next_node"],
                "status": "passed" if routing_decision["next_node"] == expected_agent else "failed",
                "completed_domains": len(domains[:i])
            }
        
        # Calculate overall status
        passed_domains = sum(1 for test in test_result["domain_tests"].values() if test["status"] == "passed")
        total_domains = len(test_result["domain_tests"])
        
        if passed_domains == total_domains:
            test_result["status"] = "passed"
            test_result["fixes_validated"].append("All domain agents triggered correctly")
        elif passed_domains > 0:
            test_result["status"] = "partial"
            test_result["issues_found"].append(f"Only {passed_domains}/{total_domains} domain agents triggered correctly")
        else:
            test_result["status"] = "failed"
            test_result["issues_found"].append("Domain agent triggering completely broken")
        
        return test_result
    
    async def _test_tool_to_domain_flow(self) -> Dict[str, Any]:
        """Test flow from tool results to domain analysis."""
        
        logger.info("🧪 Test 4: Tool Results to Domain Flow")
        
        test_result = {
            "test_name": "tool_to_domain_flow",
            "status": "pending",
            "flow_tests": {},
            "issues_found": [],
            "fixes_validated": []
        }
        
        # Test different tool result scenarios
        scenarios = [
            {
                "name": "single_tool_result",
                "tool_results": {"ip_reputation": {"score": 0.8}},
                "should_trigger_domains": True
            },
            {
                "name": "multiple_tool_results",
                "tool_results": {
                    "threat_intelligence": {"threats": ["malware"]},
                    "ip_reputation": {"score": 0.3},
                    "geolocation": {"country": "unknown"}
                },
                "should_trigger_domains": True
            },
            {
                "name": "empty_tool_results",
                "tool_results": {},
                "should_trigger_domains": False
            }
        ]
        
        for scenario in scenarios:
            state = create_initial_state("test_tool_flow", "192.168.1.100")
            state.update({
                "snowflake_data": {"test": "data"},
                "snowflake_completed": True,
                "tool_results": scenario["tool_results"],
                "domain_findings": {},
                "domains_completed": []
            })
            
            routing_decision = await self.router.get_hybrid_routing_decision(state)
            
            triggers_domain = routing_decision["next_node"].endswith("_agent")
            
            test_result["flow_tests"][scenario["name"]] = {
                "tool_results_count": len(scenario["tool_results"]),
                "should_trigger_domains": scenario["should_trigger_domains"],
                "actually_triggers_domains": triggers_domain,
                "next_node": routing_decision["next_node"],
                "status": "passed" if triggers_domain == scenario["should_trigger_domains"] else "failed"
            }
        
        # Calculate overall status
        passed_flows = sum(1 for test in test_result["flow_tests"].values() if test["status"] == "passed")
        total_flows = len(test_result["flow_tests"])
        
        if passed_flows == total_flows:
            test_result["status"] = "passed"
            test_result["fixes_validated"].append("Tool-to-domain flow working correctly")
        else:
            test_result["status"] = "failed"
            test_result["issues_found"].append(f"Tool-to-domain flow issues: {passed_flows}/{total_flows} working")
        
        return test_result
    
    async def _test_sequential_domain_execution(self) -> Dict[str, Any]:
        """Test sequential domain execution order."""
        
        logger.info("🧪 Test 5: Sequential Domain Execution")
        
        test_result = {
            "test_name": "sequential_domains",
            "status": "pending",
            "execution_order": [],
            "issues_found": [],
            "fixes_validated": []
        }
        
        expected_order = ["network", "device", "location", "logs", "authentication", "risk"]
        
        # Simulate progressive domain completion
        for i in range(len(expected_order)):
            completed_domains = expected_order[:i]
            
            state = create_initial_state("test_sequential", "192.168.1.100")
            state.update({
                "snowflake_data": {"test": "data"},
                "snowflake_completed": True,
                "tool_results": {"test_tool": {"result": "data"}},
                "domain_findings": {domain: {"result": "test"} for domain in completed_domains},
                "domains_completed": completed_domains
            })
            
            routing_decision = await self.router.get_hybrid_routing_decision(state)
            
            if i < len(expected_order):
                expected_next = f"{expected_order[i]}_agent"
                actual_next = routing_decision["next_node"]
                
                test_result["execution_order"].append({
                    "step": i + 1,
                    "completed_domains": completed_domains,
                    "expected_next": expected_next,
                    "actual_next": actual_next,
                    "status": "passed" if actual_next == expected_next else "failed"
                })
        
        # Check final completion
        final_state = create_initial_state("test_final", "192.168.1.100")
        final_state.update({
            "snowflake_data": {"test": "data"},
            "snowflake_completed": True,
            "tool_results": {"test_tool": {"result": "data"}},
            "domain_findings": {domain: {"result": "test"} for domain in expected_order},
            "domains_completed": expected_order
        })
        
        final_routing = await self.router.get_hybrid_routing_decision(final_state)
        
        test_result["execution_order"].append({
            "step": "final",
            "completed_domains": expected_order,
            "expected_next": "summary",
            "actual_next": final_routing["next_node"],
            "status": "passed" if final_routing["next_node"] == "summary" else "failed"
        })
        
        # Calculate overall status
        passed_steps = sum(1 for step in test_result["execution_order"] if step["status"] == "passed")
        total_steps = len(test_result["execution_order"])
        
        if passed_steps == total_steps:
            test_result["status"] = "passed"
            test_result["fixes_validated"].append("Sequential domain execution working correctly")
        else:
            test_result["status"] = "failed"
            test_result["issues_found"].append(f"Sequential execution issues: {passed_steps}/{total_steps} steps working")
        
        return test_result
    
    def _calculate_overall_status(self, tests: Dict[str, Any]) -> str:
        """Calculate overall test status."""
        
        statuses = [test["status"] for test in tests.values()]
        
        if all(status == "passed" for status in statuses):
            return "passed"
        elif any(status == "passed" for status in statuses):
            return "partial"
        else:
            return "failed"
    
    def _log_test_results(self, test_results: Dict[str, Any]) -> None:
        """Log comprehensive test results."""
        
        logger.info("🧪 ORCHESTRATION FIX VALIDATION RESULTS:")
        logger.info(f"   Overall Status: {test_results['overall_status'].upper()}")
        
        for test_name, test_data in test_results["tests"].items():
            status_emoji = {"passed": "✅", "partial": "⚠️", "failed": "❌"}[test_data["status"]]
            logger.info(f"   {status_emoji} {test_name}: {test_data['status']}")
            
            if test_data.get("fixes_validated"):
                for fix in test_data["fixes_validated"]:
                    logger.info(f"     💚 {fix}")
            
            if test_data.get("issues_found"):
                for issue in test_data["issues_found"]:
                    logger.error(f"     💥 {issue}")


async def test_orchestration_fixes():
    """
    Main function to test orchestration fixes.
    """
    
    logger.info("🚀 Starting Orchestration Fix Validation")
    
    # Set test mode
    os.environ["TEST_MODE"] = "mock"
    
    test_suite = OrchestrationTestSuite()
    results = await test_suite.run_comprehensive_tests()
    
    # Save results to file
    results_file = f"/tmp/orchestration_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    logger.info(f"📊 Test results saved to: {results_file}")
    
    return results


if __name__ == "__main__":
    asyncio.run(test_orchestration_fixes())