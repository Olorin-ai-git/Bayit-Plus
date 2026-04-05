"""B2B partner-facing sanitised DTOs for comprehension_mode capability.

Hard invariants per D-19 (Phase 3 CONTEXT):
  - Score is expressed as `band: low|med|high` only — NEVER numeric 0-3.
  - Rationale is the short one-sentence field, override-aware.
  - Scoring criteria text is NEVER serialised in responses.
  - Grader prompts are NEVER serialised in responses.
  - Internal fields (adapt_level raw, memory_retry_pending, full exchanges list)
    are stripped from partner responses.

These response shapes contain band + rationale_summary only; no numeric
fields, no scoring-criteria text, no prompt text.
"""
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class PartnerTurnDTO(BaseModel):
    """Per-turn partner payload — band-only, no numeric score exposure."""

    turn_index: int
    band: Literal["low", "med", "high"]
    rationale_summary: str = Field(
        ..., description="Authoritative rationale truncated to 240 chars",
    )
    adapt_level: str
    moment_timestamp: float
    override_applied: bool


class PartnerSessionDTO(BaseModel):
    """Session metadata exposed to partners."""

    session_id: str
    external_session_id: Optional[str]
    content_id: str
    character_name: str
    status: str
    turn_count: int
    created_at: datetime


class PartnerReportDTO(BaseModel):
    """Sanitised report DTO — histogram counts only, no numeric scores."""

    session_id: str
    content_id: str
    turn_count: int
    high_count: int
    med_count: int
    low_count: int
    turns: List[PartnerTurnDTO]
    generated_at: datetime
    override_applied_any: bool


class PartnerCreateSessionRequest(BaseModel):
    """Body for POST /partner/comprehension/sessions."""

    content_id: str
    user_id: str
    profile_id: str
    character_name: str
    scene_context: Optional[str] = None


class PartnerPostTurnRequest(BaseModel):
    """Body for POST /partner/comprehension/sessions/{sid}/turns."""

    question_text: str
    student_answer: str
    scoring_criteria: str = Field(
        ...,
        description="Per-film scoring criteria text passed through to the stateless grader",
    )
    playback_seconds: float
    moment_timestamp: float
    answer_modality: Literal["text", "voice"] = "text"
