"""
Text deduplication utilities.
"""

def dedupe_lines(block: str) -> str:
    """Deduplicate repeating recommendations."""
    seen, out = set(), []
    for line in (block or "").splitlines():
        key = line.strip()
        if key and key not in seen:
            seen.add(key)
            out.append(line)
    return "\n".join(out)


# Standard assessment footer text
ASSESSMENT_FOOTER = (
    "This assessment is based solely on the provided evidence and should be "
    "considered in conjunction with other fraud detection mechanisms and broader context if available."
)


def normalize_section(txt: str) -> str:
    """
    Normalize section text by removing duplicate assessment footers and deduplicating lines.
    
    Args:
        txt: Text to normalize
        
    Returns:
        Cleaned and normalized text
    """
    txt = (txt or "").strip()
    if not txt:
        return txt
    
    # Split by footer text and keep only unique parts
    parts = [p.strip() for p in txt.split(ASSESSMENT_FOOTER) if p.strip()]
    
    # Check if footer was present originally
    has_footer = ASSESSMENT_FOOTER in txt
    
    # Join unique parts and deduplicate lines
    cleaned_content = dedupe_lines("\n".join(parts)).strip()
    
    # Add footer back if it was present originally
    if has_footer and cleaned_content:
        return f"{cleaned_content}\n\n{ASSESSMENT_FOOTER}"
    
    return cleaned_content


def clean_recommendations(recommendations: str) -> str:
    """
    Clean recommendations by removing duplicates and normalizing format.
    
    Args:
        recommendations: Raw recommendations text
        
    Returns:
        Cleaned recommendations text
    """
    return normalize_section(recommendations)


def clean_reasoning(reasoning: str) -> str:
    """
    Clean reasoning text by removing duplicates and normalizing format.
    
    Args:
        reasoning: Raw reasoning text
        
    Returns:
        Cleaned reasoning text
    """
    return normalize_section(reasoning)


def clean_assessment(assessment: str) -> str:
    """
    Clean assessment text by removing duplicates and normalizing format.
    
    Args:
        assessment: Raw assessment text
        
    Returns:
        Cleaned assessment text
    """
    return normalize_section(assessment)