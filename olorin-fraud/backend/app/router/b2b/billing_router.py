"""
B2B Billing Router.

Endpoints for managing subscriptions, invoices, and payment methods.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.models.b2b.billing import BillingPeriod
from app.security.b2b_auth import (
    B2BPartnerContext,
    get_b2b_partner_context,
    require_b2b_admin,
    require_b2b_owner,
)
from app.service.b2b.billing_service import get_b2b_billing_service
from app.service.b2b.partner_service import get_b2b_partner_service
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

router = APIRouter(prefix="/billing", tags=["B2B Billing"])


# ==================== Request/Response Models ====================


class CreateSubscriptionRequest(BaseModel):
    """Create or update subscription request."""

    plan_id: str = Field(..., min_length=1)
    billing_period: str = Field(default="monthly", pattern="^(monthly|yearly)$")


class CancelSubscriptionRequest(BaseModel):
    """Cancel subscription request."""

    reason: Optional[str] = Field(default=None, max_length=500)
    cancel_immediately: bool = False


class PlanResponse(BaseModel):
    """Plan details for API response."""

    plan_id: str
    name: str
    name_en: Optional[str]
    description: Optional[str]
    base_price_monthly: float
    base_price_yearly: float
    max_team_members: int
    max_api_keys: int
    max_api_calls_per_minute: int
    support_level: str
    trial_days: int


# ==================== Plan Endpoints ====================


@router.get("/plans")
async def list_plans() -> dict:
    """
    List available B2B subscription plans.

    This endpoint is public (no authentication required).
    """
    billing_service = get_b2b_billing_service()

    plans = await billing_service.list_plans(active_only=True, public_only=True)

    return {
        "plans": [p.to_dict() for p in plans],
        "total": len(plans),
    }


@router.get("/plans/{plan_id}")
async def get_plan(plan_id: str) -> dict:
    """
    Get details of a specific plan.
    """
    billing_service = get_b2b_billing_service()

    plan = await billing_service.get_plan(plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found",
        )

    return {"plan": plan.to_dict()}


# ==================== Subscription Endpoints ====================


@router.get("/subscription")
async def get_subscription(
    context: B2BPartnerContext = Depends(get_b2b_partner_context),
) -> dict:
    """
    Get the current organization's subscription.
    """
    billing_service = get_b2b_billing_service()

    subscription = await billing_service.get_organization_subscription(context.org_id)
    if not subscription:
        return {"subscription": None, "message": "No active subscription"}

    # Get plan details
    plan = await billing_service.get_plan(subscription.plan_id)

    return {
        "subscription": subscription.to_dict(),
        "plan": plan.to_dict() if plan else None,
    }


@router.post("/subscription", status_code=status.HTTP_201_CREATED)
async def create_subscription(
    request: CreateSubscriptionRequest,
    context: B2BPartnerContext = Depends(require_b2b_owner),
) -> dict:
    """
    Create a new subscription or upgrade existing one.

    Requires owner role.
    """
    billing_service = get_b2b_billing_service()
    partner_service = get_b2b_partner_service()

    # Check for existing subscription
    existing = await billing_service.get_organization_subscription(context.org_id)
    if existing and existing.is_active():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Active subscription already exists. Cancel current subscription first or contact support for upgrade.",
        )

    # Verify plan exists
    plan = await billing_service.get_plan(request.plan_id)
    if not plan or not plan.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan not found or not available",
        )

    # Get organization for Stripe customer
    org = await partner_service.get_organization(context.org_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    # Create Stripe customer if doesn't exist
    stripe_customer_id = org.stripe_customer_id
    if not stripe_customer_id:
        stripe_customer_id = await billing_service.create_stripe_customer(
            org_id=context.org_id,
            email=org.contact_email,
            name=org.name,
        )
        if stripe_customer_id:
            await partner_service.update_organization(
                context.org_id,
                stripe_customer_id=stripe_customer_id,
            )

    try:
        billing_period = BillingPeriod(request.billing_period)
        subscription = await billing_service.create_subscription(
            org_id=context.org_id,
            plan_id=request.plan_id,
            billing_period=billing_period,
            stripe_customer_id=stripe_customer_id,
            start_trial=True,
        )

        logger.info(
            f"Subscription created: {subscription.subscription_id} for org: {context.org_id}"
        )

        return {
            "subscription": subscription.to_dict(),
            "plan": plan.to_dict(),
            "message": f"Subscription created successfully. Trial period: {plan.trial_days} days.",
        }

    except Exception as e:
        logger.error(f"Failed to create subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subscription. Please try again.",
        )


@router.delete("/subscription")
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    context: B2BPartnerContext = Depends(require_b2b_owner),
) -> dict:
    """
    Cancel the current subscription.

    Requires owner role.
    """
    billing_service = get_b2b_billing_service()

    subscription = await billing_service.get_organization_subscription(context.org_id)
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription to cancel",
        )

    canceled = await billing_service.cancel_subscription(
        subscription_id=subscription.subscription_id,
        reason=request.reason,
        cancel_immediately=request.cancel_immediately,
    )

    if not canceled:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription",
        )

    logger.info(f"Subscription canceled: {subscription.subscription_id} for org: {context.org_id}")

    message = (
        "Subscription canceled immediately."
        if request.cancel_immediately
        else "Subscription will be canceled at the end of the current billing period."
    )

    return {"subscription": canceled.to_dict(), "message": message}


# ==================== Invoice Endpoints ====================


@router.get("/invoices")
async def list_invoices(
    limit: int = 50,
    context: B2BPartnerContext = Depends(get_b2b_partner_context),
) -> dict:
    """
    List invoices for the organization.
    """
    billing_service = get_b2b_billing_service()

    invoices = await billing_service.list_organization_invoices(
        org_id=context.org_id,
        limit=min(limit, 100),
    )

    return {
        "invoices": [inv.to_dict() for inv in invoices],
        "total": len(invoices),
    }


@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    context: B2BPartnerContext = Depends(get_b2b_partner_context),
) -> dict:
    """
    Get details of a specific invoice.
    """
    billing_service = get_b2b_billing_service()

    invoice = await billing_service.get_invoice(invoice_id)
    if not invoice or invoice.org_id != context.org_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    return {"invoice": invoice.to_dict()}


@router.get("/invoices/{invoice_id}/pdf")
async def get_invoice_pdf(
    invoice_id: str,
    context: B2BPartnerContext = Depends(get_b2b_partner_context),
) -> dict:
    """
    Get PDF download URL for an invoice.
    """
    billing_service = get_b2b_billing_service()

    invoice = await billing_service.get_invoice(invoice_id)
    if not invoice or invoice.org_id != context.org_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    if not invoice.invoice_pdf_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF not available for this invoice",
        )

    return {
        "invoice_id": invoice.invoice_id,
        "pdf_url": invoice.invoice_pdf_url,
        "hosted_url": invoice.hosted_invoice_url,
    }


# ==================== Webhook Endpoint ====================


@router.post("/webhooks/stripe")
async def handle_stripe_webhook(request: Request) -> dict:
    """
    Handle Stripe webhook events.

    This endpoint is called by Stripe to notify about subscription
    and payment events.
    """
    billing_service = get_b2b_billing_service()

    # Get raw payload and signature
    payload = await request.body()
    signature = request.headers.get("Stripe-Signature")

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe signature",
        )

    try:
        result = await billing_service.handle_stripe_webhook(payload, signature)
        logger.info(f"Processed Stripe webhook: {result.get('event_type')}")
        return result
    except ValueError as e:
        logger.error(f"Stripe webhook error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
