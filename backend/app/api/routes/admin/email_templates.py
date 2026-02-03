"""Admin Email Templates Management - Preview and send email templates"""

from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr

from app.core.rate_limiter import RATE_LIMITS, limiter
from app.models.admin import Permission
from app.models.user import User
from app.services.bayit_email_service import get_bayit_email_service
from app.services.email_templates import get_template_renderer

from .auth import has_permission

router = APIRouter()


class TemplateMetadata(BaseModel):
    """Email template metadata."""

    name: str
    display_name: str
    description: str
    category: str
    required_variables: list[str]
    optional_variables: list[str]


# Template catalog with metadata
TEMPLATE_CATALOG: Dict[str, TemplateMetadata] = {
    "platform_invitation": TemplateMetadata(
        name="platform_invitation",
        display_name="Platform Invitation",
        description="Invite users to join Bayit+ platform",
        category="marketing",
        required_variables=["greeting", "personal_section", "signup_url", "support_email", "current_year"],
        optional_variables=["inviter_name", "personal_message"],
    ),
    "beta_verification": TemplateMetadata(
        name="beta_verification",
        display_name="Beta Verification",
        description="Email verification for Beta 500 program",
        category="onboarding",
        required_variables=["verification_url", "current_year"],
        optional_variables=[],
    ),
    "household_invitation": TemplateMetadata(
        name="household_invitation",
        display_name="Household Invitation",
        description="Invite family members to household",
        category="family",
        required_variables=[
            "inviter_name",
            "household_name",
            "role_display",
            "accept_url",
            "expires_at",
            "support_email",
            "current_year",
        ],
        optional_variables=[],
    ),
}


@router.get("/marketing/email-templates")
async def list_email_templates(
    current_user: User = Depends(has_permission(Permission.MARKETING_READ)),
):
    """
    List all available email templates with metadata.

    Returns:
        List of email templates with their metadata
    """
    templates = [
        {
            "name": metadata.name,
            "display_name": metadata.display_name,
            "description": metadata.description,
            "category": metadata.category,
            "required_variables": metadata.required_variables,
            "optional_variables": metadata.optional_variables,
        }
        for metadata in TEMPLATE_CATALOG.values()
    ]
    return {"templates": templates}


@router.get("/marketing/email-templates/{template_name}")
async def get_template_details(
    template_name: str,
    current_user: User = Depends(has_permission(Permission.MARKETING_READ)),
):
    """
    Get detailed information about a specific template.

    Args:
        template_name: Template identifier (e.g., "platform_invitation")

    Returns:
        Template metadata with variable descriptions

    Raises:
        HTTPException: If template not found
    """
    metadata = TEMPLATE_CATALOG.get(template_name)
    if not metadata:
        raise HTTPException(
            status_code=404,
            detail=f"Template '{template_name}' not found. Available templates: {list(TEMPLATE_CATALOG.keys())}",
        )

    return {
        "name": metadata.name,
        "display_name": metadata.display_name,
        "description": metadata.description,
        "category": metadata.category,
        "required_variables": metadata.required_variables,
        "optional_variables": metadata.optional_variables,
    }


class TemplatePreviewRequest(BaseModel):
    """Template preview request with variables."""

    variables: Dict[str, str]


@router.post("/marketing/email-templates/{template_name}/preview")
async def preview_email_template(
    template_name: str,
    data: TemplatePreviewRequest,
    current_user: User = Depends(has_permission(Permission.MARKETING_READ)),
):
    """
    Render template with provided variables for preview.

    Args:
        template_name: Template identifier
        data: Template variables for rendering

    Returns:
        Rendered HTML content

    Raises:
        HTTPException: If template not found or variables missing
    """
    # Validate template exists
    metadata = TEMPLATE_CATALOG.get(template_name)
    if not metadata:
        raise HTTPException(
            status_code=404,
            detail=f"Template '{template_name}' not found",
        )

    # Validate required variables are present
    missing_vars = [
        var for var in metadata.required_variables if var not in data.variables
    ]
    if missing_vars:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required variables: {missing_vars}",
        )

    try:
        renderer = get_template_renderer()
        html_content = renderer.render(f"{template_name}.html", data.variables)
        return {"html": html_content}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to render template: {str(e)}",
        )


class SendTestEmailRequest(BaseModel):
    """Send test email request."""

    test_email: EmailStr
    variables: Dict[str, str]


@router.post("/marketing/email-templates/{template_name}/send-test")
@limiter.limit(RATE_LIMITS["email_send_test"])
async def send_test_email(
    request: Request,
    template_name: str,
    data: SendTestEmailRequest,
    current_user: User = Depends(has_permission(Permission.MARKETING_SEND)),
):
    """
    Send test email to specified address.

    Args:
        template_name: Template identifier
        data: Test email address and template variables

    Returns:
        Success message with test email address

    Raises:
        HTTPException: If template not found, variables missing, or send fails
    """
    # Validate template exists
    metadata = TEMPLATE_CATALOG.get(template_name)
    if not metadata:
        raise HTTPException(
            status_code=404,
            detail=f"Template '{template_name}' not found",
        )

    # Validate required variables
    missing_vars = [
        var for var in metadata.required_variables if var not in data.variables
    ]
    if missing_vars:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required variables: {missing_vars}",
        )

    try:
        # Render template
        renderer = get_template_renderer()
        html_content = renderer.render(f"{template_name}.html", data.variables)

        # Send via BayitEmailService
        bayit_email = get_bayit_email_service()
        result = await bayit_email.send_generic_email(
            to_emails=[data.test_email],
            subject=f"[TEST] {metadata.display_name}",
            html_content=html_content,
        )

        if result.success:
            return {
                "message": f"Test email sent successfully to {data.test_email}",
                "email": data.test_email,
                "message_id": result.message_id,
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send test email: {result.message}",
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send test email: {str(e)}",
        )
