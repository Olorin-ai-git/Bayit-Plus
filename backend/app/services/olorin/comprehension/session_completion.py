"""Session completion helper: mark completed + enqueue ARQ report job (D-04, D-07).

Also exposes run_report_generation_inline for tests + dev paths that need
synchronous report generation without an ARQ Redis dependency.
"""
from datetime import datetime
from typing import Optional

from app.core.logging_config import get_logger
from app.models.comprehension_report import ComprehensionReport
from app.models.comprehension_session import ComprehensionSession
from app.services.olorin.comprehension.report_generator import (
    build_report_from_session,
)
from app.services.olorin.comprehension.report_worker import (
    enqueue_report_generation,
)

logger = get_logger(__name__)


async def mark_completed_and_enqueue(session: ComprehensionSession) -> None:
    """Transition session to completed and enqueue a report-generation task."""
    if session.status != "completed":
        session.status = "completed"
        session.updated_at = datetime.utcnow()
        await session.save()
    try:
        await enqueue_report_generation(str(session.id))
    except Exception as exc:  # noqa: BLE001 — never block the caller
        logger.warning(
            "mark_completed_and_enqueue: enqueue failed",
            extra={"session_id": str(session.id), "error": str(exc)},
        )


async def run_report_generation_inline(
    session_id: str, partner_id: Optional[str] = None,
) -> Optional[ComprehensionReport]:
    """Build + upsert a ComprehensionReport synchronously (test-friendly path)."""
    session = await ComprehensionSession.get(session_id)
    if session is None:
        return None
    pid = partner_id if partner_id is not None else (session.partner_id or "")
    report = build_report_from_session(session, partner_id=pid)
    existing = await ComprehensionReport.find_one(
        {"comprehension_session_id": session_id},
    )
    if existing is not None:
        existing.turn_count = report.turn_count
        existing.avg_score = report.avg_score
        existing.high_count = report.high_count
        existing.med_count = report.med_count
        existing.low_count = report.low_count
        existing.turns = report.turns
        existing.status = report.status
        existing.generation_attempts = existing.generation_attempts + 1
        existing.last_error = None
        await existing.save()
        return existing
    report.generation_attempts = 1
    await report.insert()
    return report
