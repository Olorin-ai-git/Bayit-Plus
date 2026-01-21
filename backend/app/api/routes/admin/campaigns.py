"""
Admin campaign management endpoints.
Provides CRUD operations for promotional campaigns.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from app.models.admin import (AuditAction, Campaign, CampaignStatus,
                              CampaignType, DiscountType, Permission,
                              TargetAudience)
from app.models.user import User

from .auth import has_permission, log_audit

router = APIRouter()


class CampaignCreate(BaseModel):
    """Campaign creation schema."""

    name: str
    description: Optional[str] = None
    type: CampaignType
    start_date: datetime
    end_date: Optional[datetime] = None
    promo_code: Optional[str] = None
    discount_type: DiscountType
    discount_value: float
    usage_limit: Optional[int] = None
    target_audience: Optional[TargetAudience] = None


@router.get("/campaigns")
async def get_campaigns(
    status: Optional[str] = None,
    type: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.CAMPAIGNS_READ)),
):
    """Get campaigns list."""
    query = Campaign.find()

    if status:
        query = query.find(Campaign.status == CampaignStatus(status))
    if type:
        query = query.find(Campaign.type == CampaignType(type))

    total = await query.count()
    skip = (page - 1) * page_size
    campaigns = (
        await query.sort(-Campaign.created_at).skip(skip).limit(page_size).to_list()
    )

    return {
        "items": [
            {
                "id": str(c.id),
                "name": c.name,
                "description": c.description,
                "type": c.type.value,
                "status": c.status.value,
                "promo_code": c.promo_code,
                "discount_type": c.discount_type.value,
                "discount_value": c.discount_value,
                "usage_limit": c.usage_limit,
                "usage_count": c.usage_count,
                "start_date": c.start_date.isoformat(),
                "end_date": c.end_date.isoformat() if c.end_date else None,
                "target_audience": (
                    c.target_audience.model_dump() if c.target_audience else None
                ),
                "created_by": c.created_by,
                "created_at": c.created_at.isoformat(),
            }
            for c in campaigns
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/campaigns")
async def create_campaign(
    data: CampaignCreate,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CAMPAIGNS_CREATE)),
):
    """Create a new campaign."""
    if data.promo_code:
        existing = await Campaign.find_one(Campaign.promo_code == data.promo_code)
        if existing:
            raise HTTPException(status_code=400, detail="Promo code already exists")

    campaign = Campaign(
        name=data.name,
        description=data.description,
        type=data.type,
        start_date=data.start_date,
        end_date=data.end_date,
        promo_code=data.promo_code,
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        usage_limit=data.usage_limit,
        target_audience=data.target_audience or TargetAudience(),
        created_by=str(current_user.id),
    )
    await campaign.insert()

    await log_audit(
        str(current_user.id),
        AuditAction.CAMPAIGN_CREATED,
        "campaign",
        str(campaign.id),
        {"name": data.name},
        request,
    )

    return {"id": str(campaign.id), "message": "Campaign created"}


@router.get("/campaigns/{campaign_id}")
async def get_campaign(
    campaign_id: str,
    current_user: User = Depends(has_permission(Permission.CAMPAIGNS_READ)),
):
    """Get campaign details."""
    campaign = await Campaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    return {
        "id": str(campaign.id),
        "name": campaign.name,
        "description": campaign.description,
        "type": campaign.type.value,
        "status": campaign.status.value,
        "promo_code": campaign.promo_code,
        "discount_type": campaign.discount_type.value,
        "discount_value": campaign.discount_value,
        "usage_limit": campaign.usage_limit,
        "usage_count": campaign.usage_count,
        "start_date": campaign.start_date.isoformat(),
        "end_date": campaign.end_date.isoformat() if campaign.end_date else None,
        "target_audience": (
            campaign.target_audience.model_dump() if campaign.target_audience else None
        ),
        "created_by": campaign.created_by,
        "created_at": campaign.created_at.isoformat(),
        "updated_at": campaign.updated_at.isoformat(),
    }


@router.patch("/campaigns/{campaign_id}")
async def update_campaign(
    campaign_id: str,
    data: CampaignCreate,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CAMPAIGNS_UPDATE)),
):
    """Update campaign."""
    campaign = await Campaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.name = data.name
    campaign.description = data.description
    campaign.type = data.type
    campaign.start_date = data.start_date
    campaign.end_date = data.end_date
    campaign.discount_type = data.discount_type
    campaign.discount_value = data.discount_value
    campaign.usage_limit = data.usage_limit
    campaign.target_audience = data.target_audience or TargetAudience()
    campaign.updated_at = datetime.utcnow()

    if data.promo_code and data.promo_code != campaign.promo_code:
        existing = await Campaign.find_one(Campaign.promo_code == data.promo_code)
        if existing:
            raise HTTPException(status_code=400, detail="Promo code already exists")
        campaign.promo_code = data.promo_code

    await campaign.save()
    await log_audit(
        str(current_user.id),
        AuditAction.CAMPAIGN_UPDATED,
        "campaign",
        campaign_id,
        {"name": data.name},
        request,
    )

    return {"message": "Campaign updated"}


@router.post("/campaigns/{campaign_id}/activate")
async def activate_campaign(
    campaign_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CAMPAIGNS_UPDATE)),
):
    """Activate a campaign."""
    campaign = await Campaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.status = CampaignStatus.ACTIVE
    campaign.updated_at = datetime.utcnow()
    await campaign.save()

    await log_audit(
        str(current_user.id),
        AuditAction.CAMPAIGN_ACTIVATED,
        "campaign",
        campaign_id,
        {},
        request,
    )

    return {"message": "Campaign activated"}


@router.post("/campaigns/{campaign_id}/deactivate")
async def deactivate_campaign(
    campaign_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CAMPAIGNS_UPDATE)),
):
    """Deactivate a campaign."""
    campaign = await Campaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.status = CampaignStatus.PAUSED
    campaign.updated_at = datetime.utcnow()
    await campaign.save()

    return {"message": "Campaign deactivated"}


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CAMPAIGNS_DELETE)),
):
    """Delete a campaign."""
    campaign = await Campaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    await log_audit(
        str(current_user.id),
        AuditAction.CAMPAIGN_DELETED,
        "campaign",
        campaign_id,
        {"name": campaign.name},
        request,
    )
    await campaign.delete()

    return {"message": "Campaign deleted"}


@router.get("/campaigns/validate/{promo_code}")
async def validate_promo_code(
    promo_code: str,
    current_user: User = Depends(has_permission(Permission.CAMPAIGNS_READ)),
):
    """Validate a promo code."""
    campaign = await Campaign.find_one(Campaign.promo_code == promo_code)
    if not campaign:
        return {"valid": False, "message": "Invalid promo code"}

    if campaign.status != CampaignStatus.ACTIVE:
        return {"valid": False, "message": "Campaign not active"}

    if campaign.usage_limit and campaign.usage_count >= campaign.usage_limit:
        return {"valid": False, "message": "Usage limit reached"}

    now = datetime.utcnow()
    if campaign.start_date > now:
        return {"valid": False, "message": "Campaign not started"}
    if campaign.end_date and campaign.end_date < now:
        return {"valid": False, "message": "Campaign ended"}

    return {
        "valid": True,
        "campaign_id": str(campaign.id),
        "discount_type": campaign.discount_type.value,
        "discount_value": campaign.discount_value,
    }
