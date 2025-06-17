from unittest.mock import MagicMock, patch

import pytest

from app.service.config import LocalSettings, SvcSettings
from app.utils.idps_utils import _getIdpsClient, get_app_secret


@pytest.fixture
def mock_local_settings():
    """Create mock LocalSettings for testing local environment."""
    mock_settings = MagicMock(spec=LocalSettings)
    mock_settings.idps_endpoint = "http://localhost:8080"
    mock_settings.asset_id = "test_asset_id"
    return mock_settings


@pytest.fixture
def mock_svc_settings():
    """Create mock SvcSettings for testing non-local environment."""
    mock_settings = MagicMock(spec=SvcSettings)
    mock_settings.idps_endpoint = "https://idps.example.com"
    mock_settings.idps_policy_id = "test_policy_id"
    return mock_settings


@pytest.fixture
def mock_idps_client():
    """Create mock IDPS client for testing."""
    mock_client = MagicMock()
    mock_secret = MagicMock()
    mock_secret.get_string_value.return_value = "secret_value"
    mock_client.get_secret.return_value = mock_secret
    return mock_client


@pytest.fixture
def mock_idps_client_factory(mock_idps_client):
    """Create mock IdpsClientFactory for testing."""
    with patch("app.utils.idps_utils.IdpsClientFactory") as mock_factory:
        mock_factory.get_instance.return_value = mock_idps_client
        yield mock_factory


# Override the fixture from conftest.py for these specific tests
@pytest.fixture(autouse=True, scope="module")
def no_global_mock_idps_auth():
    """Disable the global IDPS authentication mock for these tests"""
    # First, patch to get original behavior
    with (
        patch("app.utils.idps_utils._app_secrets", {}),
        patch("app.utils.idps_utils._getIdpsClient", _getIdpsClient),
    ):
        # Then yield to run the test
        yield


def test_getIdpsClient_local_environment(mock_local_settings, mock_idps_client_factory):
    """Test _getIdpsClient with local environment settings."""
    client = _getIdpsClient(mock_local_settings)

    # Verify IdpsClientFactory was called with correct arguments for local environment
    mock_idps_client_factory.get_instance.assert_called_once_with(
        endpoint=mock_local_settings.idps_endpoint,
        resource_asset_id=mock_local_settings.asset_id,
    )
    # Verify client is returned
    assert client is not None


def test_getIdpsClient_non_local_environment(
    mock_svc_settings, mock_idps_client_factory
):
    """Test _getIdpsClient with non-local environment settings."""
    client = _getIdpsClient(mock_svc_settings)

    # Verify IdpsClientFactory was called with correct arguments for non-local environment
    mock_idps_client_factory.get_instance.assert_called_once_with(
        endpoint=mock_svc_settings.idps_endpoint,
        policy_id=mock_svc_settings.idps_policy_id,
    )
    # Verify client is returned
    assert client is not None


@patch("app.utils.idps_utils.get_settings_for_env")
@patch("app.utils.idps_utils._getIdpsClient")
def test_get_app_secret_cached(
    mock_get_idps_client, mock_get_settings, mock_local_settings, mock_idps_client
):
    """Test get_app_secret when secret is already cached."""
    # Setup
    mock_get_settings.return_value = mock_local_settings
    mock_get_idps_client.return_value = mock_idps_client

    # First call to get_app_secret (should use the client)
    result1 = get_app_secret("test_secret")
    assert result1 == "secret_value"

    # Reset mock to verify it's not called again
    mock_get_idps_client.reset_mock()

    # Second call to get_app_secret with the same key (should use cached value)
    result2 = get_app_secret("test_secret")

    # Verify
    assert result2 == "secret_value"
    # Factory should not be called again for cached value
    mock_get_idps_client.assert_not_called()


@patch("app.utils.idps_utils.get_settings_for_env")
@patch("app.utils.idps_utils._getIdpsClient")
def test_get_app_secret_different_keys(
    mock_get_idps_client, mock_get_settings, mock_local_settings, mock_idps_client
):
    """Test get_app_secret with different secret keys."""
    # Setup
    mock_get_settings.return_value = mock_local_settings
    mock_get_idps_client.return_value = mock_idps_client

    # First call with "secret1"
    result1 = get_app_secret("secret1")
    assert result1 == "secret_value"

    # Verify client.get_secret was called with "secret1"
    mock_idps_client.get_secret.assert_called_with("secret1")

    # Second call with "secret2"
    result2 = get_app_secret("secret2")
    assert result2 == "secret_value"

    # Verify client.get_secret was called with "secret2"
    mock_idps_client.get_secret.assert_called_with("secret2")


@patch("app.utils.idps_utils.get_settings_for_env")
@patch("app.utils.idps_utils._app_secrets", {})  # Reset the global cache
@patch("app.utils.idps_utils._getIdpsClient")
def test_get_app_secret_non_local_environment(
    mock_get_idps_client, mock_get_settings, mock_svc_settings, mock_idps_client
):
    """Test get_app_secret in non-local environment."""
    # Setup
    mock_get_settings.return_value = mock_svc_settings
    mock_get_idps_client.return_value = mock_idps_client

    # Call to get_app_secret
    result = get_app_secret("production_secret")

    # Verify
    assert result == "secret_value"
    mock_get_idps_client.assert_called_once_with(mock_svc_settings)


@patch("app.utils.idps_utils.get_settings_for_env")
@patch("app.utils.idps_utils._app_secrets", {})  # Reset the global cache
@patch("app.utils.idps_utils._getIdpsClient")
def test_get_app_secret_exception_handling(
    mock_get_idps_client, mock_get_settings, mock_local_settings, mock_idps_client
):
    """Test get_app_secret handles exceptions properly."""
    # Setup
    mock_get_settings.return_value = mock_local_settings
    mock_get_idps_client.return_value = mock_idps_client
    mock_idps_client.get_secret.side_effect = Exception("IDPS client error")

    # Test that exception is propagated
    with pytest.raises(Exception) as excinfo:
        get_app_secret("error_secret")

    # Verify the exception message
    assert "IDPS client error" in str(excinfo.value)
