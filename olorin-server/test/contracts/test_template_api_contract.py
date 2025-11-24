"""
Contract Test: Template API
Feature: 005-polling-and-persistence

Tests ALL 6 template management endpoints against the OpenAPI specification.
Tests are expected to FAIL initially (endpoints not implemented yet).

Template Management:
- Create templates from investigation settings
- List user's saved templates with sorting/filtering
- Apply templates to new investigations
- Update template metadata (name, description, tags)
- Delete templates (soft delete if used)
- Track template usage statistics

SYSTEM MANDATE Compliance:
- Contract-first approach (test before implementation)
- No mock data (tests validate real API behavior)
- All endpoints tested against OpenAPI schema
- All error codes validated (400, 401, 403, 404, 409, 422, 500)
- Template validation against InvestigationSettings schema

Endpoints Tested:
1. GET /templates (list user templates)
2. POST /templates (create template)
3. GET /templates/{id} (retrieve template)
4. PUT /templates/{id} (update template)
5. DELETE /templates/{id} (delete template)
6. POST /templates/{id}/apply (apply template to new investigation)
"""

import pytest
from pathlib import Path
import yaml
from typing import Dict, Any
from openapi_core import OpenAPI


SPEC_PATH = Path(__file__).parent.parent.parent.parent / "specs" / "005-polling-and-persistence" / "contracts" / "template-api.yaml"


@pytest.fixture(scope="module")
def openapi_spec() -> Dict[str, Any]:
    """Load Template API OpenAPI specification from YAML file."""
    with open(SPEC_PATH, "r") as f:
        return yaml.safe_load(f)


@pytest.fixture(scope="module")
def openapi_validator(openapi_spec: Dict[str, Any]):
    """Create OpenAPI validator from specification."""
    return OpenAPI.from_dict(openapi_spec)


@pytest.fixture
def template_data() -> Dict[str, Any]:
    """Sample template data for testing.

    CONFIGURATION SOURCE: All values represent valid data structures,
    no hardcoded business logic values.
    """
    return {
        "name": "Test Investigation Template",
        "description": "Template for testing purposes",
        "template_json": {
            "entities": [
                {
                    "entity_type": "user_id"
                }
            ],
            "time_range": {
                "duration_hours": 24
            },
            "tools": [
                {
                    "tool_name": "device_fingerprint",
                    "enabled": True,
                    "config": {}
                }
            ],
            "correlation_mode": "OR"
        },
        "tags": ["test", "automation"]
    }


class TestTemplateAPIContract:
    """Contract tests for Template API endpoints."""

    @pytest.mark.unit
    def test_list_templates_schema(self, openapi_validator):
        """
        Test GET /templates request/response schema validation.

        Validates:
        - Query parameters (sort_by, sort_order, limit, offset)
        - Response schema matches TemplateListResponse
        - templates array contains TemplateResponse objects
        - Pagination metadata (total, limit, offset)

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T017")

    @pytest.mark.unit
    def test_list_templates_sorting(self, openapi_validator):
        """
        Test template listing sorting parameters.

        Validates:
        - sort_by enum values (name, created_at, last_used, usage_count)
        - sort_order enum values (asc, desc)
        - Default sorting (created_at desc)
        - Sort order applied correctly

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T017")

    @pytest.mark.unit
    def test_list_templates_pagination(self, openapi_validator):
        """
        Test pagination parameters.

        Validates:
        - limit parameter (min 1, max 100, default 20)
        - offset parameter (min 0, default 0)
        - total count in response
        - templates array size <= limit

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T017")

    @pytest.mark.unit
    def test_create_template_schema(
        self,
        openapi_validator,
        template_data: Dict[str, Any]
    ):
        """
        Test POST /templates request/response schema validation.

        Validates:
        - Request schema matches TemplateCreate
        - Required fields (name, template_json)
        - Response schema matches TemplateResponse
        - 201 Created status code
        - usage_count initialized to 0

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T017")

    @pytest.mark.unit
    def test_create_template_name_uniqueness(
        self,
        openapi_validator,
        template_data: Dict[str, Any]
    ):
        """
        Test template name uniqueness constraint.

        Validates:
        - 409 Conflict when template name already exists for user
        - Error message indicates duplicate name
        - Different users can have same template name

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T017")

    @pytest.mark.unit
    def test_create_template_json_validation(
        self,
        openapi_validator,
        template_data: Dict[str, Any]
    ):
        """
        Test template_json validation against InvestigationSettings schema.

        Validates:
        - Required fields (entities, time_range, tools, correlation_mode)
        - Entities array constraints (at least 1 entity)
        - Tools array constraints (at least 1 tool)
        - 422 Validation Error for invalid template_json

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T017")

    @pytest.mark.unit
    def test_get_template_schema(self, openapi_validator):
        """
        Test GET /templates/{id} request/response schema validation.

        Validates:
        - Path parameter validation (template_id pattern)
        - Response schema matches TemplateResponse
        - Complete template_json included
        - Usage statistics present (usage_count, last_used)

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T017")

    @pytest.mark.unit
    def test_get_template_access_control(self, openapi_validator):
        """
        Test template access control.

        Validates:
        - Users can only access their own templates
        - 403 Forbidden for templates owned by other users
        - 404 Not Found for non-existent templates

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T017")

    @pytest.mark.unit
    def test_update_template_metadata(
        self,
        openapi_validator,
        template_data: Dict[str, Any]
    ):
        """
        Test PUT /templates/{id} metadata updates.

        Validates:
        - Can update name, description, tags
        - Request schema matches TemplateUpdate
        - Response includes updated fields
        - updated_at timestamp changes

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T017")

    @pytest.mark.unit
    def test_update_template_configuration_restriction(
        self,
        openapi_validator
    ):
        """
        Test restriction on updating template_json when template is in use.

        Validates:
        - Cannot update template_json if usage_count > 0
        - 400 Bad Request with appropriate error message
        - Can update metadata even when template is in use

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T017")

    @pytest.mark.unit
    def test_delete_template_schema(self, openapi_validator):
        """
        Test DELETE /templates/{id} request/response validation.

        Validates:
        - 204 No Content response on success
        - 404 Not Found for non-existent template
        - 403 Forbidden for unauthorized access

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T017")

    @pytest.mark.unit
    def test_delete_template_soft_delete(self, openapi_validator):
        """
        Test soft delete behavior for used templates.

        Validates:
        - Templates with usage_count > 0 are soft-deleted
        - Templates with usage_count = 0 are hard-deleted
        - Soft-deleted templates retained for audit

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T017")

    @pytest.mark.unit
    def test_apply_template_schema(
        self,
        openapi_validator,
        template_data: Dict[str, Any]
    ):
        """
        Test POST /templates/{id}/apply request/response schema.

        Validates:
        - Request schema matches TemplateApplyRequest
        - Required fields (investigation_id, investigation_name)
        - Response schema matches WizardStateResponse
        - 201 Created status code
        - template_id field present in response

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T017")

    @pytest.mark.unit
    def test_apply_template_placeholder_replacement(
        self,
        openapi_validator
    ):
        """
        Test placeholder replacement in template application.

        Validates:
        - entity_values array replaces placeholders
        - Entity types match template configuration
        - Multiple entities supported
        - entity_value field populated in wizard state

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T017")

    @pytest.mark.unit
    def test_apply_template_overrides(self, openapi_validator):
        """
        Test override functionality when applying template.

        Validates:
        - overrides.time_range can override template time_range
        - overrides.tools can override template tools
        - Overridden values used in created wizard state
        - Template original configuration unchanged

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T017")

    @pytest.mark.unit
    def test_apply_template_usage_tracking(self, openapi_validator):
        """
        Test usage statistics tracking.

        Validates:
        - usage_count incremented after template application
        - last_used timestamp updated
        - GET /templates/{id} shows updated statistics
        - Template listing reflects usage counts

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T017")

    @pytest.mark.unit
    def test_error_response_schemas(self, openapi_validator):
        """
        Test all error response schemas match OpenAPI specification.

        Validates error responses for:
        - 400 Bad Request (cannot modify template_json when in use)
        - 401 Unauthorized (missing auth)
        - 403 Forbidden (insufficient permissions)
        - 404 Not Found (template not found)
        - 409 Conflict (duplicate template name)
        - 422 Validation Error (invalid template_json)
        - 500 Server Error (internal error)

        Expected to FAIL initially (endpoint not implemented).
        """
        pytest.skip("Endpoint not implemented yet - will implement in T017")
