"""
Authorization tests for API endpoints
Tests that all endpoints properly enforce authentication and authorization
"""

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.main import app
from app.security.auth import create_access_token


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def read_token():
    """Create JWT token with read scope"""
    token_data = {"sub": "testuser", "scopes": ["read"]}
    return create_access_token(token_data)


@pytest.fixture
def write_token():
    """Create JWT token with write scope"""
    token_data = {"sub": "testuser", "scopes": ["read", "write"]}
    return create_access_token(token_data)


@pytest.fixture
def admin_token():
    """Create JWT token with admin scope"""
    token_data = {"sub": "admin", "scopes": ["read", "write", "admin"]}
    return create_access_token(token_data)


class TestCommentAuthorization:
    """Test authorization for comment endpoints"""

    def test_get_comments_without_auth_returns_401(self, client):
        """Test that getting comments without auth returns 401"""
        response = client.get("/investigation/test-123/comment")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_comments_with_read_token_succeeds(self, client, read_token):
        """Test that getting comments with read token succeeds"""
        headers = {"Authorization": f"Bearer {read_token}"}
        response = client.get("/investigation/test-123/comment", headers=headers)
        assert response.status_code == status.HTTP_200_OK

    def test_post_comment_without_auth_returns_401(self, client):
        """Test that posting comment without auth returns 401"""
        response = client.post(
            "/investigation/test-123/comment",
            json={
                "entity_id": "test-123",
                "entity_type": "user_id",
                "sender": "test",
                "message": "test message",
            },
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_post_comment_with_read_only_returns_403(self, client, read_token):
        """Test that posting comment with only read scope returns 403"""
        headers = {"Authorization": f"Bearer {read_token}"}
        response = client.post(
            "/investigation/test-123/comment",
            headers=headers,
            json={
                "entity_id": "test-123",
                "entity_type": "user_id",
                "sender": "test",
                "message": "test message",
            },
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_post_comment_with_write_token_succeeds(self, client, write_token):
        """Test that posting comment with write token succeeds"""
        headers = {"Authorization": f"Bearer {write_token}"}
        response = client.post(
            "/investigation/test-123/comment",
            headers=headers,
            json={
                "entity_id": "test-123",
                "entity_type": "user_id",
                "sender": "test",
                "message": "test message",
            },
        )
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]


class TestDeviceAuthorization:
    """Test authorization for device endpoints"""

    def test_analyze_device_without_auth_returns_401(self, client):
        """Test that device analysis without auth returns 401"""
        response = client.get(
            "/device/test-device-123",
            params={"investigation_id": "inv-123", "entity_type": "device_id"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_analyze_device_with_read_token_succeeds(self, client, read_token):
        """Test that device analysis with read token succeeds"""
        headers = {"Authorization": f"Bearer {read_token}"}
        response = client.get(
            "/device/test-device-123",
            headers=headers,
            params={"investigation_id": "inv-123", "entity_type": "device_id"},
        )
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        ]


class TestNetworkAuthorization:
    """Test authorization for network endpoints"""

    def test_analyze_network_without_auth_returns_401(self, client):
        """Test that network analysis without auth returns 401"""
        response = client.get(
            "/network/test-user-123",
            params={"investigation_id": "inv-123", "entity_type": "user_id"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_analyze_network_with_read_token_succeeds(self, client, read_token):
        """Test that network analysis with read token succeeds"""
        headers = {"Authorization": f"Bearer {read_token}"}
        response = client.get(
            "/network/test-user-123",
            headers=headers,
            params={"investigation_id": "inv-123", "entity_type": "user_id"},
        )
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        ]


class TestLocationAuthorization:
    """Test authorization for location endpoints"""

    def test_analyze_location_without_auth_returns_401(self, client):
        """Test that location analysis without auth returns 401"""
        response = client.get(
            "/location/test-user-123",
            params={"investigation_id": "inv-123", "entity_type": "user_id"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_analyze_location_with_read_token_succeeds(self, client, read_token):
        """Test that location analysis with read token succeeds"""
        headers = {"Authorization": f"Bearer {read_token}"}
        response = client.get(
            "/location/test-user-123",
            headers=headers,
            params={"investigation_id": "inv-123", "entity_type": "user_id"},
        )
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        ]


class TestLogsAuthorization:
    """Test authorization for logs endpoints"""

    def test_analyze_logs_without_auth_returns_401(self, client):
        """Test that logs analysis without auth returns 401"""
        response = client.get(
            "/logs/test-user-123",
            params={"investigation_id": "inv-123", "entity_type": "user_id"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_analyze_logs_with_read_token_succeeds(self, client, read_token):
        """Test that logs analysis with read token succeeds"""
        headers = {"Authorization": f"Bearer {read_token}"}
        response = client.get(
            "/logs/test-user-123",
            headers=headers,
            params={"investigation_id": "inv-123", "entity_type": "user_id"},
        )
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        ]


class TestInvestigationAuthorization:
    """Test authorization for investigation endpoints"""

    def test_create_investigation_without_auth_returns_401(self, client):
        """Test that creating investigation without auth returns 401"""
        response = client.post(
            "/investigation", json={"entity_id": "test-123", "entity_type": "user_id"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_investigation_with_read_only_returns_403(self, client, read_token):
        """Test that creating investigation with only read scope returns 403"""
        headers = {"Authorization": f"Bearer {read_token}"}
        response = client.post(
            "/investigation",
            headers=headers,
            json={"entity_id": "test-123", "entity_type": "user_id"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_investigation_with_write_token_succeeds(self, client, write_token):
        """Test that creating investigation with write token succeeds"""
        headers = {"Authorization": f"Bearer {write_token}"}
        response = client.post(
            "/investigation",
            headers=headers,
            json={"entity_id": "test-123", "entity_type": "user_id"},
        )
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        ]

    def test_delete_all_without_admin_returns_403(self, client, write_token):
        """Test that deleting all investigations without admin returns 403"""
        headers = {"Authorization": f"Bearer {write_token}"}
        response = client.delete("/investigations/delete_all", headers=headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_all_with_admin_succeeds(self, client, admin_token):
        """Test that deleting all investigations with admin token succeeds"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.delete("/investigations/delete_all", headers=headers)
        assert response.status_code == status.HTTP_200_OK
