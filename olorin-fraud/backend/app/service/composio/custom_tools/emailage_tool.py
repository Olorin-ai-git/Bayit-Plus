"""
Emailage Tool

Provides email risk scoring via LexisNexis Emailage API for identity risk,
domain age, and email validity signals.
"""

import base64
import os
from typing import Any, Dict, Optional

import httpx

from app.service.config_loader import get_config_loader
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class EmailageTool:
    """
    Emailage tool for LexisNexis Emailage API.

    Provides:
    - Email risk score (0-1000, higher = riskier)
    - Domain age (days)
    - Email validity
    - Identity risk signals
    """

    def __init__(self):
        """Initialize Emailage tool."""
        self.config_loader = get_config_loader()
        self.api_key = self._load_api_key()
        self.api_secret = self._load_api_secret()
        self.base_url = "https://api.emailage.com/emailagevalidator"

    def _load_api_key(self) -> Optional[str]:
        """Load Emailage API key."""
        api_key = self.config_loader.load_secret("EMAILAGE_API_KEY")
        if not api_key:
            api_key = os.getenv("EMAILAGE_API_KEY")
        return api_key

    def _load_api_secret(self) -> Optional[str]:
        """Load Emailage API secret."""
        api_secret = self.config_loader.load_secret("EMAILAGE_API_SECRET")
        if not api_secret:
            api_secret = os.getenv("EMAILAGE_API_SECRET")
        return api_secret

    def lookup_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Lookup email risk information via Emailage API.

        Args:
            email: Email address to lookup

        Returns:
            Dictionary with email risk score, domain age, validity, or None if not found

        Raises:
            ValueError: If email is invalid
            Exception: If API call fails
        """
        if not email or "@" not in email:
            raise ValueError("Invalid email address")

        if not self.api_key or not self.api_secret:
            logger.warning("Emailage API credentials not configured")
            return None

        try:
            return self._lookup_emailage(email)
        except Exception as e:
            logger.error(f"Emailage lookup failed for {email}: {e}", exc_info=True)
            return None

    def _lookup_emailage(self, email: str) -> Optional[Dict[str, Any]]:
        """Lookup email using Emailage API."""
        import hashlib
        import hmac
        import time

        timestamp = str(int(time.time()))
        query_string = f"email={email}&format=json"
        message = f"{self.api_key}{query_string}{timestamp}"

        signature = base64.b64encode(
            hmac.new(
                self.api_secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256
            ).digest()
        ).decode("utf-8")

        url = f"{self.base_url}?{query_string}"
        headers = {
            "Authorization": f'OAuth oauth_consumer_key="{self.api_key}", oauth_signature_method="HMAC-SHA256", oauth_signature="{signature}", oauth_timestamp="{timestamp}"',
            "Accept": "application/json",
        }

        with httpx.Client(timeout=30.0) as client:
            response = client.get(url, headers=headers)

            if response.status_code == 200:
                data = response.json()
                query_result = data.get("query", {})
                emailage_score = query_result.get("emailageScore", {})

                return {
                    "email_risk_score": emailage_score.get("score"),
                    "email_domain_age": emailage_score.get("domainAge"),
                    "email_valid": query_result.get("emailExists") == "Y",
                    "email_first_seen": emailage_score.get("firstSeen"),
                    "email_last_seen": emailage_score.get("lastSeen"),
                    "provider": "emailage",
                }
            elif response.status_code == 404:
                logger.debug(f"Email {email} not found in Emailage database")
                return None
            else:
                logger.error(
                    f"Emailage lookup failed: {response.status_code} - {response.text}"
                )
                return None
