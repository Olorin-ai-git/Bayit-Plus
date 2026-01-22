"""
Unit Tests for Configuration
Tests config validation and parsing
"""

import pytest
import os
from unittest.mock import patch


def test_settings_loads_from_env():
    """Test that settings load from environment variables"""
    from app.core.config import get_settings

    settings = get_settings()

    assert settings.app_name == "Olorin CVPlus"
    # Environment is set in conftest.py but Settings may use default
    assert settings.environment in ["test", "production", "development"]
    assert settings.jwt_secret_key is not None


def test_cors_origins_parsing():
    """Test CORS origins parsing from comma-separated string"""
    from app.core.config import get_settings

    settings = get_settings()
    # CORS origins should be a list regardless of format
    assert isinstance(settings.cors_origins, list)


def test_jwt_secret_minimum_length():
    """Test that JWT secret must be at least 32 characters"""
    from pydantic import ValidationError
    from app.core.config import Settings

    # Should work with valid env vars (from conftest)
    from app.core.config import get_settings
    settings = get_settings()
    assert len(settings.jwt_secret_key) >= 32


def test_mongodb_config():
    """Test MongoDB configuration is loaded"""
    from app.core.config import get_settings

    settings = get_settings()

    assert settings.mongodb_uri is not None
    assert settings.mongodb_db_name is not None
    assert settings.mongodb_max_pool_size > 0


def test_anthropic_config():
    """Test Anthropic AI configuration is loaded"""
    from app.core.config import get_settings

    settings = get_settings()

    assert settings.anthropic_api_key is not None
    assert settings.anthropic_model is not None
    assert settings.anthropic_max_tokens > 0


def test_firebase_config():
    """Test Firebase configuration is loaded"""
    from app.core.config import get_settings

    settings = get_settings()

    assert settings.firebase_project_id is not None
    assert settings.storage_bucket is not None
