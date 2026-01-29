"""Payment-specific response models.

This module defines response models for payment-related endpoints.
"""
from typing import Literal, Optional

from pydantic import BaseModel


class PaymentStatusResponse(BaseModel):
    """Payment status response for polling endpoint.

    Used by frontend to check if payment has been completed.
    DO NOT include checkout_url (generate on-demand instead).
    """

    payment_pending: bool
    subscription_tier: Optional[str] = None
    subscription_status: Optional[str] = None
    can_access_app: bool
    pending_plan_id: Optional[str] = None


class PaymentPendingError(BaseModel):
    """Typed error response for payment pending state.

    Returned when user attempts to access protected content
    while payment is still pending.
    """

    error: Literal["payment_pending"] = "payment_pending"
    message: str
    action_url: str  # Link to generate checkout URL (e.g., "/api/payment/checkout-url")


class CheckoutSessionResponse(BaseModel):
    """Response for checkout session generation.

    Returned by /payment/checkout-url endpoint.
    URL is generated fresh on-demand and never stored.
    """

    checkout_url: str
    expires_in: int  # Seconds until URL expires (Stripe default: 24 hours)
    session_id: str  # Stripe session ID for tracking
