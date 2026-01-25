"""
Audit Recovery Service

Monitors running audits for health issues and automatically recovers stuck/crashed audits.
Ensures audit status is always accurate in the database and UI.
"""

import asyncio
import logging
from datetime import UTC, datetime, timedelta
from typing import Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings
from app.services.audit_task_manager import audit_task_manager

logger = logging.getLogger(__name__)


class AuditRecoveryService:
    """
    Service for monitoring audit health and recovering stuck/crashed audits.

    Features:
    - Detects audits stuck in 'in_progress' state
    - Monitors audits with no recent activity
    - Automatically marks crashed audits as failed
    - Logs recovery actions to audit execution logs
    """

    def __init__(
        self,
        db: Optional[AsyncIOMotorDatabase] = None,
        stuck_timeout_minutes: Optional[int] = None,
        no_activity_timeout_minutes: Optional[int] = None,
        check_interval_seconds: Optional[int] = None,
    ):
        """
        Initialize the audit recovery service.

        Args:
            db: MongoDB database instance (optional, will create if not provided)
            stuck_timeout_minutes: Minutes before audit is considered stuck (from config)
            no_activity_timeout_minutes: Minutes of no activity before audit is suspicious
            check_interval_seconds: How often to check for stuck audits
        """
        self.db = db
        self.stuck_timeout_minutes = (
            stuck_timeout_minutes or settings.AUDIT_STUCK_TIMEOUT_MINUTES
        )
        self.no_activity_timeout_minutes = (
            no_activity_timeout_minutes or settings.AUDIT_NO_ACTIVITY_TIMEOUT_MINUTES
        )
        self.check_interval_seconds = (
            check_interval_seconds or settings.AUDIT_HEALTH_CHECK_INTERVAL_SECONDS
        )
        self._monitoring_task: Optional[asyncio.Task] = None
        self._is_running = False
        logger.info(
            f"AuditRecoveryService initialized: "
            f"stuck_timeout={self.stuck_timeout_minutes}min, "
            f"no_activity_timeout={self.no_activity_timeout_minutes}min, "
            f"check_interval={self.check_interval_seconds}s"
        )

    async def _get_db(self) -> AsyncIOMotorDatabase:
        """Get database connection."""
        if self.db is None:
            client = AsyncIOMotorClient(settings.MONGODB_URI)
            self.db = client[settings.MONGODB_DB_NAME]
        return self.db

    async def check_audit_health(self, audit_id: str) -> Dict[str, any]:
        """
        Check the health of a specific audit.

        Returns:
            Dict with health status:
            {
                'is_healthy': bool,
                'issues': List[str],
                'last_activity': datetime,
                'status': str,
                'task_running': bool
            }
        """
        db = await self._get_db()
        audit_reports = db["audit_reports"]

        audit = await audit_reports.find_one({"audit_id": audit_id})
        if not audit:
            return {
                "is_healthy": False,
                "issues": ["Audit not found in database"],
                "audit_id": audit_id,
            }

        issues = []
        status = audit.get("status", "unknown")
        task_running = audit_task_manager.is_running(audit_id)

        # Check if status is inconsistent with task manager
        if status == "in_progress" and not task_running:
            issues.append("Audit marked as in_progress but task is not running")

        # Check for no recent activity
        execution_logs = audit.get("execution_logs", [])
        last_activity = None
        if execution_logs:
            last_log = execution_logs[-1]
            last_activity_str = last_log.get("timestamp")
            if last_activity_str:
                try:
                    last_activity = datetime.fromisoformat(
                        last_activity_str.replace("Z", "+00:00")
                    )
                    # Ensure timezone-aware datetime
                    if last_activity.tzinfo is None:
                        last_activity = last_activity.replace(tzinfo=UTC)
                except (ValueError, AttributeError):
                    pass

        if last_activity:
            time_since_activity = datetime.now(UTC) - last_activity
            if (
                status == "in_progress"
                and time_since_activity.total_seconds()
                > self.no_activity_timeout_minutes * 60
            ):
                issues.append(
                    f"No activity for {int(time_since_activity.total_seconds() / 60)} minutes"
                )

        # Check for stuck audits (started long ago, still in progress)
        audit_date = audit.get("audit_date")
        if audit_date and status == "in_progress":
            if isinstance(audit_date, datetime):
                time_since_start = datetime.now(UTC) - audit_date.replace(tzinfo=UTC)
            else:
                try:
                    audit_date_dt = datetime.fromisoformat(
                        str(audit_date).replace("Z", "+00:00")
                    )
                    # Ensure timezone-aware datetime
                    if audit_date_dt.tzinfo is None:
                        audit_date_dt = audit_date_dt.replace(tzinfo=UTC)
                    time_since_start = datetime.now(UTC) - audit_date_dt
                except (ValueError, AttributeError):
                    time_since_start = timedelta(minutes=0)

            if time_since_start.total_seconds() > self.stuck_timeout_minutes * 60:
                issues.append(
                    f"Audit stuck for {int(time_since_start.total_seconds() / 60)} minutes"
                )

        return {
            "is_healthy": len(issues) == 0,
            "issues": issues,
            "last_activity": last_activity,
            "status": status,
            "task_running": task_running,
            "audit_id": audit_id,
        }

    async def recover_stuck_audit(self, audit_id: str, reason: str) -> Dict[str, any]:
        """
        Recover a stuck audit by marking it as failed and adding recovery logs.

        Args:
            audit_id: The audit ID to recover
            reason: Reason why the audit was marked as failed

        Returns:
            Dict with recovery status and details
        """
        db = await self._get_db()
        audit_reports = db["audit_reports"]

        audit = await audit_reports.find_one({"audit_id": audit_id})
        if not audit:
            logger.error(f"Cannot recover audit {audit_id}: not found in database")
            return {"success": False, "error": "Audit not found"}

        current_status = audit.get("status")
        if current_status in ["completed", "failed", "cancelled"]:
            logger.info(f"Audit {audit_id} already in terminal state: {current_status}")
            return {
                "success": False,
                "error": f"Audit already {current_status}",
                "status": current_status,
            }

        logger.warning(f"Recovering stuck audit {audit_id}: {reason}")

        # Update audit to failed status
        recovery_log = {
            "id": f"recovery_{datetime.now(UTC).timestamp()}",
            "timestamp": datetime.now(UTC).isoformat(),
            "level": "error",
            "message": f"Audit recovery triggered: {reason}",
            "source": "Recovery Service",
        }

        update_data = {
            "$set": {
                "status": "failed",
                "completed_at": datetime.now(UTC),
                "summary": {
                    "crash_detected": True,
                    "crash_reason": reason,
                    "recovery_timestamp": datetime.now(UTC).isoformat(),
                    "original_status": current_status,
                },
            },
            "$push": {"execution_logs": recovery_log},
        }

        result = await audit_reports.update_one({"audit_id": audit_id}, update_data)

        if result.modified_count > 0:
            logger.info(f"Successfully recovered audit {audit_id}")

            # Clean up task manager if task exists
            if audit_task_manager.is_running(audit_id):
                try:
                    await audit_task_manager.cancel_task(audit_id)
                except Exception as e:
                    logger.warning(
                        f"Failed to cancel task for recovered audit {audit_id}: {e}"
                    )

            return {
                "success": True,
                "audit_id": audit_id,
                "reason": reason,
                "recovery_timestamp": datetime.now(UTC).isoformat(),
            }
        else:
            logger.error(f"Failed to update audit {audit_id} during recovery")
            return {"success": False, "error": "Database update failed"}

    async def scan_and_recover_stuck_audits(self) -> List[Dict[str, any]]:
        """
        Scan all in-progress audits and recover stuck ones.

        Returns:
            List of recovery actions taken
        """
        db = await self._get_db()
        audit_reports = db["audit_reports"]

        # Find all in-progress audits
        in_progress_audits = await audit_reports.find(
            {"status": "in_progress"}
        ).to_list(None)

        recoveries = []
        for audit in in_progress_audits:
            audit_id = audit.get("audit_id")
            if not audit_id:
                continue

            health = await self.check_audit_health(audit_id)

            if not health["is_healthy"]:
                logger.warning(
                    f"Unhealthy audit detected: {audit_id} - Issues: {health['issues']}"
                )

                # Recover the audit
                recovery = await self.recover_stuck_audit(
                    audit_id, reason="; ".join(health["issues"])
                )
                recoveries.append(recovery)

        if recoveries:
            logger.info(f"Recovered {len(recoveries)} stuck audits")

        return recoveries

    async def start_monitoring(self):
        """Start background monitoring of audit health."""
        if self._is_running:
            logger.warning("Audit monitoring is already running")
            return

        self._is_running = True
        logger.info("Starting audit health monitoring")

        async def monitor_loop():
            while self._is_running:
                try:
                    await self.scan_and_recover_stuck_audits()
                    await asyncio.sleep(self.check_interval_seconds)
                except asyncio.CancelledError:
                    logger.info("Audit monitoring cancelled")
                    break
                except Exception as e:
                    logger.error(f"Error in audit monitoring loop: {e}", exc_info=True)
                    await asyncio.sleep(self.check_interval_seconds)

        self._monitoring_task = asyncio.create_task(monitor_loop())
        logger.info("Audit health monitoring started")

    async def stop_monitoring(self):
        """Stop background monitoring."""
        if not self._is_running:
            return

        self._is_running = False
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass
        logger.info("Audit health monitoring stopped")


# Global singleton instance
audit_recovery_service = AuditRecoveryService()
