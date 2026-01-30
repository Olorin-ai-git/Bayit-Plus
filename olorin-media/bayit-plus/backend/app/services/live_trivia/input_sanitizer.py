"""
Input Sanitization Utility

Sanitizes user input to prevent prompt injection attacks.

Security measures:
- Length truncation
- Removal of code block markers (```)
- Removal of XML-like tags (< >)
- Removal of newlines
"""


def sanitize_input(text: str, max_length: int = 500) -> str:
    """
    Sanitize user input to prevent prompt injection.

    Args:
        text: Input text to sanitize
        max_length: Maximum allowed length

    Returns:
        Sanitized text, safe for use in AI prompts
    """
    if not text:
        return ""

    # Truncate to max length
    text = text[:max_length]

    # Remove potential prompt injection patterns
    # Remove triple backticks that could break out of XML/JSON blocks
    text = text.replace("```", "")

    # Remove XML-like tags that could break prompt structure
    text = text.replace("<", "").replace(">", "")

    # Remove newlines that could break prompt formatting
    text = text.replace("\n", " ").replace("\r", " ")

    return text.strip()
