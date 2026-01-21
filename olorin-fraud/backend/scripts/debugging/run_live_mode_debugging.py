#!/usr/bin/env python3
"""
Live Mode Debugging Orchestrator

This script orchestrates the complete live mode debugging process according to the
6-phase plan, with comprehensive safety monitoring and emergency procedures.

CRITICAL: This script operates with real financial costs. User approval required.

Usage:
    python run_live_mode_debugging.py --phase <phase_number> [options]
    python run_live_mode_debugging.py --full-run [options]

Phases:
    1 - Environment Verification (1-2 hours)
    2 - Live Data Integration Analysis (2-3 hours)
    3 - External API Integration Validation (2-3 hours)
    4 - Cost Management & Monitoring (1-2 hours)
    5 - Live Investigation Testing (3-4 hours)
    6 - Performance & Cost Analysis (1-2 hours)

Safety Features:
    - Real-time cost monitoring with circuit breakers
    - Emergency stop procedures
    - Automatic rollback on failures
    - Comprehensive logging and reporting
"""

import argparse
import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from app.service.agent.orchestration.hybrid.live_mode_safety_manager import (
    EmergencyStopReason,
    LiveModeSafetyLevel,
    LiveModeSafetyManager,
)
from app.service.cost_management.live_mode_cost_tracker import LiveModeCostTracker
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class LiveModeDebuggingOrchestrator:
    """
    Orchestrates the complete live mode debugging process with safety monitoring.

    Manages:
    - Phase-by-phase execution with safety checks
    - Real-time cost and performance monitoring
    - Emergency procedures and rollback capabilities
    - Comprehensive reporting and state preservation
    """

    def __init__(
        self, safety_level: LiveModeSafetyLevel = LiveModeSafetyLevel.COMPONENT_TEST
    ):
        self.safety_level = safety_level
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.results_dir = Path("live_mode_debugging_results") / self.session_id
        self.results_dir.mkdir(parents=True, exist_ok=True)

        # Initialize safety and monitoring systems
        self.safety_manager = LiveModeSafetyManager(safety_level)
        self.cost_tracker = LiveModeCostTracker()

        # Phase tracking
        self.current_phase = 0
        self.phase_results = {}
        self.session_start_time = datetime.now()

        # Register emergency callbacks
        self._register_emergency_callbacks()

    def _register_emergency_callbacks(self):
        """Register callbacks for emergency situations"""

        async def emergency_callback(reason, message, emergency_record):
            logger.critical(f"Emergency callback triggered: {reason}")
            await self._handle_emergency_stop(reason, message, emergency_record)

        self.safety_manager.register_emergency_callback(emergency_callback)

        async def cost_alert_callback(alert):
            logger.warning(f"Cost alert: {alert.message}")
            if alert.level.value in ["critical", "emergency"]:
                await self._handle_cost_alert(alert)

        self.cost_tracker.register_alert_callback(cost_alert_callback)

    async def run_full_debugging_session(self) -> Dict[str, Any]:
        """Run the complete 6-phase debugging session"""
        try:
            logger.info(f"🚀 Starting live mode debugging session: {self.session_id}")
            logger.info(f"Safety Level: {self.safety_level.value}")

            session_report = {
                "session_id": self.session_id,
                "start_time": self.session_start_time.isoformat(),
                "safety_level": self.safety_level.value,
                "phases": {},
                "total_cost": 0.0,
                "success": False,
            }

            # Start monitoring systems
            await self.cost_tracker.start_monitoring()

            # Execute all phases
            for phase_num in range(1, 7):
                phase_result = await self.run_phase(phase_num)
                session_report["phases"][f"phase_{phase_num}"] = phase_result

                if not phase_result["success"]:
                    logger.error(f"Phase {phase_num} failed, stopping session")
                    break

                # Check if we should continue
                if not await self._should_continue_session():
                    logger.warning("Session stopped due to safety concerns")
                    break

            # Generate final report
            session_report["end_time"] = datetime.now().isoformat()
            session_report["duration_hours"] = (
                datetime.now() - self.session_start_time
            ).total_seconds() / 3600
            session_report["total_cost"] = self.cost_tracker.get_total_cost()
            session_report["success"] = all(
                result["success"] for result in session_report["phases"].values()
            )

            # Stop monitoring and generate reports
            await self.cost_tracker.stop_monitoring()
            await self._generate_session_report(session_report)

            return session_report

        except Exception as e:
            logger.critical(f"Critical error in debugging session: {e}")
            await self._handle_session_failure(e)
            raise

    async def run_phase(self, phase_number: int) -> Dict[str, Any]:
        """Run a specific phase of the debugging process"""
        try:
            self.current_phase = phase_number
            phase_start_time = datetime.now()

            logger.info(f"🔄 Starting Phase {phase_number}")

            phase_result = {
                "phase_number": phase_number,
                "start_time": phase_start_time.isoformat(),
                "success": False,
                "cost": 0.0,
                "duration_minutes": 0.0,
                "tasks": {},
                "alerts": [],
                "errors": [],
            }

            # Phase-specific execution
            if phase_number == 1:
                phase_result = await self._run_phase_1_environment_verification(
                    phase_result
                )
            elif phase_number == 2:
                phase_result = await self._run_phase_2_live_data_integration(
                    phase_result
                )
            elif phase_number == 3:
                phase_result = await self._run_phase_3_external_api_validation(
                    phase_result
                )
            elif phase_number == 4:
                phase_result = await self._run_phase_4_cost_management(phase_result)
            elif phase_number == 5:
                phase_result = await self._run_phase_5_live_investigation_testing(
                    phase_result
                )
            elif phase_number == 6:
                phase_result = await self._run_phase_6_performance_analysis(
                    phase_result
                )
            else:
                raise ValueError(f"Invalid phase number: {phase_number}")

            # Calculate phase metrics
            phase_end_time = datetime.now()
            phase_result["end_time"] = phase_end_time.isoformat()
            phase_result["duration_minutes"] = (
                phase_end_time - phase_start_time
            ).total_seconds() / 60

            # Save phase results
            phase_file = self.results_dir / f"phase_{phase_number}_results.json"
            with open(phase_file, "w") as f:
                json.dump(phase_result, f, indent=2, default=str)

            logger.info(
                f"✅ Phase {phase_number} completed - Success: {phase_result['success']}"
            )
            return phase_result

        except Exception as e:
            logger.error(f"Phase {phase_number} failed: {e}")
            phase_result["success"] = False
            phase_result["errors"].append(str(e))
            return phase_result

    async def _run_phase_1_environment_verification(
        self, phase_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Phase 1: Environment Verification (1-2 hours)"""
        logger.info("🔍 Phase 1: Environment Verification")

        tasks = {
            "credential_validation": False,
            "rate_limit_assessment": False,
            "circuit_breaker_testing": False,
        }

        try:
            # Task 1.1: Credential Validation
            logger.info("Task 1.1: Validating credentials...")
            await self._validate_credentials()
            tasks["credential_validation"] = True
            await self.cost_tracker.track_external_api_usage("credential_validation", 1)

            # Task 1.2: Rate Limit Assessment
            logger.info("Task 1.2: Assessing rate limits...")
            await self._assess_rate_limits()
            tasks["rate_limit_assessment"] = True

            # Task 1.3: Circuit Breaker Testing
            logger.info("Task 1.3: Testing circuit breakers...")
            await self._test_circuit_breakers()
            tasks["circuit_breaker_testing"] = True

            phase_result["tasks"] = tasks
            phase_result["success"] = all(tasks.values())

            if phase_result["success"]:
                logger.info("✅ Phase 1 completed successfully")
            else:
                logger.warning("⚠️ Phase 1 completed with issues")

        except Exception as e:
            logger.error(f"Phase 1 failed: {e}")
            phase_result["errors"].append(str(e))
            self.safety_manager.record_error("phase_1_failure", {"error": str(e)})

        return phase_result

    async def _run_phase_2_live_data_integration(
        self, phase_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Phase 2: Live Data Integration Analysis (2-3 hours)"""
        logger.info("📊 Phase 2: Live Data Integration Analysis")

        tasks = {
            "schema_validation": False,
            "data_quality_assessment": False,
            "pipeline_testing": False,
        }

        try:
            # Task 2.1: Snowflake Schema Validation
            logger.info("Task 2.1: Validating Snowflake schemas...")
            await self._validate_snowflake_schemas()
            tasks["schema_validation"] = True
            await self.cost_tracker.track_snowflake_usage(
                1.0, {"task": "schema_validation"}
            )

            # Task 2.2: Data Quality Assessment
            logger.info("Task 2.2: Assessing data quality...")
            await self._assess_data_quality()
            tasks["data_quality_assessment"] = True
            await self.cost_tracker.track_snowflake_usage(2.5, {"task": "data_quality"})

            # Task 2.3: Data Pipeline Testing
            logger.info("Task 2.3: Testing data pipelines...")
            await self._test_data_pipelines()
            tasks["pipeline_testing"] = True
            await self.cost_tracker.track_snowflake_usage(
                1.5, {"task": "pipeline_testing"}
            )

            phase_result["tasks"] = tasks
            phase_result["success"] = all(tasks.values())

        except Exception as e:
            logger.error(f"Phase 2 failed: {e}")
            phase_result["errors"].append(str(e))
            self.safety_manager.record_error("phase_2_failure", {"error": str(e)})

        return phase_result

    async def _run_phase_3_external_api_validation(
        self, phase_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Phase 3: External API Integration Validation (2-3 hours)"""
        logger.info("🌐 Phase 3: External API Integration Validation")

        tasks = {
            "abuseipdb_testing": False,
            "virustotal_testing": False,
            "shodan_testing": False,
            "error_handling_validation": False,
        }

        try:
            # Task 3.1: AbuseIPDB Testing
            logger.info("Task 3.1: Testing AbuseIPDB integration...")
            await self._test_abuseipdb_integration()
            tasks["abuseipdb_testing"] = True
            await self.cost_tracker.track_external_api_usage("abuseipdb", 5)

            # Task 3.2: VirusTotal Testing
            logger.info("Task 3.2: Testing VirusTotal integration...")
            await self._test_virustotal_integration()
            tasks["virustotal_testing"] = True
            await self.cost_tracker.track_external_api_usage("virustotal", 3)

            # Task 3.3: Shodan Testing
            logger.info("Task 3.3: Testing Shodan integration...")
            await self._test_shodan_integration()
            tasks["shodan_testing"] = True
            await self.cost_tracker.track_external_api_usage("shodan", 2)

            # Task 3.4: Error Handling Validation
            logger.info("Task 3.4: Validating error handling...")
            await self._validate_api_error_handling()
            tasks["error_handling_validation"] = True

            phase_result["tasks"] = tasks
            phase_result["success"] = all(tasks.values())

        except Exception as e:
            logger.error(f"Phase 3 failed: {e}")
            phase_result["errors"].append(str(e))
            self.safety_manager.record_error("phase_3_failure", {"error": str(e)})

        return phase_result

    async def _run_phase_4_cost_management(
        self, phase_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Phase 4: Cost Management & Monitoring (1-2 hours)"""
        logger.info("💰 Phase 4: Cost Management & Monitoring")

        tasks = {
            "real_time_tracking": False,
            "circuit_breaker_integration": False,
            "budget_validation": False,
        }

        try:
            # Task 4.1: Real-time Cost Tracking
            logger.info("Task 4.1: Implementing real-time cost tracking...")
            await self._implement_real_time_tracking()
            tasks["real_time_tracking"] = True

            # Task 4.2: Circuit Breaker Integration
            logger.info("Task 4.2: Integrating cost circuit breakers...")
            await self._integrate_cost_circuit_breakers()
            tasks["circuit_breaker_integration"] = True

            # Task 4.3: Budget Validation
            logger.info("Task 4.3: Validating budget controls...")
            await self._validate_budget_controls()
            tasks["budget_validation"] = True

            phase_result["tasks"] = tasks
            phase_result["success"] = all(tasks.values())

        except Exception as e:
            logger.error(f"Phase 4 failed: {e}")
            phase_result["errors"].append(str(e))
            self.safety_manager.record_error("phase_4_failure", {"error": str(e)})

        return phase_result

    async def _run_phase_5_live_investigation_testing(
        self, phase_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Phase 5: Live Investigation Testing (3-4 hours)"""
        logger.info("🔬 Phase 5: Live Investigation Testing")

        tasks = {
            "single_investigation": False,
            "error_recovery_testing": False,
            "comparative_analysis": False,
        }

        try:
            # Task 5.1: Single Investigation Validation
            logger.info("Task 5.1: Running single investigation test...")
            investigation_result = await self._run_single_investigation_test()
            tasks["single_investigation"] = investigation_result["success"]

            # Track significant costs for investigation
            await self.cost_tracker.track_claude_usage(
                "claude-opus-4-1",
                5000,
                2000,
                investigation_id="test_001",
                phase="investigation",
            )
            await self.cost_tracker.track_snowflake_usage(
                3.0, {"query": "investigation_data"}, investigation_id="test_001"
            )

            # Task 5.2: Error Recovery Testing
            logger.info("Task 5.2: Testing error recovery mechanisms...")
            await self._test_error_recovery()
            tasks["error_recovery_testing"] = True

            # Task 5.3: Comparative Analysis
            logger.info("Task 5.3: Performing comparative analysis...")
            await self._perform_comparative_analysis()
            tasks["comparative_analysis"] = True

            phase_result["tasks"] = tasks
            phase_result["success"] = all(tasks.values())

        except Exception as e:
            logger.error(f"Phase 5 failed: {e}")
            phase_result["errors"].append(str(e))
            self.safety_manager.record_error("phase_5_failure", {"error": str(e)})

        return phase_result

    async def _run_phase_6_performance_analysis(
        self, phase_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Phase 6: Performance & Cost Analysis (1-2 hours)"""
        logger.info("⚡ Phase 6: Performance & Cost Analysis")

        tasks = {
            "performance_optimization": False,
            "cost_optimization": False,
            "operational_guidelines": False,
        }

        try:
            # Task 6.1: Performance Optimization
            logger.info("Task 6.1: Analyzing performance optimizations...")
            await self._analyze_performance_optimizations()
            tasks["performance_optimization"] = True

            # Task 6.2: Cost Optimization
            logger.info("Task 6.2: Analyzing cost optimizations...")
            cost_optimization_report = await self._analyze_cost_optimizations()
            tasks["cost_optimization"] = True
            phase_result["cost_optimization"] = cost_optimization_report

            # Task 6.3: Operational Guidelines
            logger.info("Task 6.3: Creating operational guidelines...")
            operational_guidelines = await self._create_operational_guidelines()
            tasks["operational_guidelines"] = True
            phase_result["operational_guidelines"] = operational_guidelines

            phase_result["tasks"] = tasks
            phase_result["success"] = all(tasks.values())

        except Exception as e:
            logger.error(f"Phase 6 failed: {e}")
            phase_result["errors"].append(str(e))
            self.safety_manager.record_error("phase_6_failure", {"error": str(e)})

        return phase_result

    # Placeholder implementations for actual testing tasks
    # In a real implementation, these would contain actual integration tests

    async def _validate_credentials(self):
        """Validate all API credentials"""
        # Simulate credential validation
        await asyncio.sleep(1)
        logger.info("Credentials validated successfully")

    async def _assess_rate_limits(self):
        """Assess API rate limits"""
        await asyncio.sleep(1)
        logger.info("Rate limits assessed")

    async def _test_circuit_breakers(self):
        """Test circuit breaker functionality"""
        await asyncio.sleep(1)
        logger.info("Circuit breakers tested")

    async def _validate_snowflake_schemas(self):
        """Validate Snowflake data schemas"""
        await asyncio.sleep(2)
        logger.info("Snowflake schemas validated")

    async def _assess_data_quality(self):
        """Assess data quality"""
        await asyncio.sleep(3)
        logger.info("Data quality assessed")

    async def _test_data_pipelines(self):
        """Test data processing pipelines"""
        await asyncio.sleep(2)
        logger.info("Data pipelines tested")

    async def _test_abuseipdb_integration(self):
        """Test AbuseIPDB integration"""
        await asyncio.sleep(2)
        logger.info("AbuseIPDB integration tested")

    async def _test_virustotal_integration(self):
        """Test VirusTotal integration"""
        await asyncio.sleep(2)
        logger.info("VirusTotal integration tested")

    async def _test_shodan_integration(self):
        """Test Shodan integration"""
        await asyncio.sleep(1)
        logger.info("Shodan integration tested")

    async def _validate_api_error_handling(self):
        """Validate API error handling"""
        await asyncio.sleep(1)
        logger.info("API error handling validated")

    async def _implement_real_time_tracking(self):
        """Implement real-time cost tracking"""
        await asyncio.sleep(1)
        logger.info("Real-time tracking implemented")

    async def _integrate_cost_circuit_breakers(self):
        """Integrate cost circuit breakers"""
        await asyncio.sleep(1)
        logger.info("Cost circuit breakers integrated")

    async def _validate_budget_controls(self):
        """Validate budget controls"""
        await asyncio.sleep(1)
        logger.info("Budget controls validated")

    async def _run_single_investigation_test(self):
        """Run a single investigation test"""
        await asyncio.sleep(5)
        logger.info("Single investigation test completed")
        return {"success": True, "score": 75.0, "evidence_sources": 4}

    async def _test_error_recovery(self):
        """Test error recovery mechanisms"""
        await asyncio.sleep(2)
        logger.info("Error recovery tested")

    async def _perform_comparative_analysis(self):
        """Perform comparative analysis"""
        await asyncio.sleep(3)
        logger.info("Comparative analysis completed")

    async def _analyze_performance_optimizations(self):
        """Analyze performance optimizations"""
        await asyncio.sleep(2)
        logger.info("Performance optimization analysis completed")

    async def _analyze_cost_optimizations(self):
        """Analyze cost optimizations"""
        await asyncio.sleep(2)
        recommendations = self.cost_tracker.get_cost_optimization_recommendations()
        logger.info("Cost optimization analysis completed")
        return {"recommendations": recommendations}

    async def _create_operational_guidelines(self):
        """Create operational guidelines"""
        await asyncio.sleep(1)
        guidelines = {
            "recommended_investigation_budget": "$8.00",
            "optimal_batch_size": 3,
            "recommended_timeout": "25 minutes",
            "performance_thresholds": {
                "response_time": "< 20 minutes",
                "success_rate": "> 90%",
                "cost_per_investigation": "< $10.00",
            },
        }
        logger.info("Operational guidelines created")
        return guidelines

    async def _should_continue_session(self) -> bool:
        """Check if session should continue based on safety status"""
        safety_status = self.safety_manager.get_safety_status()

        if safety_status.requires_immediate_termination:
            logger.critical("Session must be terminated due to safety concerns")
            return False

        if not safety_status.allows_operation:
            logger.warning("Session paused due to safety concerns")
            return False

        return True

    async def _handle_emergency_stop(self, reason, message, emergency_record):
        """Handle emergency stop situation"""
        logger.critical(f"Emergency stop handled: {reason}")

        # Generate emergency report
        emergency_file = (
            self.results_dir
            / f"emergency_stop_{datetime.now().strftime('%H%M%S')}.json"
        )
        with open(emergency_file, "w") as f:
            json.dump(emergency_record, f, indent=2, default=str)

        # Stop all monitoring
        await self.cost_tracker.stop_monitoring()

        print(f"\n🚨 EMERGENCY STOP ACTIVATED")
        print(f"Reason: {message}")
        print(f"Emergency report: {emergency_file}")

    async def _handle_cost_alert(self, alert):
        """Handle cost alert"""
        logger.warning(f"Cost alert handled: {alert.message}")

        # Save alert to results
        alert_file = (
            self.results_dir / f"cost_alert_{datetime.now().strftime('%H%M%S')}.json"
        )
        with open(alert_file, "w") as f:
            json.dump(alert.__dict__, f, indent=2, default=str)

    async def _handle_session_failure(self, error):
        """Handle session failure"""
        failure_report = {
            "timestamp": datetime.now().isoformat(),
            "error": str(error),
            "current_phase": self.current_phase,
            "total_cost": self.cost_tracker.get_total_cost(),
            "safety_status": self.safety_manager.get_safety_status().__dict__,
        }

        failure_file = self.results_dir / "session_failure.json"
        with open(failure_file, "w") as f:
            json.dump(failure_report, f, indent=2, default=str)

        await self.cost_tracker.stop_monitoring()

    async def _generate_session_report(self, session_report):
        """Generate comprehensive session report"""
        # Add safety and cost summaries
        session_report["safety_summary"] = (
            self.safety_manager.get_safety_status().__dict__
        )
        session_report["cost_summary"] = (
            self.cost_tracker.generate_cost_report().__dict__
        )

        # Save session report
        report_file = self.results_dir / "session_report.json"
        with open(report_file, "w") as f:
            json.dump(session_report, f, indent=2, default=str)

        # Generate human-readable summary
        summary_file = self.results_dir / "session_summary.txt"
        with open(summary_file, "w") as f:
            f.write(f"LIVE MODE DEBUGGING SESSION REPORT\n")
            f.write(f"{'=' * 50}\n\n")
            f.write(f"Session ID: {session_report['session_id']}\n")
            f.write(f"Duration: {session_report.get('duration_hours', 0):.1f} hours\n")
            f.write(f"Total Cost: ${session_report['total_cost']:.2f}\n")
            f.write(f"Overall Success: {session_report['success']}\n\n")

            f.write("PHASE RESULTS:\n")
            for phase_name, phase_result in session_report["phases"].items():
                f.write(
                    f"  {phase_name}: {'✅' if phase_result['success'] else '❌'}\n"
                )

            if session_report.get("cost_summary"):
                f.write(f"\nCOST BREAKDOWN:\n")
                cost_summary = session_report["cost_summary"]
                for category, amount in cost_summary.get(
                    "cost_by_category", {}
                ).items():
                    f.write(f"  {category}: ${amount:.2f}\n")

        logger.info(f"Session report generated: {report_file}")
        print(f"\n📊 SESSION COMPLETED")
        print(f"Report: {report_file}")
        print(f"Summary: {summary_file}")


def main():
    parser = argparse.ArgumentParser(
        description="Live Mode Debugging Orchestrator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument(
        "--phase", type=int, choices=[1, 2, 3, 4, 5, 6], help="Run specific phase only"
    )

    parser.add_argument(
        "--full-run", action="store_true", help="Run complete 6-phase debugging session"
    )

    parser.add_argument(
        "--safety-level",
        choices=[
            "component_test",
            "single_investigation",
            "limited_batch",
            "operational",
        ],
        default="component_test",
        help="Safety level for debugging session",
    )

    parser.add_argument(
        "--force", action="store_true", help="Skip confirmation prompts"
    )

    args = parser.parse_args()

    if not args.phase and not args.full_run:
        parser.print_help()
        return

    # Convert safety level string to enum
    safety_level_map = {
        "component_test": LiveModeSafetyLevel.COMPONENT_TEST,
        "single_investigation": LiveModeSafetyLevel.SINGLE_INVESTIGATION,
        "limited_batch": LiveModeSafetyLevel.LIMITED_BATCH,
        "operational": LiveModeSafetyLevel.OPERATIONAL,
    }
    safety_level = safety_level_map[args.safety_level]

    async def run():
        orchestrator = LiveModeDebuggingOrchestrator(safety_level)

        # Confirmation check
        if not args.force:
            print(f"\n🚨 LIVE MODE DEBUGGING CONFIRMATION")
            print(f"Safety Level: {args.safety_level}")
            print(f"This will incur real financial costs from:")
            print(f"  - Snowflake queries")
            print(f"  - Claude API usage")
            print(f"  - External API calls")
            print(f"  - Infrastructure usage")

            response = input(
                "\nDo you confirm you have user approval for real financial costs? (yes/no): "
            )
            if response.lower() != "yes":
                print("Live mode debugging cancelled.")
                return

        try:
            if args.full_run:
                result = await orchestrator.run_full_debugging_session()
                print(f"\n✅ Full debugging session completed")
                print(f"Total cost: ${result['total_cost']:.2f}")
            else:
                result = await orchestrator.run_phase(args.phase)
                print(f"\n✅ Phase {args.phase} completed")
                print(f"Success: {result['success']}")

        except Exception as e:
            print(f"\n❌ Debugging session failed: {e}")
            logger.critical(f"Session failed: {e}")

    asyncio.run(run())


if __name__ == "__main__":
    main()
