"""Training-portal response schemas for ComprehensionReport (full fidelity).

Teacher surface schemas carry numeric score + rationale because the training
JWT is teacher-trusted (D-03/D-08). B2B sanitised DTOs live in
app/schemas/partner_comprehension.py (D-19).
"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ReportTurnResponse(BaseModel):
    """Per-turn teacher-facing payload mirroring ReportTurn."""

    turn_index: int
    question_text: str
    student_answer: str
    numeric_score: int = Field(..., ge=0, le=3)
    rationale: str
    adapt_level: str
    moment_timestamp: float
    override_applied: bool
    original_numeric_score: int = Field(..., ge=0, le=3)
    original_rationale: str


class ComprehensionReportResponse(BaseModel):
    """Full-fidelity report payload for authenticated teacher reads."""

    session_id: str = Field(..., description="Alias for comprehension_session_id")
    comprehension_session_id: str
    partner_id: str
    user_id: str
    profile_id: str
    content_id: str
    character_name: str
    turn_count: int
    avg_score: float
    high_count: int
    med_count: int
    low_count: int
    turns: List[ReportTurnResponse]
    status: str
    generation_attempts: int
    last_error: Optional[str] = None
    generated_at: datetime


class ComprehensionReportSummary(BaseModel):
    """List-view row (no turns array) for the teacher dashboard."""

    session_id: str
    partner_id: str
    user_id: str
    profile_id: str
    content_id: str
    character_name: str
    turn_count: int
    avg_score: float
    high_count: int
    med_count: int
    low_count: int
    status: str
    generated_at: datetime


class OverrideRequest(BaseModel):
    """Body for POST override endpoint (D-11, D-13)."""

    score_after: int = Field(..., ge=0, le=3)
    rationale_after: str = Field(..., min_length=1, max_length=2000)
    note: Optional[str] = Field(default=None, max_length=500)
