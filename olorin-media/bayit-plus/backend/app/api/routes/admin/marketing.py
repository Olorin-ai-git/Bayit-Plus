"""Admin Marketing Management - Email campaigns, push notifications, and audience segments"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from app.models.admin import (AudienceFilter, EmailCampaign, MarketingStatus,
                              Permission, PushNotification)
from app.models.user import User

from .auth import has_permission

router = APIRouter()


@router.get("/marketing/metrics")
async def get_marketing_metrics(
    current_user: User = Depends(has_permission(Permission.MARKETING_READ)),
):
    """Get marketing metrics summary."""
    # Email metrics
    email_campaigns = await EmailCampaign.find().to_list()
    total_emails_sent = sum(c.sent_count for c in email_campaigns)
    total_emails_opened = sum(c.open_count for c in email_campaigns)
    total_emails_clicked = sum(c.click_count for c in email_campaigns)

    email_open_rate = (
        (total_emails_opened / total_emails_sent * 100) if total_emails_sent > 0 else 0
    )
    email_click_rate = (
        (total_emails_clicked / total_emails_sent * 100) if total_emails_sent > 0 else 0
    )

    # Push metrics
    push_notifications = await PushNotification.find().to_list()
    total_push_sent = sum(p.sent_count for p in push_notifications)
    total_push_opened = sum(p.open_count for p in push_notifications)

    push_open_rate = (
        (total_push_opened / total_push_sent * 100) if total_push_sent > 0 else 0
    )

    # Active segments (hardcoded for now as we have 5 segments)
    active_segments = 5

    # Conversion and unsubscribe rates (placeholder values)
    conversion_rate = 4.5
    unsubscribe_rate = 0.8

    return {
        "emailsSent": total_emails_sent,
        "emailOpenRate": round(email_open_rate, 1),
        "emailClickRate": round(email_click_rate, 1),
        "pushSent": total_push_sent,
        "pushOpenRate": round(push_open_rate, 1),
        "activeSegments": active_segments,
        "conversionRate": conversion_rate,
        "unsubscribeRate": unsubscribe_rate,
    }


@router.get("/marketing/campaigns/recent")
async def get_recent_campaigns(
    limit: int = Query(default=5, le=20),
    current_user: User = Depends(has_permission(Permission.MARKETING_READ)),
):
    """Get recent marketing campaigns (email and push)."""
    # Get recent email campaigns
    email_campaigns = (
        await EmailCampaign.find()
        .sort(-EmailCampaign.created_at)
        .limit(limit)
        .to_list()
    )

    # Get recent push notifications
    push_campaigns = (
        await PushNotification.find()
        .sort(-PushNotification.created_at)
        .limit(limit)
        .to_list()
    )

    # Combine and format
    campaigns = []

    for c in email_campaigns:
        campaigns.append(
            {
                "id": str(c.id),
                "name": c.name,
                "type": "email",
                "status": c.status.value,
                "sent": c.sent_count,
                "opened": c.open_count,
                "clicked": c.click_count,
                "created_at": c.created_at.isoformat(),
            }
        )

    for c in push_campaigns:
        campaigns.append(
            {
                "id": str(c.id),
                "name": c.title,
                "type": "push",
                "status": c.status.value,
                "sent": c.sent_count,
                "opened": c.open_count,
                "clicked": 0,
                "created_at": c.created_at.isoformat(),
            }
        )

    # Sort by created_at and limit
    campaigns.sort(key=lambda x: x["created_at"], reverse=True)
    return campaigns[:limit]


@router.get("/marketing/segments/summary")
async def get_audience_segments(
    request: Request,
    current_user: User = Depends(has_permission(Permission.MARKETING_READ)),
):
    """Get audience segments summary with user counts.
    Returns localized segment names based on Accept-Language header.
    """
    # Get user's preferred language from Accept-Language header
    accept_language = request.headers.get("Accept-Language", "he")
    preferred_lang = accept_language.split(",")[0].split("-")[0].lower()

    # Localized segment names
    segment_translations = {
        "he": {
            "all_users": "כל המשתמשים",
            "active_subscribers": "מנויים פעילים",
            "new_users": "משתמשים חדשים (7 ימים)",
            "expired_subscribers": "מנויים שפג תוקפם",
            "inactive_users": "לא פעילים (30 יום)",
        },
        "en": {
            "all_users": "All Users",
            "active_subscribers": "Active Subscribers",
            "new_users": "New Users (7 days)",
            "expired_subscribers": "Expired Subscribers",
            "inactive_users": "Inactive (30 days)",
        },
        "es": {
            "all_users": "Todos los Usuarios",
            "active_subscribers": "Suscriptores Activos",
            "new_users": "Nuevos Usuarios (7 días)",
            "expired_subscribers": "Suscriptores Expirados",
            "inactive_users": "Inactivos (30 días)",
        },
    }

    # Default to Hebrew if language not supported
    translations = segment_translations.get(preferred_lang, segment_translations["he"])

    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)

    # Get counts for different segments
    total_users = await User.find().count()
    active_subscribers = await User.find(User.subscription_status == "active").count()
    new_users = await User.find(User.created_at >= seven_days_ago).count()
    expired_subscribers = await User.find(User.subscription_status == "expired").count()
    inactive_users = await User.find(User.last_login < thirty_days_ago).count()

    return [
        {"name": translations["all_users"], "count": total_users},
        {"name": translations["active_subscribers"], "count": active_subscribers},
        {"name": translations["new_users"], "count": new_users},
        {"name": translations["expired_subscribers"], "count": expired_subscribers},
        {"name": translations["inactive_users"], "count": inactive_users},
    ]


@router.get("/marketing/emails")
async def get_email_campaigns(
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.MARKETING_READ)),
):
    """Get email campaigns list."""
    query = EmailCampaign.find()

    if status and status != "all":
        query = query.find(EmailCampaign.status == MarketingStatus(status))

    if search:
        query = query.find(
            {
                "$or": [
                    {"name": {"$regex": search, "$options": "i"}},
                    {"subject": {"$regex": search, "$options": "i"}},
                ]
            }
        )

    total = await query.count()
    skip = (page - 1) * page_size
    campaigns = (
        await query.sort(-EmailCampaign.created_at)
        .skip(skip)
        .limit(page_size)
        .to_list()
    )

    items = [
        {
            "id": str(c.id),
            "name": c.name,
            "subject": c.subject,
            "status": c.status.value,
            "sent_count": c.sent_count,
            "open_count": c.open_count,
            "click_count": c.click_count,
            "scheduled_at": c.scheduled_at.isoformat() if c.scheduled_at else None,
            "sent_at": c.sent_at.isoformat() if c.sent_at else None,
            "created_at": c.created_at.isoformat(),
        }
        for c in campaigns
    ]
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


class EmailCampaignCreate(BaseModel):
    name: str
    subject: str
    body_html: str
    body_text: Optional[str] = None
    audience_filter: Optional[AudienceFilter] = None


@router.post("/marketing/emails")
async def create_email_campaign(
    data: EmailCampaignCreate,
    current_user: User = Depends(has_permission(Permission.MARKETING_CREATE)),
):
    """Create a new email campaign."""
    campaign = EmailCampaign(
        name=data.name,
        subject=data.subject,
        body_html=data.body_html,
        body_text=data.body_text,
        audience_filter=data.audience_filter or AudienceFilter(),
        created_by=str(current_user.id),
    )
    await campaign.insert()

    return {"id": str(campaign.id), "message": "Email campaign created"}


@router.post("/marketing/emails/{campaign_id}/send")
async def send_email_campaign(
    campaign_id: str,
    current_user: User = Depends(has_permission(Permission.MARKETING_SEND)),
):
    """Send an email campaign."""
    campaign = await EmailCampaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.status == MarketingStatus.SENT:
        raise HTTPException(status_code=400, detail="Campaign already sent")

    # In production, this would queue the emails for sending
    campaign.status = MarketingStatus.SENT
    campaign.sent_at = datetime.utcnow()
    await campaign.save()

    return {"message": "Email campaign sent"}


@router.post("/marketing/emails/{campaign_id}/schedule")
async def schedule_email_campaign(
    campaign_id: str,
    scheduled_at: datetime = Query(...),
    current_user: User = Depends(has_permission(Permission.MARKETING_SEND)),
):
    """Schedule an email campaign."""
    campaign = await EmailCampaign.get(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.status = MarketingStatus.SCHEDULED
    campaign.scheduled_at = scheduled_at
    await campaign.save()

    return {"message": f"Email campaign scheduled for {scheduled_at}"}


@router.get("/marketing/push")
async def get_push_notifications(
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.MARKETING_READ)),
):
    """Get push notifications list."""
    query = PushNotification.find()

    if status and status != "all":
        query = query.find(PushNotification.status == MarketingStatus(status))

    if search:
        query = query.find(
            {
                "$or": [
                    {"title": {"$regex": search, "$options": "i"}},
                    {"body": {"$regex": search, "$options": "i"}},
                ]
            }
        )

    total = await query.count()
    skip = (page - 1) * page_size
    notifications = (
        await query.sort(-PushNotification.created_at)
        .skip(skip)
        .limit(page_size)
        .to_list()
    )

    items = [
        {
            "id": str(n.id),
            "title": n.title,
            "body": n.body,
            "deep_link": n.deep_link,
            "status": n.status.value,
            "sent_count": n.sent_count,
            "open_count": n.open_count,
            "scheduled_at": n.scheduled_at.isoformat() if n.scheduled_at else None,
            "sent_at": n.sent_at.isoformat() if n.sent_at else None,
            "created_at": n.created_at.isoformat(),
        }
        for n in notifications
    ]
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


class PushNotificationCreate(BaseModel):
    title: str
    body: str
    image_url: Optional[str] = None
    deep_link: Optional[str] = None
    audience_filter: Optional[AudienceFilter] = None


@router.post("/marketing/push")
async def create_push_notification(
    data: PushNotificationCreate,
    current_user: User = Depends(has_permission(Permission.MARKETING_CREATE)),
):
    """Create a new push notification."""
    notification = PushNotification(
        title=data.title,
        body=data.body,
        image_url=data.image_url,
        deep_link=data.deep_link,
        audience_filter=data.audience_filter or AudienceFilter(),
        created_by=str(current_user.id),
    )
    await notification.insert()

    return {"id": str(notification.id), "message": "Push notification created"}


@router.post("/marketing/push/{notification_id}/send")
async def send_push_notification(
    notification_id: str,
    current_user: User = Depends(has_permission(Permission.MARKETING_SEND)),
):
    """Send a push notification."""
    notification = await PushNotification.get(notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    if notification.status == MarketingStatus.SENT:
        raise HTTPException(status_code=400, detail="Notification already sent")

    # In production, this would send via FCM/APNS
    notification.status = MarketingStatus.SENT
    notification.sent_at = datetime.utcnow()
    await notification.save()

    return {"message": "Push notification sent"}
