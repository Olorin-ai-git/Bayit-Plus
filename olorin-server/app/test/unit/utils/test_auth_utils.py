"""
Tests for app.utils.auth_utils module
"""

import http.client
import json
import uuid
from unittest.mock import MagicMock, Mock, patch

import pytest
import requests

from app.utils.auth_utils import (
    get_auth_token,
    get_offline_auth_token,
    get_userid_and_token_from_authn_header,
    validate_auth_token,
    AuthError
)


class TestGetUseridAndTokenFromAuthnHeader:
    """Test the get_userid_and_token_from_authn_header function."""

    def test_parse_header_with_all_fields(self):
        """Test parsing header with all required fields."""
        header = 'intuit_userid="test_user_123", intuit_token="token_abc_456", intuit_realmid="realm_789"'

        userid, token, realmid = get_userid_and_token_from_authn_header(header)

        assert userid == "test_user_123"
        assert token == "token_abc_456"
        assert realmid == "realm_789"

    def test_parse_header_without_quotes(self):
        """Test parsing header without quotes around values."""
        header = "intuit_userid=user123, intuit_token=token456, intuit_realmid=realm789"

        userid, token, realmid = get_userid_and_token_from_authn_header(header)

        assert userid == "user123"
        assert token == "token456"
        assert realmid == "realm789"

    def test_parse_header_mixed_quotes(self):
        """Test parsing header with mixed quoted and unquoted values."""
        header = 'intuit_userid="quoted_user", intuit_token=unquoted_token, intuit_realmid="quoted_realm"'

        userid, token, realmid = get_userid_and_token_from_authn_header(header)

        assert userid == "quoted_user"
        assert token == "unquoted_token"
        assert realmid == "quoted_realm"

    def test_parse_header_without_realmid(self):
        """Test parsing header without realmid (optional field)."""
        header = 'intuit_userid="test_user", intuit_token="test_token"'

        userid, token, realmid = get_userid_and_token_from_authn_header(header)

        assert userid == "test_user"
        assert token == "test_token"
        assert realmid is None

    def test_parse_header_missing_userid(self):
        """Test parsing header missing userid."""
        header = 'intuit_token="test_token", intuit_realmid="test_realm"'

        userid, token, realmid = get_userid_and_token_from_authn_header(header)

        assert userid is None
        assert token == "test_token"
        assert realmid == "test_realm"

    def test_parse_header_missing_token(self):
        """Test parsing header missing token."""
        header = 'intuit_userid="test_user", intuit_realmid="test_realm"'

        userid, token, realmid = get_userid_and_token_from_authn_header(header)

        assert userid == "test_user"
        assert token is None
        assert realmid == "test_realm"

    def test_parse_header_empty_values(self):
        """Test parsing header with empty values."""
        header = 'intuit_userid="", intuit_token="", intuit_realmid=""'

        userid, token, realmid = get_userid_and_token_from_authn_header(header)

        assert userid == ""
        assert token == ""
        assert realmid == ""

    def test_parse_header_none_input(self):
        """Test parsing None header."""
        userid, token, realmid = get_userid_and_token_from_authn_header(None)

        assert userid is None
        assert token is None
        assert realmid is None

    def test_parse_header_empty_string(self):
        """Test parsing empty string header."""
        userid, token, realmid = get_userid_and_token_from_authn_header("")

        assert userid is None
        assert token is None
        assert realmid is None

    def test_parse_header_malformed(self):
        """Test parsing malformed header."""
        header = "invalid_header_format"

        userid, token, realmid = get_userid_and_token_from_authn_header(header)

        assert userid is None
        assert token is None
        assert realmid is None

    def test_parse_header_with_special_characters(self):
        """Test parsing header with special characters in values."""
        header = 'intuit_userid="user@domain.com", intuit_token="token-with-dashes_and_underscores", intuit_realmid="realm.123"'

        userid, token, realmid = get_userid_and_token_from_authn_header(header)

        assert userid == "user@domain.com"
        assert token == "token-with-dashes_and_underscores"
        assert realmid == "realm.123"


class TestGetAuthToken:
    """Test the get_auth_token function."""

    @patch("app.utils.auth_utils.requests.request")
    @patch("app.utils.auth_utils.get_app_secret")
    @patch("app.utils.auth_utils.settings_for_env")
    def test_get_auth_token_success(
        self, mock_settings, mock_get_app_secret, mock_request
    ):
        """Test successful authentication token retrieval."""
        # Setup mocks
        mock_settings.app_id = "test_app_id"
        mock_settings.app_secret = "test_app_secret_path"
        mock_get_app_secret.side_effect = ["test_password", "test_app_secret"]

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": {
                "identityTestSignInWithPassword": {
                    "accessToken": "test_access_token",
                    "legacyAuthId": "test_legacy_auth_id",
                }
            }
        }
        mock_request.return_value = mock_response

        # Call function
        userid, token, realmid = get_auth_token()

        # Assertions
        assert userid == "test_legacy_auth_id"
        assert token == "test_access_token"
        assert realmid == "50000003"

        # Verify API call
        mock_request.assert_called_once()
        call_args = mock_request.call_args
        assert call_args[0][0] == "POST"
        assert "identityinternal-e2e.api.intuit.com" in call_args[0][1]

    @patch("app.utils.auth_utils.requests.request")
    @patch("app.utils.auth_utils.get_app_secret")
    @patch("app.utils.auth_utils.settings_for_env")
    def test_get_auth_token_http_error(
        self, mock_settings, mock_get_app_secret, mock_request
    ):
        """Test authentication token retrieval with HTTP error."""
        # Setup mocks
        mock_settings.app_id = "test_app_id"
        mock_settings.app_secret = "test_app_secret_path"
        mock_get_app_secret.side_effect = ["test_password", "test_app_secret"]

        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"
        mock_request.return_value = mock_response

        # Call function
        userid, token, realmid = get_auth_token()

        # Should return fallback values
        assert userid == "fallback_user_id"
        assert token == "fallback_token"
        assert realmid == "50000003"

    @patch("app.utils.auth_utils.requests.request")
    @patch("app.utils.auth_utils.get_app_secret")
    @patch("app.utils.auth_utils.settings_for_env")
    def test_get_auth_token_json_decode_error(
        self, mock_settings, mock_get_app_secret, mock_request
    ):
        """Test authentication token retrieval with JSON decode error."""
        # Setup mocks
        mock_settings.app_id = "test_app_id"
        mock_settings.app_secret = "test_app_secret_path"
        mock_get_app_secret.side_effect = ["test_password", "test_app_secret"]

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.side_effect = json.JSONDecodeError("Invalid JSON", "", 0)
        mock_response.text = "Invalid JSON response"
        mock_request.return_value = mock_response

        # Call function
        userid, token, realmid = get_auth_token()

        # Should return fallback values
        assert userid == "fallback_user_id"
        assert token == "fallback_token"
        assert realmid == "50000003"

    @patch("app.utils.auth_utils.requests.request")
    @patch("app.utils.auth_utils.get_app_secret")
    @patch("app.utils.auth_utils.settings_for_env")
    def test_get_auth_token_missing_data_field(
        self, mock_settings, mock_get_app_secret, mock_request
    ):
        """Test authentication token retrieval with missing data field."""
        # Setup mocks
        mock_settings.app_id = "test_app_id"
        mock_settings.app_secret = "test_app_secret_path"
        mock_get_app_secret.side_effect = ["test_password", "test_app_secret"]

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"error": "Missing data"}
        mock_request.return_value = mock_response

        # Call function
        userid, token, realmid = get_auth_token()

        # Should return fallback values
        assert userid == "fallback_user_id"
        assert token == "fallback_token"
        assert realmid == "50000003"

    @patch("app.utils.auth_utils.requests.request")
    @patch("app.utils.auth_utils.get_app_secret")
    @patch("app.utils.auth_utils.settings_for_env")
    def test_get_auth_token_missing_auth_data(
        self, mock_settings, mock_get_app_secret, mock_request
    ):
        """Test authentication token retrieval with missing authentication data."""
        # Setup mocks
        mock_settings.app_id = "test_app_id"
        mock_settings.app_secret = "test_app_secret_path"
        mock_get_app_secret.side_effect = ["test_password", "test_app_secret"]

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"data": {"someOtherField": "value"}}
        mock_request.return_value = mock_response

        # Call function
        userid, token, realmid = get_auth_token()

        # Should return fallback values
        assert userid == "fallback_user_id"
        assert token == "fallback_token"
        assert realmid == "50000003"

    @patch("app.utils.auth_utils.requests.request")
    @patch("app.utils.auth_utils.get_app_secret")
    @patch("app.utils.auth_utils.settings_for_env")
    def test_get_auth_token_missing_token_or_userid(
        self, mock_settings, mock_get_app_secret, mock_request
    ):
        """Test authentication token retrieval with missing token or userid."""
        # Setup mocks
        mock_settings.app_id = "test_app_id"
        mock_settings.app_secret = "test_app_secret_path"
        mock_get_app_secret.side_effect = ["test_password", "test_app_secret"]

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": {
                "identityTestSignInWithPassword": {
                    "accessToken": None,  # Missing token
                    "legacyAuthId": "test_legacy_auth_id",
                }
            }
        }
        mock_request.return_value = mock_response

        # Call function
        userid, token, realmid = get_auth_token()

        # Should return fallback values
        assert userid == "fallback_user_id"
        assert token == "fallback_token"
        assert realmid == "50000003"

    @patch("app.utils.auth_utils.requests.request")
    @patch("app.utils.auth_utils.get_app_secret")
    @patch("app.utils.auth_utils.settings_for_env")
    def test_get_auth_token_request_exception(
        self, mock_settings, mock_get_app_secret, mock_request
    ):
        """Test authentication token retrieval with request exception."""
        # Setup mocks
        mock_settings.app_id = "test_app_id"
        mock_settings.app_secret = "test_app_secret_path"
        mock_get_app_secret.side_effect = ["test_password", "test_app_secret"]

        mock_request.side_effect = requests.RequestException("Network error")

        # Call function
        userid, token, realmid = get_auth_token()

        # Should return fallback values
        assert userid == "fallback_user_id"
        assert token == "fallback_token"
        assert realmid == "50000003"


class TestGetOfflineAuthToken:
    """Test the get_offline_auth_token function."""

    @patch("app.utils.auth_utils.http.client.HTTPSConnection")
    @patch("app.utils.auth_utils.get_app_secret")
    @patch("app.utils.auth_utils.settings_for_env")
    @patch("app.utils.auth_utils.uuid.uuid4")
    @patch("app.utils.auth_utils.get_userid_and_token_from_authn_header")
    def test_get_offline_auth_token_success(
        self,
        mock_get_userid,
        mock_uuid,
        mock_settings,
        mock_get_app_secret,
        mock_https_conn,
    ):
        """Test successful offline authentication token retrieval."""
        # Setup mocks
        mock_settings.app_id = "test_app_id"
        mock_settings.app_secret = "test_app_secret_path"
        mock_settings.default_profile_id = "test_profile_id"
        mock_get_app_secret.return_value = "test_app_secret"
        mock_uuid.return_value = Mock(spec=uuid.UUID)
        mock_uuid.return_value.__str__ = Mock(return_value="test-uuid-1234")

        # Mock HTTP connection
        mock_conn = Mock()
        mock_https_conn.return_value = mock_conn

        mock_response = Mock()
        mock_response.read.return_value = json.dumps(
            {
                "data": {
                    "identitySignInInternalApplicationWithPrivateAuth": {
                        "authorizationHeader": "test_auth_header"
                    }
                }
            }
        ).encode("utf-8")
        mock_conn.getresponse.return_value = mock_response

        mock_get_userid.return_value = ("test_user", "test_token", "test_realm")

        # Call function
        userid, token, realmid = get_offline_auth_token()

        # Assertions
        assert userid == "test_user"
        assert token == "test_token"
        assert realmid == "test_realm"

        # Verify HTTP connection was made
        mock_https_conn.assert_called_once_with("identityinternal-e2e.api.intuit.com")
        mock_conn.request.assert_called_once()
        mock_get_userid.assert_called_once_with("test_auth_header")

    @patch("app.utils.auth_utils.http.client.HTTPSConnection")
    @patch("app.utils.auth_utils.get_app_secret")
    @patch("app.utils.auth_utils.settings_for_env")
    @patch("app.utils.auth_utils.uuid.uuid4")
    def test_get_offline_auth_token_missing_default_profile_id(
        self, mock_uuid, mock_settings, mock_get_app_secret, mock_https_conn
    ):
        """Test offline auth token with missing default_profile_id (uses fallback)."""
        # Setup mocks - no default_profile_id attribute
        mock_settings.app_id = "test_app_id"
        mock_settings.app_secret = "test_app_secret_path"
        # Don't set default_profile_id to test getattr fallback
        if hasattr(mock_settings, "default_profile_id"):
            delattr(mock_settings, "default_profile_id")

        mock_get_app_secret.return_value = "test_app_secret"
        mock_uuid.return_value = Mock(spec=uuid.UUID)
        mock_uuid.return_value.__str__ = Mock(return_value="test-uuid-1234")

        # Mock HTTP connection
        mock_conn = Mock()
        mock_https_conn.return_value = mock_conn

        mock_response = Mock()
        mock_response.read.return_value = json.dumps(
            {
                "data": {
                    "identitySignInInternalApplicationWithPrivateAuth": {
                        "authorizationHeader": "test_auth_header"
                    }
                }
            }
        ).encode("utf-8")
        mock_conn.getresponse.return_value = mock_response

        with patch(
            "app.utils.auth_utils.get_userid_and_token_from_authn_header"
        ) as mock_get_userid:
            mock_get_userid.return_value = ("test_user", "test_token", "test_realm")

            # Call function
            userid, token, realmid = get_offline_auth_token()

            # Should use fallback profile ID
            call_args = mock_conn.request.call_args
            payload = call_args[0][2]  # Third argument is payload
            assert "9341454513864369" in payload  # Fallback profile ID

    @patch("app.utils.auth_utils.http.client.HTTPSConnection")
    @patch("app.utils.auth_utils.get_app_secret")
    @patch("app.utils.auth_utils.settings_for_env")
    @patch("app.utils.auth_utils.uuid.uuid4")
    def test_get_offline_auth_token_missing_auth_header(
        self, mock_uuid, mock_settings, mock_get_app_secret, mock_https_conn
    ):
        """Test offline auth token with missing authorization header."""
        # Setup mocks
        mock_settings.app_id = "test_app_id"
        mock_settings.app_secret = "test_app_secret_path"
        mock_settings.default_profile_id = "test_profile_id"
        mock_get_app_secret.return_value = "test_app_secret"
        mock_uuid.return_value = Mock(spec=uuid.UUID)
        mock_uuid.return_value.__str__ = Mock(return_value="test-uuid-1234")

        # Mock HTTP connection
        mock_conn = Mock()
        mock_https_conn.return_value = mock_conn

        mock_response = Mock()
        mock_response.read.return_value = json.dumps(
            {"data": {"identitySignInInternalApplicationWithPrivateAuth": {}}}
        ).encode("utf-8")
        mock_conn.getresponse.return_value = mock_response

        # Call function
        userid, token, realmid = get_offline_auth_token()

        # Should return empty values
        assert userid == ""
        assert token == ""
        assert realmid == ""

    @patch("app.utils.auth_utils.http.client.HTTPSConnection")
    @patch("app.utils.auth_utils.get_app_secret")
    @patch("app.utils.auth_utils.settings_for_env")
    @patch("app.utils.auth_utils.uuid.uuid4")
    def test_get_offline_auth_token_json_decode_error(
        self, mock_uuid, mock_settings, mock_get_app_secret, mock_https_conn
    ):
        """Test offline auth token with JSON decode error."""
        # Setup mocks
        mock_settings.app_id = "test_app_id"
        mock_settings.app_secret = "test_app_secret_path"
        mock_settings.default_profile_id = "test_profile_id"
        mock_get_app_secret.return_value = "test_app_secret"
        mock_uuid.return_value = Mock(spec=uuid.UUID)
        mock_uuid.return_value.__str__ = Mock(return_value="test-uuid-1234")

        # Mock HTTP connection
        mock_conn = Mock()
        mock_https_conn.return_value = mock_conn

        mock_response = Mock()
        mock_response.read.return_value = b"Invalid JSON"
        mock_conn.getresponse.return_value = mock_response

        # Call function
        userid, token, realmid = get_offline_auth_token()

        # Should return empty values
        assert userid == ""
        assert token == ""
        assert realmid == ""

    @patch("app.utils.auth_utils.http.client.HTTPSConnection")
    @patch("app.utils.auth_utils.get_app_secret")
    @patch("app.utils.auth_utils.settings_for_env")
    def test_get_offline_auth_token_connection_error(
        self, mock_settings, mock_get_app_secret, mock_https_conn
    ):
        """Test offline auth token with connection error."""
        # Setup mocks
        mock_settings.app_id = "test_app_id"
        mock_settings.app_secret = "test_app_secret_path"
        mock_get_app_secret.return_value = "test_app_secret"

        # Mock connection error
        mock_https_conn.side_effect = Exception("Connection failed")

        # Call function
        userid, token, realmid = get_offline_auth_token()

        # Should return empty values
        assert userid == ""
        assert token == ""
        assert realmid == ""

    @patch("app.utils.auth_utils.http.client.HTTPSConnection")
    @patch("app.utils.auth_utils.get_app_secret")
    @patch("app.utils.auth_utils.settings_for_env")
    @patch("app.utils.auth_utils.uuid.uuid4")
    def test_get_offline_auth_token_request_error(
        self, mock_uuid, mock_settings, mock_get_app_secret, mock_https_conn
    ):
        """Test offline auth token with request error."""
        # Setup mocks
        mock_settings.app_id = "test_app_id"
        mock_settings.app_secret = "test_app_secret_path"
        mock_settings.default_profile_id = "test_profile_id"
        mock_get_app_secret.return_value = "test_app_secret"
        mock_uuid.return_value = Mock(spec=uuid.UUID)
        mock_uuid.return_value.__str__ = Mock(return_value="test-uuid-1234")

        # Mock HTTP connection
        mock_conn = Mock()
        mock_https_conn.return_value = mock_conn
        mock_conn.request.side_effect = Exception("Request failed")

        # Call function
        userid, token, realmid = get_offline_auth_token()

        # Should return empty values
        assert userid == ""
        assert token == ""
        assert realmid == ""


class TestModuleConstants:
    """Test module-level constants and configurations."""

    def test_base_url_per_env_contains_all_environments(self):
        """Test that BASE_URL_PER_ENV contains all expected environments."""
        from app.utils.auth_utils import BASE_URL_PER_ENV

        expected_envs = ["QAL", "E2E", "PRF", "PRD"]
        for env in expected_envs:
            assert env in BASE_URL_PER_ENV
            assert "llmexecution" in BASE_URL_PER_ENV[env]
            assert "{intuit_genos_model_id}" in BASE_URL_PER_ENV[env]

    def test_base_url_default_is_e2e(self):
        """Test that BASE_URL defaults to E2E environment."""
        from app.utils.auth_utils import BASE_URL, BASE_URL_PER_ENV

        assert BASE_URL == BASE_URL_PER_ENV["E2E"]

    def test_base_url_with_model_id_formatted(self):
        """Test that BASE_URL_WITH_INTUIT_GENOS_MODEL_ID is properly formatted."""
        from app.utils.auth_utils import BASE_URL_WITH_INTUIT_GENOS_MODEL_ID

        assert "gpt-4o-2024-08-06" in BASE_URL_WITH_INTUIT_GENOS_MODEL_ID
        assert "{intuit_genos_model_id}" not in BASE_URL_WITH_INTUIT_GENOS_MODEL_ID


class TestIntegration:
    """Integration tests for auth_utils functions."""

    @patch("app.utils.auth_utils.get_app_secret")
    @patch("app.utils.auth_utils.settings_for_env")
    def test_auth_functions_use_correct_settings(
        self, mock_settings, mock_get_app_secret
    ):
        """Test that auth functions use the correct settings and secrets."""
        mock_settings.app_id = "test_app_id"
        mock_settings.app_secret = "test_app_secret_path"
        mock_get_app_secret.return_value = "test_secret_value"

        # Test that both functions would use the same settings
        with patch("app.utils.auth_utils.requests.request") as mock_request:
            mock_response = Mock()
            mock_response.status_code = 500  # Force fallback
            mock_request.return_value = mock_response

            get_auth_token()

            # Verify get_app_secret was called for both password and app secret
            assert mock_get_app_secret.call_count >= 1

    def test_header_parsing_integration_with_offline_auth(self):
        """Test integration between header parsing and offline auth."""
        # Test that the header format expected by get_userid_and_token_from_authn_header
        # matches what get_offline_auth_token would receive
        test_header = 'intuit_userid="integration_user", intuit_token="integration_token", intuit_realmid="integration_realm"'

        userid, token, realmid = get_userid_and_token_from_authn_header(test_header)

        assert userid == "integration_user"
        assert token == "integration_token"
        assert realmid == "integration_realm"

        # Verify the format is consistent with what the API would return
        assert all(
            isinstance(val, (str, type(None))) for val in [userid, token, realmid]
        )

@pytest.fixture
def mock_token():
    return "test_token"

@pytest.fixture
def mock_headers():
    return {
        "Authorization": "Bearer test_token",
        "X-User-ID": "test_user",
        "X-Realm-ID": "test_realm"
    }

def test_get_auth_token_success(mock_headers):
    token = get_auth_token(mock_headers)
    assert token == "test_token"

def test_get_auth_token_missing():
    with pytest.raises(AuthError) as exc_info:
        get_auth_token({})
    assert str(exc_info.value) == "Missing authorization header"

def test_get_auth_token_invalid_format():
    with pytest.raises(AuthError) as exc_info:
        get_auth_token({"Authorization": "InvalidFormat"})
    assert str(exc_info.value) == "Invalid authorization header format"

@patch('app.utils.auth_utils.validate_token')
def test_validate_auth_token_success(mock_validate, mock_token):
    mock_validate.return_value = True
    assert validate_auth_token(mock_token) is True

@patch('app.utils.auth_utils.validate_token')
def test_validate_auth_token_failure(mock_validate, mock_token):
    mock_validate.return_value = False
    with pytest.raises(AuthError) as exc_info:
        validate_auth_token(mock_token)
    assert str(exc_info.value) == "Invalid token"
