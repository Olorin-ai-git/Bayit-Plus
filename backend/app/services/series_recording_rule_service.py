"""
Series Recording Rule Service
Manages CRUD operations for series recording rules.
"""

import logging
from datetime import datetime
from typing import Optional

from app.core.config import settings
from app.models.recording import RecordingSchedule
from app.models.series_recording_rule import SeriesRecordingRule

logger = logging.getLogger(__name__)


class SeriesRecordingRuleService:
    """Manages CRUD operations for series recording rules."""

    async def create_rule(
        self,
        user_id: str,
        rule_name: str,
        match_title: str,
        match_type: str,
        scope: str,
        channel_ids: Optional[list[str]] = None,
        subtitle_enabled: bool = False,
        subtitle_target_language: Optional[str] = None,
        dubbing_enabled: bool = False,
        dubbing_target_language: Optional[str] = None,
        max_recordings: int = 0,
    ) -> SeriesRecordingRule:
        """Create a new series recording rule."""
        max_rules = settings.RECORDING_MAX_SERIES_RULES_PER_USER
        existing_count = await SeriesRecordingRule.find(
            SeriesRecordingRule.user_id == user_id,
            SeriesRecordingRule.is_active == True,  # noqa: E712
        ).count()

        if existing_count >= max_rules:
            raise ValueError(
                f"Maximum of {max_rules} active series rules allowed"
            )

        rule = SeriesRecordingRule(
            user_id=user_id,
            rule_name=rule_name,
            match_title=match_title,
            match_type=match_type,
            scope=scope,
            channel_ids=channel_ids or [],
            subtitle_enabled=subtitle_enabled,
            subtitle_target_language=subtitle_target_language,
            dubbing_enabled=dubbing_enabled,
            dubbing_target_language=dubbing_target_language,
            max_recordings=max_recordings,
        )

        await rule.insert()

        logger.info(
            "Series recording rule created",
            extra={
                "rule_id": str(rule.id),
                "user_id": user_id,
                "match_title": match_title,
                "match_type": match_type,
            },
        )

        # Scan upcoming EPG for immediate matches
        from app.services.series_epg_matcher import scan_upcoming_epg

        await scan_upcoming_epg(rule)

        return rule

    async def update_rule(
        self,
        rule_id: str,
        user_id: str,
        updates: dict,
    ) -> SeriesRecordingRule:
        """Update an existing series recording rule."""
        rule = await SeriesRecordingRule.get(rule_id)
        if not rule:
            raise ValueError("Rule not found")

        if rule.user_id != user_id:
            raise PermissionError("Not authorized to update this rule")

        allowed_fields = {
            "rule_name", "match_title", "match_type", "channel_ids",
            "scope", "subtitle_enabled", "subtitle_target_language",
            "dubbing_enabled", "dubbing_target_language", "is_active",
            "max_recordings",
        }

        for field, value in updates.items():
            if field in allowed_fields:
                setattr(rule, field, value)

        rule.updated_at = datetime.utcnow()
        await rule.save()

        logger.info(
            "Series recording rule updated",
            extra={
                "rule_id": rule_id,
                "user_id": user_id,
                "updated_fields": list(updates.keys()),
            },
        )

        return rule

    async def delete_rule(self, rule_id: str, user_id: str) -> None:
        """Delete a series recording rule and cancel pending schedules."""
        rule = await SeriesRecordingRule.get(rule_id)
        if not rule:
            raise ValueError("Rule not found")

        if rule.user_id != user_id:
            raise PermissionError("Not authorized to delete this rule")

        pending_schedules = await RecordingSchedule.find(
            RecordingSchedule.series_rule_id == rule_id,
            RecordingSchedule.status == "pending",
        ).to_list(length=settings.RECORDING_QUERY_LIMIT)

        from app.services.recording_scheduler_service import (
            recording_scheduler_service,
        )

        for schedule in pending_schedules:
            await recording_scheduler_service.cancel_schedule(str(schedule.id))

        await rule.delete()

        logger.info(
            "Series recording rule deleted",
            extra={
                "rule_id": rule_id,
                "user_id": user_id,
                "cancelled_schedules": len(pending_schedules),
            },
        )

    async def list_rules(self, user_id: str) -> list[SeriesRecordingRule]:
        """List all series recording rules for a user."""
        return await SeriesRecordingRule.find(
            SeriesRecordingRule.user_id == user_id,
        ).sort(-SeriesRecordingRule.created_at).to_list(
            length=settings.RECORDING_QUERY_LIMIT
        )

    async def get_rule(
        self, rule_id: str, user_id: str
    ) -> Optional[SeriesRecordingRule]:
        """Get a single rule by ID with ownership check."""
        rule = await SeriesRecordingRule.get(rule_id)
        if rule and rule.user_id == user_id:
            return rule
        return None


# Singleton instance
series_recording_rule_service = SeriesRecordingRuleService()
