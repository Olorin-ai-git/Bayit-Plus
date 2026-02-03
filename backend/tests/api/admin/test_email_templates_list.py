"""
Tests for Email Templates Management API - List and Details Endpoints
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


class TestListEmailTemplates:
    """Tests for GET /api/v1/admin/marketing/email-templates"""

    async def test_list_templates_success(self, admin_client: AsyncClient):
        """Test listing all email templates."""
        response = await admin_client.get("/api/v1/admin/marketing/email-templates")

        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        assert len(data["templates"]) == 3

        # Verify template structure
        template_names = [t["name"] for t in data["templates"]]
        assert "platform_invitation" in template_names
        assert "beta_verification" in template_names
        assert "household_invitation" in template_names

    async def test_list_templates_requires_permission(self, client_without_permission: AsyncClient):
        """Test that listing templates requires MARKETING_READ permission."""
        response = await client_without_permission.get("/api/v1/admin/marketing/email-templates")
        assert response.status_code == 403


class TestGetTemplateDetails:
    """Tests for GET /api/v1/admin/marketing/email-templates/{template_name}"""

    async def test_get_template_details_success(self, admin_client: AsyncClient):
        """Test getting template details."""
        response = await admin_client.get("/api/v1/admin/marketing/email-templates/platform_invitation")

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "platform_invitation"
        assert data["display_name"] == "Platform Invitation"
        assert data["category"] == "marketing"
        assert "required_variables" in data
        assert "optional_variables" in data

    async def test_get_template_not_found(self, admin_client: AsyncClient):
        """Test getting non-existent template."""
        response = await admin_client.get("/api/v1/admin/marketing/email-templates/nonexistent")
        assert response.status_code == 404

    async def test_get_template_requires_permission(self, client_without_permission: AsyncClient):
        """Test that getting template requires MARKETING_READ permission."""
        response = await client_without_permission.get(
            "/api/v1/admin/marketing/email-templates/platform_invitation"
        )
        assert response.status_code == 403
