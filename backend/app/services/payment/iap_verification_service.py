"""
IAP verification for Apple App Store and Google Play.

Verifies signed transactions (Apple JWS) and purchase tokens
(Google Play) to confirm subscription purchases.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import httpx
from appstoreserverlibrary.models.Environment import Environment
from appstoreserverlibrary.signed_data_verifier import SignedDataVerifier

from app.core.config import Settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class IAPVerificationResult:
    """Result of an IAP receipt/transaction verification."""

    valid: bool
    product_id: Optional[str] = None
    original_transaction_id: Optional[str] = None
    expires_date: Optional[datetime] = None
    error: Optional[str] = None


class AppleIAPVerifier:
    """Verifies Apple App Store signed transactions (JWS)."""

    def __init__(self, settings: Settings):
        self._bundle_id = settings.APPLE_BUNDLE_ID_IOS
        self._env_str = settings.APPLE_APP_STORE_ENVIRONMENT
        self._environment = (
            Environment.PRODUCTION
            if self._env_str == "Production"
            else Environment.SANDBOX
        )
        self._issuer_id = settings.APPLE_APP_STORE_ISSUER_ID
        self._key_id = settings.APPLE_APP_STORE_KEY_ID
        self._private_key = settings.APPLE_APP_STORE_PRIVATE_KEY

    async def verify_transaction(
        self, signed_transaction: str
    ) -> IAPVerificationResult:
        """Verify a JWS signed transaction from Apple."""
        try:
            verifier = SignedDataVerifier(
                root_certificates=[],
                enable_online_checks=True,
                environment=self._environment,
                bundle_id=self._bundle_id,
                app_apple_id=None,
            )
            decoded = verifier.verify_and_decode_signed_transaction(
                signed_transaction
            )

            product_id = decoded.productId
            original_tx_id = decoded.originalTransactionId
            expires_ms = decoded.expiresDate
            expires_dt = (
                datetime.fromtimestamp(expires_ms / 1000)
                if expires_ms
                else None
            )

            logger.info(
                "Apple transaction verified",
                extra={
                    "product_id": product_id,
                    "original_transaction_id": original_tx_id,
                },
            )

            return IAPVerificationResult(
                valid=True,
                product_id=product_id,
                original_transaction_id=original_tx_id,
                expires_date=expires_dt,
            )

        except Exception as exc:
            logger.error(
                "Apple transaction verification failed",
                extra={"error": str(exc)},
            )
            return IAPVerificationResult(valid=False, error=str(exc))


class GooglePlayVerifier:
    """Verifies Google Play purchase tokens via androidpublisher API."""

    def __init__(self, settings: Settings):
        self._package_name = settings.GOOGLE_PLAY_PACKAGE_NAME

    async def verify_purchase(
        self, product_id: str, purchase_token: str
    ) -> IAPVerificationResult:
        """Verify a Google Play subscription purchase token."""
        import google.auth
        import google.auth.transport.requests

        try:
            credentials, _ = google.auth.default(
                scopes=["https://www.googleapis.com/auth/androidpublisher"]
            )
            credentials.refresh(google.auth.transport.requests.Request())
            access_token = credentials.token

            url = (
                f"https://androidpublisher.googleapis.com/androidpublisher"
                f"/v3/applications/{self._package_name}"
                f"/purchases/subscriptions/{product_id}"
                f"/tokens/{purchase_token}"
            )

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers={"Authorization": f"Bearer {access_token}"},
                )

            if response.status_code != 200:
                logger.error(
                    "Google Play verification HTTP error",
                    extra={
                        "status": response.status_code,
                        "body": response.text,
                    },
                )
                return IAPVerificationResult(
                    valid=False,
                    error=f"Google API returned {response.status_code}",
                )

            data = response.json()
            expiry_ms = int(data.get("expiryTimeMillis", 0))
            expires_dt = (
                datetime.fromtimestamp(expiry_ms / 1000)
                if expiry_ms
                else None
            )

            logger.info(
                "Google Play purchase verified",
                extra={
                    "product_id": product_id,
                    "purchase_token_prefix": purchase_token[:12],
                },
            )

            return IAPVerificationResult(
                valid=True,
                product_id=product_id,
                original_transaction_id=purchase_token,
                expires_date=expires_dt,
            )

        except Exception as exc:
            logger.error(
                "Google Play verification failed",
                extra={"error": str(exc)},
            )
            return IAPVerificationResult(valid=False, error=str(exc))
