"""
Test wizard prompts module
"""

import pytest
from app.services.voice.wizard_prompts import get_system_prompt, SYSTEM_PROMPTS


def test_system_prompts_structure():
    """Test that all 3 languages have system prompts."""
    assert "he" in SYSTEM_PROMPTS
    assert "en" in SYSTEM_PROMPTS
    assert "es" in SYSTEM_PROMPTS


def test_system_prompts_not_empty():
    """Test that all system prompts have content."""
    for lang, prompt in SYSTEM_PROMPTS.items():
        assert len(prompt) > 100, f"{lang} prompt too short"
        assert "בית+" in prompt or "Bayit+" in prompt, f"{lang} prompt missing platform name"


def test_system_prompts_mention_tools():
    """Test that system prompts mention available tools."""
    tools = ["search_content", "get_recommendations", "get_live_channels",
             "get_kids_content", "lookup_user_guide"]

    for lang, prompt in SYSTEM_PROMPTS.items():
        for tool in tools:
            assert tool in prompt, f"{lang} prompt missing {tool}"


def test_get_system_prompt_hebrew():
    """Test getting Hebrew system prompt."""
    prompt = get_system_prompt("he")
    assert "אתה הקוסם של בית+" in prompt
    assert "search_content" in prompt


def test_get_system_prompt_english():
    """Test getting English system prompt."""
    prompt = get_system_prompt("en")
    assert "Bayit+ Wizard" in prompt
    assert "search_content" in prompt


def test_get_system_prompt_spanish():
    """Test getting Spanish system prompt."""
    prompt = get_system_prompt("es")
    assert "Mago de Bayit+" in prompt
    assert "search_content" in prompt


def test_get_system_prompt_with_media_context():
    """Test system prompt with media context."""
    media_context = {
        "currently_playing": "Ice Age",
        "current_page": "/vod"
    }

    prompt = get_system_prompt("en", media_context)
    assert "Ice Age" in prompt
    assert "/vod" in prompt


def test_get_system_prompt_unknown_language_fallback():
    """Test that unknown language falls back to English."""
    prompt = get_system_prompt("fr")
    assert "Bayit+ Wizard" in prompt


def test_system_prompts_voice_optimized():
    """Test that prompts mention voice optimization."""
    for lang, prompt in SYSTEM_PROMPTS.items():
        # Check for voice-related instructions
        assert "voice" in prompt.lower() or "קול" in prompt or "voz" in prompt
        # Check for brevity instructions
        assert "short" in prompt.lower() or "קצר" in prompt or "cortas" in prompt
