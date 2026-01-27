"""
Security Tests for Audiobooks

Tests for SSRF prevention, input validation, and injection attack prevention.
"""

import pytest
from fastapi import HTTPException

from app.api.routes.audiobook_security import (
    validate_audio_quality,
    validate_audio_url,
    validate_drm_key_id,
    validate_isbn,
)
from app.api.routes.audiobook_schemas import AudiobookCreateRequest, AudiobookUpdateRequest


# ============ SSRF PREVENTION TESTS ============


class TestSSRFPrevention:
    """Test SSRF (Server-Side Request Forgery) prevention."""

    def test_valid_https_url(self):
        """Valid HTTPS URLs should pass."""
        validate_audio_url("https://example.com/audio.mp3")
        validate_audio_url("https://cdn.example.com/audio/file.aac")

    def test_valid_http_url(self):
        """Valid HTTP URLs should pass."""
        validate_audio_url("http://example.com/audio.mp3")

    def test_valid_hls_url(self):
        """Valid HLS stream URLs should pass."""
        validate_audio_url("https://example.com/stream.m3u8")

    def test_valid_rtmp_url(self):
        """Valid RTMP URLs should pass."""
        validate_audio_url("rtmp://streaming.example.com/live/audiobook")

    def test_localhost_ipv4_blocked(self):
        """127.0.0.1 (localhost IPv4) should be blocked."""
        with pytest.raises(HTTPException) as exc_info:
            validate_audio_url("http://127.0.0.1:8080/audio.mp3")
        assert "localhost" in str(exc_info.value.detail) or "private IP" in str(exc_info.value.detail)

    def test_localhost_hostname_blocked(self):
        """localhost hostname should be blocked."""
        with pytest.raises(HTTPException) as exc_info:
            validate_audio_url("http://localhost/audio.mp3")
        assert "localhost" in str(exc_info.value.detail)

    def test_0000_address_blocked(self):
        """0.0.0.0 should be blocked."""
        with pytest.raises(HTTPException) as exc_info:
            validate_audio_url("http://0.0.0.0/audio.mp3")
        assert "localhost" in str(exc_info.value.detail)

    def test_private_ip_10_blocked(self):
        """10.x.x.x private IP range should be blocked."""
        with pytest.raises(HTTPException) as exc_info:
            validate_audio_url("http://10.0.0.1/audio.mp3")
        assert "private IP" in str(exc_info.value.detail)

    def test_private_ip_172_16_blocked(self):
        """172.16.x.x - 172.31.x.x private IP range should be blocked."""
        with pytest.raises(HTTPException) as exc_info:
            validate_audio_url("http://172.16.0.1/audio.mp3")
        assert "private IP" in str(exc_info.value.detail)

        with pytest.raises(HTTPException) as exc_info:
            validate_audio_url("http://172.31.255.254/audio.mp3")
        assert "private IP" in str(exc_info.value.detail)

    def test_private_ip_192_168_blocked(self):
        """192.168.x.x private IP range should be blocked."""
        with pytest.raises(HTTPException) as exc_info:
            validate_audio_url("http://192.168.1.1/audio.mp3")
        assert "private IP" in str(exc_info.value.detail)

    def test_aws_metadata_endpoint_blocked(self):
        """AWS metadata endpoint (169.254.169.254) should be blocked."""
        with pytest.raises(HTTPException) as exc_info:
            validate_audio_url("http://169.254.169.254/latest/meta-data/")
        assert "private IP" in str(exc_info.value.detail)

    def test_invalid_scheme_blocked(self):
        """Invalid URL schemes should be blocked."""
        with pytest.raises(HTTPException) as exc_info:
            validate_audio_url("file:///etc/passwd")
        assert "scheme" in str(exc_info.value.detail).lower()

        with pytest.raises(HTTPException) as exc_info:
            validate_audio_url("gopher://example.com")
        assert "scheme" in str(exc_info.value.detail).lower()

    def test_empty_url_blocked(self):
        """Empty URL should be blocked."""
        with pytest.raises(HTTPException) as exc_info:
            validate_audio_url("")
        assert "non-empty" in str(exc_info.value.detail).lower()

    def test_malformed_url_blocked(self):
        """Malformed URLs should be blocked."""
        with pytest.raises(HTTPException) as exc_info:
            validate_audio_url("ht!tp://[invalid")
        assert "scheme" in str(exc_info.value.detail).lower() or "format" in str(exc_info.value.detail).lower()


# ============ DRM KEY ID VALIDATION TESTS ============


class TestDRMKeyIDValidation:
    """Test DRM Key ID validation to prevent injection attacks."""

    def test_valid_alphanumeric_key(self):
        """Alphanumeric key IDs should pass."""
        validate_drm_key_id("key12345")
        validate_drm_key_id("ABC123XYZ")

    def test_valid_key_with_hyphens(self):
        """Key IDs with hyphens should pass."""
        validate_drm_key_id("key-id-123")
        validate_drm_key_id("MY-DRM-KEY")

    def test_valid_key_with_underscores(self):
        """Key IDs with underscores should pass."""
        validate_drm_key_id("key_id_123")
        validate_drm_key_id("MY_DRM_KEY")

    def test_none_key_allowed(self):
        """None (no DRM) should be allowed."""
        validate_drm_key_id(None)

    def test_invalid_special_characters(self):
        """Special characters should be blocked."""
        with pytest.raises(HTTPException) as exc_info:
            validate_drm_key_id("key@id")
        assert "alphanumeric" in str(exc_info.value.detail)

        with pytest.raises(HTTPException) as exc_info:
            validate_drm_key_id("key#id")
        assert "alphanumeric" in str(exc_info.value.detail)

        with pytest.raises(HTTPException) as exc_info:
            validate_drm_key_id("key$id;drop")
        assert "alphanumeric" in str(exc_info.value.detail)

    def test_invalid_quotes(self):
        """Quotes should be blocked."""
        with pytest.raises(HTTPException) as exc_info:
            validate_drm_key_id('key"id')
        assert "alphanumeric" in str(exc_info.value.detail)

        with pytest.raises(HTTPException) as exc_info:
            validate_drm_key_id("key'id")
        assert "alphanumeric" in str(exc_info.value.detail)

    def test_key_too_long(self):
        """Key IDs longer than 128 characters should be blocked."""
        long_key = "a" * 129
        with pytest.raises(HTTPException) as exc_info:
            validate_drm_key_id(long_key)
        assert "128 characters" in str(exc_info.value.detail)

    def test_key_max_length_allowed(self):
        """Key IDs with exactly 128 characters should be allowed."""
        max_key = "a" * 128
        validate_drm_key_id(max_key)


# ============ AUDIO QUALITY VALIDATION TESTS ============


class TestAudioQualityValidation:
    """Test audio quality validation."""

    def test_valid_quality_values(self):
        """Valid audio quality values should pass."""
        validate_audio_quality("8-bit")
        validate_audio_quality("16-bit")
        validate_audio_quality("24-bit")
        validate_audio_quality("32-bit")
        validate_audio_quality("high-fidelity")
        validate_audio_quality("standard")
        validate_audio_quality("premium")
        validate_audio_quality("lossless")

    def test_none_quality_allowed(self):
        """None (unspecified quality) should be allowed."""
        validate_audio_quality(None)

    def test_invalid_quality_blocked(self):
        """Invalid quality values should be blocked."""
        with pytest.raises(HTTPException) as exc_info:
            validate_audio_quality("ultra-mega-quality")
        assert "quality" in str(exc_info.value.detail).lower()

        with pytest.raises(HTTPException) as exc_info:
            validate_audio_quality("128kbps")
        assert "quality" in str(exc_info.value.detail).lower()


# ============ ISBN VALIDATION TESTS ============


class TestISBNValidation:
    """Test ISBN format validation."""

    def test_valid_isbn_10(self):
        """Valid ISBN-10 should pass."""
        validate_isbn("0306406954")  # Valid ISBN-10
        validate_isbn("0-306-40695-4")  # ISBN-10 with hyphens

    def test_valid_isbn_13(self):
        """Valid ISBN-13 should pass."""
        validate_isbn("9781491954936")  # Valid ISBN-13
        validate_isbn("978-1-491-95493-6")  # ISBN-13 with hyphens

    def test_none_isbn_allowed(self):
        """None (no ISBN) should be allowed."""
        validate_isbn(None)

    def test_invalid_isbn_blocked(self):
        """Invalid ISBNs should be blocked."""
        with pytest.raises(HTTPException) as exc_info:
            validate_isbn("12345")  # Too short
        assert "ISBN" in str(exc_info.value.detail)

        with pytest.raises(HTTPException) as exc_info:
            validate_isbn("ABC-DEF-GHI-JK")  # Non-numeric
        assert "ISBN" in str(exc_info.value.detail)


# ============ REQUEST SCHEMA VALIDATION TESTS ============


class TestAudiobookCreateRequestValidation:
    """Test AudiobookCreateRequest schema validation."""

    def test_valid_create_request(self):
        """Valid create request should validate."""
        request = AudiobookCreateRequest(
            title="Great Audiobook",
            author="John Author",
            stream_url="https://cdn.example.com/audio.mp3",
        )
        assert request.title == "Great Audiobook"

    def test_create_request_with_ssrf_blocked(self):
        """Create request with SSRF URL should be rejected."""
        with pytest.raises(Exception):  # Pydantic ValidationError
            AudiobookCreateRequest(
                title="Malicious Audiobook",
                author="Hacker",
                stream_url="http://127.0.0.1:8080/audio.mp3",
            )

    def test_create_request_with_invalid_drm_key(self):
        """Create request with invalid DRM key should be rejected."""
        with pytest.raises(Exception):  # Pydantic ValidationError
            AudiobookCreateRequest(
                title="Audiobook",
                author="Author",
                stream_url="https://example.com/audio.mp3",
                drm_key_id="key@injection",
            )

    def test_create_request_with_invalid_quality(self):
        """Create request with invalid audio quality should be rejected."""
        with pytest.raises(Exception):  # Pydantic ValidationError
            AudiobookCreateRequest(
                title="Audiobook",
                author="Author",
                stream_url="https://example.com/audio.mp3",
                audio_quality="super-ultra-quality",
            )


class TestAudiobookUpdateRequestValidation:
    """Test AudiobookUpdateRequest schema validation."""

    def test_valid_update_request(self):
        """Valid update request should validate."""
        request = AudiobookUpdateRequest(
            title="Updated Title",
            stream_url="https://cdn.example.com/new-audio.mp3",
        )
        assert request.title == "Updated Title"

    def test_update_request_with_ssrf_blocked(self):
        """Update request with SSRF URL should be rejected."""
        with pytest.raises(Exception):  # Pydantic ValidationError
            AudiobookUpdateRequest(
                stream_url="http://192.168.1.1/audio.mp3",
            )

    def test_update_request_partial_allowed(self):
        """Partial update request should validate."""
        request = AudiobookUpdateRequest(author="New Author")
        assert request.author == "New Author"
        assert request.stream_url is None


# ============ COMPREHENSIVE ATTACK SCENARIO TESTS ============


class TestSecurityAttackScenarios:
    """Test comprehensive security attack scenarios."""

    def test_ssrf_cloud_metadata_attack(self):
        """Prevent SSRF attacks on cloud metadata services."""
        # AWS metadata (via link-local IP)
        with pytest.raises(HTTPException) as exc_info:
            validate_audio_url("http://169.254.169.254/latest/meta-data/iam/security-credentials/")
        assert "private IP" in str(exc_info.value.detail)

        # GCP metadata (via hostname)
        with pytest.raises(HTTPException) as exc_info:
            validate_audio_url("http://metadata.google.internal/computeMetadata/v1/")
        assert "metadata" in str(exc_info.value.detail).lower()

    def test_drm_key_sql_injection_attempt(self):
        """Prevent SQL injection via DRM key ID."""
        with pytest.raises(HTTPException):
            validate_drm_key_id("key'; DROP TABLE users; --")

    def test_drm_key_nosql_injection_attempt(self):
        """Prevent NoSQL injection via DRM key ID."""
        with pytest.raises(HTTPException):
            validate_drm_key_id('key","$ne":""}')

    def test_quality_enum_bypass_attempt(self):
        """Prevent enum bypass in audio quality."""
        with pytest.raises(HTTPException):
            validate_audio_quality("16-bit', 'admin': true, 'quality': '16-bit")
