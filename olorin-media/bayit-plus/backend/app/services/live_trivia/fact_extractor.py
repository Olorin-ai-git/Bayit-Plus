"""
Fact Extraction Service

Extracts trivia facts from web search results using Claude AI.
Generates multilingual facts (Hebrew, English, Spanish).
"""

import json
import logging
from typing import Dict, List, Optional

from anthropic import AsyncAnthropic

from app.core.config import settings
from app.models.trivia import TriviaFactModel
from app.services.live_trivia.input_sanitizer import sanitize_input

logger = logging.getLogger(__name__)


class FactExtractionService:
    """Service for extracting trivia facts from search results using AI."""

    def __init__(self, anthropic_client: Optional[AsyncAnthropic] = None):
        """Initialize fact extractor with optional injected Anthropic client."""
        self.anthropic_client = anthropic_client or AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.claude_model = settings.olorin.live_trivia.claude_model
        self.claude_max_tokens_long = settings.olorin.live_trivia.claude_max_tokens_long
        self.claude_temperature = settings.olorin.live_trivia.claude_temperature_facts
        self.fact_display_duration = settings.olorin.live_trivia.fact_display_duration
        self.fact_default_priority = settings.olorin.live_trivia.fact_default_priority
        self.fact_default_relevance = settings.olorin.live_trivia.fact_default_relevance

    async def extract_facts(
        self,
        topic_text: str,
        topic_type: str,
        search_result: Dict
    ) -> List[TriviaFactModel]:
        """
        Extract trivia facts from search result using Claude AI.

        Args:
            topic_text: Topic name (e.g., "Vladimir Putin")
            topic_type: Entity type (person|place|event|organization)
            search_result: Dict with keys: title, summary, url, source

        Returns:
            List of TriviaFactModel instances (max 3 facts)
        """
        summary = search_result.get("summary", "")
        source_url = search_result.get("url", "")

        if not summary:
            logger.warning(f"No summary available for '{topic_text}'")
            return []

        # Sanitize inputs to prevent prompt injection
        safe_topic = sanitize_input(topic_text, max_length=200)
        safe_type = sanitize_input(topic_type, max_length=50)
        safe_source = sanitize_input(search_result.get('source', 'unknown'), max_length=50)
        safe_summary = sanitize_input(summary, max_length=1500)

        prompt = f"""Extract 3 interesting trivia facts about this topic.

Topic: {safe_topic}
Type: {safe_type}
Source: {safe_source}

Information:
{safe_summary}

Requirements for each fact:
- Interesting and educational (Did you know? style)
- Maximum 150 characters per language
- Suitable for all audiences
- Factually accurate from the source text
- Generate in 3 languages: Hebrew (he), English (en), Spanish (es)

Respond with JSON array:
[
    {{
        "text_he": "Hebrew trivia fact here",
        "text_en": "English trivia fact here",
        "text_es": "Spanish trivia fact here",
        "category": "historical",
        "priority": 7
    }}
]

Categories: cast, production, location, cultural, historical
Priority: 1-10 (7-8 for news-related, 5-6 for general)"""

        try:
            message = await self.anthropic_client.messages.create(
                model=self.claude_model,
                max_tokens=self.claude_max_tokens_long,
                temperature=self.claude_temperature,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            response_text = message.content[0].text

            # Extract JSON from response (may have markdown code blocks)
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()

            facts_data = json.loads(response_text)

            if not isinstance(facts_data, list):
                logger.error(f"Expected list of facts, got: {type(facts_data)}")
                return []

            # Convert to TriviaFactModel instances
            facts = []
            for fact_dict in facts_data[:3]:  # Max 3 facts
                try:
                    # Validate fact lengths
                    text_he = fact_dict.get("text_he", "")
                    text_en = fact_dict.get("text_en", "")
                    text_es = fact_dict.get("text_es", "")

                    if len(text_he) > 150:
                        text_he = text_he[:147] + "..."
                    if len(text_en) > 150:
                        text_en = text_en[:147] + "..."
                    if len(text_es) > 150:
                        text_es = text_es[:147] + "..."

                    # Create TriviaFactModel
                    fact = TriviaFactModel(
                        text=text_he,  # Hebrew as primary
                        text_en=text_en,
                        text_es=text_es,
                        trigger_type="topic",
                        category=fact_dict.get("category", "historical"),
                        source="live_ai",
                        display_duration=self.fact_display_duration,
                        priority=fact_dict.get("priority", self.fact_default_priority),
                        detected_topic=topic_text,
                        topic_type=topic_type,
                        search_query=topic_text,
                        relevance_score=self.fact_default_relevance
                    )

                    facts.append(fact)
                    logger.info(
                        f"Extracted fact for '{topic_text}': "
                        f"{text_en[:50]}..."
                    )

                except Exception as e:
                    logger.error(f"Failed to create fact from data: {e}")
                    continue

            return facts

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude response as JSON: {e}")
            logger.debug(f"Response text: {response_text}")
            return []
        except Exception as e:
            logger.error(f"Fact extraction failed for '{topic_text}': {e}")
            return []

    def validate_fact_quality(self, fact: TriviaFactModel) -> bool:
        """
        Validate fact meets quality standards.

        Args:
            fact: TriviaFactModel to validate

        Returns:
            True if fact passes quality checks
        """
        # Check all language texts exist and are not empty
        if not fact.text or not fact.text_en or not fact.text_es:
            return False

        # Check length constraints
        if len(fact.text) > 150 or len(fact.text_en) > 150 or len(fact.text_es) > 150:
            return False

        # Check minimum length (at least 20 chars per language)
        if len(fact.text) < 20 or len(fact.text_en) < 20 or len(fact.text_es) < 20:
            return False

        # Check for placeholder text
        placeholders = ["TODO", "FIXME", "[", "]", "...", "N/A"]
        for text in [fact.text, fact.text_en, fact.text_es]:
            if any(placeholder in text for placeholder in placeholders):
                return False

        return True
