"""
Data Parser

Handles parsing of Snowflake data from message content.
"""

import json
from typing import Dict, Any

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DataParser:
    """Utilities for parsing Snowflake data."""

    @staticmethod
    def parse_snowflake_data(content: str) -> Dict[str, Any]:
        """Parse Snowflake data from message content."""
        if isinstance(content, str):
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                logger.warning(f"Snowflake data is not valid JSON, attempting to parse Python repr: {content[:100]}...")
                try:
                    import ast
                    return ast.literal_eval(content)
                except (ValueError, SyntaxError):
                    logger.error("Failed to parse Snowflake data as JSON or Python literal")
                    return {"error": "Failed to parse Snowflake data", "raw": content}
        return content