#!/usr/bin/env python
"""
Standalone Autonomous Investigation Test Runner

Runs comprehensive tests of the autonomous investigation system without pytest dependencies.
Tests all major scenarios with real API calls and comprehensive reporting.
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.service.agent.autonomous_agents import (
    autonomous_network_agent,
    autonomous_device_agent,
    autonomous_location_agent,
    autonomous_logs_agent,
    autonomous_risk_agent,
    cleanup_investigation_context,
)
from app.service.agent.autonomous_context import (
    AutonomousInvestigationContext,
    InvestigationPhase,
    DomainFindings,
    EntityType,
)
from app.service.agent.journey_tracker import (
    LangGraphJourneyTracker,
    NodeType,
    NodeStatus,
)
from langchain_core.runnables.config import RunnableConfig
from tests.fixtures.real_investigation_scenarios import (
    get_test_scenarios,
    get_scenario_by_type,
    RealScenarioGenerator,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


class AutonomousTestRunner:
    """Runs comprehensive autonomous investigation tests."""
    
    def __init__(self):
        self.results = {}
        self.generator = RealScenarioGenerator()
        self.journey_tracker = LangGraphJourneyTracker()
        
    async def test_full_investigation_lifecycle(self) -> Dict[str, Any]:
        """Test complete investigation from creation to completion."""
        logger.info("=" * 60)
        logger.info("TEST: Full Investigation Lifecycle")
        logger.info("=" * 60)
        
        # Create test context
        investigation_id = f"test_full_{datetime.now().timestamp()}"
        user_data = self.generator.generate_real_user_data("high_risk")
        entity_data = self.generator.generate_real_entity_data()
        behavioral_patterns = self.generator.generate_behavioral_patterns("abnormal")
        
        context = AutonomousInvestigationContext(
            investigation_id=investigation_id,
            entity_id=entity_data["entity_id"],
            entity_type=EntityType.USER_ID,
            investigation_type="fraud_investigation"
        )
        # Add additional data after initialization
        context.data_sources["user"] = user_data
        context.data_sources["entity"] = entity_data
        context.data_sources["behavioral"] = behavioral_patterns
        context.current_phase = InvestigationPhase.ANALYSIS
        
        # Initialize journey tracking
        journey_id = self.journey_tracker.start_journey(
            investigation_id=investigation_id,
            user_id=user_data["user_id"],
            metadata={"test": "full_lifecycle"}
        )
        
        config = RunnableConfig(
            tags=["test", "full_lifecycle"],
            metadata={"investigation_id": investigation_id, "journey_id": journey_id}
        )
        
        phases = {}
        start_time = time.time()
        
        try:
            # Phase 1: Network Analysis
            logger.info("Running Network Analysis...")
            phase_start = time.time()
            network_findings = await autonomous_network_agent(context, config)
            phases["network"] = {
                "duration": time.time() - phase_start,
                "findings": network_findings,
                "risk_score": network_findings.risk_score if network_findings else None
            }
            logger.info(f"✓ Network Analysis: risk_score={phases['network']['risk_score']:.2f}, duration={phases['network']['duration']:.2f}s")
            
            # Phase 2: Device Analysis
            logger.info("Running Device Analysis...")
            phase_start = time.time()
            device_findings = await autonomous_device_agent(context, config)
            phases["device"] = {
                "duration": time.time() - phase_start,
                "findings": device_findings,
                "risk_score": device_findings.risk_score if device_findings else None
            }
            logger.info(f"✓ Device Analysis: risk_score={phases['device']['risk_score']:.2f}, duration={phases['device']['duration']:.2f}s")
            
            # Phase 3: Location Analysis
            logger.info("Running Location Analysis...")
            phase_start = time.time()
            location_findings = await autonomous_location_agent(context, config)
            phases["location"] = {
                "duration": time.time() - phase_start,
                "findings": location_findings,
                "risk_score": location_findings.risk_score if location_findings else None
            }
            logger.info(f"✓ Location Analysis: risk_score={phases['location']['risk_score']:.2f}, duration={phases['location']['duration']:.2f}s")
            
            # Phase 4: Logs Analysis
            logger.info("Running Logs Analysis...")
            phase_start = time.time()
            logs_findings = await autonomous_logs_agent(context, config)
            phases["logs"] = {
                "duration": time.time() - phase_start,
                "findings": logs_findings,
                "risk_score": logs_findings.risk_score if logs_findings else None
            }
            logger.info(f"✓ Logs Analysis: risk_score={phases['logs']['risk_score']:.2f}, duration={phases['logs']['duration']:.2f}s")
            
            # Phase 5: Risk Aggregation
            logger.info("Running Risk Aggregation...")
            # Add domain findings to progress tracking
            context.progress.domain_findings = {
                "network": network_findings,
                "device": device_findings,
                "location": location_findings,
                "logs": logs_findings,
            }
            
            phase_start = time.time()
            final_risk = await autonomous_risk_agent(context, config)
            phases["risk_aggregation"] = {
                "duration": time.time() - phase_start,
                "findings": final_risk,
                "risk_score": final_risk.risk_score if final_risk else None
            }
            logger.info(f"✓ Risk Aggregation: final_risk={phases['risk_aggregation']['risk_score']:.2f}, duration={phases['risk_aggregation']['duration']:.2f}s")
            
            # Complete journey
            self.journey_tracker.complete_journey(
                journey_id,
                final_output={
                    "investigation_id": investigation_id,
                    "final_risk_score": final_risk.risk_score if final_risk else 0,
                    "status": "completed"
                }
            )
            
            total_duration = time.time() - start_time
            
            result = {
                "status": "PASSED",
                "duration": total_duration,
                "phases": phases,
                "final_risk_score": final_risk.risk_score if final_risk else 0,
                "confidence": final_risk.confidence if final_risk else 0,
            }
            
            logger.info(f"✅ TEST PASSED: Total duration={total_duration:.2f}s, Final risk={result['final_risk_score']:.2f}")
            
        except Exception as e:
            logger.error(f"❌ TEST FAILED: {str(e)}")
            result = {
                "status": "FAILED",
                "error": str(e),
                "duration": time.time() - start_time,
                "phases": phases
            }
            
        finally:
            cleanup_investigation_context(investigation_id)
            
        return result
    
    async def test_concurrent_investigations(self) -> Dict[str, Any]:
        """Test multiple concurrent investigations."""
        logger.info("=" * 60)
        logger.info("TEST: Concurrent Investigations")
        logger.info("=" * 60)
        
        num_concurrent = 3
        contexts = []
        
        # Create multiple investigation contexts
        for i in range(num_concurrent):
            user_data = self.generator.generate_real_user_data("normal")
            entity_data = self.generator.generate_real_entity_data()
            
            context = AutonomousInvestigationContext(
                investigation_id=f"concurrent_{i}_{datetime.now().timestamp()}",
                entity_id=entity_data["entity_id"],
                entity_type=EntityType.USER_ID,
                investigation_type="fraud_investigation"
            )
            context.data_sources["user"] = user_data
            context.data_sources["entity"] = entity_data
            context.current_phase = InvestigationPhase.ANALYSIS
            contexts.append(context)
        
        config = RunnableConfig(
            tags=["test", "concurrent"],
            metadata={"test_type": "concurrent_investigations"}
        )
        
        async def run_investigation(ctx):
            """Run a single investigation."""
            try:
                findings = await autonomous_network_agent(ctx, config)
                return {"status": "SUCCESS", "risk_score": findings.risk_score if findings else 0}
            except Exception as e:
                return {"status": "FAILED", "error": str(e)}
        
        # Execute concurrently
        start_time = time.time()
        logger.info(f"Running {num_concurrent} concurrent investigations...")
        results = await asyncio.gather(*[run_investigation(ctx) for ctx in contexts])
        total_time = time.time() - start_time
        
        # Analyze results
        successful = sum(1 for r in results if r["status"] == "SUCCESS")
        risk_scores = [r.get("risk_score", 0) for r in results if r["status"] == "SUCCESS"]
        
        result = {
            "status": "PASSED" if successful == num_concurrent else "FAILED",
            "duration": total_time,
            "total_investigations": num_concurrent,
            "successful": successful,
            "risk_scores": risk_scores,
            "average_risk": sum(risk_scores) / len(risk_scores) if risk_scores else 0
        }
        
        logger.info(f"{'✅' if result['status'] == 'PASSED' else '❌'} TEST {result['status']}: {successful}/{num_concurrent} succeeded in {total_time:.2f}s")
        
        # Cleanup
        for ctx in contexts:
            cleanup_investigation_context(ctx.investigation_id)
        
        return result
    
    async def test_account_takeover_detection(self) -> Dict[str, Any]:
        """Test detection of account takeover patterns."""
        logger.info("=" * 60)
        logger.info("TEST: Account Takeover Detection")
        logger.info("=" * 60)
        
        # Create ATO scenario
        scenario = get_scenario_by_type("account_takeover", "critical")
        
        context = AutonomousInvestigationContext(
            investigation_id=f"ato_test_{datetime.now().timestamp()}",
            entity_id=scenario.entity_data["entity_id"],
            entity_type=EntityType.USER_ID,
            investigation_type="fraud_investigation"
        )
        context.data_sources["user"] = scenario.user_data
        context.data_sources["entity"] = scenario.entity_data
        context.data_sources["behavioral"] = scenario.behavioral_patterns
        context.current_phase = InvestigationPhase.ANALYSIS
        
        config = RunnableConfig(
            tags=["test", "ato_detection"],
            metadata={"scenario_id": scenario.scenario_id}
        )
        
        start_time = time.time()
        
        try:
            # Run multi-domain analysis
            logger.info("Analyzing network patterns...")
            network_findings = await autonomous_network_agent(context, config)
            
            logger.info("Analyzing device patterns...")
            device_findings = await autonomous_device_agent(context, config)
            
            logger.info("Analyzing logs patterns...")
            logs_findings = await autonomous_logs_agent(context, config)
            
            # Risk aggregation
            context.progress.domain_findings = {
                "network": network_findings,
                "device": device_findings,
                "logs": logs_findings,
            }
            
            logger.info("Aggregating risk scores...")
            final_risk = await autonomous_risk_agent(context, config)
            
            # Check if ATO was detected
            ato_detected = final_risk.risk_score > 0.7 if final_risk else False
            
            result = {
                "status": "PASSED" if ato_detected else "FAILED",
                "duration": time.time() - start_time,
                "final_risk_score": final_risk.risk_score if final_risk else 0,
                "ato_detected": ato_detected,
                "confidence": final_risk.confidence if final_risk else 0
            }
            
            logger.info(f"{'✅' if ato_detected else '❌'} ATO Detection: risk_score={result['final_risk_score']:.2f}, detected={ato_detected}")
            
        except Exception as e:
            logger.error(f"❌ TEST FAILED: {str(e)}")
            result = {
                "status": "FAILED",
                "error": str(e),
                "duration": time.time() - start_time
            }
        
        finally:
            cleanup_investigation_context(context.investigation_id)
        
        return result
    
    async def test_performance_metrics(self) -> Dict[str, Any]:
        """Test and measure investigation performance."""
        logger.info("=" * 60)
        logger.info("TEST: Performance Metrics")
        logger.info("=" * 60)
        
        # Create test context
        user_data = self.generator.generate_real_user_data("normal")
        entity_data = self.generator.generate_real_entity_data()
        
        context = AutonomousInvestigationContext(
            investigation_id=f"perf_test_{datetime.now().timestamp()}",
            entity_id=entity_data["entity_id"],
            entity_type=EntityType.USER_ID,
            investigation_type="fraud_investigation"
        )
        context.data_sources["user"] = user_data
        context.data_sources["entity"] = entity_data
        context.current_phase = InvestigationPhase.ANALYSIS
        
        config = RunnableConfig(
            tags=["test", "performance"],
            metadata={"test": "performance_metrics"}
        )
        
        metrics = {"agent_timings": {}}
        
        # Test each agent's performance
        agents_to_test = [
            ("network", autonomous_network_agent),
            ("device", autonomous_device_agent),
            ("location", autonomous_location_agent),
            ("logs", autonomous_logs_agent),
        ]
        
        for agent_name, agent_func in agents_to_test:
            logger.info(f"Testing {agent_name} agent performance...")
            start_time = time.time()
            
            try:
                findings = await agent_func(context, config)
                duration = time.time() - start_time
                metrics["agent_timings"][agent_name] = {
                    "duration": duration,
                    "status": "SUCCESS",
                    "risk_score": findings.risk_score if findings else 0
                }
                logger.info(f"✓ {agent_name}: {duration:.2f}s")
            except Exception as e:
                metrics["agent_timings"][agent_name] = {
                    "duration": time.time() - start_time,
                    "status": "FAILED",
                    "error": str(e)
                }
                logger.error(f"✗ {agent_name}: FAILED - {str(e)}")
        
        # Calculate aggregated metrics
        successful = sum(1 for a in metrics["agent_timings"].values() if a["status"] == "SUCCESS")
        total_time = sum(a["duration"] for a in metrics["agent_timings"].values())
        average_time = total_time / len(metrics["agent_timings"]) if metrics["agent_timings"] else 0
        
        result = {
            "status": "PASSED" if successful == len(agents_to_test) else "FAILED",
            "total_agents": len(agents_to_test),
            "successful": successful,
            "total_time": total_time,
            "average_time": average_time,
            "agent_timings": metrics["agent_timings"]
        }
        
        logger.info(f"{'✅' if result['status'] == 'PASSED' else '❌'} Performance Test: {successful}/{len(agents_to_test)} agents succeeded")
        logger.info(f"Total time: {total_time:.2f}s, Average: {average_time:.2f}s")
        
        cleanup_investigation_context(context.investigation_id)
        return result
    
    async def run_all_tests(self):
        """Run all autonomous investigation tests."""
        logger.info("=" * 60)
        logger.info("AUTONOMOUS INVESTIGATION TEST SUITE")
        logger.info("=" * 60)
        logger.info(f"Starting at: {datetime.now().isoformat()}")
        logger.info("")
        
        test_suite = [
            ("Full Investigation Lifecycle", self.test_full_investigation_lifecycle),
            ("Concurrent Investigations", self.test_concurrent_investigations),
            ("Account Takeover Detection", self.test_account_takeover_detection),
            ("Performance Metrics", self.test_performance_metrics),
        ]
        
        all_results = {}
        total_start = time.time()
        
        for test_name, test_func in test_suite:
            try:
                result = await test_func()
                all_results[test_name] = result
                await asyncio.sleep(1)  # Brief pause between tests
            except Exception as e:
                logger.error(f"Failed to run {test_name}: {str(e)}")
                all_results[test_name] = {
                    "status": "ERROR",
                    "error": str(e)
                }
            
            logger.info("")  # Blank line between tests
        
        # Generate summary report
        total_duration = time.time() - total_start
        
        logger.info("=" * 60)
        logger.info("TEST SUMMARY REPORT")
        logger.info("=" * 60)
        
        passed = sum(1 for r in all_results.values() if r.get("status") == "PASSED")
        failed = sum(1 for r in all_results.values() if r.get("status") == "FAILED")
        errors = sum(1 for r in all_results.values() if r.get("status") == "ERROR")
        
        logger.info(f"Total Tests: {len(all_results)}")
        logger.info(f"Passed: {passed}")
        logger.info(f"Failed: {failed}")
        logger.info(f"Errors: {errors}")
        logger.info(f"Total Duration: {total_duration:.2f}s")
        logger.info("")
        
        logger.info("Individual Test Results:")
        for test_name, result in all_results.items():
            status = result.get("status", "UNKNOWN")
            duration = result.get("duration", 0)
            symbol = "✅" if status == "PASSED" else "❌" if status == "FAILED" else "⚠️"
            logger.info(f"{symbol} {test_name}: {status} ({duration:.2f}s)")
            
            if status == "FAILED" and "error" in result:
                logger.info(f"   Error: {result['error']}")
        
        logger.info("")
        logger.info(f"Completed at: {datetime.now().isoformat()}")
        
        # Save detailed report to file
        report_filename = f"test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_filename, 'w') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "total_duration": total_duration,
                "summary": {
                    "total": len(all_results),
                    "passed": passed,
                    "failed": failed,
                    "errors": errors
                },
                "results": all_results
            }, f, indent=2, default=str)
        
        logger.info(f"Detailed report saved to: {report_filename}")
        
        return all_results


async def main():
    """Main entry point."""
    runner = AutonomousTestRunner()
    results = await runner.run_all_tests()
    
    # Exit with appropriate code
    if all(r.get("status") == "PASSED" for r in results.values()):
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())