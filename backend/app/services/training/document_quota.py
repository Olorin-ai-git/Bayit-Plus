"""Tier-based quota enforcement for document ingestion."""

from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.models.document import Document


class QuotaExceededError(Exception):
    """Raised when a document ingest would exceed a tier cap."""


def _per_file_cap_mb(tier: str) -> int:
    if tier == "enterprise":
        return settings.KNOWLEDGE_DOC_PER_FILE_MB_ENTERPRISE
    if tier == "organization":
        return settings.KNOWLEDGE_DOC_PER_FILE_MB_ORG
    return 0


def _total_cap_mb(tier: str) -> int:
    if tier == "enterprise":
        return settings.KNOWLEDGE_DOC_TOTAL_MB_ENTERPRISE
    if tier == "organization":
        return settings.KNOWLEDGE_DOC_TOTAL_MB_ORG
    return 0


def _url_hourly_cap(tier: str) -> int:
    if tier == "enterprise":
        return settings.KNOWLEDGE_DOC_URL_HOURLY_ENTERPRISE
    if tier == "organization":
        return settings.KNOWLEDGE_DOC_URL_HOURLY_ORG
    return 0


def check_per_file_size(*, size_bytes: int, tier: str) -> None:
    cap_mb = _per_file_cap_mb(tier)
    if cap_mb == 0:
        raise QuotaExceededError(f"{tier} tier cannot upload documents")
    if size_bytes > cap_mb * 1024 * 1024:
        raise QuotaExceededError(
            f"File size {size_bytes // 1024 // 1024} MB exceeds {cap_mb} MB cap for {tier}"
        )


async def _sum_partner_doc_bytes(partner_id: str) -> int:
    coll = Document.get_motor_collection()
    cursor = coll.aggregate([
        {"$match": {"partner_id": partner_id, "status": {"$ne": "failed"}}},
        {"$group": {"_id": None, "total": {"$sum": "$word_count"}}},
    ])
    row = await cursor.to_list(length=1)
    if not row:
        return 0
    # word_count * 6 bytes ≈ conservative estimate; precise accounting is a 2.1 follow-up
    return int(row[0]["total"]) * 6


async def check_total_storage(*, partner_id: str, tier: str, additional_bytes: int) -> None:
    cap_mb = _total_cap_mb(tier)
    if cap_mb == 0:
        raise QuotaExceededError(f"{tier} tier cannot store documents")
    current = await _sum_partner_doc_bytes(partner_id)
    if current + additional_bytes > cap_mb * 1024 * 1024:
        raise QuotaExceededError(
            f"Total storage {(current + additional_bytes) // 1024 // 1024} MB exceeds {cap_mb} MB cap"
        )


async def _count_recent_url_ingests(*, partner_id: str, window_minutes: int = 60) -> int:
    since = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
    coll = Document.get_motor_collection()
    return await coll.count_documents({
        "partner_id": partner_id,
        "source_format": "url",
        "created_at": {"$gte": since},
    })


async def check_url_rate(*, partner_id: str, tier: str) -> None:
    cap = _url_hourly_cap(tier)
    if cap == 0:
        raise QuotaExceededError(f"{tier} tier cannot ingest URLs")
    recent = await _count_recent_url_ingests(partner_id=partner_id)
    if recent >= cap:
        raise QuotaExceededError(
            f"URL rate limit: {recent} in last hour exceeds {cap} for {tier}"
        )
