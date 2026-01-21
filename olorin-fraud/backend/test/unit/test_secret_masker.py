"""
Tests for Secret Masking Utility

Verifies that sensitive data is properly masked in logs to prevent
exposure of API keys, passwords, tokens, and other secrets.
"""

import pytest

from app.service.secret_masker import (
    _mask_value,
    _should_mask_field,
    mask_config_object,
    mask_sensitive_dict,
    mask_string_secrets,
)


class TestSecretFieldDetection:
    """Test detection of sensitive field names."""

    def test_detects_api_key_fields(self):
        """Should detect various api_key field name formats."""
        assert _should_mask_field("api_key")
        assert _should_mask_field("API_KEY")
        assert _should_mask_field("anthropic_api_key")
        assert _should_mask_field("openai_api_key")
        assert _should_mask_field("api-key")
        assert _should_mask_field("apikey")

    def test_detects_password_fields(self):
        """Should detect various password field name formats."""
        assert _should_mask_field("password")
        assert _should_mask_field("PASSWORD")
        assert _should_mask_field("db_password")
        assert _should_mask_field("database_password")
        assert _should_mask_field("passwd")
        assert _should_mask_field("pwd")

    def test_detects_secret_fields(self):
        """Should detect various secret field name formats."""
        assert _should_mask_field("secret")
        assert _should_mask_field("SECRET")
        assert _should_mask_field("app_secret")
        assert _should_mask_field("jwt_secret")
        assert _should_mask_field("client_secret")

    def test_detects_token_fields(self):
        """Should detect various token field name formats."""
        assert _should_mask_field("token")
        assert _should_mask_field("TOKEN")
        assert _should_mask_field("access_token")
        assert _should_mask_field("refresh_token")
        assert _should_mask_field("bearer_token")
        assert _should_mask_field("oauth_token")

    def test_ignores_safe_fields(self):
        """Should not mask non-sensitive field names."""
        assert not _should_mask_field("username")
        assert not _should_mask_field("email")
        assert not _should_mask_field("name")
        assert not _should_mask_field("id")
        assert not _should_mask_field("port")
        assert not _should_mask_field("host")


class TestValueMasking:
    """Test masking of sensitive values."""

    def test_masks_none_values(self):
        """Should handle None values properly."""
        assert _mask_value(None) == "None"

    def test_masks_short_values(self):
        """Should fully mask short values."""
        assert _mask_value("short") == "***masked***"
        assert _mask_value("12345") == "***masked***"

    def test_masks_long_values(self):
        """Should show first and last 4 characters for long values."""
        api_key = "sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz123456"
        masked = _mask_value(api_key)
        assert masked.startswith("sk-p")
        assert masked.endswith("3456")
        assert "..." in masked


class TestDictMasking:
    """Test masking of dictionaries."""

    def test_masks_sensitive_fields_in_dict(self):
        """Should mask sensitive fields in a dictionary."""
        config = {
            "host": "localhost",
            "port": 8090,
            "api_key": "secret-key-12345",
            "database_password": "super-secret-password",
            "username": "admin",
        }

        masked = mask_sensitive_dict(config)

        assert masked["host"] == "localhost"  # Safe field unchanged
        assert masked["port"] == 8090  # Safe field unchanged
        assert masked["username"] == "admin"  # Safe field unchanged
        assert "secret-key" not in str(masked["api_key"])  # Sensitive field masked
        assert "super-secret" not in str(
            masked["database_password"]
        )  # Sensitive field masked

    def test_masks_nested_dictionaries(self):
        """Should recursively mask nested dictionaries."""
        config = {
            "app": {"name": "Olorin", "api_key": "secret-key-12345"},
            "database": {"host": "localhost", "password": "db-secret-password"},
        }

        masked = mask_sensitive_dict(config)

        assert masked["app"]["name"] == "Olorin"  # Safe nested field unchanged
        assert "secret-key" not in str(
            masked["app"]["api_key"]
        )  # Nested sensitive field masked
        assert masked["database"]["host"] == "localhost"  # Safe nested field unchanged
        assert "db-secret" not in str(
            masked["database"]["password"]
        )  # Nested sensitive field masked

    def test_masks_lists_of_dicts(self):
        """Should mask sensitive fields in lists of dictionaries."""
        config = {
            "services": [
                {"name": "service1", "api_key": "key1"},
                {"name": "service2", "api_key": "key2"},
            ]
        }

        masked = mask_sensitive_dict(config)

        assert masked["services"][0]["name"] == "service1"
        assert masked["services"][1]["name"] == "service2"
        assert "key1" not in str(masked["services"][0]["api_key"])
        assert "key2" not in str(masked["services"][1]["api_key"])


class TestConfigObjectMasking:
    """Test masking of Pydantic config objects."""

    def test_masks_pydantic_model(self):
        """Should mask sensitive fields in a Pydantic model."""
        from pydantic import BaseModel

        class TestConfig(BaseModel):
            app_name: str
            api_key: str
            database_password: str
            port: int

        config = TestConfig(
            app_name="Olorin",
            api_key="secret-key-12345",
            database_password="super-secret-password",
            port=8090,
        )

        masked = mask_config_object(config)

        assert masked["app_name"] == "Olorin"
        assert masked["port"] == 8090
        assert "secret-key" not in str(masked["api_key"])
        assert "super-secret" not in str(masked["database_password"])


class TestStringMasking:
    """Test masking of sensitive patterns in strings."""

    def test_masks_api_keys_in_strings(self):
        """Should mask API keys in strings."""
        text = (
            "Using api_key=sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz123456 for authentication"
        )
        masked = mask_string_secrets(text)
        assert "sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz123456" not in masked
        assert "***masked***" in masked

    def test_masks_bearer_tokens_in_strings(self):
        """Should mask Bearer tokens in strings."""
        text = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        masked = mask_string_secrets(text)
        assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in masked
        assert "***masked***" in masked

    def test_masks_jwt_tokens_in_strings(self):
        """Should mask JWT tokens in strings."""
        jwt = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYWRtaW4ifQ.signature"
        text = f"Token: {jwt}"
        masked = mask_string_secrets(text)
        assert jwt not in masked
        assert "***jwt-masked***" in masked

    def test_masks_passwords_in_connection_strings(self):
        """Should mask passwords in connection strings."""
        text = "postgresql://user:super-secret-password@localhost:5432/db"
        masked = mask_string_secrets(text)
        assert "super-secret-password" not in masked
        assert "***masked***" in masked


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
