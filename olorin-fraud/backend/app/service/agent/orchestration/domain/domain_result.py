"""
Domain Result Structure - Uniform domain analysis results with validation.

This module provides a standardized structure for domain analysis results
that prevents score/narrative contradictions and enforces domain contracts.
"""

from dataclasses import dataclass, field
from typing import List, Literal, Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

Status = Literal["OK", "INSUFFICIENT_EVIDENCE"]


@dataclass
class DomainResult:
    """Standardized domain analysis result with validation."""

    name: str
    score: Optional[float]  # None iff insufficient evidence
    status: Status
    signals: List[str] = field(default_factory=list)
    confidence: float = 0.35
    narrative: str = ""
    is_public: Optional[bool] = None  # For network domain


def validate_domain(r: DomainResult) -> None:
    """
    Validate domain result for consistency and enforce contracts.

    Args:
        r: Domain result to validate
    """
    # 1) Score & status invariant: insufficient evidence => no numeric score
    if r.status == "INSUFFICIENT_EVIDENCE":
        if r.score is not None:
            logger.warning(
                f"Domain {r.name}: Clearing score {r.score} due to INSUFFICIENT_EVIDENCE status"
            )
        r.score = None

    # 2) Bound score to valid range
    if r.score is not None:
        original_score = r.score
        r.score = max(0.0, min(1.0, r.score))
        if r.score != original_score:
            logger.warning(
                f"Domain {r.name}: Bounded score from {original_score} to {r.score}"
            )

    # 3) If no signals, no numeric score (domain contract violation)
    if not r.signals and r.score is not None:
        logger.warning(
            f"Domain {r.name}: No signals but score={r.score} - marking insufficient evidence"
        )
        r.status = "INSUFFICIENT_EVIDENCE"
        r.score = None

    # 4) Bound confidence
    r.confidence = max(0.0, min(1.0, r.confidence))

    logger.debug(
        f"Domain {r.name} validated: score={r.score}, status={r.status}, signals={len(r.signals)}"
    )


def lint_domain_result(r: DomainResult) -> List[str]:
    """
    Lint domain result for narrative/score contradictions.

    Args:
        r: Domain result to lint

    Returns:
        List of detected issues
    """
    errors = []

    # Check score/status consistency
    if r.status == "INSUFFICIENT_EVIDENCE" and r.score is not None:
        errors.append(f"{r.name}: score present but status=INSUFFICIENT_EVIDENCE")

    # Check narrative consistency
    narrative_lower = r.narrative.lower()

    if "insufficient" in narrative_lower and (r.score or 0) >= 0.5:
        errors.append(f"{r.name}: narrative says insufficient but score={r.score}")

    if "low risk" in narrative_lower and (r.score or 0) > 0.4:
        errors.append(f"{r.name}: 'low risk' text but score={r.score}")

    if "no risk" in narrative_lower and (r.score or 0) > 0.2:
        errors.append(f"{r.name}: 'no risk' text but score={r.score}")

    # Check signals consistency
    if r.score is not None and r.score > 0.3 and len(r.signals) == 0:
        errors.append(f"{r.name}: elevated score {r.score} but no signals")

    return errors


def fmt_score(score: Optional[float]) -> str:
    """Format score safely, handling None values."""
    return "N/A" if score is None else f"{score:.3f}"
