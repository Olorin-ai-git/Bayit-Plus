"""
Cultural Reference Detection

Pattern-based and AI-powered reference detection.
"""

import json
import logging
import re
from typing import List, Optional, Tuple

from app.core.config import settings
from app.models.cultural_reference import CulturalReference, DetectedReference
from app.services.olorin.context.cache import AliasCache

logger = logging.getLogger(__name__)

# Try to import Claude
try:
    from anthropic import AsyncAnthropic
    CLAUDE_AVAILABLE = True
except ImportError:
    AsyncAnthropic = None
    CLAUDE_AVAILABLE = False


async def get_claude_client() -> Optional[AsyncAnthropic]:
    """Get Claude client if available."""
    if CLAUDE_AVAILABLE and settings.ANTHROPIC_API_KEY:
        return AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    return None


async def pattern_based_detection(
    text: str,
    min_confidence: float,
    alias_cache: AliasCache,
) -> List[DetectedReference]:
    """
    Pattern-based detection using knowledge base.

    Args:
        text: Text to search
        min_confidence: Minimum confidence threshold
        alias_cache: Alias cache instance

    Returns:
        List of detected references
    """
    # First pass: collect all matches and their reference IDs
    matches_by_ref_id: dict[str, List[Tuple[re.Match, str]]] = {}

    for alias, ref_id in alias_cache.aliases.items():
        if len(alias) < 3:
            continue

        pattern = re.compile(r'\b' + re.escape(alias) + r'\b', re.IGNORECASE)
        for match in pattern.finditer(text):
            if ref_id not in matches_by_ref_id:
                matches_by_ref_id[ref_id] = []
            matches_by_ref_id[ref_id].append((match, alias))

    if not matches_by_ref_id:
        return []

    # Batch load all referenced CulturalReference documents
    ref_ids = list(matches_by_ref_id.keys())
    refs = await CulturalReference.find(
        {"reference_id": {"$in": ref_ids}}
    ).to_list()
    refs_by_id = {r.reference_id: r for r in refs}

    # Build detected references using cached data
    detected = []
    for ref_id, match_list in matches_by_ref_id.items():
        ref = refs_by_id.get(ref_id)
        if not ref:
            continue

        for match, _alias in match_list:
            confidence = 0.9 if match.group().lower() == ref.canonical_name.lower() else 0.8

            if confidence >= min_confidence:
                detected.append(
                    DetectedReference(
                        reference_id=ref.reference_id,
                        canonical_name=ref.canonical_name,
                        canonical_name_en=ref.canonical_name_en,
                        category=ref.category,
                        subcategory=ref.subcategory,
                        matched_text=match.group(),
                        start_position=match.start(),
                        end_position=match.end(),
                        confidence=confidence,
                        short_explanation=ref.short_explanation,
                        short_explanation_en=ref.short_explanation_en,
                    )
                )

    # Remove duplicates (keep highest confidence)
    unique = {}
    for d in detected:
        key = (d.reference_id, d.start_position)
        if key not in unique or d.confidence > unique[key].confidence:
            unique[key] = d

    return list(unique.values())


async def ai_detection(
    text: str,
    language: str,
    min_confidence: float,
) -> Tuple[List[DetectedReference], int]:
    """
    AI-powered detection using Claude.

    Args:
        text: Text to analyze
        language: Text language
        min_confidence: Minimum confidence threshold

    Returns:
        Tuple of (detected references, tokens used)
    """
    detected = []
    tokens_used = 0

    claude = await get_claude_client()
    if not claude:
        return detected, 0

    try:
        prompt = f"""Analyze the following {language.upper()} text and identify any Israeli or Jewish cultural references that a non-Israeli viewer might not understand.

For each reference found, provide:
1. The exact text that contains the reference
2. A brief identifier (lowercase, hyphenated)
3. Category (person, place, event, term, organization, holiday, food, slang, law, military, media, sport, religion)
4. A one-sentence explanation in English

Text to analyze:
{text}

Respond in JSON format:
{{
  "references": [
    {{
      "matched_text": "exact text from input",
      "reference_id": "identifier-like-this",
      "category": "category",
      "explanation_en": "Brief explanation"
    }}
  ]
}}

Only include references that require cultural context. Do not include common names or well-known international references."""

        response = await claude.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )

        tokens_used = response.usage.input_tokens + response.usage.output_tokens

        content = response.content[0].text
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            data = json.loads(json_match.group())
            for ref_data in data.get("references", []):
                matched_text = ref_data.get("matched_text", "")
                pos = text.find(matched_text)
                if pos == -1:
                    pos = text.lower().find(matched_text.lower())

                if pos >= 0:
                    detected.append(
                        DetectedReference(
                            reference_id=ref_data.get("reference_id", "unknown"),
                            canonical_name=matched_text,
                            canonical_name_en=matched_text,
                            category=ref_data.get("category", "term"),
                            matched_text=matched_text,
                            start_position=pos,
                            end_position=pos + len(matched_text),
                            confidence=0.75,
                            short_explanation=ref_data.get("explanation_en", ""),
                            short_explanation_en=ref_data.get("explanation_en", ""),
                        )
                    )

    except json.JSONDecodeError:
        logger.warning("Failed to parse AI detection response")
    except Exception as e:
        logger.error(f"AI detection failed: {e}")

    return detected, tokens_used
