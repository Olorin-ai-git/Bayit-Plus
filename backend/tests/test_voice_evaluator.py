"""Tests for Talk Back VoiceEvaluator — Hebrew matching, scoring."""

import pytest

from app.models.talk_back_attempt import QUALITY_SCORE_MAP, ResponseQuality
from app.services.talk_back.voice_evaluator import VoiceEvaluator


@pytest.fixture
def evaluator():
    return VoiceEvaluator()


def test_exact_match(evaluator):
    quality, score, fb_en, fb_he = evaluator.evaluate(
        transcript="שלום",
        expected_responses=["שלום"],
        detected_language="he",
    )
    assert quality == ResponseQuality.EXACT_MATCH
    assert score == QUALITY_SCORE_MAP[ResponseQuality.EXACT_MATCH]
    assert fb_en
    assert fb_he


def test_exact_match_with_nikud(evaluator):
    """Nikud should be stripped before comparison."""
    quality, score, _, _ = evaluator.evaluate(
        transcript="שָׁלוֹם",
        expected_responses=["שלום"],
        detected_language="he",
    )
    assert quality == ResponseQuality.EXACT_MATCH


def test_correct_root_match(evaluator):
    quality, score, _, _ = evaluator.evaluate(
        transcript="כתבתי",
        expected_responses=["כתיבה"],
        detected_language="he",
    )
    assert quality in (
        ResponseQuality.CORRECT_ROOT,
        ResponseQuality.CLOSE_PHONETIC,
        ResponseQuality.RIGHT_LANGUAGE,
    )


def test_phonetic_similarity(evaluator):
    quality, score, _, _ = evaluator.evaluate(
        transcript="שלומ",
        expected_responses=["שלום"],
        detected_language="he",
    )
    assert quality in (
        ResponseQuality.EXACT_MATCH,
        ResponseQuality.CLOSE_PHONETIC,
        ResponseQuality.CORRECT_ROOT,
    )
    assert score > 0


def test_wrong_language(evaluator):
    quality, score, fb_en, _ = evaluator.evaluate(
        transcript="hello world",
        expected_responses=["שלום"],
        detected_language="en",
    )
    assert quality == ResponseQuality.WRONG_LANGUAGE
    assert score == 0.0
    assert "Hebrew" in fb_en


def test_no_response_empty_string(evaluator):
    quality, score, _, _ = evaluator.evaluate(
        transcript="",
        expected_responses=["שלום"],
        detected_language="he",
    )
    assert quality == ResponseQuality.NO_RESPONSE
    assert score == 0.0


def test_no_response_whitespace(evaluator):
    quality, score, _, _ = evaluator.evaluate(
        transcript="   ",
        expected_responses=["שלום"],
        detected_language="he",
    )
    assert quality == ResponseQuality.NO_RESPONSE


def test_right_language_no_match(evaluator):
    quality, score, _, _ = evaluator.evaluate(
        transcript="אבגד",
        expected_responses=["תפוח"],
        detected_language="he",
    )
    assert quality in (
        ResponseQuality.RIGHT_LANGUAGE,
        ResponseQuality.CLOSE_PHONETIC,
    )
    assert score > 0


def test_multiple_expected_responses(evaluator):
    quality, score, _, _ = evaluator.evaluate(
        transcript="ערב טוב",
        expected_responses=["בוקר טוב", "ערב טוב", "לילה טוב"],
        detected_language="he",
    )
    assert quality == ResponseQuality.EXACT_MATCH


def test_normalize_hebrew_removes_punctuation(evaluator):
    result = evaluator._normalize_hebrew("שלום! מה שלומך?")
    assert "!" not in result
    assert "?" not in result


def test_normalize_hebrew_removes_nikud(evaluator):
    result = evaluator._normalize_hebrew("שָׁלוֹם")
    assert result == "שלום"


def test_normalize_hebrew_strips_whitespace(evaluator):
    result = evaluator._normalize_hebrew("  שלום   עולם  ")
    assert result == "שלום עולם"


def test_iw_language_code_treated_as_hebrew(evaluator):
    """'iw' is the legacy ISO code for Hebrew, should work."""
    quality, _, _, _ = evaluator.evaluate(
        transcript="שלום",
        expected_responses=["שלום"],
        detected_language="iw",
    )
    assert quality == ResponseQuality.EXACT_MATCH


def test_check_root_match_short_input(evaluator):
    assert evaluator._check_root_match("א", "אב") is False


def test_check_phonetic_similarity_empty(evaluator):
    assert evaluator._check_phonetic_similarity("", "שלום") is False
