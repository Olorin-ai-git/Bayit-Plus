"""
OpenAPI Schema Validation Tests

This test suite validates that the FastAPI application generates a valid OpenAPI 3.1 schema
that conforms to the OpenAPI specification. This is critical for contract testing and
type generation workflows.

Test Requirements (TDD - These tests MUST FAIL before implementation):
1. FastAPI app generates OpenAPI schema
2. Schema validates against OpenAPI 3.1 spec
3. Schema includes required metadata (title, version, description)
4. Schema includes investigation endpoints
5. Schema includes proper response models

Constitutional Compliance:
- Tests use environment-based configuration
- No hardcoded values in assertions
- Fail-fast behavior on validation errors
"""

import pytest
from fastapi.openapi.utils import get_openapi
from openapi_spec_validator import validate_spec
from openapi_spec_validator.readers import read_from_filename
import json
import os
from pathlib import Path


@pytest.fixture
def app():
    """
    Get the FastAPI application instance.

    This fixture creates the app with test configuration to ensure
    consistent schema generation across test runs.
    """
    from app.service import create_app
    from app.service.config import LocalSettings

    # Create app with test configuration
    test_config = LocalSettings()
    return create_app(test_config=test_config)


@pytest.fixture
def openapi_schema(app):
    """
    Extract OpenAPI schema from FastAPI app.

    Returns:
        dict: OpenAPI schema dictionary
    """
    return get_openapi(
        title=app.title,
        version=app.version,
        openapi_version=app.openapi_version,
        description=app.description,
        routes=app.routes,
    )


@pytest.fixture
def schema_file_path(tmp_path):
    """
    Temporary file path for schema validation.

    Args:
        tmp_path: pytest temporary directory fixture

    Returns:
        Path: Path to temporary schema file
    """
    return tmp_path / "openapi.json"


class TestOpenAPISchemaValidation:
    """Test suite for OpenAPI schema validation."""

    def test_schema_generation(self, app, openapi_schema):
        """
        Test that FastAPI app generates OpenAPI schema.

        This test will FAIL until the investigation models and endpoints are implemented.
        """
        assert openapi_schema is not None, "OpenAPI schema should be generated"
        assert isinstance(openapi_schema, dict), "Schema should be a dictionary"
        assert "openapi" in openapi_schema, "Schema should have 'openapi' version field"
        assert "info" in openapi_schema, "Schema should have 'info' metadata"
        assert "paths" in openapi_schema, "Schema should have 'paths' for endpoints"

    def test_schema_validates_against_openapi_spec(self, openapi_schema, schema_file_path):
        """
        Test that generated schema validates against OpenAPI 3.1 specification.

        This test will FAIL until the schema is properly structured and valid.
        """
        # Write schema to temporary file for validation
        with open(schema_file_path, 'w') as f:
            json.dump(openapi_schema, f, indent=2)

        # Validate against OpenAPI spec
        # This will raise ValidationError if schema is invalid
        try:
            validate_spec(openapi_schema)
        except Exception as e:
            pytest.fail(f"OpenAPI schema validation failed: {e}")

    def test_schema_metadata_from_environment(self, app, openapi_schema):
        """
        Test that schema metadata comes from environment variables.

        This test will FAIL until T011 OpenAPI metadata configuration is properly integrated.
        """
        # Get expected values from environment or defaults
        expected_title = os.getenv("OPENAPI_TITLE", "Olorin Fraud Investigation Platform API")
        expected_version = os.getenv("OPENAPI_VERSION", "1.0.0")

        info = openapi_schema.get("info", {})

        assert info.get("title") == expected_title, \
            f"Schema title should match environment: expected '{expected_title}', got '{info.get('title')}'"

        assert info.get("version") == expected_version, \
            f"Schema version should match environment: expected '{expected_version}', got '{info.get('version')}'"

        assert "description" in info, "Schema should have description"
        assert len(info["description"]) > 0, "Description should not be empty"

    def test_schema_includes_investigation_endpoints(self, openapi_schema):
        """
        Test that schema includes investigation management endpoints.

        This test will FAIL until investigation endpoints (T019, T020) are implemented.
        """
        paths = openapi_schema.get("paths", {})

        # Check for POST /api/v1/investigations/ endpoint
        assert "/api/v1/investigations/" in paths, \
            "Schema should include POST /api/v1/investigations/ endpoint"

        post_endpoint = paths.get("/api/v1/investigations/", {})
        assert "post" in post_endpoint, \
            "POST method should be defined for /api/v1/investigations/"

        # Check for GET /api/v1/investigations/{investigation_id} endpoint
        assert "/api/v1/investigations/{investigation_id}" in paths, \
            "Schema should include GET /api/v1/investigations/{investigation_id} endpoint"

        get_endpoint = paths.get("/api/v1/investigations/{investigation_id}", {})
        assert "get" in get_endpoint, \
            "GET method should be defined for /api/v1/investigations/{investigation_id}"

    def test_schema_includes_health_check_endpoints(self, openapi_schema):
        """
        Test that schema includes health check endpoints.

        This test will FAIL until health check endpoints (T021) are implemented.
        """
        paths = openapi_schema.get("paths", {})

        # Check for health check endpoints
        health_endpoints = [
            "/health/ready",
            "/health/live",
            "/health/startup"
        ]

        for endpoint in health_endpoints:
            assert endpoint in paths, \
                f"Schema should include {endpoint} health check endpoint"

            endpoint_def = paths.get(endpoint, {})
            assert "get" in endpoint_def, \
                f"GET method should be defined for {endpoint}"

    def test_schema_includes_investigation_models(self, openapi_schema):
        """
        Test that schema includes InvestigationRequest and InvestigationResponse models.

        This test will FAIL until investigation models (T014-T018) are implemented.
        """
        components = openapi_schema.get("components", {})
        schemas = components.get("schemas", {})

        # Check for InvestigationRequest model
        assert "InvestigationRequest" in schemas, \
            "Schema should include InvestigationRequest model"

        request_schema = schemas["InvestigationRequest"]
        assert "properties" in request_schema, \
            "InvestigationRequest should have properties"
        assert "entity_id" in request_schema["properties"], \
            "InvestigationRequest should have entity_id field"
        assert "entity_type" in request_schema["properties"], \
            "InvestigationRequest should have entity_type field"

        # Check for InvestigationResponse model
        assert "InvestigationResponse" in schemas, \
            "Schema should include InvestigationResponse model"

        response_schema = schemas["InvestigationResponse"]
        assert "properties" in response_schema, \
            "InvestigationResponse should have properties"
        assert "investigation_id" in response_schema["properties"], \
            "InvestigationResponse should have investigation_id field"
        assert "status" in response_schema["properties"], \
            "InvestigationResponse should have status field"
        assert "risk_score" in response_schema["properties"], \
            "InvestigationResponse should have risk_score field"

    def test_schema_includes_error_response_model(self, openapi_schema):
        """
        Test that schema includes ErrorResponse model.

        This test will FAIL until ErrorResponse model (T018) is implemented.
        """
        components = openapi_schema.get("components", {})
        schemas = components.get("schemas", {})

        assert "ErrorResponse" in schemas, \
            "Schema should include ErrorResponse model"

        error_schema = schemas["ErrorResponse"]
        assert "properties" in error_schema, \
            "ErrorResponse should have properties"
        assert "error" in error_schema["properties"], \
            "ErrorResponse should have error field"
        assert "message" in error_schema["properties"], \
            "ErrorResponse should have message field"
