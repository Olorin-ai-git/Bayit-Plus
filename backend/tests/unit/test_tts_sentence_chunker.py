"""Unit tests for the TTS sentence chunker.

Validates sentence splitting, abbreviation handling, ellipsis preservation,
decimal number handling, short-chunk merging, and the sentence-end helper.
"""

import pytest

from app.services.voice.tts_sentence_chunker import (
    chunk_sentences,
    _ends_with_sentence,
)


class TestChunkSentencesSingleSentence:
    """Tests for input that should not be split."""

    def test_single_sentence_no_split(self):
        result = chunk_sentences("Hello world this is a test")
        assert result == ["Hello world this is a test"]

    def test_single_sentence_with_period(self):
        result = chunk_sentences("Hello world this is a test.")
        assert result == ["Hello world this is a test."]

    def test_single_word(self):
        result = chunk_sentences("word")
        assert result == ["word"]


class TestChunkSentencesMultiSentence:
    """Tests for multi-sentence English input."""

    def test_two_sentences_period(self):
        result = chunk_sentences("Hello world. How are you?")
        assert result == ["Hello world.", "How are you?"]

    def test_two_sentences_newline(self):
        result = chunk_sentences("Hello world.\nHow are you?")
        assert result == ["Hello world.", "How are you?"]

    def test_three_sentences(self):
        text = "First sentence here. Second sentence here. Third sentence here."
        result = chunk_sentences(text)
        assert result == [
            "First sentence here.",
            "Second sentence here.",
            "Third sentence here.",
        ]


class TestChunkSentencesExclamation:
    """Tests for exclamation and question marks."""

    def test_exclamation_then_period(self):
        result = chunk_sentences("Stop! Do not move.")
        assert result == ["Stop!", "Do not move."]

    def test_question_then_period(self):
        result = chunk_sentences("Why is that? It seems strange.")
        assert result == ["Why is that?", "It seems strange."]


class TestChunkSentencesAbbreviations:
    """Tests for abbreviation handling."""

    def test_dr_abbreviation(self):
        result = chunk_sentences("Dr. Smith went home. He was tired.")
        assert result == ["Dr. Smith went home.", "He was tired."]

    def test_mr_and_mrs(self):
        result = chunk_sentences("Mr. and Mrs. Jones arrived. They were happy.")
        assert result == ["Mr. and Mrs. Jones arrived.", "They were happy."]

    def test_multiple_abbreviations(self):
        result = chunk_sentences("Prof. Adams vs. Dr. Lee debated. It was intense.")
        assert result == ["Prof. Adams vs. Dr. Lee debated.", "It was intense."]

    def test_etc_abbreviation(self):
        result = chunk_sentences(
            "Bring food, drinks, etc. for the party. We need supplies."
        )
        assert result == [
            "Bring food, drinks, etc. for the party.",
            "We need supplies.",
        ]


class TestChunkSentencesEllipsis:
    """Tests for ellipsis handling."""

    def test_ellipsis_then_sentence(self):
        # Ellipsis is masked so no split occurs; short fragment merges
        result = chunk_sentences("Wait... What happened?")
        assert result == ["Wait... What happened?"]

    def test_ellipsis_mid_text(self):
        result = chunk_sentences("She paused... then continued speaking. It was odd.")
        assert result == [
            "She paused... then continued speaking.",
            "It was odd.",
        ]


class TestChunkSentencesNumbers:
    """Tests for decimal number handling."""

    def test_decimal_number(self):
        result = chunk_sentences("Pi is 3.14 exactly. That is precise.")
        assert result == ["Pi is 3.14 exactly.", "That is precise."]

    def test_multiple_decimals(self):
        # "Check them." is 2 words, below 3-word minimum, so merges back
        result = chunk_sentences("Values are 1.5 and 2.7 respectively. Check them.")
        assert result == [
            "Values are 1.5 and 2.7 respectively. Check them.",
        ]


class TestChunkSentencesEmptyInput:
    """Tests for empty and whitespace input."""

    def test_empty_string(self):
        assert chunk_sentences("") == []

    def test_whitespace_only(self):
        assert chunk_sentences("   ") == []

    def test_none_input(self):
        assert chunk_sentences(None) == []


class TestChunkSentencesHebrew:
    """Tests for Hebrew text with sentence boundaries."""

    def test_hebrew_with_periods(self):
        result = chunk_sentences("שלום עולם טוב. מה שלומך היום?")
        assert result == ["שלום עולם טוב.", "מה שלומך היום?"]

    def test_hebrew_single_sentence(self):
        result = chunk_sentences("ברוכים הבאים לבית פלוס")
        assert result == ["ברוכים הבאים לבית פלוס"]


class TestChunkSentencesMinimumWordMerge:
    """Tests for short-chunk merging behavior."""

    def test_short_fragment_merges_with_previous(self):
        result = chunk_sentences("The sun rose. Indeed. A new day had begun.")
        assert len(result) == 2
        assert "Indeed." in result[0]
        assert result[1] == "A new day had begun."

    def test_two_word_fragment_merges(self):
        result = chunk_sentences("She left. He followed. They reconciled quickly.")
        assert len(result) <= 2
        assert "They reconciled quickly." in result[-1]


class TestEndsWithSentence:
    """Tests for the _ends_with_sentence helper."""

    def test_ends_with_period(self):
        assert _ends_with_sentence("Hello world.") is True

    def test_ends_with_exclamation(self):
        assert _ends_with_sentence("Stop!") is True

    def test_ends_with_question(self):
        assert _ends_with_sentence("Why?") is True

    def test_no_sentence_ending(self):
        assert _ends_with_sentence("Hello world") is False

    def test_empty_string(self):
        assert _ends_with_sentence("") is False

    def test_whitespace_only(self):
        assert _ends_with_sentence("   ") is False

    def test_trailing_whitespace_after_period(self):
        assert _ends_with_sentence("Hello world.  ") is True

    def test_ellipsis_counts_as_sentence_end(self):
        assert _ends_with_sentence("Wait...") is True
