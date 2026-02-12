"""
Coupon Redemption Service.

Manages coupon browsing and redemption with atomic shekel deduction.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from app.models.coupon import (
    Coupon,
    CouponRedemption,
    CouponStatus,
)
from app.models.shekel_currency import TransactionType
from app.services.mission.shekel_service import shekel_service

logger = logging.getLogger(__name__)


class CouponService:
    """Manages coupon browsing and redemption."""

    async def get_available_coupons(
        self,
        category: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> List[Coupon]:
        """Get available coupons, optionally filtered by category."""
        query = {"status": CouponStatus.ACTIVE}
        if category:
            query["category"] = category

        coupons = (
            await Coupon.find(query)
            .sort("shekel_cost")
            .skip(offset)
            .limit(limit)
            .to_list()
        )

        now = datetime.now(timezone.utc)
        return [
            c
            for c in coupons
            if c.is_available
            and (not c.expires_at or c.expires_at > now)
        ]

    async def redeem_coupon(
        self,
        user_id: str,
        profile_id: Optional[str],
        coupon_id: str,
    ) -> CouponRedemption:
        """
        Redeem a coupon with atomic shekel deduction.

        Raises ValueError if coupon unavailable or insufficient balance.
        """
        coupon = await Coupon.find_one({"coupon_id": coupon_id})
        if not coupon:
            raise ValueError("Coupon not found")

        if not coupon.is_available:
            raise ValueError("Coupon is no longer available")

        user_redemptions = await CouponRedemption.find(
            {
                "user_id": user_id,
                "profile_id": profile_id,
                "coupon_id": coupon_id,
            }
        ).count()

        if user_redemptions >= coupon.max_per_user:
            raise ValueError(
                f"Maximum redemptions reached ({coupon.max_per_user})"
            )

        await shekel_service.spend_shekels(
            user_id=user_id,
            profile_id=profile_id,
            amount=coupon.shekel_cost,
            transaction_type=TransactionType.COUPON_REDEMPTION,
            description=f"Coupon: {coupon.title}",
            description_he=f"קופון: {coupon.title_he}",
            reference_id=coupon_id,
        )

        redemption_code = str(uuid.uuid4())[:8].upper()

        redemption = CouponRedemption(
            user_id=user_id,
            profile_id=profile_id,
            coupon_id=coupon_id,
            partner_id=coupon.partner_id,
            shekel_cost=coupon.shekel_cost,
            redemption_code=redemption_code,
        )
        await redemption.insert()

        coupon.redeemed_count += 1
        if (
            coupon.total_quantity > 0
            and coupon.redeemed_count >= coupon.total_quantity
        ):
            coupon.status = CouponStatus.DEPLETED
        await coupon.save()

        logger.info(
            "Coupon redeemed",
            extra={
                "user_id": user_id,
                "coupon_id": coupon_id,
                "shekels": coupon.shekel_cost,
                "code": redemption_code,
            },
        )
        return redemption

    async def get_user_redemptions(
        self,
        user_id: str,
        profile_id: Optional[str],
        limit: int = 20,
        offset: int = 0,
    ) -> List[CouponRedemption]:
        """Get redemption history for a user."""
        return (
            await CouponRedemption.find(
                {"user_id": user_id, "profile_id": profile_id}
            )
            .sort("-redeemed_at")
            .skip(offset)
            .limit(limit)
            .to_list()
        )


coupon_service = CouponService()
