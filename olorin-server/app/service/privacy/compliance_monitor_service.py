"""
Compliance Monitor Background Service.

Runs the Compliance AI Agent continuously in the background,
automatically monitoring DPA compliance and taking enforcement actions.
"""

import asyncio
import os
from typing import Optional

from app.service.logging import get_bridge_logger
from app.service.privacy.compliance_agent import get_compliance_agent

logger = get_bridge_logger(__name__)


class ComplianceMonitorService:
    """
    Background service for continuous DPA compliance monitoring.

    Automatically starts the Compliance AI Agent and runs it continuously
    in the background, checking compliance at configured intervals.
    """

    def __init__(self):
        """Initialize the monitoring service."""
        self._agent = get_compliance_agent()
        self._task: Optional[asyncio.Task] = None
        self._running = False
        self._enabled = os.getenv("ENABLE_COMPLIANCE_MONITORING", "true").lower() == "true"
        self._check_interval = int(os.getenv("COMPLIANCE_CHECK_INTERVAL_SECONDS", "3600"))

        logger.info(
            f"[COMPLIANCE_MONITOR] Service initialized: "
            f"enabled={self._enabled}, interval={self._check_interval}s"
        )

    async def start(self) -> None:
        """Start the continuous monitoring service."""
        if not self._enabled:
            logger.info("[COMPLIANCE_MONITOR] Service disabled via config")
            return

        if self._running:
            logger.warning("[COMPLIANCE_MONITOR] Service already running")
            return

        self._running = True
        self._task = asyncio.create_task(self._monitoring_loop())
        logger.info(
            "[COMPLIANCE_MONITOR] ✅ Started continuous compliance monitoring "
            f"(checking every {self._check_interval}s)"
        )

    async def stop(self) -> None:
        """Stop the monitoring service gracefully."""
        if not self._running:
            return

        logger.info("[COMPLIANCE_MONITOR] Stopping monitoring service...")
        self._running = False

        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                logger.info("[COMPLIANCE_MONITOR] Monitoring task cancelled")

        logger.info("[COMPLIANCE_MONITOR] ✅ Service stopped")

    async def _monitoring_loop(self) -> None:
        """
        Main monitoring loop - runs continuously until stopped.

        Performs compliance checks at configured intervals and logs results.
        """
        logger.info("[COMPLIANCE_MONITOR] Entering monitoring loop")

        # Run initial check immediately on startup
        await self._run_check("Initial startup compliance check")

        # Continue monitoring at intervals
        while self._running:
            try:
                await asyncio.sleep(self._check_interval)

                if not self._running:
                    break

                await self._run_check("Scheduled compliance check")

            except asyncio.CancelledError:
                logger.info("[COMPLIANCE_MONITOR] Monitoring loop cancelled")
                break
            except Exception as e:
                logger.error(
                    f"[COMPLIANCE_MONITOR] Error in monitoring loop: {e}",
                    exc_info=True,
                )
                # Continue monitoring even after errors
                await asyncio.sleep(60)  # Short delay before retry

    async def _run_check(self, context: str) -> None:
        """
        Run a single compliance check.

        Args:
            context: Context description for the check
        """
        try:
            logger.info(f"[COMPLIANCE_MONITOR] Running check: {context}")

            decision = await self._agent.run_compliance_check(context=context)

            if decision.compliant:
                logger.info(
                    f"[COMPLIANCE_MONITOR] ✅ COMPLIANT - "
                    f"No violations found"
                )
            else:
                logger.warning(
                    f"[COMPLIANCE_MONITOR] ❌ NON-COMPLIANT - "
                    f"Violations: {len(decision.violations_found)}"
                )
                for i, violation in enumerate(decision.violations_found, 1):
                    logger.warning(
                        f"[COMPLIANCE_MONITOR]   Violation {i}: {violation}"
                    )

                # If violations are critical, could trigger alerts here
                if decision.violations_found:
                    logger.critical(
                        "[COMPLIANCE_MONITOR] CRITICAL: DPA compliance violations detected! "
                        "Review required immediately."
                    )

        except Exception as e:
            logger.error(
                f"[COMPLIANCE_MONITOR] Failed to run compliance check: {e}",
                exc_info=True,
            )

    @property
    def is_running(self) -> bool:
        """Check if the monitoring service is running."""
        return self._running

    @property
    def is_enabled(self) -> bool:
        """Check if the monitoring service is enabled."""
        return self._enabled


# Global singleton
_monitor_service: Optional[ComplianceMonitorService] = None


def get_compliance_monitor_service() -> ComplianceMonitorService:
    """Get the global compliance monitor service instance."""
    global _monitor_service
    if _monitor_service is None:
        _monitor_service = ComplianceMonitorService()
    return _monitor_service
