"""
Topic Validation Service

Validates topic relevance using Claude AI for live trivia system.
"""

import json
import logging
from typing import Tuple

from anthropic import AsyncAnthropic

from app.services.live_trivia.input_sanitizer import sanitize_input

logger = logging.getLogger(__name__)


class TopicValidator:
    """Validates topics using Claude AI for relevance and newsworthiness."""

    def __init__(
        self,
        anthropic_client: AsyncAnthropic,
        claude_model: str,
        max_tokens: int,
        temperature: float = 0.0
    ):
        """Initialize topic validator with injected Anthropic client."""
        self.anthropic_client = anthropic_client
        self.claude_model = claude_model
        self.max_tokens = max_tokens
        self.temperature = temperature

    async def validate_topic(
        self,
        topic_text: str,
        entity_type: str,
        context: str
    ) -> Tuple[bool, float]:
        """
        Validate topic relevance using Claude AI.

        Args:
            topic_text: Topic/entity text
            entity_type: Type (person|place|event|organization)
            context: Surrounding transcript context

        Returns:
            (is_relevant, confidence_score) tuple
        """
        # Sanitize inputs to prevent prompt injection
        safe_topic = sanitize_input(topic_text, max_length=200)
        safe_type = sanitize_input(entity_type, max_length=50)
        safe_context = sanitize_input(context, max_length=500)

        prompt = f"""Analyze if this topic is newsworthy and suitable for generating trivia facts.

Topic: {safe_topic}
Type: {safe_type}
Context: {safe_context}

Criteria for relevance:
- Well-known entity (not obscure local names)
- Newsworthy or historically significant
- Has interesting trivia facts available
- Suitable for educational content

Respond with JSON:
{{
    "is_relevant": true/false,
    "confidence": 0.0-1.0,
    "reason": "brief explanation"
}}"""

        try:
            message = await self.anthropic_client.messages.create(
                model=self.claude_model,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            response_text = message.content[0].text
            result = json.loads(response_text)

            is_relevant = result.get("is_relevant", False)
            confidence = result.get("confidence", 0.0)

            logger.info(
                f"AI validation: {topic_text} → relevant={is_relevant}, "
                f"confidence={confidence:.2f}, reason={result.get('reason')}"
            )

            return (is_relevant, confidence)

        except Exception as e:
            logger.error(f"AI validation failed for '{topic_text}': {e}")
            # On error, return False to be conservative
            return (False, 0.0)
