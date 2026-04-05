"""Test that CharacterAIService injects memory_context into the system prompt."""
from app.services.vod_interaction.character_ai import CharacterAIService


def test_build_system_prompt_includes_memory_block_when_provided():
    svc = CharacterAIService()
    prompt = svc._build_system_prompt(
        character_name="Walter",
        scene_context="Newsroom, 1940s.",
        history=[],
        character_description="Cynical editor",
        memory_context="<memory>\nSome prior content here.\n</memory>",
    )
    assert "<memory>" in prompt
    assert "Some prior content here." in prompt
    assert "</memory>" in prompt


def test_build_system_prompt_omits_memory_block_when_empty():
    svc = CharacterAIService()
    prompt = svc._build_system_prompt(
        character_name="Walter",
        scene_context="Newsroom, 1940s.",
        history=[],
        character_description="Cynical editor",
        memory_context="",
    )
    assert "<memory>" not in prompt


def test_build_system_prompt_memory_block_placed_after_scene_before_history():
    svc = CharacterAIService()
    prompt = svc._build_system_prompt(
        character_name="Walter",
        scene_context="Scene X",
        history=[],
        memory_context="<memory>\nPrior.\n</memory>",
    )
    scene_idx = prompt.find("Scene X")
    memory_idx = prompt.find("<memory>")
    history_idx = prompt.find("Previous conversation:")
    assert scene_idx < memory_idx < history_idx
