"""
Session validity monitoring and cleanup service
Detects stale sessions, implements timeouts, and prevents session hijacking
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

from app.core.config import settings
from app.models.live_feature_quota import LiveFeatureUsageSession, UsageSessionStatus

logger = logging.getLogger(__name__)


class SessionMonitor:
    """Monitors live feature sessions for validity and security issues"""

    def __init__(self):
        self._cleanup_task: Optional[asyncio.Task] = None
        self._session_timeout_minutes = 120  # 2 hours max session duration
        self._stale_threshold_minutes = 30  # Mark as stale if no activity for 30 min

    async def start(self):
        """Start background monitoring tasks"""
        self._cleanup_task = asyncio.create_task(self._monitor_sessions())
        logger.info("Session monitor started")

    async def stop(self):
        """Stop background monitoring tasks"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        logger.info("Session monitor stopped")

    async def _monitor_sessions(self):
        """Background task to monitor and cleanup sessions"""
        while True:
            try:
                await asyncio.sleep(300)  # Check every 5 minutes
                await self._cleanup_stale_sessions()
                await self._timeout_long_sessions()
            except Exception as e:
                logger.error(f"Error in session monitor: {e}")

    async def _cleanup_stale_sessions(self):
        """Mark sessions as interrupted if no activity for threshold period"""
        now = datetime.utcnow()
        stale_cutoff = now - timedelta(minutes=self._stale_threshold_minutes)

        stale_sessions = await LiveFeatureUsageSession.find(
            LiveFeatureUsageSession.status == UsageSessionStatus.ACTIVE,
            LiveFeatureUsageSession.last_activity_at < stale_cutoff,
        ).to_list()

        for session in stale_sessions:
            session.status = UsageSessionStatus.INTERRUPTED
            session.ended_at = session.last_activity_at
            session.duration_seconds = (session.ended_at - session.started_at).total_seconds()
            await session.save()
            logger.warning(
                f"Marked stale session as interrupted: {session.session_id}, "
                f"user={session.user_id}, last_activity={session.last_activity_at}"
            )

        if stale_sessions:
            logger.info(f"Cleaned up {len(stale_sessions)} stale sessions")

    async def _timeout_long_sessions(self):
        """Timeout sessions that exceed maximum duration"""
        now = datetime.utcnow()
        timeout_cutoff = now - timedelta(minutes=self._session_timeout_minutes)

        long_sessions = await LiveFeatureUsageSession.find(
            LiveFeatureUsageSession.status == UsageSessionStatus.ACTIVE,
            LiveFeatureUsageSession.started_at < timeout_cutoff,
        ).to_list()

        for session in long_sessions:
            session.status = UsageSessionStatus.ERROR
            session.ended_at = now
            session.duration_seconds = (session.ended_at - session.started_at).total_seconds()
            await session.save()
            logger.warning(
                f"Timed out long-running session: {session.session_id}, "
                f"user={session.user_id}, duration={session.duration_seconds / 60:.1f}min"
            )

        if long_sessions:
            logger.info(f"Timed out {len(long_sessions)} long-running sessions")

    async def check_session_validity(self, session_id: str) -> tuple[bool, Optional[str]]:
        """
        Check if a session is still valid.
        Returns: (is_valid, error_message)
        """
        session = await LiveFeatureUsageSession.find_one(
            LiveFeatureUsageSession.session_id == session_id
        )

        if not session:
            return False, "Session not found"

        if session.status != UsageSessionStatus.ACTIVE:
            return False, f"Session is {session.status}"

        now = datetime.utcnow()

        # Check for stale session
        if now - session.last_activity_at > timedelta(minutes=self._stale_threshold_minutes):
            return False, "Session has become stale due to inactivity"

        # Check for timeout
        if now - session.started_at > timedelta(minutes=self._session_timeout_minutes):
            return False, "Session has exceeded maximum duration"

        return True, None

    async def update_session_activity(self, session_id: str):
        """Update last activity timestamp for a session"""
        session = await LiveFeatureUsageSession.find_one(
            LiveFeatureUsageSession.session_id == session_id
        )
        if session:
            session.last_activity_at = datetime.utcnow()
            await session.save()


# Global session monitor instance
_session_monitor: Optional[SessionMonitor] = None


async def get_session_monitor() -> SessionMonitor:
    """Get or create global session monitor instance"""
    global _session_monitor
    if _session_monitor is None:
        _session_monitor = SessionMonitor()
        await _session_monitor.start()
    return _session_monitor


async def shutdown_session_monitor():
    """Shutdown global session monitor"""
    global _session_monitor
    if _session_monitor:
        await _session_monitor.stop()
        _session_monitor = None
