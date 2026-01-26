"""
Intent Parser - Parse natural language commands into structured intents.

Uses Claude to understand user commands and extract parameters with confidence scoring.
"""

import json
import logging
from typing import Any, Dict, Optional

from anthropic import Anthropic
from pydantic import BaseModel, Field

from app.core.config import settings

logger = logging.getLogger(__name__)


class ParsedIntent(BaseModel):
    """Structured representation of parsed user intent."""

    intent: str = Field(description="Intent type (upload_series, search_content, etc.)")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score (0.0-1.0)")
    params: Dict[str, Any] = Field(default_factory=dict, description="Extracted parameters")
    requires_confirmation: bool = Field(default=False, description="Whether to confirm before executing")
    suggested_command: Optional[str] = Field(default=None, description="Suggested shell command")


# Intent mappings to shell scripts or handlers
INTENT_MAPPINGS = {
    "upload_series": {
        "script": "scripts/backend/upload_series.sh",
        "params": ["source", "series", "season", "limit", "url"],
        "requires_confirmation": True,
        "description": "Upload TV series from USB or URL"
    },
    "upload_movies": {
        "script": "scripts/backend/upload_movies.sh",
        "params": ["source", "limit", "start_from", "url"],
        "requires_confirmation": True,
        "description": "Upload movies from USB or URL"
    },
    "upload_podcasts": {
        "script": "scripts/backend/upload_podcasts.sh",
        "params": ["source", "limit", "url"],
        "requires_confirmation": True,
        "description": "Upload podcasts from USB or URL"
    },
    "search_content": {
        "handler": "semantic_search",
        "params": ["query", "content_type", "limit"],
        "requires_confirmation": False,
        "description": "Search content library with natural language"
    },
    "update_metadata": {
        "handler": "update_content",
        "params": ["content_id", "field", "value"],
        "requires_confirmation": True,
        "description": "Update content metadata"
    },
    "run_audit": {
        "handler": "agent_audit",
        "params": ["audit_type", "dry_run"],
        "requires_confirmation": True,
        "description": "Run AI-powered content audit"
    },
    "get_stats": {
        "handler": "content_stats",
        "params": ["stat_type", "time_period"],
        "requires_confirmation": False,
        "description": "Get content library statistics"
    },
    "status_check": {
        "handler": "platform_status",
        "params": ["platform"],
        "requires_confirmation": False,
        "description": "Check platform status"
    }
}


class IntentParser:
    """Parse natural language commands using Claude."""

    def __init__(self):
        """Initialize parser with Anthropic client."""
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is required for NLP features")

        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.confidence_threshold = settings.NLP_CONFIDENCE_THRESHOLD

    async def parse_command(
        self,
        query: str,
        context: Optional[Dict[str, Any]] = None
    ) -> ParsedIntent:
        """
        Parse natural language command into structured intent.

        Args:
            query: Natural language command from user
            context: Optional context (platform, user preferences, etc.)

        Returns:
            ParsedIntent with intent type, parameters, and confidence score

        Examples:
            >>> await parser.parse_command("upload family ties season 2 from usb")
            ParsedIntent(
                intent="upload_series",
                confidence=0.95,
                params={"series": "family ties", "season": 2, "source": "usb"},
                requires_confirmation=True
            )

            >>> await parser.parse_command("search for jewish holiday content")
            ParsedIntent(
                intent="search_content",
                confidence=0.92,
                params={"query": "jewish holiday content"},
                requires_confirmation=False
            )
        """
        logger.info(f"Parsing command: {query}")

        # Build system prompt
        system_prompt = self._build_system_prompt()

        # Build user message
        user_message = self._build_user_message(query, context)

        # Call Claude with structured output
        try:
            response = self.client.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=500,
                temperature=0.0,  # Deterministic for intent parsing
                system=system_prompt,
                messages=[{
                    "role": "user",
                    "content": user_message
                }]
            )

            # Extract JSON response
            response_text = response.content[0].text
            result = json.loads(response_text)

            # Build ParsedIntent
            intent = ParsedIntent(
                intent=result["intent"],
                confidence=result["confidence"],
                params=result.get("params", {}),
                requires_confirmation=result.get("requires_confirmation", False),
                suggested_command=result.get("suggested_command")
            )

            logger.info(f"Parsed intent: {intent.intent} (confidence: {intent.confidence:.2f})")

            return intent

        except Exception as e:
            logger.error(f"Intent parsing failed: {e}")
            # Return low-confidence fallback
            return ParsedIntent(
                intent="unknown",
                confidence=0.0,
                params={"query": query, "error": str(e)},
                requires_confirmation=True
            )

    def _build_system_prompt(self) -> str:
        """Build system prompt for intent parsing."""

        # Build intent definitions from mappings
        intent_descriptions = []
        for intent, info in INTENT_MAPPINGS.items():
            params_str = ", ".join(info["params"])
            intent_descriptions.append(
                f"- {intent}: {info['description']} (params: {params_str})"
            )

        intents_text = "\n".join(intent_descriptions)

        return f"""You are an intent parser for the Olorin CLI. Parse user commands into structured intents.

Available intents:
{intents_text}

Respond ONLY with valid JSON in this format:
{{
    "intent": "intent_name",
    "confidence": 0.0-1.0,
    "params": {{"param1": "value1", "param2": "value2"}},
    "requires_confirmation": true/false,
    "suggested_command": "optional shell command"
}}

Parameter extraction rules:
- "from usb" → automatically detect USB paths like /Volumes/USB/Series
- "family ties season 2" → extract series name and season number
- "first 5 movies" → extract limit=5
- "jewish holiday content" → extract query text
- Season numbers: "season 2", "s2", "S02" all → season=2
- Content types: detect "series", "movies", "podcasts" automatically

Confidence scoring:
- 0.9-1.0: Very clear command with all parameters
- 0.7-0.9: Clear intent but some parameters ambiguous
- 0.5-0.7: Intent unclear or multiple interpretations
- 0.0-0.5: Cannot determine intent

If confidence < 0.7, set requires_confirmation=true
"""

    def _build_user_message(
        self,
        query: str,
        context: Optional[Dict[str, Any]]
    ) -> str:
        """Build user message with query and context."""

        message = f"Parse this command:\n\n{query}"

        if context:
            message += f"\n\nContext:\n{json.dumps(context, indent=2)}"

        return message

    def get_intent_mapping(self, intent: str) -> Optional[Dict]:
        """Get mapping information for an intent."""
        return INTENT_MAPPINGS.get(intent)
