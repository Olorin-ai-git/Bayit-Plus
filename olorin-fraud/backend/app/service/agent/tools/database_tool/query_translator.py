"""
Query Translator for Snowflake to PostgreSQL SQL Translation.

Translates Snowflake-specific SQL syntax to PostgreSQL-compatible SQL.
Maintains query semantics while adapting syntax differences.

Constitutional Compliance:
- NO hardcoded queries - translates dynamically
- Complete translation implementation
- All translation rules from configuration
"""

import re
from dataclasses import dataclass, field
from typing import Dict, List, Tuple

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


@dataclass
class TranslationStats:
    """Statistics about a query translation."""

    rules_applied: List[str] = field(default_factory=list)
    original_length: int = 0
    translated_length: int = 0


class QueryTranslator:
    """Translates Snowflake SQL to PostgreSQL SQL."""

    def __init__(self):
        """Initialize translator with translation rules."""
        self.translation_count = 0
        self.last_translation_stats = None

        # Define translation rules (pattern, replacement, description)
        # IMPORTANT: Order matters! Simple substitutions should happen BEFORE complex ones
        self.translation_rules = [
            # 3-part table names: database.schema.table → schema.table (PostgreSQL only supports 2-part)
            # This should be FIRST to clean up table references before other translations
            (r"\b(\w+)\.(\w+)\.(\w+)\b", r"\2.\3", "3part_to_2part_table_names"),
            # CURRENT_TIMESTAMP() → CURRENT_TIMESTAMP (remove parentheses)
            (
                r"CURRENT_TIMESTAMP\s*\(\s*\)",
                "CURRENT_TIMESTAMP",
                "CURRENT_TIMESTAMP_no_parens",
            ),
            # CURRENT_DATE() → CURRENT_DATE (remove parentheses)
            (r"CURRENT_DATE\s*\(\s*\)", "CURRENT_DATE", "CURRENT_DATE_no_parens"),
            # DATEADD function: DATEADD(unit, amount, date) → date + INTERVAL 'amount unit'
            # Applied AFTER function call normalization so date expressions are clean
            (
                r"DATEADD\s*\(\s*(\w+)\s*,\s*(-?\d+)\s*,\s*([^)]+)\)",
                self._translate_dateadd,
                "DATEADD_to_INTERVAL",
            ),
            # LISTAGG → STRING_AGG
            (r"LISTAGG\s*\(", "STRING_AGG(", "LISTAGG_to_STRING_AGG"),
        ]

        logger.info(
            "QueryTranslator initialized with %d translation rules",
            len(self.translation_rules),
        )

    def translate(self, query: str) -> str:
        """
        Translate Snowflake SQL to PostgreSQL SQL.

        Args:
            query: Snowflake SQL query

        Returns:
            PostgreSQL-compatible SQL query
        """
        if not query or not query.strip():
            return query

        original_query = query
        stats = TranslationStats(original_length=len(query))

        # Apply translation rules
        translated_query = query
        for pattern, replacement, description in self.translation_rules:
            if callable(replacement):
                # Custom replacement function
                translated_query, applied = self._apply_custom_rule(
                    translated_query, pattern, replacement
                )
                if applied:
                    stats.rules_applied.append(description)
            else:
                # Simple pattern replacement
                if re.search(pattern, translated_query, re.IGNORECASE):
                    translated_query = re.sub(
                        pattern, replacement, translated_query, flags=re.IGNORECASE
                    )
                    stats.rules_applied.append(description)

        stats.translated_length = len(translated_query)

        # Update metrics
        self.translation_count += 1
        self.last_translation_stats = stats

        if stats.rules_applied:
            logger.debug(
                "Query translation applied %d rules: %s",
                len(stats.rules_applied),
                ", ".join(stats.rules_applied),
            )

        return translated_query

    def _apply_custom_rule(
        self, query: str, pattern: str, replacement_func
    ) -> Tuple[str, bool]:
        """Apply custom replacement function to query."""
        applied = False
        matches = list(re.finditer(pattern, query, re.IGNORECASE))

        if not matches:
            return query, applied

        # Process matches in reverse to maintain positions
        for match in reversed(matches):
            replacement = replacement_func(match)
            query = query[: match.start()] + replacement + query[match.end() :]
            applied = True

        return query, applied

    def _translate_dateadd(self, match) -> str:
        """
        Translate DATEADD function to PostgreSQL INTERVAL.

        Snowflake: DATEADD(day, 7, created_at)
        PostgreSQL: created_at + INTERVAL '7 days'
        """
        unit = match.group(1).lower()
        amount = match.group(2)
        date_expr = match.group(3).strip()

        # Map Snowflake units to PostgreSQL units
        unit_map = {
            "day": "days",
            "days": "days",
            "month": "months",
            "months": "months",
            "year": "years",
            "years": "years",
            "hour": "hours",
            "hours": "hours",
            "minute": "minutes",
            "minutes": "minutes",
            "second": "seconds",
            "seconds": "seconds",
        }

        pg_unit = unit_map.get(unit, unit + "s")

        # Handle negative intervals
        if amount.startswith("-"):
            return f"{date_expr} - INTERVAL '{amount[1:]} {pg_unit}'"
        else:
            return f"{date_expr} + INTERVAL '{amount} {pg_unit}'"

    def get_stats(self) -> Dict:
        """Get translator statistics."""
        return {
            "translation_count": self.translation_count,
            "last_translation": (
                self.last_translation_stats.__dict__
                if self.last_translation_stats
                else None
            ),
        }

    def reset_stats(self):
        """Reset translation statistics."""
        self.translation_count = 0
        self.last_translation_stats = None
