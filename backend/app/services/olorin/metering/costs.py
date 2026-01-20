"""
Cost Configuration

Cost calculations using configurable rates from settings.
"""

from app.core.config import settings


def _get_metering_config():
    """Get metering config from settings."""
    return settings.olorin.metering


def calculate_dubbing_cost(
    audio_seconds: float,
    characters_translated: int,
    characters_synthesized: int,
) -> float:
    """
    Calculate cost for dubbing usage.

    Args:
        audio_seconds: Seconds of audio processed
        characters_translated: Characters translated
        characters_synthesized: Characters synthesized

    Returns:
        Total estimated cost in USD
    """
    metering = _get_metering_config()
    stt_cost = audio_seconds * metering.cost_per_audio_second_stt
    translation_cost = (
        characters_translated / 1000
    ) * metering.cost_per_1k_translation_chars
    tts_cost = (characters_synthesized / 1000) * metering.cost_per_audio_second_tts * 10
    return stt_cost + translation_cost + tts_cost


def calculate_search_cost(tokens_used: int) -> float:
    """Calculate cost for search embedding."""
    metering = _get_metering_config()
    return (tokens_used / 1000) * metering.cost_per_1k_embedding_tokens


def calculate_llm_cost(tokens_used: int) -> float:
    """Calculate cost for LLM usage."""
    metering = _get_metering_config()
    return (tokens_used / 1000) * metering.cost_per_1k_tokens_llm


def calculate_session_cost(
    audio_seconds: float,
    characters_translated: int,
) -> float:
    """Calculate total cost for a dubbing session."""
    metering = _get_metering_config()
    return (
        audio_seconds * metering.cost_per_audio_second_stt
        + audio_seconds * metering.cost_per_audio_second_tts
        + (characters_translated / 1000) * metering.cost_per_1k_translation_chars
    )
