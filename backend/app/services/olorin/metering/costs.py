"""
Cost Configuration

Cost estimates per unit for billing calculations.
"""

# Cost estimates per unit (USD)
COST_PER_AUDIO_SECOND_STT = 0.00004  # ElevenLabs STT ~$0.04/1000 seconds
COST_PER_AUDIO_SECOND_TTS = 0.00024  # ElevenLabs TTS ~$0.24/1000 seconds
COST_PER_1K_TRANSLATION_CHARS = 0.00002  # Google Translate ~$20/1M chars
COST_PER_1K_TOKENS_LLM = 0.003  # Claude Sonnet ~$3/1M input tokens
COST_PER_1K_EMBEDDING_TOKENS = 0.00002  # OpenAI embeddings ~$0.02/1M tokens


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
    stt_cost = audio_seconds * COST_PER_AUDIO_SECOND_STT
    translation_cost = (characters_translated / 1000) * COST_PER_1K_TRANSLATION_CHARS
    tts_cost = (characters_synthesized / 1000) * COST_PER_AUDIO_SECOND_TTS * 10
    return stt_cost + translation_cost + tts_cost


def calculate_search_cost(tokens_used: int) -> float:
    """Calculate cost for search embedding."""
    return (tokens_used / 1000) * COST_PER_1K_EMBEDDING_TOKENS


def calculate_llm_cost(tokens_used: int) -> float:
    """Calculate cost for LLM usage."""
    return (tokens_used / 1000) * COST_PER_1K_TOKENS_LLM


def calculate_session_cost(
    audio_seconds: float,
    characters_translated: int,
) -> float:
    """Calculate total cost for a dubbing session."""
    return (
        audio_seconds * COST_PER_AUDIO_SECOND_STT
        + audio_seconds * COST_PER_AUDIO_SECOND_TTS
        + (characters_translated / 1000) * COST_PER_1K_TRANSLATION_CHARS
    )
