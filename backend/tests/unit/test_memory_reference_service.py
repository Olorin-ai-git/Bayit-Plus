"""Tests for memory_reference_service.find_reference()."""

from app.services.vod_interaction.memory_reference_service import find_reference


def test_no_prior_messages_returns_none():
    result = find_reference("Hello there, friend.", [])
    assert result is None


def test_no_shared_phrase_returns_none():
    result = find_reference(
        "The weather is nice today.",
        ["Tell me about your childhood"],
    )
    assert result is None


def test_returns_none_when_match_under_three_words():
    # "your" alone doesn't qualify — needs 3+ words
    result = find_reference(
        "I love you.",
        ["Do you like me?"],
    )
    assert result is None


def test_three_word_match_returns_reference():
    result = find_reference(
        "Well, the fastest way to get there is by train.",
        ["What is the fastest way to travel?"],
    )
    assert result is not None
    assert result.referenced_turn_index == 0
    # Normalized match is "the fastest way to" (4 words) or longer
    assert "fastest way to" in result.highlighted_phrase.lower()


def test_prefers_longest_match():
    # Turn 0: short match possible ("what is your name")
    # Turn 1: longer match possible ("the story about the apple")
    result = find_reference(
        "Let me tell you the story about the apple, my friend.",
        [
            "What is your name?",
            "Please tell me the story about the apple tree.",
        ],
    )
    assert result is not None
    assert result.referenced_turn_index == 1


def test_tiebreak_prefers_recent_turn():
    # Both turns share the same 4-word phrase with the response
    result = find_reference(
        "The fastest way to learn is practice.",
        [
            "What is the fastest way to win?",
            "Tell me the fastest way to succeed.",
        ],
    )
    assert result is not None
    assert result.referenced_turn_index == 1  # more recent wins tie


def test_highlighted_phrase_preserves_original_casing():
    result = find_reference(
        "The Fastest Way To win is practice.",
        ["What is the fastest way to succeed?"],
    )
    assert result is not None
    # Original casing from response should be preserved
    assert "Fastest Way To" in result.highlighted_phrase


def test_punctuation_in_response_does_not_break_match():
    result = find_reference(
        "Well, the fastest way to, uh, win is practice.",
        ["What is the fastest way to succeed?"],
    )
    assert result is not None
    assert result.referenced_turn_index == 0


def test_empty_response_returns_none():
    result = find_reference("", ["Tell me about your day"])
    assert result is None
