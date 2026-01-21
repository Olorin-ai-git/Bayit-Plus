"""
B2B Partner Platform Models.

MongoDB models for the unified B2B partner platform supporting:
- Partner organization management
- Billing and subscription handling
- Usage tracking and analytics
- Multi-service capability management (fraud detection + content AI)

SYSTEM MANDATE Compliance:
- No hardcoded values: All enums configurable
- Complete implementation: No placeholders
- Configuration-driven: All values from models or config
"""

from app.models.b2b.partner import (
    PartnerOrganization,
    PartnerUser,
    PartnerApiKey,
    PartnerRole,
    ServiceCategory,
)
from app.models.b2b.billing import (
    B2BPlan,
    B2BSubscription,
    B2BInvoice,
    B2BPaymentMethod,
    ServiceInclusion,
    SubscriptionStatus,
    InvoiceStatus,
    BillingPeriod,
)

__all__ = [
    # Partner models
    "PartnerOrganization",
    "PartnerUser",
    "PartnerApiKey",
    "PartnerRole",
    "ServiceCategory",
    # Billing models
    "B2BPlan",
    "B2BSubscription",
    "B2BInvoice",
    "B2BPaymentMethod",
    "ServiceInclusion",
    "SubscriptionStatus",
    "InvoiceStatus",
    "BillingPeriod",
]
