"""
Olorin Auth Service client for Bayit+ backend.

Proxies authentication requests to auth.olorin.ai while maintaining
Bayit+ specific features (payment flow, beta users, etc).

In production (Cloud Run), uses GCP metadata server for identity tokens.
In development (localhost), skips service-to-service auth.
"""

import httpx
import structlog
from typing import Optional

from app.core.config import settings

logger = structlog.get_logger(__name__)


def _get_identity_token(target_audience: str) -> Optional[str]:
    """
    Get GCP identity token for service-to-service auth.

    Uses google-auth library which automatically detects the environment:
    - Cloud Run: uses metadata server
    - Local with gcloud: uses application default credentials
    - Local without gcloud: returns None (no auth needed for local dev)

    Args:
        target_audience: The URL of the target service

    Returns:
        Identity token string, or None if not available
    """
    try:
        import google.auth.transport.requests
        import google.oauth2.id_token

        request = google.auth.transport.requests.Request()
        token = google.oauth2.id_token.fetch_id_token(request, target_audience)
        return token
    except Exception as e:
        logger.debug(
            "identity_token_unavailable",
            reason=str(e),
            target=target_audience,
        )
        return None


class AuthServiceClient:
    """Client for communicating with Olorin Auth Service."""

    def __init__(self):
        self.base_url = getattr(settings, "AUTH_SERVICE_URL", "https://auth.olorin.ai")
        self.tenant_id = "bayit_plus"
        self.timeout = 30.0
        self._is_local = self.base_url.startswith("http://localhost")

    def _get_auth_headers(self) -> dict:
        """Get authentication headers for auth service requests."""
        if self._is_local:
            return {}

        token = _get_identity_token(self.base_url)
        if token:
            return {"Authorization": f"Bearer {token}"}

        logger.warning("no_identity_token_for_auth_service", base_url=self.base_url)
        return {}

    def _extract_error(self, response: httpx.Response, fallback: str) -> str:
        """Extract error detail from response, handling non-JSON bodies."""
        try:
            return response.json().get("detail", fallback)
        except Exception:
            return response.text or fallback

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
            ValueError: If registration fails
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/v1/auth/register",
                    json={
                        "email": email,
                        "password": password,
                        "name": name,
                        "tenant_id": self.tenant_id,
                    },
                    headers=self._get_auth_headers(),
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
                    error_detail = self._extract_error(response, "Registration failed")
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
                response = await client.post(
                    f"{self.base_url}/api/v1/auth/login",
                    json={
                        "email": email,
                        "password": password,
                        "tenant_id": self.tenant_id,
                    },
                    headers=self._get_auth_headers(),
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
                    error_detail = self._extract_error(response, "Login failed")
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

    async def login_google(
        self,
        id_token: str,
        device_id: Optional[str] = None,
    ) -> dict:
        """
        Login with Google via auth service.

        Args:
            id_token: Google ID token from mobile/web SDK
            device_id: Optional device identifier

        Returns:
            Dict with user_id, email, name, role, access_token, refresh_token, avatar

        Raises:
            ValueError: If Google login fails
        """
        async with httpx.AsyncClient() as client:
            try:
                logger.info(
                    "auth_service_google_login_request",
                    base_url=self.base_url,
                    is_local=self._is_local,
                )

                response = await client.post(
                    f"{self.base_url}/api/v1/auth/login/google",
                    json={
                        "provider": "google",
                        "id_token": id_token,
                        "tenant_id": self.tenant_id,
                        "device_id": device_id,
                    },
                    headers=self._get_auth_headers(),
                    timeout=self.timeout,
                )

                if response.status_code == 200:
                    data = response.json()
                    logger.info(
                        "auth_service_google_login_success",
                        user_id=data.get("user_id"),
                        email=data.get("email"),
                    )
                    return data
                else:
                    logger.warning(
                        "auth_service_google_login_failed",
                        status_code=response.status_code,
                        response_text=response.text[:500],
                    )
                    error_detail = self._extract_error(response, "Google login failed")
                    raise ValueError(error_detail)

            except httpx.RequestError as e:
                logger.error("auth_service_request_error", error=str(e))
                raise ValueError(f"Failed to connect to auth service: {str(e)}")

    async def login_apple(
        self,
        id_token: str,
        device_id: Optional[str] = None,
    ) -> dict:
        """
        Login with Apple via auth service.

        Args:
            id_token: Apple identity token from mobile SDK
            device_id: Optional device identifier

        Returns:
            Dict with user_id, email, name, role, access_token, refresh_token, avatar

        Raises:
            ValueError: If Apple login fails
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/v1/auth/login/apple",
                    json={
                        "provider": "apple",
                        "id_token": id_token,
                        "tenant_id": self.tenant_id,
                        "device_id": device_id,
                    },
                    headers=self._get_auth_headers(),
                    timeout=self.timeout,
                )

                if response.status_code == 200:
                    data = response.json()
                    logger.info(
                        "auth_service_apple_login_success",
                        user_id=data.get("user_id"),
                        email=data.get("email"),
                    )
                    return data
                else:
                    error_detail = self._extract_error(response, "Apple login failed")
                    logger.warning(
                        "auth_service_apple_login_failed",
                        status_code=response.status_code,
                        detail=error_detail,
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
        avatar: Optional[str] = None,
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
            avatar=avatar,  # Profile picture from OAuth provider
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
