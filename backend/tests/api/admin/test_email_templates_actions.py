"""
Tests for Email Templates Management API - Preview and Send Actions
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


class TestPreviewTemplate:
    """Tests for POST /api/v1/admin/marketing/email-templates/{template_name}/preview"""

    async def test_preview_template_success(self, admin_client: AsyncClient):
        """Test previewing template with variables."""
        response = await admin_client.post(
            "/api/v1/admin/marketing/email-templates/platform_invitation/preview",
            json={
                "variables": {
                    "greeting": "Welcome to Bayit+!",
                    "personal_section": "",
                    "signup_url": "https://bayitplus.com/signup",
                    "support_email": "support@bayitplus.com",
                    "current_year": "2026",
                }
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "html" in data
        assert "Welcome to Bayit+!" in data["html"]
        assert "https://bayitplus.com/signup" in data["html"]

    async def test_preview_template_missing_variables(self, admin_client: AsyncClient):
        """Test preview fails with missing required variables."""
        response = await admin_client.post(
            "/api/v1/admin/marketing/email-templates/platform_invitation/preview",
            json={"variables": {"greeting": "Welcome"}},
        )

        assert response.status_code == 400
        assert "Missing required variables" in response.json()["detail"]

    async def test_preview_template_not_found(self, admin_client: AsyncClient):
        """Test preview fails for non-existent template."""
        response = await admin_client.post(
            "/api/v1/admin/marketing/email-templates/nonexistent/preview",
            json={"variables": {}},
        )
        assert response.status_code == 404

    async def test_preview_requires_permission(self, client_without_permission: AsyncClient):
        """Test that preview requires MARKETING_READ permission."""
        response = await client_without_permission.post(
            "/api/v1/admin/marketing/email-templates/platform_invitation/preview",
            json={"variables": {}},
        )
        assert response.status_code == 403


class TestSendTestEmail:
    """Tests for POST /api/v1/admin/marketing/email-templates/{template_name}/send-test"""

    async def test_send_test_email_success(self, admin_client: AsyncClient, mocker):
        """Test sending test email."""
        # Mock BayitEmailService to avoid actual email sends
        mock_send = mocker.patch(
            "app.api.routes.admin.email_templates.get_bayit_email_service"
        )
        mock_send.return_value.send_generic_email.return_value.success = True
        mock_send.return_value.send_generic_email.return_value.message_id = "test-123"

        response = await admin_client.post(
            "/api/v1/admin/marketing/email-templates/platform_invitation/send-test",
            json={
                "test_email": "test@example.com",
                "variables": {
                    "greeting": "Welcome!",
                    "personal_section": "",
                    "signup_url": "https://bayitplus.com/signup",
                    "support_email": "support@bayitplus.com",
                    "current_year": "2026",
                },
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "test@example.com" in data["message"]

    async def test_send_test_email_missing_variables(self, admin_client: AsyncClient):
        """Test send test email fails with missing variables."""
        response = await admin_client.post(
            "/api/v1/admin/marketing/email-templates/platform_invitation/send-test",
            json={
                "test_email": "test@example.com",
                "variables": {"greeting": "Welcome"},
            },
        )
        assert response.status_code == 400

    async def test_send_test_email_invalid_email(self, admin_client: AsyncClient):
        """Test send test email fails with invalid email."""
        response = await admin_client.post(
            "/api/v1/admin/marketing/email-templates/platform_invitation/send-test",
            json={
                "test_email": "not-an-email",
                "variables": {
                    "greeting": "Welcome",
                    "personal_section": "",
                    "signup_url": "https://bayitplus.com/signup",
                    "support_email": "support@bayitplus.com",
                    "current_year": "2026",
                },
            },
        )
        assert response.status_code == 422  # Pydantic validation error

    async def test_send_test_requires_permission(self, client_without_permission: AsyncClient):
        """Test that send test requires MARKETING_SEND permission."""
        response = await client_without_permission.post(
            "/api/v1/admin/marketing/email-templates/platform_invitation/send-test",
            json={
                "test_email": "test@example.com",
                "variables": {},
            },
        )
        assert response.status_code == 403


class TestTemplateVariables:
    """Tests for template variable handling and XSS protection"""

    async def test_html_escaping_in_preview(self, admin_client: AsyncClient):
        """Test that HTML in variables is escaped to prevent XSS."""
        response = await admin_client.post(
            "/api/v1/admin/marketing/email-templates/platform_invitation/preview",
            json={
                "variables": {
                    "greeting": "<script>alert('XSS')</script>",
                    "personal_section": "",
                    "signup_url": "https://bayitplus.com/signup",
                    "support_email": "support@bayitplus.com",
                    "current_year": "2026",
                }
            },
        )

        assert response.status_code == 200
        data = response.json()
        # HTML should be rendered but script tags should be escaped or not executed
        assert "<script>" not in data["html"] or "&lt;script&gt;" in data["html"]

    async def test_all_templates_have_required_fields(self, admin_client: AsyncClient):
        """Test that all templates have complete metadata."""
        response = await admin_client.get("/api/v1/admin/marketing/email-templates")
        assert response.status_code == 200

        templates = response.json()["templates"]
        for template in templates:
            assert "name" in template
            assert "display_name" in template
            assert "category" in template
            assert "required_variables" in template
            assert "optional_variables" in template
            assert isinstance(template["required_variables"], list)
            assert isinstance(template["optional_variables"], list)
