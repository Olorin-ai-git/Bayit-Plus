"""
Admin billing and transaction management endpoints.
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel

from app.models.user import User
from app.models.admin import (
    Transaction, TransactionStatus, Refund, RefundStatus, Permission, AuditAction
)
from .auth import has_permission, log_audit


router = APIRouter()


class RefundRequest(BaseModel):
    """Refund request schema."""
    amount: float
    reason: str


@router.get("/billing/overview")
async def get_billing_overview(
    current_user: User = Depends(has_permission(Permission.BILLING_READ))
):
    """Get billing overview stats."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start.replace(day=1)
    year_start = today_start.replace(month=1, day=1)

    today_txns = await Transaction.find(
        Transaction.created_at >= today_start,
        Transaction.status == TransactionStatus.COMPLETED
    ).to_list()
    week_txns = await Transaction.find(
        Transaction.created_at >= week_start,
        Transaction.status == TransactionStatus.COMPLETED
    ).to_list()
    month_txns = await Transaction.find(
        Transaction.created_at >= month_start,
        Transaction.status == TransactionStatus.COMPLETED
    ).to_list()
    year_txns = await Transaction.find(
        Transaction.created_at >= year_start,
        Transaction.status == TransactionStatus.COMPLETED
    ).to_list()
    all_txns = await Transaction.find(Transaction.status == TransactionStatus.COMPLETED).to_list()

    pending_refunds = await Refund.find(Refund.status == RefundStatus.PENDING).count()
    total_refunds = await Refund.find().count()
    total_transactions = len(all_txns)
    total_revenue = sum(t.amount for t in all_txns)
    avg_transaction = total_revenue / total_transactions if total_transactions > 0 else 0
    refund_rate = (total_refunds / total_transactions * 100) if total_transactions > 0 else 0

    return {
        "today": sum(t.amount for t in today_txns),
        "this_week": sum(t.amount for t in week_txns),
        "this_month": sum(t.amount for t in month_txns),
        "this_year": sum(t.amount for t in year_txns),
        "pending_refunds": pending_refunds,
        "total_transactions": total_transactions,
        "avg_transaction": round(avg_transaction, 2),
        "refund_rate": round(refund_rate, 2),
    }


@router.get("/billing/transactions")
async def get_transactions(
    status: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.BILLING_READ))
):
    """Get transactions list."""
    query = Transaction.find()

    if status:
        query = query.find(Transaction.status == TransactionStatus(status))
    if start_date:
        query = query.find(Transaction.created_at >= start_date)
    if end_date:
        query = query.find(Transaction.created_at <= end_date)
    if min_amount is not None:
        query = query.find(Transaction.amount >= min_amount)
    if max_amount is not None:
        query = query.find(Transaction.amount <= max_amount)

    total = await query.count()
    skip = (page - 1) * page_size
    txns = await query.sort(-Transaction.created_at).skip(skip).limit(page_size).to_list()

    return {
        "items": [
            {
                "id": str(t.id),
                "user_id": t.user_id,
                "amount": t.amount,
                "currency": t.currency,
                "status": t.status.value,
                "payment_method": t.payment_method.value,
                "description": t.description,
                "created_at": t.created_at.isoformat(),
            }
            for t in txns
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/billing/refunds")
async def get_refunds(
    status: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.BILLING_READ))
):
    """Get refunds list."""
    query = Refund.find()

    if status:
        query = query.find(Refund.status == RefundStatus(status))

    total = await query.count()
    skip = (page - 1) * page_size
    refunds = await query.sort(-Refund.created_at).skip(skip).limit(page_size).to_list()

    return {
        "items": [
            {
                "id": str(r.id),
                "transaction_id": r.transaction_id,
                "user_id": r.user_id,
                "amount": r.amount,
                "reason": r.reason,
                "status": r.status.value,
                "processed_by": r.processed_by,
                "processed_at": r.processed_at.isoformat() if r.processed_at else None,
                "created_at": r.created_at.isoformat(),
            }
            for r in refunds
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/billing/transactions/{transaction_id}/refund")
async def process_refund(
    transaction_id: str,
    data: RefundRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.BILLING_REFUND))
):
    """Process a refund for a transaction."""
    txn = await Transaction.get(transaction_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if txn.status != TransactionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Can only refund completed transactions")

    if data.amount > txn.amount:
        raise HTTPException(status_code=400, detail="Refund amount exceeds transaction amount")

    refund = Refund(
        transaction_id=transaction_id,
        user_id=txn.user_id,
        amount=data.amount,
        reason=data.reason,
        status=RefundStatus.PENDING,
    )
    await refund.insert()

    await log_audit(str(current_user.id), AuditAction.REFUND_PROCESSED, "refund", str(refund.id),
                   {"transaction_id": transaction_id, "amount": data.amount}, request)

    return {"id": str(refund.id), "message": "Refund requested"}


@router.post("/billing/refunds/{refund_id}/approve")
async def approve_refund(
    refund_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.BILLING_REFUND))
):
    """Approve a pending refund."""
    refund = await Refund.get(refund_id)
    if not refund:
        raise HTTPException(status_code=404, detail="Refund not found")

    if refund.status != RefundStatus.PENDING:
        raise HTTPException(status_code=400, detail="Refund is not pending")

    txn = await Transaction.get(refund.transaction_id)
    if txn:
        txn.status = TransactionStatus.REFUNDED
        await txn.save()

    refund.status = RefundStatus.APPROVED
    refund.processed_by = str(current_user.id)
    refund.processed_at = datetime.utcnow()
    await refund.save()

    await log_audit(str(current_user.id), AuditAction.REFUND_PROCESSED, "refund", refund_id, {"action": "approved"}, request)

    return {"message": "Refund approved"}


@router.post("/billing/refunds/{refund_id}/reject")
async def reject_refund(
    refund_id: str,
    reason: str = Query(...),
    request: Request = None,
    current_user: User = Depends(has_permission(Permission.BILLING_REFUND))
):
    """Reject a pending refund."""
    refund = await Refund.get(refund_id)
    if not refund:
        raise HTTPException(status_code=404, detail="Refund not found")

    if refund.status != RefundStatus.PENDING:
        raise HTTPException(status_code=400, detail="Refund is not pending")

    refund.status = RefundStatus.REJECTED
    refund.processed_by = str(current_user.id)
    refund.processed_at = datetime.utcnow()
    await refund.save()

    await log_audit(str(current_user.id), AuditAction.REFUND_PROCESSED, "refund", refund_id, {"action": "rejected", "reason": reason}, request)

    return {"message": "Refund rejected"}
