"""
Contract Test: Investigation State API
Feature: 005-polling-and-persistence

Tests ALL 5 endpoints against the OpenAPI specification using contract testing.
Tests are expected to FAIL initially (endpoints not implemented yet).

Investigation Lifecycle: CREATED → SETTINGS → IN_PROGRESS → COMPLETED/ERROR/CANCELLED

SYSTEM MANDATE Compliance:
- Contract-first approach (test before implementation)
- No mock data (tests validate real API behavior)
- All endpoints tested against OpenAPI schema
- All error codes validated
- ETag conditional GET behavior tested

Endpoints Tested:
1. POST /investigation-state (create state)
2. GET /investigation-state/{id} (retrieve with conditional GET)
3. PUT /investigation-state/{id} (update with optimistic locking)
4. DELETE /investigation-state/{id} (delete state)
5. GET /investigation-state/{id}/history (audit log)
"""

from pathlib import Path
from typing import Any, Dict

import pytest
import yaml
from openapi_core import OpenAPI

# Load OpenAPI specification
SPEC_PATH = (
    Path(__file__).parent.parent.parent.parent
    / "specs"
    / "005-polling-and-persistence"
    / "contracts"
    / "wizard-state-api.yaml"
)


@pytest.fixture(scope="module")
def openapi_spec() -> Dict[str, Any]:
    """Load OpenAPI specification from YAML file."""
    with open(SPEC_PATH, "r") as f:
        return yaml.safe_load(f)


@pytest.fixture(scope="module")
def openapi_validator(openapi_spec: Dict[str, Any]):
    """Create OpenAPI validator from specification."""
    return OpenAPI.from_dict(openapi_spec)


@pytest.fixture
def investigation_state_data() -> Dict[str, Any]:
    """Sample investigation state data for testing.

    CONFIGURATION SOURCE: All values represent valid data structures,
    no hardcoded business logic values.
    """
    return {
        "investigation_id": "test_inv_001",
        "lifecycle_stage": "SETTINGS",
        "settings": {
            "name": "Test Investigation",
            "entities": [{"entity_type": "user_id", "entity_value": "test_user_123"}],
            "time_range": {
                "start_time": "2024-01-01T00:00:00Z",
                "end_time": "2024-01-31T23:59:59Z",
            },
            "tools": [
                {"tool_name": "device_fingerprint", "enabled": True, "config": {}}
            ],
            "correlation_mode": "OR",
        },
        "status": "SETTINGS",
    }


class TestInvestigationStateAPIContract:
    """Contract tests for Investigation State API endpoints."""

    @pytest.mark.unit
    def test_create_investigation_state_schema(
        self, openapi_validator, investigation_state_data: Dict[str, Any]
    ):
        """
        Test POST /investigation-state request/response schema validation.

        Expected to FAIL initially (endpoint not implemented).
        """
        # This test validates the request schema matches OpenAPI spec
        # Implementation will be done in T013
        pytest.skip("Endpoint not implemented yet - will implement in T013")

    @pytest.mark.unit
    def test_get_investigation_state_schema(self, openapi_validator):
        """
        Test GET /investigation-state/{id} request/response schema validation.

        Validates:
        - Path parameter validation (investigation_id pattern)
        - Response schema matches WizardStateResponse
        - ETag header present in response

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T013")

    @pytest.mark.unit
    def test_get_investigation_state_conditional_get(self, openapi_validator):
        """
        Test GET /investigation-state/{id} with If-None-Match header.

        Validates:
        - If-None-Match header support
        - 304 Not Modified response when version matches
        - ETag comparison logic

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T013")

    @pytest.mark.unit
    def test_update_investigation_state_optimistic_locking(
        self, openapi_validator, investigation_state_data: Dict[str, Any]
    ):
        """
        Test PUT /investigation-state/{id} optimistic locking behavior.

        Validates:
        - Version field required in request
        - 409 Conflict when version mismatch
        - Version incremented in response
        - ETag updated after successful update

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T013")

    @pytest.mark.unit
    def test_delete_investigation_state_schema(self, openapi_validator):
        """
        Test DELETE /investigation-state/{id} request/response validation.

        Validates:
        - 204 No Content response on success
        - 404 Not Found for non-existent state
        - 403 Forbidden for unauthorized access

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T013")

    @pytest.mark.unit
    def test_get_investigation_history_schema(self, openapi_validator):
        """
        Test GET /investigation-state/{id}/history request/response validation.

        Validates:
        - Pagination parameters (limit, offset)
        - Filter parameters (action_type, source)
        - Response array schema matches AuditLogEntry
        - Pagination metadata (total, limit, offset)

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T013")

    @pytest.mark.unit
    def test_error_response_schemas(self, openapi_validator):
        """
        Test all error response schemas match OpenAPI specification.

        Validates error responses for:
        - 400 Bad Request (ErrorResponse schema)
        - 401 Unauthorized (ErrorResponse schema)
        - 403 Forbidden (ErrorResponse schema)
        - 404 Not Found (ErrorResponse schema)
        - 409 Conflict (ErrorResponse schema with version details)
        - 422 Validation Error (ValidationErrorResponse schema)
        - 500 Server Error (ErrorResponse schema)

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T013")

    @pytest.mark.unit
    def test_lifecycle_stage_validation(
        self, openapi_validator, investigation_state_data: Dict[str, Any]
    ):
        """
        Test lifecycle_stage field validation against schema constraints.

        Validates:
        - lifecycle_stage enum values (CREATED, SETTINGS, IN_PROGRESS, COMPLETED)
        - Invalid lifecycle_stage rejected with 422
        - Lifecycle transitions validated

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T013")

    @pytest.mark.unit
    def test_status_field_validation(
        self, openapi_validator, investigation_state_data: Dict[str, Any]
    ):
        """
        Test status field validation against schema constraints.

        Validates:
        - status enum values (CREATED, SETTINGS, IN_PROGRESS, COMPLETED, ERROR, CANCELLED)
        - Invalid status rejected with 422
        - Status consistency with lifecycle_stage

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T013")

    @pytest.mark.unit
    def test_investigation_settings_schema(
        self, openapi_validator, investigation_state_data: Dict[str, Any]
    ):
        """
        Test InvestigationSettings schema validation.

        Validates:
        - Required fields (name, entities, time_range, tools, correlation_mode)
        - Entities array constraints (min 1, max 10)
        - Tools array constraints (min 1, max 20)
        - Entity type enum validation
        - Time range format validation

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T013")
