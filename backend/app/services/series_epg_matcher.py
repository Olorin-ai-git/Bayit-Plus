"""
Series EPG Matcher
Matches EPG entries against series recording rules and creates schedules.
"""

import logging
from datetime import datetime

from app.core.config import settings
from app.models.content import EPGEntry, LiveChannel
from app.models.recording import RecordingSchedule
from app.models.series_recording_rule import SeriesRecordingRule

logger = logging.getLogger(__name__)


def matches_title(rule: SeriesRecordingRule, epg_title: str) -> bool:
    """Check if an EPG entry title matches a rule's pattern."""
    title_lower = epg_title.lower()
    match_lower = rule.match_title.lower()

    if rule.match_type == "exact":
        return title_lower == match_lower
    elif rule.match_type == "contains":
        return match_lower in title_lower
    elif rule.match_type == "starts_with":
        return title_lower.startswith(match_lower)
    return False


async def _bulk_load_channel_names(channel_ids: set[str]) -> dict[str, str]:
    """Bulk load channel names to avoid N+1 queries."""
    if not channel_ids:
        return {}
    channels = await LiveChannel.find(
        LiveChannel.id.is_in(list(channel_ids))
    ).to_list(length=settings.RECORDING_QUERY_LIMIT)
    return {str(ch.id): ch.name for ch in channels}


async def match_epg_entry(epg_entry: EPGEntry) -> list[SeriesRecordingRule]:
    """Find all active rules that match a given EPG entry."""
    active_rules = await SeriesRecordingRule.find(
        SeriesRecordingRule.is_active == True,  # noqa: E712
    ).to_list(length=settings.RECORDING_QUERY_LIMIT)

    matching_rules = []
    for rule in active_rules:
        if not matches_title(rule, epg_entry.title):
            continue
        if rule.channel_ids and epg_entry.channel_id not in rule.channel_ids:
            continue
        if rule.max_recordings > 0 and rule.recordings_count >= rule.max_recordings:
            continue
        matching_rules.append(rule)

    return matching_rules


async def _create_schedule_from_rule(
    rule: SeriesRecordingRule, entry: EPGEntry, channel_name: str,
) -> RecordingSchedule:
    """Create a RecordingSchedule from a rule and EPG entry."""
    schedule = RecordingSchedule(
        user_id=rule.user_id, channel_id=entry.channel_id,
        channel_name=channel_name, program_title=entry.title,
        start_time=entry.start_time, end_time=entry.end_time,
        subtitle_enabled=rule.subtitle_enabled,
        subtitle_target_language=rule.subtitle_target_language,
        dubbing_enabled=rule.dubbing_enabled,
        dubbing_target_language=rule.dubbing_target_language,
        series_rule_id=str(rule.id), epg_entry_id=str(entry.id),
        status="pending",
    )
    await schedule.insert()
    return schedule


async def scan_upcoming_epg(rule: SeriesRecordingRule) -> int:
    """Scan upcoming EPG entries for matches against a rule."""
    now = datetime.utcnow()
    schedules_created = 0

    query_filters = [EPGEntry.start_time > now]
    if rule.channel_ids:
        query_filters.append(EPGEntry.channel_id.is_in(rule.channel_ids))

    upcoming_entries = await EPGEntry.find(
        *query_filters
    ).sort(EPGEntry.start_time).to_list(length=settings.RECORDING_QUERY_LIMIT)

    # Bulk load channel names to avoid N+1
    channel_ids = {e.channel_id for e in upcoming_entries}
    channel_names = await _bulk_load_channel_names(channel_ids)

    from app.services.recording_scheduler_service import recording_scheduler_service

    for entry in upcoming_entries:
        if not matches_title(rule, entry.title):
            continue

        existing = await RecordingSchedule.find_one(
            RecordingSchedule.user_id == rule.user_id,
            RecordingSchedule.epg_entry_id == str(entry.id),
            RecordingSchedule.status.is_in(["pending", "recording", "completed"]),
        )
        if existing:
            continue

        conflicts = await recording_scheduler_service.check_conflicts(
            user_id=rule.user_id, start_time=entry.start_time,
            end_time=entry.end_time, channel_id=entry.channel_id,
        )
        if conflicts:
            continue

        ch_name = channel_names.get(entry.channel_id, entry.channel_id)
        schedule = await _create_schedule_from_rule(rule, entry, ch_name)
        await recording_scheduler_service.schedule_recording(schedule)

        schedules_created += 1
        rule.recordings_count += 1
        rule.last_matched_at = now

        if rule.max_recordings > 0 and rule.recordings_count >= rule.max_recordings:
            break

    if schedules_created > 0:
        rule.updated_at = now
        await rule.save()
        logger.info(
            "Series rule scan created schedules",
            extra={
                "rule_id": str(rule.id), "match_title": rule.match_title,
                "schedules_created": schedules_created,
            },
        )

    return schedules_created


async def process_new_epg_entries(entries: list[EPGEntry]) -> int:
    """Process newly ingested EPG entries against all active series rules."""
    if not entries:
        return 0

    # Bulk load channel names for all entries
    channel_ids = {e.channel_id for e in entries}
    channel_names = await _bulk_load_channel_names(channel_ids)

    total_created = 0
    from app.services.recording_scheduler_service import recording_scheduler_service

    for entry in entries:
        matching_rules = await match_epg_entry(entry)

        for rule in matching_rules:
            existing = await RecordingSchedule.find_one(
                RecordingSchedule.user_id == rule.user_id,
                RecordingSchedule.epg_entry_id == str(entry.id),
                RecordingSchedule.status.is_in(["pending", "recording", "completed"]),
            )
            if existing:
                continue

            conflicts = await recording_scheduler_service.check_conflicts(
                user_id=rule.user_id, start_time=entry.start_time,
                end_time=entry.end_time, channel_id=entry.channel_id,
            )
            if conflicts:
                continue

            ch_name = channel_names.get(entry.channel_id, entry.channel_id)
            schedule = await _create_schedule_from_rule(rule, entry, ch_name)
            await recording_scheduler_service.schedule_recording(schedule)

            rule.recordings_count += 1
            rule.last_matched_at = datetime.utcnow()
            rule.updated_at = datetime.utcnow()
            await rule.save()

            total_created += 1

    if total_created > 0:
        logger.info(
            "Processed new EPG entries against series rules",
            extra={"total_schedules_created": total_created},
        )

    return total_created
