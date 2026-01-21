"""
AI Agent Tool Definitions

Claude tool use definitions for the autonomous AI agent.
These define the tools available to the agent for library management.

Tool definitions are organized into domain-specific modules under tool_definitions/.
"""

from app.services.ai_agent.tool_definitions import TOOLS

__all__ = ["TOOLS", "get_language_name"]


def get_language_name(code: str) -> str:
    """Get human-readable language name from code."""
    lang_map = {
        "he": "Hebrew",
        "en": "English",
        "es": "Spanish",
        "ar": "Arabic",
        "ru": "Russian",
        "fr": "French",
    }
    return lang_map.get(code, code.upper())
