"""
Text Cleaning - Remove duplicate boilerplate and normalize LLM output sections.

This module provides utilities to clean up repetitive text in LLM-generated
analysis sections, particularly risk factors and recommendations.
"""

import re
from typing import List

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def normalize_section(txt: str) -> str:
    """
    Squash repeated numbered lists and headings; collapse >1 blank line.
    Remove exact duplicate consecutive blocks for write-time deduplication.
    """
    if not isinstance(txt, str):
        return txt

    # Split into lines and remove trailing whitespace
    lines = [l.rstrip() for l in txt.splitlines()]

    # Drop exact duplicate consecutive blocks
    out, prev = [], None
    for l in lines:
        if l == prev:
            continue
        out.append(l)
        prev = l

    # Join and collapse multiple blank lines
    s = "\n".join(out)
    s = re.sub(r"\n{3,}", "\n\n", s)

    return s.strip()


def deduplicate_recommendations(
    recommendations: List[str], has_confirmed_fraud: bool = False
) -> List[str]:
    """
    Remove duplicate recommendations from a list and apply fraud severity guard.

    Args:
        recommendations: List of recommendation strings
        has_confirmed_fraud: Whether confirmed fraud was detected

    Returns:
        Deduplicated list of recommendations with severity guard applied
    """
    if not recommendations:
        return recommendations

    seen_content = set()
    unique_recommendations = []

    for rec in recommendations:
        if not rec or not isinstance(rec, str):
            continue

        # CRITICAL FIX: Apply fraud severity guard
        if has_confirmed_fraud:
            rec = _apply_fraud_severity_guard(rec)

        # Normalize for comparison
        normalized = re.sub(r"[^\w\s]", "", rec.lower())
        normalized = re.sub(r"\s+", " ", normalized).strip()

        if normalized not in seen_content and len(normalized) > 5:
            seen_content.add(normalized)
            unique_recommendations.append(rec.strip())

    return unique_recommendations


def _apply_fraud_severity_guard(recommendation: str) -> str:
    """
    Apply fraud severity guard to recommendation text.

    User requirement: "If has_confirmed_fraud: block 'monitoring' phrases, upgrade to 'immediate escalation'"

    Args:
        recommendation: Original recommendation text

    Returns:
        Modified recommendation with severity escalation
    """
    if not recommendation or not isinstance(recommendation, str):
        return recommendation

    # Patterns to replace in confirmed fraud cases
    monitoring_patterns = [
        (r"\bcontinue\s+monitoring\b", "immediate escalation required"),
        (r"\benhanced\s+monitoring\b", "immediate investigation"),
        (r"\bstandard\s+monitoring\b", "immediate escalation"),
        (r"\bmonitor\s+for\s+patterns\b", "escalate immediately for analysis"),
        (r"\bmonitor\s+closely\b", "escalate for immediate action"),
        (r"\bmonitoring\s+recommended\b", "immediate escalation required"),
        (r"\bmonitoring\s+sufficient\b", "immediate escalation required"),
    ]

    modified_rec = recommendation
    changes_made = 0

    for pattern, replacement in monitoring_patterns:
        new_text = re.sub(pattern, replacement, modified_rec, flags=re.IGNORECASE)
        if new_text != modified_rec:
            modified_rec = new_text
            changes_made += 1

    # If we made changes, log it
    if changes_made > 0:
        logger.debug(
            f"🚨 FRAUD SEVERITY GUARD: Upgraded {changes_made} monitoring phrases to escalation"
        )
        logger.debug(f"   Original: {recommendation}")
        logger.debug(f"   Modified: {modified_rec}")

    return modified_rec


def write_llm_sections(domain_obj: dict) -> None:
    """
    Apply write-time deduplication to LLM sections to prevent propagation of repeats.

    Args:
        domain_obj: Domain object containing llm_analysis section
    """
    if not isinstance(domain_obj, dict):
        return

    la = domain_obj.get("llm_analysis", {})
    if not isinstance(la, dict):
        return

    # Clean the key sections where duplication occurs
    for k in ("risk_factors", "reasoning", "recommendations"):
        if k in la and isinstance(la[k], str):
            la[k] = normalize_section(la[k])

    domain_obj["llm_analysis"] = la


def clean_llm_analysis_sections(analysis_dict: dict) -> dict:
    """
    Clean all text sections in an LLM analysis dictionary.

    Args:
        analysis_dict: Dictionary containing LLM analysis with text sections

    Returns:
        Cleaned analysis dictionary
    """
    if not isinstance(analysis_dict, dict):
        return analysis_dict

    # Text sections that commonly need cleaning
    text_sections = ["risk_factors", "reasoning", "recommendations", "llm_response"]

    for section in text_sections:
        if section in analysis_dict:
            analysis_dict[section] = normalize_section(analysis_dict[section])

    return analysis_dict


def _calculate_similarity(text1: str, text2: str) -> float:
    """
    Calculate similarity between two text strings using word overlap.

    Args:
        text1: First text string
        text2: Second text string

    Returns:
        Similarity score between 0.0 and 1.0
    """
    if not text1 or not text2:
        return 0.0

    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())

    if not words1 and not words2:
        return 1.0
    if not words1 or not words2:
        return 0.0

    intersection = len(words1.intersection(words2))
    union = len(words1.union(words2))

    return intersection / union if union > 0 else 0.0
