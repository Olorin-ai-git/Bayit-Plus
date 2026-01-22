"""
Test Main Application
Basic tests for FastAPI application startup and health checks
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Test client fixture"""
    return TestClient(app)


def test_root_endpoint(client):
    """Test root health check endpoint"""
    response = client.get("/")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "Olorin CVPlus API"
    assert data["version"] == "1.0.0"


def test_health_endpoint(client):
    """Test detailed health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "Olorin CVPlus API"
    assert "environment" in data


def test_api_docs_accessible(client):
    """Test API documentation is accessible"""
    response = client.get("/api/docs")
    assert response.status_code == 200


def test_api_redoc_accessible(client):
    """Test ReDoc documentation is accessible"""
    response = client.get("/api/redoc")
    assert response.status_code == 200
