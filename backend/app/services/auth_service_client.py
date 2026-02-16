"""
Olorin Auth Service client for Bayit+ backend.

Proxies authentication requests to auth.olorin.ai while maintaining
Bayit+ specific features (payment flow, beta users, etc).
"""

import httpx
import structlog
from typing import Optional

from app.core.config import settings

logger = structlog.get_logger(__name__)


class AuthServiceClient:
    """Client for communicating with Olorin Auth Service."""

    def __init__(self):
        self.base_url = getattr(settings, "AUTH_SERVICE_URL", "https://auth.olorin.ai")
        self.tenant_id = "bayit_plus"
        self.timeout = 30.0

    async def register(
        self,
        email: str,
        password: str,
        name: str,
    ) -> dict:
        """
        Register user via auth service.

        Args:
            email: User email
            password: User password
            name: User full name

        Returns:
            Dict with user_id, email, name, role, access_token, refresh_token

        Raises:
            HTTPException: If registration fails
        """
        async with httpx.AsyncClient() as client:
            try:
                # Use service account credentials for auth service access
                import subprocess
                token = subprocess.check_output(
                    ["gcloud", "auth", "print-identity-token"],
                    text=True
                ).strip()

                response = await client.post(
                    f"{self.base_url}/api/v1/auth/register",
                    json={
                        "email": email,
                        "password": password,
                        "name": name,
                        "tenant_id": self.tenant_id,
                    },
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=self.timeout,
                )

                if response.status_code == 201:
                    data = response.json()
                    logger.info(
                        "auth_service_register_success",
                        user_id=data.get("user_id"),
                        email=email,
                    )
                    return data
                else:
                    error_detail = response.json().get("detail", "Registration failed")
                    logger.warning(
                        "auth_service_register_failed",
                        status_code=response.status_code,
                        detail=error_detail,
                        email=email,
                    )
                    raise ValueError(error_detail)

            except httpx.RequestError as e:
                logger.error("auth_service_request_error", error=str(e))
                raise ValueError(f"Failed to connect to auth service: {str(e)}")

    async def login(
        self,
        email: str,
        password: str,
    ) -> dict:
        """
        Login user via auth service.

        Args:
            email: User email
            password: User password

        Returns:
            Dict with user_id, email, name, role, access_token, refresh_token

        Raises:
            ValueError: If login fails
        """
        async with httpx.AsyncClient() as client:
            try:
                # Use service account credentials
                import subprocess
                token = subprocess.check_output(
                    ["gcloud", "auth", "print-identity-token"],
                    text=True
                ).strip()

                response = await client.post(
                    f"{self.base_url}/api/v1/auth/login",
                    json={
                        "email": email,
                        "password": password,
                        "tenant_id": self.tenant_id,
                    },
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=self.timeout,
                )

                if response.status_code == 200:
                    data = response.json()
                    logger.info(
                        "auth_service_login_success",
                        user_id=data.get("user_id"),
                        email=email,
                    )
                    return data
                else:
                    error_detail = response.json().get("detail", "Login failed")
                    logger.warning(
                        "auth_service_login_failed",
                        status_code=response.status_code,
                        detail=error_detail,
                        email=email,
                    )
                    raise ValueError(error_detail)

            except httpx.RequestError as e:
                logger.error("auth_service_request_error", error=str(e))
                raise ValueError(f"Failed to connect to auth service: {str(e)}")

    async def create_user_in_bayit_db(
        self,
        auth_service_user_id: str,
        email: str,
        name: str,
        role: str = "user",
    ):
        """
        Create corresponding user record in Bayit+ MongoDB.

        This syncs the user from auth service to Bayit+ database
        with Bayit+ specific fields.

        Args:
            auth_service_user_id: User ID from auth service
            email: User email
            name: User name
            role: User role from auth service

        Returns:
            Bayit+ User object
        """
        from app.models.user import User
        from app.models.beta_user import BetaUser

        # Check if user already exists in Bayit+ DB
        existing = await User.find_one({"email": email})
        if existing:
            # Update auth service user ID reference
            existing.auth_service_user_id = auth_service_user_id
            await existing.save()
            return existing

        # Create new user in Bayit+ DB
        user = User(
            email=email,
            name=name,
            role=role,
            auth_provider="olorin_auth",
            linked_providers=["olorin_auth"],
            auth_service_user_id=auth_service_user_id,
            email_verified=True,  # Auth service handles verification
            is_verified=True,
            payment_pending=False,  # Will be set later if needed
        )

        # Check beta status
        beta_user = await BetaUser.find_one({"email": email})
        if beta_user and beta_user.is_active() and not beta_user.is_expired():
            user.is_beta_user = True

        await user.insert()

        logger.info(
            "bayit_user_synced_from_auth_service",
            bayit_user_id=str(user.id),
            auth_service_user_id=auth_service_user_id,
            email=email,
        )

        return user


_auth_service_client: Optional[AuthServiceClient] = None


def get_auth_service_client() -> AuthServiceClient:
    """Get singleton auth service client."""
    global _auth_service_client
    if _auth_service_client is None:
        _auth_service_client = AuthServiceClient()
    return _auth_service_client
