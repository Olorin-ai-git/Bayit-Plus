"""Teacher override service — append-only audit trail (D-11, D-12).

Each call to append_override() adds one OverrideAuditEntry to the target
ScoredExchange.overrides[] without mutating prior entries. The current
authoritative score + rationale on subsequent reads is the last row.
"""
from datetime import datetime
from typing import Optional

from app.models.comprehension_session import (
    ComprehensionSession,
    OverrideAuditEntry,
    current_authoritative_rationale,
    current_authoritative_score,
)


async def append_override(
    session: ComprehensionSession,
    turn_index: int,
    teacher_id: str,
    score_after: int,
    rationale_after: str,
    note: Optional[str] = None,
) -> OverrideAuditEntry:
    """Append a teacher override audit row to the session + persist.

    Raises ValueError on score_after out of 0..3 range, IndexError on
    turn_index out of session.exchanges range. teacher_id + timestamp are
    captured server-side (D-07 Phase3 threat model: never from client).
    """
    if not (0 <= score_after <= 3):
        raise ValueError(
            f"score_after must be in 0..3, got {score_after}",
        )
    if not (0 <= turn_index < len(session.exchanges)):
        raise IndexError(
            f"turn_index {turn_index} out of range "
            f"for session with {len(session.exchanges)} exchanges",
        )
    exch = session.exchanges[turn_index]
    score_before = current_authoritative_score(exch)
    rationale_before = current_authoritative_rationale(exch)
    entry = OverrideAuditEntry(
        timestamp=datetime.utcnow(),
        teacher_id=teacher_id,
        score_before=score_before,
        score_after=score_after,
        rationale_before=rationale_before,
        rationale_after=rationale_after,
        note=note,
    )
    exch.overrides.append(entry)
    session.updated_at = datetime.utcnow()
    await session.save()
    return entry
