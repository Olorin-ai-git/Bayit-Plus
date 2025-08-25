from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class VerificationVerdict(str, Enum):
    pass_ = "pass"
    fail = "fail"


class VerificationCategoryScores(BaseModel):
    correctness: float = Field(ge=0.0, le=1.0)
    completeness: float = Field(ge=0.0, le=1.0)
    adherence: float = Field(ge=0.0, le=1.0)
    grounding: float = Field(ge=0.0, le=1.0)
    safety: float = Field(ge=0.0, le=1.0)


class VerificationReport(BaseModel):
    weighted_score: float = Field(ge=0.0, le=1.0)
    category_scores: VerificationCategoryScores
    verdict: VerificationVerdict
    hard_gate_failures: List[str] = []
    required_fixes: List[str] = []
    rationale: Optional[str] = None
    suggested_retry_suffix: Optional[str] = None


class VerificationContext(BaseModel):
    request_id: Optional[str] = None
    task_type: str
    system_prompt_or_instructions: Optional[str] = None
    conversation_history: Optional[List[Dict[str, Any]]] = None
    user_request: Optional[str] = None
    original_prompt: Optional[str] = None
    original_response_text: str
    schema_id: Optional[str] = None
    schema_json: Optional[Dict[str, Any]] = None


class VerificationPolicy(BaseModel):
    threshold: float = 0.85
    max_retries: int = 1
    min_adherence: float = 0.0
    min_safety: float = 0.0

    def is_passing(self, report: VerificationReport) -> bool:
        if report.verdict == VerificationVerdict.fail:
            return False
        if report.hard_gate_failures:
            return False
        if report.category_scores.adherence < self.min_adherence:
            return False
        if report.category_scores.safety < self.min_safety:
            return False
        return report.weighted_score >= self.threshold
