"""
RS256-only authentication client for Bayit+.

Post-migration: Only accepts RS256 tokens from auth.olorin.ai.
Legacy HS256 tokens are rejected with warning logs for monitoring.
"""

import httpx
import structlog
from jose import JWTError, jwt
from typing import Optional

from app.core.config import settings

logger = structlog.get_logger(__name__)


class DualModeAuthClient:
    """
    RS256-only auth client for Bayit+.

    Post-migration: Only accepts RS256 tokens from auth.olorin.ai.
    HS256 tokens are rejected and logged for monitoring.
    """

    def __init__(self):
        self.auth_service_url = getattr(
            settings, "AUTH_SERVICE_URL", "https://auth.olorin.ai"
        )
        self.jwks_url = f"{self.auth_service_url}/.well-known/jwks.json"
        self._jwks_cache: Optional[dict] = None
        # HS256 secrets removed - RS256-only mode (Task #6)

    async def get_jwks(self) -> dict:
        """Fetch and cache JWKS from auth service."""
        if self._jwks_cache:
            return self._jwks_cache

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.jwks_url, timeout=10.0)

                if response.status_code == 200:
                    self._jwks_cache = response.json()
                    return self._jwks_cache

        except Exception as e:
            logger.warning("jwks_fetch_failed", error=str(e))

        return {"keys": []}

    async def verify_token(self, token: str) -> Optional[dict]:
        """
        Verify RS256 tokens only - HS256 support removed.

        Args:
            token: JWT token string

        Returns:
            Token claims dict or None if invalid
        """
        try:
            header = jwt.get_unverified_header(token)
            algorithm = header.get("alg", "HS256")

            # RS256-ONLY MODE: Reject non-RS256 tokens
            if algorithm != "RS256":
                logger.warning(
                    "rejected_non_rs256_token",
                    alg=algorithm,
                    token_prefix=token[:20] if token else "",
                )
                return None

            return await self._verify_rs256(token)

        except Exception as e:
            logger.warning("token_verification_failed", error=str(e))
            return None

    async def _verify_rs256(self, token: str) -> Optional[dict]:
        """Verify RS256 token using JWKS from auth service."""
        try:
            jwks = await self.get_jwks()
            header = jwt.get_unverified_header(token)
            key_id = header.get("kid")

            if not key_id:
                logger.warning("rs256_no_kid")
                return None

            public_key = None
            for key in jwks.get("keys", []):
                if key.get("kid") == key_id:
                    public_key = key
                    break

            if not public_key:
                logger.warning("rs256_key_not_found", kid=key_id)
                return None

            from cryptography.hazmat.backends import default_backend
            from cryptography.hazmat.primitives.asymmetric import rsa
            from cryptography.hazmat.primitives import serialization
            import base64

            n_bytes = base64.urlsafe_b64decode(
                public_key["n"] + "=" * (4 - len(public_key["n"]) % 4)
            )
            e_bytes = base64.urlsafe_b64decode(
                public_key["e"] + "=" * (4 - len(public_key["e"]) % 4)
            )

            n = int.from_bytes(n_bytes, byteorder="big")
            e = int.from_bytes(e_bytes, byteorder="big")

            public_numbers = rsa.RSAPublicNumbers(e, n)
            rsa_public_key = public_numbers.public_key(default_backend())

            pem_key = rsa_public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo,
            ).decode("utf-8")

            claims = jwt.decode(
                token,
                pem_key,
                algorithms=["RS256"],
                issuer="https://auth.olorin.ai",
            )

            logger.info("rs256_token_verified", user_id=claims.get("sub"))
            return claims

        except JWTError as e:
            logger.warning("rs256_verification_failed", error=str(e))
            return None

    # REMOVED: _verify_hs256() method
    # HS256 support completely removed as of Task #6 (2026-02-15)
    # All tokens must be RS256 from auth.olorin.ai
    # Original implementation available in git history if rollback needed


_auth_client: Optional[DualModeAuthClient] = None


def get_auth_client() -> DualModeAuthClient:
    """Get singleton auth client instance."""
    global _auth_client
    if _auth_client is None:
        _auth_client = DualModeAuthClient()
    return _auth_client
