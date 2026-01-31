"""
Shoresh (Root Word) Service.
Uses Claude AI to extract Hebrew root words (שורש) from words.
Format: "הולך [הלך]" - word followed by root in brackets.
"""

import hashlib
from datetime import datetime
from typing import Dict, List

import anthropic

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Simple in-memory cache for shoresh extraction
_shoresh_cache: Dict[str, str] = {}


def _get_cache_key(text: str) -> str:
    """Generate cache key for text"""
    return hashlib.md5(text.encode()).hexdigest()


async def extract_shoresh(text: str, use_cache: bool = True) -> str:
    """
    Extract shoresh (root words) from Hebrew text using Claude.
    Returns text in format: "word [root]" for each word.
    Example: "הולך [הלך]", "כותבים [כתב]"
    """
    if not text or not text.strip():
        return text

    # Check cache
    cache_key = _get_cache_key(text)
    if use_cache and cache_key in _shoresh_cache:
        return _shoresh_cache[cache_key]

    prompt = f"""חלץ שורש מכל מילה בטקסט העברי הבא. החזר את הטקסט בפורמט: 'מילה [שורש]' לכל מילה.

דוגמה:
טקסט: "הילדים הולכים לבית הספר"
תשובה: "הילדים [ילד] הולכים [הלך] לבית [בית] הספר [ספר]"

טקסט: {text}

תשובה:"""

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        response = client.messages.create(
            model=settings.SUBTITLE_AI_MODEL,
            max_tokens=len(text) * 4,  # Shoresh adds brackets
            messages=[{"role": "user", "content": prompt}],
        )

        shoresh_text = response.content[0].text.strip()

        # Cache result
        if use_cache and len(_shoresh_cache) < settings.SUBTITLE_SHORESH_CACHE_MAX_SIZE:
            _shoresh_cache[cache_key] = shoresh_text

        logger.info(
            "Shoresh extracted",
            extra={
                "original_length": len(text),
                "result_length": len(shoresh_text),
                "cached": False,
            },
        )

        return shoresh_text

    except Exception as e:
        logger.error("Error extracting shoresh", extra={"error": str(e), "text": text})
        return text


async def extract_shoresh_batch(texts: List[str], use_cache: bool = True) -> List[str]:
    """
    Extract shoresh from multiple texts efficiently.
    Batches uncached texts into single API call.
    Returns list of texts with shoresh in same order as input.
    """
    results = []
    uncached_indices = []
    uncached_texts = []

    # Check cache first
    for i, text in enumerate(texts):
        if not text or not text.strip():
            results.append(text)
            continue

        cache_key = _get_cache_key(text)
        if use_cache and cache_key in _shoresh_cache:
            results.append(_shoresh_cache[cache_key])
        else:
            results.append(None)  # Placeholder
            uncached_indices.append(i)
            uncached_texts.append(text)

    # If all cached, return
    if not uncached_texts:
        logger.info(
            "Shoresh batch - all cached",
            extra={"total_texts": len(texts), "cache_hit_rate": 1.0},
        )
        return results

    # Batch process uncached texts
    texts_formatted = "\n---\n".join(
        [f"[{i+1}] {t}" for i, t in enumerate(uncached_texts)]
    )

    prompt = f"""חלץ שורש מכל מילה בכל אחד מהטקסטים הבאים. החזר כל טקסט בשורה נפרדת עם המספור המקורי, בפורמט 'מילה [שורש]'.

דוגמה:
[1] הילדים הולכים
תשובה:
[1] הילדים [ילד] הולכים [הלך]

טקסטים:
{texts_formatted}

תשובות:"""

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        response = client.messages.create(
            model=settings.SUBTITLE_AI_MODEL,
            max_tokens=sum(len(t) * 4 for t in uncached_texts),
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = response.content[0].text.strip()

        # Parse response
        parsed_count = 0
        for line in response_text.split("\n"):
            line = line.strip()
            if line.startswith("[") and "]" in line:
                try:
                    bracket_end = line.index("]")
                    idx = int(line[1:bracket_end]) - 1
                    shoresh_text = line[bracket_end + 1 :].strip()

                    if 0 <= idx < len(uncached_texts):
                        original_idx = uncached_indices[idx]
                        results[original_idx] = shoresh_text
                        parsed_count += 1

                        # Cache
                        if use_cache and len(_shoresh_cache) < settings.SUBTITLE_SHORESH_CACHE_MAX_SIZE:
                            cache_key = _get_cache_key(uncached_texts[idx])
                            _shoresh_cache[cache_key] = shoresh_text
                except (ValueError, IndexError):
                    continue

        # Fill any remaining Nones with original text (fallback)
        for i, result in enumerate(results):
            if result is None:
                results[i] = texts[i]

        cache_hit_rate = (len(texts) - len(uncached_texts)) / len(texts)
        logger.info(
            "Shoresh batch extracted",
            extra={
                "total_texts": len(texts),
                "uncached_texts": len(uncached_texts),
                "parsed_count": parsed_count,
                "cache_hit_rate": cache_hit_rate,
            },
        )

        return results

    except Exception as e:
        logger.error(
            "Error batch extracting shoresh",
            extra={
                "error": str(e),
                "total_texts": len(texts),
                "uncached_count": len(uncached_texts),
            },
        )
        # Return original texts for uncached items
        for idx in uncached_indices:
            if results[idx] is None:
                results[idx] = texts[idx]
        return results


def clear_cache():
    """Clear shoresh cache"""
    global _shoresh_cache
    _shoresh_cache = {}
    logger.info("Shoresh cache cleared")


def get_cache_stats() -> Dict[str, int]:
    """Get cache statistics"""
    return {
        "shoresh_cache_size": len(_shoresh_cache),
        "max_size": settings.SUBTITLE_SHORESH_CACHE_MAX_SIZE,
    }
