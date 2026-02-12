"""AI Usage Analytics Service.

Aggregates BetaCreditTransaction data for admin analytics dashboard.
"""

from datetime import datetime

from app.api.routes.admin.cost_auth import hash_user_id
from app.core.logging_config import get_logger
from app.models.beta_credit_transaction import BetaCreditTransaction
from app.services.beta.credit_service import BetaCreditService

logger = get_logger(__name__)

_DEBIT_MATCH = {"transaction_type": "debit"}


def _date_match(start: datetime, end: datetime) -> dict:
    return {**_DEBIT_MATCH, "created_at": {"$gte": start, "$lte": end}}


async def get_usage_overview(
    start: datetime, end: datetime, credit_service: BetaCreditService,
) -> dict:
    """Aggregate credit usage by feature for a date range."""
    results = await BetaCreditTransaction.aggregate([
        {"$match": _date_match(start, end)},
        {"$group": {
            "_id": "$feature",
            "total_credits": {"$sum": {"$abs": "$amount"}},
            "transaction_count": {"$sum": 1},
            "unique_users": {"$addToSet": "$user_id"},
        }},
        {"$sort": {"total_credits": -1}},
    ]).to_list()

    features, grand_credits, grand_txns, all_users = [], 0, 0, set()
    for doc in results:
        name = doc["_id"] or "unknown"
        total, count, users = doc["total_credits"], doc["transaction_count"], doc["unique_users"]
        try:
            rate = await credit_service.get_credit_rate(name)
        except ValueError:
            rate = 0.0
        features.append({
            "feature": name, "total_credits": total,
            "transaction_count": count, "unique_users": len(users),
            "avg_credits_per_use": round(total / count, 2) if count else 0.0,
            "credit_rate": rate,
        })
        grand_credits += total
        grand_txns += count
        all_users.update(users)

    return {
        "period_start": start, "period_end": end,
        "total_credits_consumed": grand_credits,
        "total_transactions": grand_txns,
        "active_beta_users": len(all_users),
        "features": features,
    }


async def get_feature_timeline(
    feature: str, start: datetime, end: datetime,
) -> dict:
    """Get daily credit consumption timeline for a feature."""
    results = await BetaCreditTransaction.aggregate([
        {"$match": {**_date_match(start, end), "feature": feature}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "credits_consumed": {"$sum": {"$abs": "$amount"}},
            "transaction_count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]).to_list()

    return {
        "feature": feature,
        "timeline": [
            {"date": d["_id"], "credits_consumed": d["credits_consumed"],
             "transaction_count": d["transaction_count"]}
            for d in results
        ],
    }


async def get_top_users(
    start: datetime, end: datetime, limit: int,
) -> dict:
    """Get top Beta-500 users by credit consumption (hashed IDs)."""
    results = await BetaCreditTransaction.aggregate([
        {"$match": _date_match(start, end)},
        {"$group": {
            "_id": "$user_id",
            "total_credits": {"$sum": {"$abs": "$amount"}},
            "transaction_count": {"$sum": 1},
            "features_used": {"$addToSet": "$feature"},
        }},
        {"$sort": {"total_credits": -1}},
        {"$limit": limit},
    ]).to_list()

    return {
        "period_start": start, "period_end": end,
        "users": [
            {"user_id_hash": hash_user_id(d["_id"]),
             "total_credits": d["total_credits"],
             "transaction_count": d["transaction_count"],
             "top_features": (d["features_used"] or [])[:5]}
            for d in results
        ],
    }


async def get_feature_rates(credit_service: BetaCreditService) -> dict:
    """Get current configured credit rates for all features."""
    mapping = credit_service.get_all_rates()
    return {"rates": [{"feature": f, "credit_rate": r} for f, r in mapping.items()]}
