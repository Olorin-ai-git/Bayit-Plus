"""
Tests for TriviaTextSanitizer - XSS and Injection Prevention

Verifies that dangerous patterns are detected and removed from trivia text.
"""

import pytest
from app.services.trivia.trivia_text_sanitizer import TriviaTextSanitizer


class TestTriviaTextSanitizer:
    """Test suite for TriviaTextSanitizer."""

    def test_sanitize_normal_text(self):
        """Normal text should pass through unchanged (except HTML encoding)."""
        text = "This movie won an Oscar in 2020"
        result = TriviaTextSanitizer.sanitize(text)
        assert result == text

    def test_sanitize_empty_string(self):
        """Empty string should return empty string."""
        assert TriviaTextSanitizer.sanitize("") == ""
        assert TriviaTextSanitizer.sanitize(None) == ""

    def test_sanitize_removes_script_tags(self):
        """Script tags should be removed completely."""
        text = "Normal text <script>alert('xss')</script> more text"
        result = TriviaTextSanitizer.sanitize(text)
        assert "<script>" not in result
        assert "alert" not in result
        assert "[removed]" in result

    def test_sanitize_removes_unclosed_script_tags(self):
        """Unclosed script tags should be removed."""
        text = "Text with <script>incomplete tag"
        result = TriviaTextSanitizer.sanitize(text)
        assert "<script>" not in result
        assert "[removed]" in result

    def test_sanitize_removes_javascript_urls(self):
        """JavaScript URLs should be removed."""
        text = "Click here: javascript:alert('xss')"
        result = TriviaTextSanitizer.sanitize(text)
        assert "javascript:" not in result
        assert "[removed]" in result

    def test_sanitize_removes_data_urls(self):
        """Data URLs with HTML should be removed."""
        text = "Image: data:text/html,<script>alert('xss')</script>"
        result = TriviaTextSanitizer.sanitize(text)
        assert "data:text/html" not in result
        assert "[removed]" in result

    def test_sanitize_removes_iframe_tags(self):
        """Iframe tags should be removed."""
        text = "Content <iframe src='evil.com'></iframe> end"
        result = TriviaTextSanitizer.sanitize(text)
        assert "<iframe" not in result
        assert "[removed]" in result

    def test_sanitize_removes_onerror_handlers(self):
        """Event handlers like onerror should be removed."""
        text = "Image <img onerror='alert(1)' src='x'>"
        result = TriviaTextSanitizer.sanitize(text)
        assert "onerror" not in result
        assert "[removed]" in result

    def test_sanitize_removes_onload_handlers(self):
        """Event handlers like onload should be removed."""
        text = "Body <body onload='alert(1)'>"
        result = TriviaTextSanitizer.sanitize(text)
        assert "onload" not in result
        assert "[removed]" in result

    def test_sanitize_removes_template_injection_jinja(self):
        """Jinja2 template injection should be removed."""
        text = "Text {% for item in items %} {{ item }} {% endfor %}"
        result = TriviaTextSanitizer.sanitize(text)
        assert "{%" not in result
        assert "[removed]" in result

    def test_sanitize_removes_template_injection_handlebars(self):
        """Handlebars template injection should be removed."""
        text = "Text {{ malicious_code }} end"
        result = TriviaTextSanitizer.sanitize(text)
        assert "{{" not in result
        assert "[removed]" in result

    def test_sanitize_removes_exec_calls(self):
        """Exec() function calls should be removed."""
        text = "Code exec(malicious_code) end"
        result = TriviaTextSanitizer.sanitize(text)
        assert "exec(" not in result
        assert "[removed]" in result

    def test_sanitize_removes_eval_calls(self):
        """Eval() function calls should be removed."""
        text = "Code eval(dangerous_code) end"
        result = TriviaTextSanitizer.sanitize(text)
        assert "eval(" not in result
        assert "[removed]" in result

    def test_sanitize_html_encodes_special_chars(self):
        """HTML special characters should be encoded."""
        text = "Text with <b>bold</b> and & ampersand"
        result = TriviaTextSanitizer.sanitize(text)
        # After removing dangerous patterns, HTML encode
        assert "&lt;" in result or "<b>" not in result
        assert "&amp;" in result or "&" not in result

    def test_sanitize_limits_length(self):
        """Text longer than 1000 chars should be truncated."""
        text = "A" * 1500
        result = TriviaTextSanitizer.sanitize(text)
        assert len(result) <= 1000

    def test_sanitize_normalizes_whitespace(self):
        """Excessive whitespace should be normalized."""
        text = "Text    with     many      spaces"
        result = TriviaTextSanitizer.sanitize(text)
        assert "     " not in result
        assert result == "Text with many spaces"

    def test_sanitize_case_insensitive(self):
        """Dangerous patterns should be detected case-insensitively."""
        text = "Text <SCRIPT>alert(1)</SCRIPT> end"
        result = TriviaTextSanitizer.sanitize(text)
        assert "<SCRIPT>" not in result.upper()
        assert "[removed]" in result

    def test_sanitize_multiple_patterns(self):
        """Multiple dangerous patterns should all be removed."""
        text = "<script>alert(1)</script> and javascript:void(0) and <iframe src='x'>"
        result = TriviaTextSanitizer.sanitize(text)
        assert "<script>" not in result
        assert "javascript:" not in result
        assert "<iframe" not in result
        assert result.count("[removed]") >= 3

    def test_sanitize_hebrew_text(self):
        """Hebrew text should pass through safely."""
        text = "הסרט זכה באוסקר בשנת 2020"
        result = TriviaTextSanitizer.sanitize(text)
        assert "הסרט" in result
        assert "זכה" in result

    def test_sanitize_spanish_text(self):
        """Spanish text should pass through safely."""
        text = "La película ganó un Oscar en 2020"
        result = TriviaTextSanitizer.sanitize(text)
        assert "película" in result
        assert "ganó" in result

    def test_sanitize_mixed_language_with_attack(self):
        """Mixed language text with attack should remove only attack."""
        text = "Film won Oscar <script>alert('xss')</script> en 2020"
        result = TriviaTextSanitizer.sanitize(text)
        assert "Film" in result
        assert "Oscar" in result
        assert "<script>" not in result
        assert "[removed]" in result
