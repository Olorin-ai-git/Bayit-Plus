"""
Response Formatter Module
Voice response formatting utilities for wizard chat
"""

from anthropic.types import Message, TextBlock


def extract_text_from_response(response: Message) -> str:
    """
    Extract text content from Claude response.

    Args:
        response: Claude API response message

    Returns:
        Extracted text content
    """
    text_blocks = [
        block.text for block in response.content
        if isinstance(block, TextBlock)
    ]
    return " ".join(text_blocks).strip()


def format_for_voice(text: str) -> str:
    """
    Format text for voice output.
    Remove markdown, complex punctuation, etc.

    Args:
        text: Raw text from Claude

    Returns:
        Voice-optimized text
    """
    # Remove markdown formatting
    text = text.replace("**", "").replace("*", "")
    text = text.replace("#", "").replace("`", "")

    # Remove brackets and parentheses
    text = text.replace("[", "").replace("]", "")
    text = text.replace("(", "").replace(")", "")

    # Normalize whitespace
    text = " ".join(text.split())

    return text.strip()
