"""
Coupon / Partner Rewards Routes.

Endpoints for browsing and redeeming coupons with shekels.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.security import get_current_user
from app.models.coupon import CouponResponse, RedemptionResponse
from app.models.user import User
from app.services.coupon_service import coupon_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/coupons", tags=["coupons"])


class RedeemRequest(BaseModel):
    """Request body for coupon redemption."""
    coupon_id: str


@router.get("/available", response_model=List[CouponResponse])
async def get_available_coupons(
    category: Optional[str] = Query(None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
):
    """Get available coupons for redemption."""
    coupons = await coupon_service.get_available_coupons(
        category=category,
        limit=limit,
        offset=offset,
    )

    return [
        CouponResponse(
            coupon_id=c.coupon_id,
            title=c.title,
            title_he=c.title_he,
            description=c.description,
            description_he=c.description_he,
            image_url=c.image_url,
            shekel_cost=c.shekel_cost,
            original_value=c.original_value,
            is_available=c.is_available,
            category=c.category,
        )
        for c in coupons
    ]


@router.post("/redeem", response_model=RedemptionResponse)
async def redeem_coupon(
    request: RedeemRequest,
    profile_id: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
):
    """Redeem a coupon using shekels."""
    try:
        redemption = await coupon_service.redeem_coupon(
            user_id=str(user.id),
            profile_id=profile_id,
            coupon_id=request.coupon_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )

    return RedemptionResponse(
        coupon_id=redemption.coupon_id,
        redemption_code=redemption.redemption_code,
        shekel_cost=redemption.shekel_cost,
        redeemed_at=redemption.redeemed_at.isoformat(),
    )


@router.get(
    "/my-redemptions", response_model=List[RedemptionResponse]
)
async def get_my_redemptions(
    profile_id: Optional[str] = Query(None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
):
    """Get user's coupon redemption history."""
    redemptions = await coupon_service.get_user_redemptions(
        user_id=str(user.id),
        profile_id=profile_id,
        limit=limit,
        offset=offset,
    )

    return [
        RedemptionResponse(
            coupon_id=r.coupon_id,
            redemption_code=r.redemption_code,
            shekel_cost=r.shekel_cost,
            redeemed_at=r.redeemed_at.isoformat(),
        )
        for r in redemptions
    ]
