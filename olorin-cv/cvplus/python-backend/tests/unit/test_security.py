"""
Unit Tests for Security Module
Tests JWT token generation and password hashing
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import patch
import time


def test_create_access_token():
    """Test JWT access token creation"""
    from app.core.security import create_access_token

    token = create_access_token({"sub": "user123", "email": "test@example.com"})

    assert token is not None
    assert isinstance(token, str)
    assert len(token) > 0


def test_access_token_contains_data():
    """Test JWT token contains correct data"""
    from app.core.security import create_access_token
    from jose import jwt
    from app.core.config import get_settings

    settings = get_settings()
    data = {"sub": "user123", "email": "test@example.com"}

    token = create_access_token(data)

    decoded = jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm]
    )

    assert decoded["sub"] == "user123"
    assert decoded["email"] == "test@example.com"
    assert "exp" in decoded


def test_access_token_has_expiration():
    """Test JWT token has proper expiration"""
    from app.core.security import create_access_token
    from jose import jwt
    from app.core.config import get_settings

    settings = get_settings()
    token = create_access_token({"sub": "user123"})

    decoded = jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm]
    )

    # Check that expiration is in the future
    exp_timestamp = decoded["exp"]
    current_timestamp = time.time()
    assert exp_timestamp > current_timestamp


def test_decode_access_token_invalid():
    """Test decoding invalid token raises exception"""
    from fastapi import HTTPException
    from app.core.security import decode_access_token

    with pytest.raises(HTTPException) as exc_info:
        decode_access_token("invalid_token_string")

    assert exc_info.value.status_code == 401


def test_decode_access_token_valid():
    """Test decoding valid token returns payload"""
    from app.core.security import create_access_token, decode_access_token

    token = create_access_token({"sub": "user123", "email": "test@example.com"})
    payload = decode_access_token(token)

    assert payload["sub"] == "user123"
    assert payload["email"] == "test@example.com"
