import json
import sys
from unittest.mock import MagicMock, patch

import pytest

from app.utils.prompt_utils import (
    count_tokens,
    sanitize_splunk_data,
    trim_prompt_to_token_limit,
)


class TestCountTokens:
    """Test the count_tokens function with both tiktoken and fallback implementations."""

    def test_count_tokens_with_tiktoken(self):
        """Test count_tokens when tiktoken is available."""
        with patch("app.utils.prompt_utils.tiktoken") as mock_tiktoken:
            # Mock the encoding
            mock_encoding = MagicMock()
            mock_encoding.encode.return_value = [1, 2, 3, 4, 5]  # 5 tokens
            mock_tiktoken.encoding_for_model.return_value = mock_encoding

            # Import after patching to ensure tiktoken is available
            from app.utils.prompt_utils import count_tokens

            result = count_tokens("Hello world", "gpt-3.5-turbo")

            assert result == 5
            mock_tiktoken.encoding_for_model.assert_called_once_with("gpt-3.5-turbo")
            mock_encoding.encode.assert_called_once_with("Hello world")

    def test_count_tokens_with_different_model(self):
        """Test count_tokens with a different model."""
        with patch("app.utils.prompt_utils.tiktoken") as mock_tiktoken:
            mock_encoding = MagicMock()
            mock_encoding.encode.return_value = [1, 2, 3]  # 3 tokens
            mock_tiktoken.encoding_for_model.return_value = mock_encoding

            from app.utils.prompt_utils import count_tokens

            result = count_tokens("Test text", "gpt-4")

            assert result == 3
            mock_tiktoken.encoding_for_model.assert_called_once_with("gpt-4")

    def test_count_tokens_fallback_implementation(self):
        """Test count_tokens fallback when tiktoken is not available."""
        # Test the fallback by directly calling it
        text = "Hello world this is a test"
        expected_word_count = len(text.split())  # 6 words

        # Mock ImportError to trigger fallback
        with patch("app.utils.prompt_utils.tiktoken", side_effect=ImportError):
            # Re-import to trigger the fallback
            import importlib

            import app.utils.prompt_utils

            importlib.reload(app.utils.prompt_utils)

            result = app.utils.prompt_utils.count_tokens(text)
            assert result == expected_word_count

    def test_count_tokens_empty_string(self):
        """Test count_tokens with empty string."""
        with patch("app.utils.prompt_utils.tiktoken") as mock_tiktoken:
            mock_encoding = MagicMock()
            mock_encoding.encode.return_value = []  # 0 tokens
            mock_tiktoken.encoding_for_model.return_value = mock_encoding

            from app.utils.prompt_utils import count_tokens

            result = count_tokens("", "gpt-3.5-turbo")
            assert result == 0

    def test_count_tokens_fallback_empty_string(self):
        """Test count_tokens fallback with empty string."""
        with patch("app.utils.prompt_utils.tiktoken", side_effect=ImportError):
            import importlib

            import app.utils.prompt_utils

            importlib.reload(app.utils.prompt_utils)

            result = app.utils.prompt_utils.count_tokens("")
            assert result == 0


class TestTrimPromptToTokenLimit:
    """Test the trim_prompt_to_token_limit function."""

    def test_trim_prompt_no_trimming_needed(self):
        """Test when prompt is already under token limit."""
        prompt_data = {"field1": "short text", "field2": ["item1", "item2"]}
        system_prompt = "System prompt"
        max_tokens = 1000
        list_fields_priority = ["field2"]

        with patch("app.utils.prompt_utils.count_tokens", return_value=50):
            trimmed, llm_input, trimmed_any = trim_prompt_to_token_limit(
                prompt_data, system_prompt, max_tokens, list_fields_priority
            )

        assert trimmed == prompt_data
        assert not trimmed_any
        assert system_prompt in llm_input
        assert json.dumps(prompt_data, indent=2) in llm_input

    def test_trim_prompt_with_trimming(self):
        """Test when prompt needs trimming."""
        prompt_data = {"field1": "text", "field2": ["item1", "item2", "item3", "item4"]}
        system_prompt = "System prompt"
        max_tokens = 100
        list_fields_priority = ["field2"]

        # Mock count_tokens to return high value first, then low value
        with patch("app.utils.prompt_utils.count_tokens", side_effect=[150, 50]):
            trimmed, llm_input, trimmed_any = trim_prompt_to_token_limit(
                prompt_data, system_prompt, max_tokens, list_fields_priority
            )

        assert trimmed_any
        assert len(trimmed["field2"]) == 2  # Should be halved
        assert trimmed["field2"] == ["item3", "item4"]  # Most recent half
        assert trimmed["field1"] == "text"  # Non-list field unchanged

    def test_trim_prompt_multiple_iterations(self):
        """Test when multiple trimming iterations are needed."""
        prompt_data = {
            "field1": "text",
            "field2": [
                "item1",
                "item2",
                "item3",
                "item4",
                "item5",
                "item6",
                "item7",
                "item8",
            ],
        }
        system_prompt = "System prompt"
        max_tokens = 100
        list_fields_priority = ["field2"]

        # Mock count_tokens to require multiple trims
        with patch("app.utils.prompt_utils.count_tokens", side_effect=[200, 150, 50]):
            trimmed, llm_input, trimmed_any = trim_prompt_to_token_limit(
                prompt_data, system_prompt, max_tokens, list_fields_priority
            )

        assert trimmed_any
        assert len(trimmed["field2"]) == 2  # Should be trimmed twice: 8 -> 4 -> 2

    def test_trim_prompt_multiple_list_fields(self):
        """Test trimming with multiple list fields in priority order."""
        prompt_data = {
            "field1": ["a", "b", "c", "d"],
            "field2": ["1", "2", "3", "4"],
            "field3": "text",
        }
        system_prompt = "System prompt"
        max_tokens = 100
        list_fields_priority = ["field1", "field2"]

        # Mock to require trimming
        with patch("app.utils.prompt_utils.count_tokens", side_effect=[150, 50]):
            trimmed, llm_input, trimmed_any = trim_prompt_to_token_limit(
                prompt_data, system_prompt, max_tokens, list_fields_priority
            )

        assert trimmed_any
        assert len(trimmed["field1"]) == 2  # First priority field trimmed
        assert len(trimmed["field2"]) == 4  # Second priority field untouched

    def test_trim_prompt_cannot_trim_further(self):
        """Test when prompt cannot be trimmed further."""
        prompt_data = {"field1": "text", "field2": ["single_item"]}
        system_prompt = "System prompt"
        max_tokens = 10  # Very low limit
        list_fields_priority = ["field2"]

        # Mock to always return high token count
        with patch("app.utils.prompt_utils.count_tokens", return_value=150):
            trimmed, llm_input, trimmed_any = trim_prompt_to_token_limit(
                prompt_data, system_prompt, max_tokens, list_fields_priority
            )

        # Should return original data when can't trim further
        assert trimmed == prompt_data
        assert not trimmed_any

    def test_trim_prompt_empty_list_field(self):
        """Test trimming when list field is empty."""
        prompt_data = {"field1": "text", "field2": []}
        system_prompt = "System prompt"
        max_tokens = 100
        list_fields_priority = ["field2"]

        with patch("app.utils.prompt_utils.count_tokens", return_value=50):
            trimmed, llm_input, trimmed_any = trim_prompt_to_token_limit(
                prompt_data, system_prompt, max_tokens, list_fields_priority
            )

        assert trimmed == prompt_data
        assert not trimmed_any

    def test_trim_prompt_non_list_field_in_priority(self):
        """Test when priority field is not a list."""
        prompt_data = {"field1": "text", "field2": ["item1", "item2", "item3", "item4"]}
        system_prompt = "System prompt"
        max_tokens = 100
        list_fields_priority = ["field1", "field2"]  # field1 is not a list

        with patch("app.utils.prompt_utils.count_tokens", side_effect=[150, 50]):
            trimmed, llm_input, trimmed_any = trim_prompt_to_token_limit(
                prompt_data, system_prompt, max_tokens, list_fields_priority
            )

        assert trimmed_any
        # field1 should be skipped, field2 should be trimmed
        assert trimmed["field1"] == "text"
        assert len(trimmed["field2"]) == 2


class TestSanitizeSplunkData:
    """Test the sanitize_splunk_data function."""

    def test_sanitize_splunk_data_normal_case(self):
        """Test sanitizing normal Splunk data."""
        splunk_data = [
            {
                "timestamp": "2023-01-01",
                "user": "testuser",
                "_raw": "sensitive raw data",
                "_internal": "internal field",
                "message": "log message",
            },
            {
                "timestamp": "2023-01-02",
                "user": "testuser2",
                "_rawdata": "more sensitive data",
                "status": "success",
            },
        ]

        result = sanitize_splunk_data(splunk_data)

        assert len(result) == 2

        # First event
        assert "timestamp" in result[0]
        assert "user" in result[0]
        assert "message" in result[0]
        assert "_raw" not in result[0]
        assert "_internal" in result[0]  # Only _raw prefix is filtered

        # Second event
        assert "timestamp" in result[1]
        assert "user" in result[1]
        assert "status" in result[1]
        assert "_rawdata" not in result[1]

    def test_sanitize_splunk_data_empty_list(self):
        """Test sanitizing empty Splunk data."""
        result = sanitize_splunk_data([])
        assert result == []

    def test_sanitize_splunk_data_none_input(self):
        """Test sanitizing None input."""
        result = sanitize_splunk_data(None)
        assert result == []

    def test_sanitize_splunk_data_no_raw_fields(self):
        """Test sanitizing data with no _raw fields."""
        splunk_data = [
            {"timestamp": "2023-01-01", "user": "testuser", "message": "log message"}
        ]

        result = sanitize_splunk_data(splunk_data)

        assert len(result) == 1
        assert result[0] == splunk_data[0]  # Should be unchanged

    def test_sanitize_splunk_data_only_raw_fields(self):
        """Test sanitizing data with only _raw fields."""
        splunk_data = [{"_raw": "sensitive data", "_rawdata": "more sensitive data"}]

        result = sanitize_splunk_data(splunk_data)

        assert len(result) == 1
        assert result[0] == {}  # All fields should be removed

    def test_sanitize_splunk_data_mixed_raw_fields(self):
        """Test sanitizing data with various _raw prefixed fields."""
        splunk_data = [
            {
                "normal_field": "value",
                "_raw": "sensitive",
                "_raw_data": "sensitive",
                "_rawlog": "sensitive",
                "raw_field": "not sensitive",  # Doesn't start with _raw
                "_other": "not raw related",
            }
        ]

        result = sanitize_splunk_data(splunk_data)

        assert len(result) == 1
        assert "normal_field" in result[0]
        assert "raw_field" in result[0]
        assert "_other" in result[0]
        assert "_raw" not in result[0]
        assert "_raw_data" not in result[0]
        assert "_rawlog" not in result[0]
