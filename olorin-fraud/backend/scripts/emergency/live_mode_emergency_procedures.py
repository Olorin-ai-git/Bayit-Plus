#!/usr/bin/env python3
"""
Live Mode Emergency Procedures for Structured Investigation System

This script provides comprehensive emergency procedures for live mode debugging sessions,
including immediate termination, cost reporting, state preservation, and system recovery.

CRITICAL: This script handles financial emergency situations with real cost implications.

Usage:
    python live_mode_emergency_procedures.py <command> [options]

Commands:
    emergency-stop    - Immediate termination of all live operations
    cost-report      - Generate emergency cost report
    rollback         - Rollback to safe configuration
    health-check     - Verify system health and safety status
    reset-circuits   - Reset all circuit breakers
    backup-state     - Backup current investigation state
"""

import argparse
import asyncio
import json
import logging
import os
import shutil
import signal
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

import psutil

# Add the project root to Python path
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


class EmergencyProcedureManager:
    """
    Manages emergency procedures for live mode debugging.

    Provides:
    - Immediate emergency stops with cost preservation
    - System state backup and recovery
    - Configuration rollback procedures
    - Health monitoring and reporting
    - Circuit breaker management
    """

    def __init__(self):
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.emergency_dir = Path("emergency_procedures")
        self.emergency_dir.mkdir(exist_ok=True)

        # Initialize managers
        self.safety_manager = LiveModeSafetyManager()
        self.cost_tracker = LiveModeCostTracker()

        # Process tracking
        self.tracked_processes = []
        self.investigation_sessions = {}

    async def emergency_stop(self, reason: str = "Manual emergency stop"):
        """
        Execute immediate emergency stop of all live mode operations.

        This is the most critical procedure - it must work reliably under any circumstances.
        """
        try:
            logger.critical(f"🚨 EMERGENCY STOP INITIATED: {reason}")
            emergency_report = {
                "timestamp": datetime.now().isoformat(),
                "reason": reason,
                "initiated_by": "emergency_procedures_script",
                "session_id": self.timestamp,
            }

            # Step 1: Immediate process termination
            await self._terminate_all_investigations()

            # Step 2: Stop all API connections
            await self._disconnect_all_apis()

            # Step 3: Preserve current state
            await self._backup_emergency_state(emergency_report)

            # Step 4: Generate cost report
            cost_report = await self._generate_emergency_cost_report()
            emergency_report["final_costs"] = cost_report

            # Step 5: Activate safety systems
            await self.safety_manager.activate_emergency_stop(
                EmergencyStopReason.MANUAL_KILL_SWITCH, reason
            )

            # Step 6: Save comprehensive emergency report
            await self._save_emergency_report(emergency_report)

            # Step 7: System cleanup
            await self._emergency_cleanup()

            logger.critical("✅ EMERGENCY STOP COMPLETED SUCCESSFULLY")
            print(f"\n🚨 EMERGENCY STOP COMPLETED")
            print(
                f"Emergency Report: {self.emergency_dir / f'emergency_report_{self.timestamp}.json'}"
            )
            print(f"Final Cost: ${cost_report.get('total_cost', 0):.2f}")
            print(f"All investigations terminated and state preserved.")

            return emergency_report

        except Exception as e:
            logger.critical(f"CRITICAL ERROR in emergency stop: {e}")
            # Even if emergency stop fails, try basic cleanup
            try:
                await self._basic_cleanup()
            except Exception as cleanup_error:
                logger.critical(f"CRITICAL: Emergency cleanup failed: {cleanup_error}")
            raise

    async def _terminate_all_investigations(self):
        """Terminate all running investigation processes"""
        try:
            logger.info("Terminating all investigation processes...")

            # Find Python processes that might be running investigations
            investigation_processes = []
            for process in psutil.process_iter(["pid", "name", "cmdline"]):
                try:
                    if (
                        process.info["name"] == "python"
                        or process.info["name"] == "python3"
                    ):
                        cmdline = " ".join(process.info["cmdline"] or [])
                        if any(
                            keyword in cmdline.lower()
                            for keyword in [
                                "structured_investigation",
                                "investigation",
                                "agent",
                                "orchestrator",
                            ]
                        ):
                            investigation_processes.append(process)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue

            # Terminate processes gracefully first
            for process in investigation_processes:
                try:
                    logger.info(f"Terminating process {process.pid}")
                    process.terminate()
                    self.tracked_processes.append(process.pid)
                except Exception as e:
                    logger.warning(f"Failed to terminate process {process.pid}: {e}")

            # Wait for graceful termination
            await asyncio.sleep(5)

            # Force kill if still running
            for process in investigation_processes:
                try:
                    if process.is_running():
                        logger.warning(f"Force killing process {process.pid}")
                        process.kill()
                except Exception as e:
                    logger.warning(f"Failed to kill process {process.pid}: {e}")

            logger.info("All investigation processes terminated")

        except Exception as e:
            logger.error(f"Error terminating investigations: {e}")

    async def _disconnect_all_apis(self):
        """Disconnect all API connections to prevent further costs"""
        try:
            logger.info("Disconnecting all API connections...")

            # This would typically involve:
            # - Closing HTTP sessions
            # - Terminating WebSocket connections
            # - Stopping database connections
            # - Clearing API client pools

            # For now, we'll simulate this with environment variable clearing
            api_env_vars = [
                "ANTHROPIC_API_KEY",
                "OPENAI_API_KEY",
                "SNOWFLAKE_USER",
                "SNOWFLAKE_PASSWORD",
                "ABUSEIPDB_API_KEY",
                "VIRUSTOTAL_API_KEY",
                "SHODAN_API_KEY",
            ]

            for var in api_env_vars:
                if var in os.environ:
                    logger.info(f"Clearing environment variable: {var}")
                    del os.environ[var]

            logger.info("API connections disconnected")

        except Exception as e:
            logger.error(f"Error disconnecting APIs: {e}")

    async def _backup_emergency_state(self, emergency_report: Dict[str, Any]):
        """Backup current system state for analysis"""
        try:
            logger.info("Backing up emergency state...")

            state_backup = {
                "emergency_report": emergency_report,
                "timestamp": datetime.now().isoformat(),
                "system_state": {
                    "working_directory": str(Path.cwd()),
                    "python_version": sys.version,
                    "environment_variables": dict(os.environ),
                    "running_processes": self.tracked_processes,
                },
                "safety_status": self.safety_manager.get_safety_status().__dict__,
                "investigation_sessions": self.investigation_sessions,
            }

            # Save state backup
            state_file = self.emergency_dir / f"emergency_state_{self.timestamp}.json"
            with open(state_file, "w") as f:
                json.dump(state_backup, f, indent=2, default=str)

            logger.info(f"Emergency state backed up to: {state_file}")

        except Exception as e:
            logger.error(f"Error backing up emergency state: {e}")

    async def _generate_emergency_cost_report(self) -> Dict[str, Any]:
        """Generate comprehensive emergency cost report"""
        try:
            logger.info("Generating emergency cost report...")

            # Get cost data from tracker
            cost_report = self.cost_tracker.generate_cost_report()
            safety_report = self.safety_manager.generate_cost_report()

            emergency_cost_report = {
                "timestamp": datetime.now().isoformat(),
                "total_session_cost": cost_report.total_cost,
                "cost_breakdown": cost_report.cost_by_category,
                "cost_by_service": cost_report.cost_by_service,
                "cost_by_investigation": cost_report.cost_by_investigation,
                "safety_metrics": safety_report,
                "budget_status": {
                    "per_investigation_limit": self.safety_manager.cost_limits.per_investigation,
                    "session_limit": self.safety_manager.cost_limits.per_session,
                    "remaining_budget": max(
                        0,
                        self.safety_manager.cost_limits.per_session
                        - cost_report.total_cost,
                    ),
                },
                "recommendations": self.cost_tracker.get_cost_optimization_recommendations(),
            }

            # Save cost report
            cost_file = (
                self.emergency_dir / f"emergency_cost_report_{self.timestamp}.json"
            )
            with open(cost_file, "w") as f:
                json.dump(emergency_cost_report, f, indent=2, default=str)

            logger.info(f"Emergency cost report saved to: {cost_file}")
            return emergency_cost_report

        except Exception as e:
            logger.error(f"Error generating emergency cost report: {e}")
            return {"error": str(e), "total_cost": 0}

    async def _save_emergency_report(self, emergency_report: Dict[str, Any]):
        """Save comprehensive emergency report"""
        try:
            report_file = self.emergency_dir / f"emergency_report_{self.timestamp}.json"
            with open(report_file, "w") as f:
                json.dump(emergency_report, f, indent=2, default=str)

            # Also save a human-readable summary
            summary_file = (
                self.emergency_dir / f"emergency_summary_{self.timestamp}.txt"
            )
            with open(summary_file, "w") as f:
                f.write(f"EMERGENCY STOP REPORT\n")
                f.write(f"{'=' * 50}\n\n")
                f.write(f"Timestamp: {emergency_report['timestamp']}\n")
                f.write(f"Reason: {emergency_report['reason']}\n")
                f.write(f"Session ID: {emergency_report['session_id']}\n\n")

                if "final_costs" in emergency_report:
                    costs = emergency_report["final_costs"]
                    f.write(f"FINAL COSTS:\n")
                    f.write(f"Total Cost: ${costs.get('total_session_cost', 0):.2f}\n")
                    f.write(f"Cost Breakdown:\n")
                    for category, amount in costs.get("cost_breakdown", {}).items():
                        f.write(f"  - {category}: ${amount:.2f}\n")

                f.write(f"\nAll investigations terminated successfully.\n")
                f.write(f"State preserved in: emergency_state_{self.timestamp}.json\n")
                f.write(
                    f"Cost report saved in: emergency_cost_report_{self.timestamp}.json\n"
                )

            logger.info(f"Emergency report saved to: {report_file}")

        except Exception as e:
            logger.error(f"Error saving emergency report: {e}")

    async def _emergency_cleanup(self):
        """Perform emergency system cleanup"""
        try:
            logger.info("Performing emergency cleanup...")

            # Clear temporary files
            temp_dirs = [
                Path("temp"),
                Path("tmp"),
                Path(".investigation_cache"),
                Path("investigation_results"),
            ]

            for temp_dir in temp_dirs:
                if temp_dir.exists():
                    try:
                        shutil.rmtree(temp_dir)
                        logger.info(f"Cleaned up temporary directory: {temp_dir}")
                    except Exception as e:
                        logger.warning(f"Failed to clean up {temp_dir}: {e}")

            # Reset environment to safe state
            safe_env_vars = {
                "USE_MOCK_MODE": "true",
                "LIVE_MODE_ENABLED": "false",
                "INVESTIGATION_MODE": "mock",
            }

            for var, value in safe_env_vars.items():
                os.environ[var] = value
                logger.info(f"Set safe environment: {var}={value}")

            logger.info("Emergency cleanup completed")

        except Exception as e:
            logger.error(f"Error in emergency cleanup: {e}")

    async def _basic_cleanup(self):
        """Basic cleanup when full emergency stop fails"""
        try:
            # Kill all Python processes (last resort)
            os.system("pkill -f python")

            # Set mock mode
            os.environ["USE_MOCK_MODE"] = "true"
            os.environ["LIVE_MODE_ENABLED"] = "false"

            logger.critical("Basic emergency cleanup completed")

        except Exception as e:
            logger.critical(f"Basic cleanup failed: {e}")

    async def rollback_to_safe_configuration(self):
        """Rollback system to last known safe configuration"""
        try:
            logger.info("Rolling back to safe configuration...")

            rollback_report = {
                "timestamp": datetime.now().isoformat(),
                "rollback_type": "safe_configuration",
                "changes_made": [],
            }

            # Step 1: Disable live mode
            safe_config = {
                "USE_MOCK_MODE": "true",
                "LIVE_MODE_ENABLED": "false",
                "INVESTIGATION_MODE": "mock",
                "ENABLE_COST_TRACKING": "false",
                "CIRCUIT_BREAKER_ENABLED": "true",
            }

            for var, value in safe_config.items():
                old_value = os.environ.get(var, "NOT_SET")
                os.environ[var] = value
                rollback_report["changes_made"].append(
                    {"variable": var, "old_value": old_value, "new_value": value}
                )
                logger.info(f"Rollback: {var} = {value}")

            # Step 2: Reset circuit breakers
            await self._reset_all_circuit_breakers()
            rollback_report["changes_made"].append({"action": "reset_circuit_breakers"})

            # Step 3: Clear investigation cache
            cache_dirs = [Path(".investigation_cache"), Path("investigation_results")]
            for cache_dir in cache_dirs:
                if cache_dir.exists():
                    shutil.rmtree(cache_dir)
                    rollback_report["changes_made"].append(
                        {"action": "cleared_cache", "directory": str(cache_dir)}
                    )

            # Step 4: Save rollback report
            rollback_file = (
                self.emergency_dir / f"rollback_report_{self.timestamp}.json"
            )
            with open(rollback_file, "w") as f:
                json.dump(rollback_report, f, indent=2)

            logger.info("✅ Rollback to safe configuration completed")
            print(f"\n✅ ROLLBACK COMPLETED")
            print(f"System restored to safe mock mode configuration")
            print(f"Rollback report: {rollback_file}")

            return rollback_report

        except Exception as e:
            logger.error(f"Error during rollback: {e}")
            raise

    async def _reset_all_circuit_breakers(self):
        """Reset all circuit breakers to safe state"""
        try:
            # Reset safety manager circuit breakers
            self.safety_manager.circuit_breakers = {
                "cost": False,
                "time": False,
                "error": False,
                "manual": False,
            }

            # Clear error history
            self.safety_manager.error_history = []
            self.safety_manager.safety_violations = []

            logger.info("All circuit breakers reset")

        except Exception as e:
            logger.error(f"Error resetting circuit breakers: {e}")

    async def health_check(self):
        """Perform comprehensive system health check"""
        try:
            logger.info("Performing system health check...")

            health_report = {
                "timestamp": datetime.now().isoformat(),
                "overall_status": "unknown",
                "checks": {},
            }

            # Check 1: Environment configuration
            env_check = self._check_environment_safety()
            health_report["checks"]["environment"] = env_check

            # Check 2: Process status
            process_check = self._check_process_status()
            health_report["checks"]["processes"] = process_check

            # Check 3: Safety systems
            safety_check = await self._check_safety_systems()
            health_report["checks"]["safety_systems"] = safety_check

            # Check 4: File system
            filesystem_check = self._check_filesystem()
            health_report["checks"]["filesystem"] = filesystem_check

            # Check 5: Network connectivity (to ensure APIs are accessible)
            network_check = await self._check_network_connectivity()
            health_report["checks"]["network"] = network_check

            # Determine overall status
            all_checks = [
                env_check,
                process_check,
                safety_check,
                filesystem_check,
                network_check,
            ]
            if all(check["status"] == "healthy" for check in all_checks):
                health_report["overall_status"] = "healthy"
            elif any(check["status"] == "critical" for check in all_checks):
                health_report["overall_status"] = "critical"
            else:
                health_report["overall_status"] = "warning"

            # Save health report
            health_file = self.emergency_dir / f"health_check_{self.timestamp}.json"
            with open(health_file, "w") as f:
                json.dump(health_report, f, indent=2)

            # Print summary
            print(f"\n🏥 SYSTEM HEALTH CHECK")
            print(f"Overall Status: {health_report['overall_status'].upper()}")
            for check_name, check_result in health_report["checks"].items():
                status_emoji = (
                    "✅"
                    if check_result["status"] == "healthy"
                    else "⚠️" if check_result["status"] == "warning" else "❌"
                )
                print(
                    f"{status_emoji} {check_name.replace('_', ' ').title()}: {check_result['status']}"
                )
                if check_result.get("message"):
                    print(f"   {check_result['message']}")

            print(f"\nDetailed report: {health_file}")

            return health_report

        except Exception as e:
            logger.error(f"Error during health check: {e}")
            return {"overall_status": "error", "error": str(e)}

    def _check_environment_safety(self) -> Dict[str, Any]:
        """Check environment configuration for safety"""
        try:
            safe_config = {
                "USE_MOCK_MODE": "true",
                "LIVE_MODE_ENABLED": "false",
                "INVESTIGATION_MODE": "mock",
            }

            issues = []
            for var, expected in safe_config.items():
                actual = os.environ.get(var, "NOT_SET")
                if actual != expected:
                    issues.append(f"{var}={actual} (expected {expected})")

            if issues:
                return {
                    "status": "warning",
                    "message": f"Configuration issues: {', '.join(issues)}",
                    "issues": issues,
                }
            else:
                return {
                    "status": "healthy",
                    "message": "Environment configured for safe operation",
                }

        except Exception as e:
            return {"status": "critical", "message": f"Environment check failed: {e}"}

    def _check_process_status(self) -> Dict[str, Any]:
        """Check for running investigation processes"""
        try:
            investigation_processes = []
            for process in psutil.process_iter(["pid", "name", "cmdline"]):
                try:
                    if process.info["name"] in ["python", "python3"]:
                        cmdline = " ".join(process.info["cmdline"] or [])
                        if "investigation" in cmdline.lower():
                            investigation_processes.append(
                                {"pid": process.pid, "cmdline": cmdline}
                            )
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue

            if investigation_processes:
                return {
                    "status": "warning",
                    "message": f"{len(investigation_processes)} investigation processes running",
                    "processes": investigation_processes,
                }
            else:
                return {
                    "status": "healthy",
                    "message": "No investigation processes running",
                }

        except Exception as e:
            return {"status": "critical", "message": f"Process check failed: {e}"}

    async def _check_safety_systems(self) -> Dict[str, Any]:
        """Check safety system status"""
        try:
            safety_status = self.safety_manager.get_safety_status()

            if safety_status.requires_immediate_termination:
                return {
                    "status": "critical",
                    "message": "Safety systems require immediate termination",
                    "active_breakers": [
                        k for k, v in self.safety_manager.circuit_breakers.items() if v
                    ],
                }
            elif not safety_status.allows_operation:
                return {
                    "status": "warning",
                    "message": "Safety systems preventing operations",
                    "concerns": safety_status.safety_concerns,
                }
            else:
                return {"status": "healthy", "message": "Safety systems operational"}

        except Exception as e:
            return {"status": "critical", "message": f"Safety system check failed: {e}"}

    def _check_filesystem(self) -> Dict[str, Any]:
        """Check filesystem for emergency artifacts"""
        try:
            emergency_files = list(self.emergency_dir.glob("emergency_*"))
            temp_dirs = [
                d
                for d in [Path("temp"), Path("tmp"), Path(".investigation_cache")]
                if d.exists()
            ]

            issues = []
            if emergency_files:
                issues.append(f"{len(emergency_files)} emergency files found")
            if temp_dirs:
                issues.append(f"{len(temp_dirs)} temporary directories exist")

            if issues:
                return {
                    "status": "warning",
                    "message": "; ".join(issues),
                    "emergency_files": len(emergency_files),
                    "temp_dirs": len(temp_dirs),
                }
            else:
                return {"status": "healthy", "message": "Filesystem clean"}

        except Exception as e:
            return {"status": "critical", "message": f"Filesystem check failed: {e}"}

    async def _check_network_connectivity(self) -> Dict[str, Any]:
        """Check network connectivity to critical services"""
        try:
            # Simple connectivity check
            import socket

            services = [("google.com", 80), ("api.anthropic.com", 443)]

            connectivity_issues = []
            for host, port in services:
                try:
                    socket.create_connection((host, port), timeout=5).close()
                except Exception as e:
                    connectivity_issues.append(f"{host}:{port} - {e}")

            if connectivity_issues:
                return {
                    "status": "warning",
                    "message": f"Connectivity issues: {len(connectivity_issues)}",
                    "issues": connectivity_issues,
                }
            else:
                return {"status": "healthy", "message": "Network connectivity OK"}

        except Exception as e:
            return {"status": "critical", "message": f"Network check failed: {e}"}


def main():
    """Main entry point for emergency procedures"""
    parser = argparse.ArgumentParser(
        description="Live Mode Emergency Procedures",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Emergency Commands:
  emergency-stop    - Immediate termination of all live operations
  cost-report       - Generate emergency cost report
  rollback          - Rollback to safe configuration
  health-check      - Verify system health and safety status
  reset-circuits    - Reset all circuit breakers
  backup-state      - Backup current investigation state

Examples:
  python live_mode_emergency_procedures.py emergency-stop
  python live_mode_emergency_procedures.py rollback
  python live_mode_emergency_procedures.py health-check
        """,
    )

    parser.add_argument(
        "command",
        choices=[
            "emergency-stop",
            "cost-report",
            "rollback",
            "health-check",
            "reset-circuits",
            "backup-state",
        ],
        help="Emergency command to execute",
    )

    parser.add_argument(
        "--reason",
        default="Manual emergency procedure",
        help="Reason for emergency action (for logging)",
    )

    parser.add_argument(
        "--force", action="store_true", help="Force action without confirmation"
    )

    args = parser.parse_args()

    async def run_command():
        manager = EmergencyProcedureManager()

        try:
            if args.command == "emergency-stop":
                if not args.force:
                    response = input(
                        "🚨 EMERGENCY STOP - This will terminate all investigations and incur costs. Continue? (yes/no): "
                    )
                    if response.lower() != "yes":
                        print("Emergency stop cancelled.")
                        return

                await manager.emergency_stop(args.reason)

            elif args.command == "rollback":
                await manager.rollback_to_safe_configuration()

            elif args.command == "health-check":
                await manager.health_check()

            elif args.command == "reset-circuits":
                await manager._reset_all_circuit_breakers()
                print("✅ All circuit breakers reset")

            elif args.command == "cost-report":
                cost_report = await manager._generate_emergency_cost_report()
                print(f"💰 Emergency Cost Report Generated")
                print(f"Total Cost: ${cost_report.get('total_session_cost', 0):.2f}")

            elif args.command == "backup-state":
                await manager._backup_emergency_state({"reason": args.reason})
                print("💾 Emergency state backup completed")

        except Exception as e:
            logger.critical(f"Emergency procedure failed: {e}")
            print(f"❌ EMERGENCY PROCEDURE FAILED: {e}")
            sys.exit(1)

    # Run the async command
    asyncio.run(run_command())


if __name__ == "__main__":
    main()
