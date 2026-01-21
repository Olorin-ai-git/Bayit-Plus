import pytest
from fastapi.testclient import TestClient
from starlette import status


@pytest.fixture
def nonmesh_client(app):
    return TestClient(app, base_url="http://testserver:8443")


def test_health_allowed_nonmesh(nonmesh_client):
    response = nonmesh_client.get("/health/full")
    assert response.status_code == status.HTTP_200_OK


def test_apidoc_allowed_nonmesh(nonmesh_client):
    response = nonmesh_client.get("apidoc/swagger")
    assert response.status_code == status.HTTP_200_OK


def test_example_denied_nonmesh(nonmesh_client):
    response = nonmesh_client.get("v1/example/log_level")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
