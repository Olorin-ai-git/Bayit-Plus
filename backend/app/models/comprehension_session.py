"""ComprehensionSession - Phase 2 scored comprehension turn persistence.

Per D-01: new, separate Beanie Document. References VODFilmMemory by the same
natural key (user_id, profile_id, content_id) but does NOT extend it. Preserves
Phase 1 invariants - rolling back Phase 2 drops this collection without any
migration of VODFilmMemory.

Per D-02: each scored turn dual-writes - ScoredExchange here (grading record)
AND a verbatim FilmMemoryExchange into VODFilmMemory (character-memory record).
The Phase 1 append path stays the single writer to VODFilmMemory.

Per D-17: resume-state only, no restart affordance. Status transitions
'active' -> 'completed' only; there is no 'restart' status and no restart method.

Per D-18: memory_retry_pending flag tags exchanges whose VODFilmMemory append
failed so ARQ retry worker can reconcile eventually-consistently.
"""
from datetime import datetime
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import ASCENDING, IndexModel

from app.schemas.comprehension import AdaptLevel, RubricScore


class OverrideAuditEntry(BaseModel):
    """Append-only teacher override row on ScoredExchange.overrides[] (D-11, D-12).

    Forensic-friendly audit trail: never overwrites history. The current
    authoritative score is the last element of overrides[] or the original
    rubric score if overrides is empty.
    """

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    teacher_id: str = Field(
        ..., description="TrainingUser id of the teacher who authored the override",
    )
    score_before: int = Field(
        ..., ge=0, le=3, description="Score prior to this override row",
    )
    score_after: int = Field(
        ..., ge=0, le=3, description="Score this override row asserts",
    )
    rationale_before: str = Field(
        ..., description="Rationale prior to this override row (may be empty)",
    )
    rationale_after: str = Field(
        ..., description="Teacher-authored rationale for this override (D-12)",
    )
    note: Optional[str] = Field(
        default=None, description="Optional free-text note from teacher",
    )


class ScoredExchange(BaseModel):
    """Single comprehension turn with rubric score. Per D-02, D-12, D-13, D-18."""

    question_text: str = Field(
        ..., description="Character's in-voice question (D-09)",
    )
    student_answer: str = Field(
        ..., description="Verbatim student response (text or STT transcript)",
    )
    score: RubricScore = Field(
        ..., description="Stateless grader output (D-10, D-11)",
    )
    adapt_level: AdaptLevel = Field(
        ..., description="Current position in 2-level adapt (D-12)",
    )
    parent_exchange_index: Optional[int] = Field(
        None,
        description="Index of prior ScoredExchange this retry/follow-up extends (D-13)",
    )
    moment_timestamp: float = Field(
        ..., description="Seconds into video when question was asked",
    )
    answer_modality: str = Field(
        default="text", description="'text' or 'voice' per D-16",
    )
    memory_retry_pending: bool = Field(
        default=False,
        description="D-18: True if VODFilmMemory append failed and ARQ retry is enqueued",
    )
    overrides: List[OverrideAuditEntry] = Field(
        default_factory=list,
        description=(
            "D-11: append-only teacher override audit trail. Last row (if any) "
            "carries the authoritative post-override score and rationale."
        ),
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ComprehensionSession(Document):
    """One comprehension session scoped to (user, profile, content). Per D-01, D-17.

    Natural-key joined with VODFilmMemory at prompt-build time. No MongoDB FK.
    Mirrors VODInteractionSession status lifecycle for resume integrity. Denorms
    character reference fields for prompt-build efficiency, matching the
    denormalization pattern from VODInteractionSession.
    """

    user_id: str
    profile_id: str
    content_id: str
    # Denormalized from CharacterProfile for prompt-build efficiency
    # (pattern from VODInteractionSession)
    character_name: str
    scene_context: Optional[str] = Field(
        None, description="Denormalized scene context at session start",
    )
    character_voice_id: Optional[str] = Field(
        None,
        description="Denormalized ElevenLabs voice_id for D-15 modality continuity",
    )
    character_frame_url: Optional[str] = Field(
        None, description="Denormalized character still frame URL",
    )
    rubric_config_id: Optional[str] = Field(
        None,
        description="Per-film rubric identifier (D-05 - per-film for MVP)",
    )
    exchanges: List[ScoredExchange] = Field(default_factory=list)
    current_adapt_level: AdaptLevel = Field(default=AdaptLevel.INITIAL)
    last_trigger_at_playback_seconds: float = Field(
        default=0.0,
        description="D-07 rate-limit anchor - max 1 trigger per 90s playback",
    )
    status: str = Field(
        default="active",
        description=(
            "'active' | 'completed'. Resume-only per D-17; "
            "no 'restart' value ever."
        ),
    )
    partner_id: Optional[str] = Field(
        default=None,
        description="D-02 org scoping + D-23 metering — partner that owns this session",
    )
    external_session_id: Optional[str] = Field(
        default=None,
        description="D-18: partner-supplied idempotency key for session creation",
    )
    share_token: Optional[str] = Field(
        default=None,
        description="D-09 cryptographic capability URL slug (secrets.token_urlsafe)",
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "comprehension_sessions"
        indexes = [
            IndexModel(
                [("user_id", 1), ("profile_id", 1), ("content_id", 1)],
                name="user_profile_content_lookup",
                # NOT unique - multiple sessions per film allowed over time per D-01
            ),
            "status",
            "updated_at",
            "partner_id",
            IndexModel(
                [("share_token", ASCENDING)],
                unique=True,
                sparse=True,
                name="share_token_unique",
            ),
            IndexModel(
                [("partner_id", ASCENDING), ("external_session_id", ASCENDING)],
                unique=True,
                sparse=True,
                name="partner_external_session_unique",
            ),
        ]


def current_authoritative_score(exch: ScoredExchange) -> int:
    """Return the post-override numeric score (0-3) for an exchange (D-11)."""
    if exch.overrides:
        return exch.overrides[-1].score_after
    return exch.score.score


def current_authoritative_rationale(exch: ScoredExchange) -> str:
    """Return the post-override rationale for an exchange (D-12)."""
    if exch.overrides:
        return exch.overrides[-1].rationale_after
    return exch.score.rationale
