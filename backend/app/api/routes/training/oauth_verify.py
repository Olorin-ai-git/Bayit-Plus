"""Shared OAuth token verification for Google and Apple providers."""

import base64
import json
import logging

import httpx
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


async def verify_oauth_email(provider: str, id_token: str) -> str:
    """Verify an OAuth token and return the authenticated email.

    Supports "google" (via tokeninfo endpoint) and "apple" (JWT decode).
    Raises HTTPException on invalid tokens.
    """
    if provider == "google":
        return await _verify_google(id_token)
    if provider == "apple":
        return await _verify_apple(id_token)
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported OAuth provider: {provider}",
    )


async def _verify_google(id_token: str) -> str:
    """Verify Google ID token via Google's tokeninfo endpoint."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token",
        )
    email = resp.json().get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account has no email",
        )
    return email


async def _verify_apple(identity_token: str) -> str:
    """Verify Apple identity token by decoding JWT payload."""
    try:
        parts = identity_token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid JWT structure")
        payload_b64 = parts[1]
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding
        claims = json.loads(base64.urlsafe_b64decode(payload_b64))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Apple identity token",
        )
    if claims.get("iss") != "https://appleid.apple.com":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token issuer",
        )
    email = claims.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apple account has no email",
        )
    return email
