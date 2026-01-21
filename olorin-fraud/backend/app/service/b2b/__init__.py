"""
B2B Partner Platform Services.

Business logic services for the unified B2B partner platform.

Services:
- PartnerService: Partner organization and user management
- BillingService: Stripe integration for B2B billing
- InvoiceService: Invoice generation and management
- CapabilityProxyService: Proxy to fraud detection and content AI services
"""

from app.service.b2b.partner_service import B2BPartnerService, get_b2b_partner_service
from app.service.b2b.billing_service import B2BBillingService, get_b2b_billing_service

__all__ = [
    "B2BPartnerService",
    "get_b2b_partner_service",
    "B2BBillingService",
    "get_b2b_billing_service",
]
