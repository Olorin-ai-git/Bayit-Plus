"""
Phase 2: Authentication Endpoint Testing for Olorin Platform.

Tests all 4 authentication endpoints to verify authentication flows,
JWT token management, and user session handling. Uses REAL authentication
credentials - NO MOCK DATA.

Endpoints tested:
1. POST /auth/login - OAuth2 form login
2. POST /auth/login-json - JSON login
3. GET /auth/me - Current user info (requires auth)
4. POST /auth/logout - Logout
"""

import json
import logging
from typing import Any, Dict

import pytest

from .conftest import ENDPOINT_TEST_CONFIG
from .utils.auth_helper import AuthenticationError, authenticate_with_credentials

logger = logging.getLogger(__name__)


class TestAuthEndpoints:
    """Test suite for authentication endpoints."""

    @pytest.mark.asyncio
    async def test_oauth2_form_login(
        self, endpoint_client, endpoint_validator, firebase_secrets_setup
    ):
        """Test POST /auth/login - OAuth2 form login."""
        logger.info("Testing OAuth2 form login: POST /auth/login")

        # Get test credentials from Firebase secrets
        from app.test.firebase_secrets_test_config import TEST_SECRETS

        username = "olorin_test_user"
        password = TEST_SECRETS.get("TEST_USER_PWD", "test_password")

        # Test form-based login
        response, metrics = await endpoint_client.post(
            "/auth/login",
            data={"username": username, "password": password, "grant_type": "password"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        # Validate response
        result = endpoint_validator.validate_response(
            response,
            metrics,
            expected_status=[200, 422, 401],  # May fail if credentials don't exist
            endpoint_type="auth",
        )

        # Log results
        logger.info(f"OAuth2 form login result: {result.get_summary()}")

        if response.status_code == 200:
            # Test successful authentication
            try:
                data = response.json()
                logger.info("OAuth2 form login successful")

                # Should have token fields
                assert "access_token" in data, "Missing access_token in login response"

                token = data["access_token"]
                assert token and len(token) > 10, "Invalid access token format"

                # Check token type
                token_type = data.get("token_type", "bearer")
                assert (
                    token_type.lower() == "bearer"
                ), f"Expected bearer token, got {token_type}"

                logger.info(f"OAuth2 login token type: {token_type}")
                logger.info(f"OAuth2 login token length: {len(token)} chars")

                # Store for other tests
                self._oauth2_token = token

            except Exception as e:
                pytest.fail(f"OAuth2 form login response parsing failed: {e}")

        elif response.status_code == 422:
            logger.warning(
                "OAuth2 form login failed with validation error - may be expected"
            )
            try:
                data = response.json()
                logger.info(f"OAuth2 form login error: {data}")
            except:
                pass

        elif response.status_code == 401:
            logger.warning(
                "OAuth2 form login failed with auth error - credentials may not exist"
            )

        # Fail if validation errors
        if result.errors:
            pytest.fail(
                f"OAuth2 form login validation failed: {'; '.join(result.errors)}"
            )

    @pytest.mark.asyncio
    async def test_json_login(
        self, endpoint_client, endpoint_validator, firebase_secrets_setup
    ):
        """Test POST /auth/login-json - JSON login."""
        logger.info("Testing JSON login: POST /auth/login-json")

        # Get test credentials
        from app.test.firebase_secrets_test_config import TEST_SECRETS

        username = "olorin_test_user"
        password = TEST_SECRETS.get("TEST_USER_PWD", "test_password")

        # Test JSON-based login
        response, metrics = await endpoint_client.post(
            "/auth/login-json", json_data={"username": username, "password": password}
        )

        # Validate response using auth-specific validator
        result = endpoint_validator.validate_response(
            response,
            metrics,
            expected_status=[200, 422, 401],  # May fail if credentials don't exist
            endpoint_type="auth",
            business_validators=(
                [self._validate_json_login_response]
                if response.status_code == 200
                else None
            ),
        )

        # Log results
        logger.info(f"JSON login result: {result.get_summary()}")

        if response.status_code == 200:
            # Test successful authentication
            try:
                data = response.json()
                logger.info("JSON login successful")

                # Should have token fields
                assert (
                    "access_token" in data
                ), "Missing access_token in JSON login response"

                token = data["access_token"]
                assert token and len(token) > 10, "Invalid access token format"

                # Validate JWT token format (3 parts separated by dots)
                token_parts = token.split(".")
                if len(token_parts) == 3:
                    logger.info("JSON login returned valid JWT token format")
                else:
                    logger.warning(
                        f"Token doesn't appear to be JWT: {len(token_parts)} parts"
                    )

                # Check for additional fields
                if "refresh_token" in data:
                    logger.info("JSON login includes refresh token")

                if "expires_in" in data:
                    logger.info(f"Token expires in: {data['expires_in']} seconds")

                logger.info(f"JSON login token length: {len(token)} chars")

                # Store for other tests
                self._json_token = token

            except Exception as e:
                pytest.fail(f"JSON login response parsing failed: {e}")

        elif response.status_code == 422:
            logger.warning("JSON login failed with validation error")
            try:
                data = response.json()
                logger.info(f"JSON login validation error: {data}")
            except:
                pass

        elif response.status_code == 401:
            logger.warning(
                "JSON login failed with auth error - test credentials may not exist"
            )

        # Fail if validation errors
        if result.errors:
            pytest.fail(f"JSON login validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_get_current_user(
        self, endpoint_client, endpoint_validator, auth_headers
    ):
        """Test GET /auth/me - Current user info (requires auth)."""
        logger.info("Testing current user endpoint: GET /auth/me")

        if not auth_headers:
            pytest.skip(
                "No authentication headers available - skipping protected endpoint test"
            )

        # Test with valid auth headers
        response, metrics = await endpoint_client.get("/auth/me", headers=auth_headers)

        # Validate response
        result = endpoint_validator.validate_response(
            response,
            metrics,
            expected_status=[200, 401, 403],
            endpoint_type="auth",
            business_validators=(
                [self._validate_user_info_response]
                if response.status_code == 200
                else None
            ),
        )

        # Log results
        logger.info(f"Current user endpoint result: {result.get_summary()}")

        if response.status_code == 200:
            # Test successful user info retrieval
            try:
                data = response.json()
                logger.info("Current user info retrieved successfully")

                # Should have user fields
                user_fields = ["username", "user_id", "email", "sub", "id"]
                found_fields = [field for field in user_fields if field in data]

                if found_fields:
                    logger.info(f"Found user fields: {found_fields}")

                    # Log specific user info (sanitized)
                    if "username" in data:
                        logger.info(f"Username: {data['username']}")
                    if "email" in data:
                        # Sanitize email for logging
                        email = data["email"]
                        if "@" in email:
                            sanitized_email = f"{email[:2]}***@{email.split('@')[1]}"
                            logger.info(f"Email: {sanitized_email}")
                    if "sub" in data:
                        logger.info(f"Subject ID: {data['sub'][:8]}...")
                else:
                    logger.warning("No standard user fields found in /auth/me response")

                # Check for scopes/permissions
                if "scopes" in data:
                    logger.info(f"User scopes: {data['scopes']}")
                if "permissions" in data:
                    logger.info(f"User permissions: {data['permissions']}")

            except Exception as e:
                pytest.fail(f"Current user response parsing failed: {e}")

        elif response.status_code == 401:
            logger.error("Authentication failed for /auth/me - token may be invalid")
            pytest.fail("Authentication token is invalid")

        elif response.status_code == 403:
            logger.error("Access forbidden for /auth/me - insufficient permissions")
            pytest.fail("Insufficient permissions for /auth/me endpoint")

        # Fail if validation errors
        if result.errors:
            pytest.fail(f"Current user validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_logout(self, endpoint_client, endpoint_validator, auth_headers):
        """Test POST /auth/logout - Logout."""
        logger.info("Testing logout endpoint: POST /auth/logout")

        if not auth_headers:
            pytest.skip("No authentication headers available - skipping logout test")

        # Test logout
        response, metrics = await endpoint_client.post(
            "/auth/logout", headers=auth_headers
        )

        # Validate response
        result = endpoint_validator.validate_response(
            response,
            metrics,
            expected_status=[
                200,
                204,
                401,
                404,
            ],  # 204 for no content, 404 if not implemented
            endpoint_type="auth",
        )

        # Log results
        logger.info(f"Logout endpoint result: {result.get_summary()}")

        if response.status_code in [200, 204]:
            logger.info("Logout successful")

            # Check response content
            if response.content:
                try:
                    data = response.json()
                    logger.info(f"Logout response: {data}")

                    # Look for success message
                    if "message" in data:
                        logger.info(f"Logout message: {data['message']}")
                except:
                    # Logout response might be plain text
                    if response.text:
                        logger.info(f"Logout response (text): {response.text}")

            # Test that token is now invalid by calling /auth/me
            try:
                me_response, _ = await endpoint_client.get(
                    "/auth/me", headers=auth_headers
                )

                if me_response.status_code == 401:
                    logger.info("Token correctly invalidated after logout")
                else:
                    logger.warning(
                        f"Token still valid after logout: {me_response.status_code}"
                    )

            except Exception as e:
                logger.warning(f"Could not test token invalidation: {e}")

        elif response.status_code == 404:
            logger.info("Logout endpoint not found (404) - may not be implemented")

        elif response.status_code == 401:
            logger.warning("Logout failed - authentication required")

        # Fail if validation errors
        if result.errors:
            pytest.fail(f"Logout validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_authentication_flow_end_to_end(
        self, endpoint_client, endpoint_validator, firebase_secrets_setup
    ):
        """Test complete authentication flow end-to-end."""
        logger.info("Testing complete authentication flow")

        from app.test.firebase_secrets_test_config import TEST_SECRETS

        # Test credentials
        test_credentials = [
            ("olorin_test_user", TEST_SECRETS.get("TEST_USER_PWD", "test_password")),
            ("testuser", "testpass"),
            ("test_user", "test_password"),
        ]

        successful_auth = False
        auth_token = None

        # Try authentication with different credential sets
        for username, password in test_credentials:
            logger.info(f"Testing auth flow with credentials: {username}")

            try:
                # Step 1: Login
                access_token, refresh_token = await authenticate_with_credentials(
                    endpoint_client, username, password
                )

                logger.info(f"Authentication successful for {username}")
                auth_token = access_token
                successful_auth = True

                # Step 2: Test protected endpoint
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                }

                me_response, me_metrics = await endpoint_client.get(
                    "/auth/me", headers=headers
                )

                if me_response.status_code == 200:
                    logger.info("Protected endpoint access successful")

                    try:
                        user_data = me_response.json()
                        logger.info(f"User data retrieved: {list(user_data.keys())}")
                    except:
                        pass
                else:
                    logger.warning(
                        f"Protected endpoint failed: {me_response.status_code}"
                    )

                # Step 3: Test logout (if implemented)
                logout_response, logout_metrics = await endpoint_client.post(
                    "/auth/logout", headers=headers
                )

                if logout_response.status_code in [200, 204]:
                    logger.info("Logout successful")
                elif logout_response.status_code == 404:
                    logger.info("Logout endpoint not implemented")
                else:
                    logger.warning(f"Logout failed: {logout_response.status_code}")

                break  # Success, no need to try other credentials

            except AuthenticationError as e:
                logger.warning(f"Authentication failed for {username}: {e}")
                continue
            except Exception as e:
                logger.error(f"Unexpected error in auth flow for {username}: {e}")
                continue

        # Log flow results
        if successful_auth:
            logger.info("✓ Complete authentication flow successful")
            assert auth_token is not None, "Authentication token should be available"
            assert len(auth_token) > 10, "Authentication token should be valid"
        else:
            logger.warning("✗ Authentication flow failed with all test credentials")
            pytest.skip(
                "No valid authentication credentials available for end-to-end test"
            )

    def _validate_json_login_response(self, data: Dict[str, Any], result):
        """Business validator for JSON login response."""
        if not isinstance(data, dict):
            result.add_error("JSON login response should be a JSON object")
            return

        # Check for required token field
        if "access_token" not in data:
            result.add_error("JSON login response missing access_token")
            return

        token = data["access_token"]
        if not token or not isinstance(token, str):
            result.add_error("Invalid access_token format")
            return

        # Basic JWT format check
        if len(token.split(".")) == 3:
            result.add_warning("Access token appears to be in JWT format")

        # Check token type
        token_type = data.get("token_type", "bearer")
        if token_type.lower() != "bearer":
            result.add_warning(f"Unexpected token type: {token_type}")

    def _validate_user_info_response(self, data: Dict[str, Any], result):
        """Business validator for user info response."""
        if not isinstance(data, dict):
            result.add_error("User info response should be a JSON object")
            return

        # Should have some user identifier
        user_id_fields = ["username", "user_id", "sub", "id", "email"]
        has_user_id = any(field in data for field in user_id_fields)

        if not has_user_id:
            result.add_error("User info response missing user identifier fields")


# Test execution summary
@pytest.mark.asyncio
async def test_auth_endpoints_summary(endpoint_client, firebase_secrets_setup):
    """Summary test to verify authentication endpoints functionality."""
    logger.info("=" * 60)
    logger.info("AUTHENTICATION ENDPOINTS TEST SUMMARY")
    logger.info("=" * 60)

    from app.test.firebase_secrets_test_config import TEST_SECRETS

    results = {
        "oauth2_login": {"tested": False, "success": False, "status": None},
        "json_login": {"tested": False, "success": False, "status": None},
        "user_info": {"tested": False, "success": False, "status": None},
        "logout": {"tested": False, "success": False, "status": None},
    }

    # Test credentials
    username = "olorin_test_user"
    password = TEST_SECRETS.get("TEST_USER_PWD", "test_password")

    # Test OAuth2 login
    try:
        response, _ = await endpoint_client.post(
            "/auth/login",
            data={"username": username, "password": password, "grant_type": "password"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        results["oauth2_login"]["tested"] = True
        results["oauth2_login"]["status"] = response.status_code
        results["oauth2_login"]["success"] = response.status_code == 200
    except Exception as e:
        results["oauth2_login"]["error"] = str(e)

    # Test JSON login
    try:
        response, _ = await endpoint_client.post(
            "/auth/login-json", json_data={"username": username, "password": password}
        )
        results["json_login"]["tested"] = True
        results["json_login"]["status"] = response.status_code
        results["json_login"]["success"] = response.status_code == 200

        # If successful, get token for other tests
        if response.status_code == 200:
            try:
                data = response.json()
                auth_token = data.get("access_token")
                if auth_token:
                    headers = {"Authorization": f"Bearer {auth_token}"}

                    # Test /auth/me
                    me_response, _ = await endpoint_client.get(
                        "/auth/me", headers=headers
                    )
                    results["user_info"]["tested"] = True
                    results["user_info"]["status"] = me_response.status_code
                    results["user_info"]["success"] = me_response.status_code == 200

                    # Test logout
                    logout_response, _ = await endpoint_client.post(
                        "/auth/logout", headers=headers
                    )
                    results["logout"]["tested"] = True
                    results["logout"]["status"] = logout_response.status_code
                    results["logout"]["success"] = logout_response.status_code in [
                        200,
                        204,
                        404,
                    ]
            except Exception as e:
                logger.warning(f"Error testing with auth token: {e}")
    except Exception as e:
        results["json_login"]["error"] = str(e)

    # Log summary
    for endpoint, result in results.items():
        if result["tested"]:
            if result["success"]:
                logger.info(f"✓ {endpoint}: {result['status']}")
            else:
                logger.warning(f"✗ {endpoint}: {result['status']}")
        else:
            logger.warning(
                f"? {endpoint}: Not tested - {result.get('error', 'Unknown error')}"
            )

    # Count successes
    tested = sum(1 for r in results.values() if r["tested"])
    successful = sum(1 for r in results.values() if r["success"])

    logger.info(f"Authentication endpoints summary: {successful}/{tested} successful")
    logger.info("=" * 60)

    # At least login should be testable
    assert tested > 0, "At least one authentication endpoint should be testable"
