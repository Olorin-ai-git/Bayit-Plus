"""
Admin API Routes for Beta 500 User Management

Provides admin-only endpoints for managing beta users, credits, and analytics.

Authentication:
- Requires admin role (verified via get_current_admin_user dependency)
- All endpoints return 403 Forbidden for non-admin users
"""

from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.security import get_current_admin_user
from app.models.user import User
from app.models.beta_user import BetaUser
from app.models.beta_credit import BetaCredit
from app.models.beta_credit_transaction import BetaCreditTransaction
from app.services.beta.credit_service import BetaCreditService
from app.core.database import get_database
from app.core.config import get_settings


# Pydantic response models
class BetaUserSummary(BaseModel):
    """Summary of beta user for list view."""
    user_id: str
    email: str
    name: Optional[str] = None
    status: str
    is_beta_user: bool
    credits_remaining: int
    credits_total: int
    credits_used: int
    enrolled_at: datetime
    last_activity: Optional[datetime] = None


class BetaUserDetail(BaseModel):
    """Detailed beta user information."""
    user_id: str
    email: str
    name: Optional[str] = None
    status: str
    is_beta_user: bool
    credits_remaining: int
    credits_total: int
    credits_used: int
    enrolled_at: datetime
    verified_at: Optional[datetime] = None
    last_activity: Optional[datetime] = None
    invitation_code: Optional[str] = None
    usage_percentage: float


class CreditTransaction(BaseModel):
    """Credit transaction record."""
    transaction_id: str
    feature: str
    credits_used: int
    remaining_after: int
    timestamp: datetime
    metadata: Optional[dict] = None


class CreditAdjustmentRequest(BaseModel):
    """Request to manually adjust user credits."""
    amount: int = Field(..., description="Credits to add (positive) or remove (negative)")
    reason: str = Field(..., min_length=10, max_length=500, description="Reason for adjustment")
    notify_user: bool = Field(default=False, description="Send email notification to user")


class BetaAnalytics(BaseModel):
    """Beta 500 program analytics."""
    total_users: int
    active_users: int
    total_credits_allocated: int
    total_credits_used: int
    average_credits_per_user: float
    top_features: List[dict]
    enrollment_trend: List[dict]


# Initialize router
router = APIRouter(
    prefix="/admin/beta",
    tags=["admin", "beta-500"],
    dependencies=[Depends(get_current_admin_user)],
)


@router.get("/users", response_model=List[BetaUserSummary])
async def list_beta_users(
    status: Optional[str] = Query(None, description="Filter by status: active, pending_verification, inactive"),
    min_credits: Optional[int] = Query(None, description="Filter by minimum credits remaining"),
    max_credits: Optional[int] = Query(None, description="Filter by maximum credits remaining"),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    current_admin: User = Depends(get_current_admin_user),
    db = Depends(get_database),
):
    """
    List all beta users with optional filters.

    Admin-only endpoint for viewing beta user roster.
    """
    # Build query filter
    query_filter = {"is_beta_user": True}
    if status:
        query_filter["status"] = status

    # Get beta users
    beta_users = await BetaUser.find(query_filter).skip(skip).limit(limit).to_list()

    results = []
    for beta_user in beta_users:
        # Get credit information
        credit = await BetaCredit.find_one(BetaCredit.user_id == str(beta_user.id))

        if credit:
            # Apply credit filters if specified
            if min_credits is not None and credit.remaining_credits < min_credits:
                continue
            if max_credits is not None and credit.remaining_credits > max_credits:
                continue

            results.append(BetaUserSummary(
                user_id=str(beta_user.id),
                email=beta_user.email,
                name=getattr(beta_user, 'name', None),
                status=beta_user.status,
                is_beta_user=beta_user.is_beta_user,
                credits_remaining=credit.remaining_credits,
                credits_total=credit.total_credits,
                credits_used=credit.used_credits,
                enrolled_at=beta_user.created_at,
                last_activity=credit.updated_at,
            ))

    return results


@router.get("/users/{user_id}", response_model=BetaUserDetail)
async def get_beta_user(
    user_id: str,
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Get detailed information about a specific beta user.

    Admin-only endpoint for viewing full user profile.
    """
    # Get beta user
    beta_user = await BetaUser.find_one(BetaUser.id == user_id)
    if not beta_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Beta user {user_id} not found"
        )

    # Get credit information
    credit = await BetaCredit.find_one(BetaCredit.user_id == user_id)
    if not credit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Credits not found for user {user_id}"
        )

    return BetaUserDetail(
        user_id=user_id,
        email=beta_user.email,
        name=getattr(beta_user, 'name', None),
        status=beta_user.status,
        is_beta_user=beta_user.is_beta_user,
        credits_remaining=credit.remaining_credits,
        credits_total=credit.total_credits,
        credits_used=credit.used_credits,
        enrolled_at=beta_user.created_at,
        verified_at=getattr(beta_user, 'verified_at', None),
        last_activity=credit.updated_at,
        invitation_code=getattr(beta_user, 'invitation_code', None),
        usage_percentage=credit.usage_percentage(),
    )


@router.get("/users/{user_id}/credits", response_model=List[CreditTransaction])
async def get_user_credit_history(
    user_id: str,
    limit: int = Query(50, ge=1, le=200),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Get credit transaction history for a user.

    Admin-only endpoint for viewing usage patterns.
    """
    # Verify user exists
    beta_user = await BetaUser.find_one(BetaUser.id == user_id)
    if not beta_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Beta user {user_id} not found"
        )

    # Get transactions
    transactions = await BetaCreditTransaction.find(
        BetaCreditTransaction.user_id == user_id
    ).sort("-timestamp").limit(limit).to_list()

    return [
        CreditTransaction(
            transaction_id=str(txn.id),
            feature=txn.feature,
            credits_used=txn.credits_used,
            remaining_after=txn.remaining_after,
            timestamp=txn.timestamp,
            metadata=txn.metadata,
        )
        for txn in transactions
    ]


@router.post("/users/{user_id}/credits/adjust")
async def adjust_user_credits(
    user_id: str,
    adjustment: CreditAdjustmentRequest,
    current_admin: User = Depends(get_current_admin_user),
    db = Depends(get_database),
):
    """
    Manually adjust user credits (add or remove).

    Admin-only endpoint for customer support interventions.
    """
    # Verify user exists
    beta_user = await BetaUser.find_one(BetaUser.id == user_id)
    if not beta_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Beta user {user_id} not found"
        )

    # Get current credits
    credit = await BetaCredit.find_one(BetaCredit.user_id == user_id)
    if not credit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Credits not found for user {user_id}"
        )

    # Validate adjustment won't make credits negative
    new_balance = credit.remaining_credits + adjustment.amount
    if new_balance < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Adjustment would result in negative balance: {new_balance}"
        )

    # Perform atomic adjustment
    result = await db.beta_credits.find_one_and_update(
        {"user_id": user_id},
        {
            "$inc": {
                "total_credits": adjustment.amount if adjustment.amount > 0 else 0,
                "remaining_credits": adjustment.amount,
                "version": 1,
            },
            "$set": {
                "updated_at": datetime.utcnow(),
            }
        },
        return_document=True,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to adjust credits"
        )

    # Record transaction
    transaction = BetaCreditTransaction(
        user_id=user_id,
        credit_id=str(credit.id),
        feature="admin_adjustment",
        credits_used=-adjustment.amount,  # Negative for additions
        remaining_after=result["remaining_credits"],
        timestamp=datetime.utcnow(),
        metadata={
            "adjusted_by": str(current_admin.id),
            "admin_email": current_admin.email,
            "reason": adjustment.reason,
        }
    )
    await transaction.insert()

    # TODO: Send notification email if requested
    if adjustment.notify_user:
        # Email notification not yet implemented
        pass

    return {
        "success": True,
        "user_id": user_id,
        "previous_balance": credit.remaining_credits,
        "adjustment": adjustment.amount,
        "new_balance": result["remaining_credits"],
        "reason": adjustment.reason,
    }


@router.post("/users/{user_id}/deactivate")
async def deactivate_beta_user(
    user_id: str,
    reason: str = Query(..., min_length=10, max_length=500),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Deactivate beta access for a user.

    Admin-only endpoint for suspending abusive users.
    """
    beta_user = await BetaUser.find_one(BetaUser.id == user_id)
    if not beta_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Beta user {user_id} not found"
        )

    # Update status
    beta_user.status = "inactive"
    beta_user.is_beta_user = False
    await beta_user.save()

    return {
        "success": True,
        "user_id": user_id,
        "status": "inactive",
        "reason": reason,
        "deactivated_by": str(current_admin.id),
    }


@router.post("/users/{user_id}/reactivate")
async def reactivate_beta_user(
    user_id: str,
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Reactivate beta access for a previously deactivated user.

    Admin-only endpoint for restoring access.
    """
    beta_user = await BetaUser.find_one(BetaUser.id == user_id)
    if not beta_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Beta user {user_id} not found"
        )

    # Update status
    beta_user.status = "active"
    beta_user.is_beta_user = True
    await beta_user.save()

    return {
        "success": True,
        "user_id": user_id,
        "status": "active",
        "reactivated_by": str(current_admin.id),
    }


@router.get("/analytics", response_model=BetaAnalytics)
async def get_beta_analytics(
    current_admin: User = Depends(get_current_admin_user),
    db = Depends(get_database),
):
    """
    Get Beta 500 program analytics and statistics.

    Admin-only endpoint for program monitoring.
    """
    # Count total and active users
    total_users = await BetaUser.find(BetaUser.is_beta_user == True).count()
    active_users = await BetaUser.find(
        BetaUser.is_beta_user == True,
        BetaUser.status == "active"
    ).count()

    # Aggregate credit statistics
    credits = await BetaCredit.find().to_list()
    total_allocated = sum(c.total_credits for c in credits)
    total_used = sum(c.used_credits for c in credits)
    avg_per_user = total_allocated / total_users if total_users > 0 else 0

    # Top features by usage
    feature_aggregation = await db.beta_credit_transactions.aggregate([
        {
            "$group": {
                "_id": "$feature",
                "total_credits": {"$sum": "$credits_used"},
                "usage_count": {"$sum": 1}
            }
        },
        {"$sort": {"total_credits": -1}},
        {"$limit": 5}
    ]).to_list()

    top_features = [
        {
            "feature": item["_id"],
            "total_credits": item["total_credits"],
            "usage_count": item["usage_count"]
        }
        for item in feature_aggregation
    ]

    # Enrollment trend (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    enrollment_trend_data = await db.beta_users.aggregate([
        {
            "$match": {
                "is_beta_user": True,
                "created_at": {"$gte": thirty_days_ago}
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$created_at"
                    }
                },
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]).to_list()

    enrollment_trend = [
        {"date": item["_id"], "enrollments": item["count"]}
        for item in enrollment_trend_data
    ]

    return BetaAnalytics(
        total_users=total_users,
        active_users=active_users,
        total_credits_allocated=total_allocated,
        total_credits_used=total_used,
        average_credits_per_user=avg_per_user,
        top_features=top_features,
        enrollment_trend=enrollment_trend,
    )
