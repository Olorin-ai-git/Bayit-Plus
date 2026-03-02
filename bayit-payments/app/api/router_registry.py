"""
Router registry for Bayit+ Payments Service.

Registers only the payment routes extracted from the monolith.
"""

import logging
from typing import List, Type

from beanie import Document
from fastapi import FastAPI

from app.core.config import settings

logger = logging.getLogger(__name__)

from app.models.user import User
from app.models.subscription import Subscription, Invoice
from app.models.admin import Transaction, Refund, SubscriptionPlan
from app.models.coupon import Coupon, CouponRedemption
from app.models.beta_credit import BetaCredit
from app.models.beta_credit_transaction import BetaCreditTransaction

SERVICE_MODELS: List[Type[Document]] = [
    User,
    Subscription,
    Invoice,
    Transaction,
    Refund,
    Coupon,
    CouponRedemption,
    SubscriptionPlan,
    BetaCredit,
    BetaCreditTransaction,
]


def register_routes(app: FastAPI) -> None:
    """Register payment API routers."""
    prefix = settings.API_V1_PREFIX

    from app.api.routes import payments

    app.include_router(
        payments.router,
        prefix=f"{prefix}/payments",
        tags=["payments"],
    )

    logger.info(
        "Payment routes registered",
        extra={"prefix": prefix, "route_count": len(app.routes)},
    )
