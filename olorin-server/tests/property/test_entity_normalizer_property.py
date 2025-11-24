"""
Property-based tests for EntityNormalizer using Hypothesis

Tests normalization properties and edge cases.
"""

from hypothesis import given, strategies as st
import pytest

from app.service.investigation.entity_normalizer import EntityNormalizer


class TestEntityNormalizerProperty:
    """Property-based tests for EntityNormalizer"""

    def setup_method(self):
        """Set up test fixtures"""
        self.normalizer = EntityNormalizer()

    @given(st.text(min_size=1, max_size=100))
    def test_normalize_always_lowercase(self, entity_id):
        """Property: Normalized entity IDs are always lowercase"""
        normalized = self.normalizer.normalize(entity_id)
        assert normalized == normalized.lower()
    
    @given(st.text(min_size=1, max_size=100))
    def test_normalize_no_dots(self, entity_id):
        """Property: Normalized entity IDs contain no dots"""
        normalized = self.normalizer.normalize(entity_id)
        assert "." not in normalized
    
    @given(st.text(min_size=1, max_size=100))
    def test_normalize_no_at_symbols(self, entity_id):
        """Property: Normalized entity IDs contain no @ symbols"""
        normalized = self.normalizer.normalize(entity_id)
        assert "@" not in normalized
    
    @given(st.text(min_size=1, max_size=100))
    def test_normalize_no_leading_trailing_dashes(self, entity_id):
        """Property: Normalized entity IDs have no leading or trailing dashes"""
        normalized = self.normalizer.normalize(entity_id)
        if normalized:  # Skip empty strings
            assert not normalized.startswith("-")
            assert not normalized.endswith("-")
    
    @given(st.text(min_size=1, max_size=100))
    def test_normalize_max_length(self, entity_id):
        """Property: Normalized entity IDs respect max_length"""
        normalized = self.normalizer.normalize(entity_id, max_length=50)
        assert len(normalized) <= 50
    
    @given(st.text(min_size=1, max_size=100))
    def test_normalize_idempotent(self, entity_id):
        """Property: Normalization is idempotent"""
        normalized1 = self.normalizer.normalize(entity_id)
        normalized2 = self.normalizer.normalize(normalized1)
        assert normalized1 == normalized2
    
    @given(st.text(min_size=1, max_size=100))
    def test_normalize_filesystem_safe(self, entity_id):
        """Property: Normalized entity IDs are filesystem-safe (no special chars)"""
        normalized = self.normalizer.normalize(entity_id)
        # Should only contain alphanumeric and dashes
        assert all(c.isalnum() or c == "-" for c in normalized)
    
    def test_normalize_email_example(self):
        """Test specific email normalization example"""
        email = "user.name@example.com"
        normalized = self.normalizer.normalize(email)
        assert "@" not in normalized
        assert "." not in normalized
        assert "user" in normalized.lower()
        assert "example" in normalized.lower()
    
    def test_normalize_empty_string(self):
        """Test normalization of empty string"""
        normalized = self.normalizer.normalize("")
        assert normalized == "unknown"
    
    def test_normalize_none_raises_error(self):
        """Test that None raises ValueError"""
        with pytest.raises(ValueError):
            self.normalizer.normalize(None)
    
    @given(st.text(min_size=1, max_size=300))  # Longer than max_length
    def test_normalize_truncation(self, entity_id):
        """Property: Very long entity IDs are truncated"""
        normalized = self.normalizer.normalize(entity_id, max_length=50)
        assert len(normalized) <= 50
    
    @given(
        st.text(min_size=1, max_size=100),
        st.integers(min_value=1, max_value=255)
    )
    def test_normalize_respects_max_length_parameter(self, entity_id, max_length):
        """Property: Normalization respects provided max_length parameter"""
        normalized = self.normalizer.normalize(entity_id, max_length=max_length)
        assert len(normalized) <= max_length

