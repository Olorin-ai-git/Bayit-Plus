"""
Question Templates

Config-driven generic question templates for movie character interactions.
Supports placeholder substitution for {movie_title} and {other_character}.
Character-specific questions (from AI) are returned first, then generic.
"""

from typing import List

from app.core.logging_config import get_logger
from app.models.vod_interaction import ContentCharacter

logger = get_logger(__name__)

GENERIC_TEMPLATES: List[str] = [
    "What was the hardest decision you had to make in {movie_title}?",
    "How did you feel about {other_character}?",
    "What would you do differently if you could relive {movie_title}?",
    "What is your biggest secret that the audience never learned?",
    "If you could send a message to your past self, what would it be?",
    "What scene in {movie_title} was the most emotional for you?",
    "Do you think the ending of {movie_title} was fair to you?",
    "What motivates you more than anything else?",
]


def get_questions_for_character(
    character: ContentCharacter,
    all_characters: List[ContentCharacter],
    movie_title: str,
) -> tuple[List[str], List[str]]:
    """
    Return (specific_questions, generic_questions) for a character.

    Specific questions come from AI-generated suggested_questions.
    Generic questions are template-based with placeholder substitution.
    """
    specific = list(character.suggested_questions)

    other_names = [
        c.name for c in all_characters if c.name != character.name
    ]
    other_character = other_names[0] if other_names else "the others"

    generic: List[str] = []
    for template in GENERIC_TEMPLATES:
        question = template.replace(
            "{movie_title}", movie_title
        ).replace(
            "{other_character}", other_character
        )
        generic.append(question)

    return specific, generic
