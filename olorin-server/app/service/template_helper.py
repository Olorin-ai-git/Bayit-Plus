"""
Template Helper
Feature: 005-polling-and-persistence

Provides helper functions for template operations including placeholder replacement.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
"""

import json
import re
from typing import Any, Dict


def replace_placeholders(template_json: str, entity_values: Dict[str, str]) -> str:
    """Replace placeholders in template JSON with entity values.

    Args:
        template_json: JSON string with placeholders like {{ entity_id }}
        entity_values: Dictionary mapping placeholder names to values

    Returns:
        JSON string with placeholders replaced
    """
    settings_str = template_json

    for placeholder, value in entity_values.items():
        pattern = r"\{\{\s*" + re.escape(placeholder) + r"\s*\}\}"
        settings_str = re.sub(pattern, value, settings_str)

    return settings_str


def apply_overrides(
    settings: Dict[str, Any], overrides: Dict[str, Any]
) -> Dict[str, Any]:
    """Apply overrides to template settings.

    Args:
        settings: Base settings from template
        overrides: Overrides to apply

    Returns:
        Merged settings dictionary
    """
    merged = settings.copy()
    merged.update(overrides)
    return merged
