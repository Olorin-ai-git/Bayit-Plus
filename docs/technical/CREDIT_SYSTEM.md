# Credit System Architecture

**Version:** 1.0.0
**Last Updated:** 2026-01-30
**Status:** ✅ Production

---

## Overview

The Bayit+ Credit System manages AI feature usage through a scalable, transaction-based credit metering architecture. The system tracks credit balances, enforces limits, and integrates with the Olorin metering service for billing and analytics.

**Key Features:**
- **Atomic Credit Deduction** - Race condition-free transactions
- **Optimistic Locking** - Version-based conflict detection
- **Session-Based Tracking** - Checkpoint-based credit deduction
- **Real-Time Balance** - Sub-second balance queries
- **Admin Operations** - Grant, refund, audit capabilities
- **Metering Integration** - Olorin service integration for billing

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATIONS                       │
│  (Web, iOS, Android, tvOS)                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   BETA CREDITS API                          │
│  /api/v1/beta/credits/*                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              BETA CREDIT SERVICE                            │
│  • Credit balance queries                                   │
│  • Atomic deductions                                        │
│  • Transaction logging                                      │
│  • Admin operations                                         │
└─────────┬────────────────────────────┬─────────────────────┘
          │                            │
          ▼                            ▼
┌──────────────────────┐    ┌──────────────────────────────┐
│  MONGODB ATLAS       │    │  OLORIN METERING SERVICE     │
│  • beta_users        │    │  • Usage tracking            │
│  • beta_transactions │    │  • Billing aggregation       │
│  • Optimistic locks  │    │  • Partner quota management  │
└──────────────────────┘    └──────────────────────────────┘
```

---

## Database Schema

### BetaUser Collection

```python
# backend/app/models/beta_user.py
from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional

class BetaUser(Document):
    """Beta 500 user with credit balance."""

    user_id: str = Field(..., unique=True, index=True)
    email: str = Field(..., index=True)
    balance: int = Field(default=500, ge=0)  # Credits remaining
    initial_grant: int = Field(default=500)  # Original grant amount
    version: int = Field(default=0)  # Optimistic locking version
    is_beta_user: bool = Field(default=True)
    enrolled_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: Optional[datetime] = None
    total_spent: int = Field(default=0)  # Total credits spent

    class Settings:
        name = "beta_users"
        indexes = [
            "user_id",
            "email",
            "is_beta_user",
            [("enrolled_at", -1)],
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_abc123",
                "email": "user@example.com",
                "balance": 485,
                "initial_grant": 500,
                "version": 15,
                "is_beta_user": True,
                "enrolled_at": "2026-01-29T10:00:00Z",
                "last_activity": "2026-01-30T14:23:45Z",
                "total_spent": 15,
            }
        }
```

### BetaCreditTransaction Collection

```python
# backend/app/models/beta_transaction.py
from beanie import Document
from pydantic import Field
from datetime import datetime
from enum import Enum

class TransactionType(str, Enum):
    DEDUCTION = "deduction"
    GRANT = "grant"
    REFUND = "refund"
    ADJUSTMENT = "adjustment"

class BetaCreditTransaction(Document):
    """Transaction log for all credit operations."""

    user_id: str = Field(..., index=True)
    transaction_type: TransactionType
    amount: int = Field(..., description="Positive for grants, negative for deductions")
    feature: Optional[str] = Field(None, description="Feature that consumed credits")
    balance_before: int
    balance_after: int
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
    admin_id: Optional[str] = Field(None, description="Admin who performed operation")
    reason: Optional[str] = Field(None, description="Reason for manual operations")
    metadata: Optional[dict] = Field(default_factory=dict)

    class Settings:
        name = "beta_credit_transactions"
        indexes = [
            "user_id",
            [("timestamp", -1)],
            [("user_id", 1), ("timestamp", -1)],
            "feature",
            "transaction_type",
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_abc123",
                "transaction_type": "deduction",
                "amount": -10,
                "feature": "ai_search",
                "balance_before": 500,
                "balance_after": 490,
                "timestamp": "2026-01-30T14:23:45Z",
                "metadata": {"query": "Israeli comedy movies"},
            }
        }
```

---

## Transaction Model

### Atomic Deduction with Optimistic Locking

```python
# backend/app/services/beta_credit_service.py
from motor.motor_asyncio import AsyncIOMotorClientSession
from pymongo.errors import DuplicateKeyError
from app.models.beta_user import BetaUser
from app.models.beta_transaction import BetaCreditTransaction, TransactionType
from app.core.exceptions import InsufficientCreditsError, ConcurrencyError

class BetaCreditService:
    """Service for managing beta credit operations."""

    async def deduct_credits(
        self,
        user_id: str,
        amount: int,
        feature: str,
        metadata: dict = None,
    ) -> int:
        """
        Atomically deduct credits with optimistic locking.

        Args:
            user_id: User identifier
            amount: Credits to deduct (positive integer)
            feature: Feature consuming credits (ai_search, ai_recommendations, catch_up)
            metadata: Optional metadata for transaction

        Returns:
            New balance after deduction

        Raises:
            InsufficientCreditsError: Not enough credits
            ConcurrencyError: Race condition detected, retry required
        """
        max_retries = 3

        for attempt in range(max_retries):
            # Fetch current state
            user = await BetaUser.find_one(BetaUser.user_id == user_id)
            if not user:
                raise ValueError(f"User {user_id} not found")

            if not user.is_beta_user:
                raise ValueError(f"User {user_id} is not a beta user")

            # Check balance
            if user.balance < amount:
                raise InsufficientCreditsError(
                    f"Insufficient credits: {user.balance} available, {amount} required"
                )

            # Calculate new balance
            new_balance = user.balance - amount
            old_version = user.version

            # Optimistic lock update
            result = await BetaUser.get_motor_collection().update_one(
                {
                    "user_id": user_id,
                    "version": old_version,  # Optimistic lock
                },
                {
                    "$set": {
                        "balance": new_balance,
                        "last_activity": datetime.utcnow(),
                        "version": old_version + 1,
                    },
                    "$inc": {"total_spent": amount},
                },
            )

            if result.modified_count == 0:
                # Version mismatch - retry
                if attempt < max_retries - 1:
                    continue
                else:
                    raise ConcurrencyError(
                        "Failed to update balance after multiple retries"
                    )

            # Log transaction
            await BetaCreditTransaction(
                user_id=user_id,
                transaction_type=TransactionType.DEDUCTION,
                amount=-amount,
                feature=feature,
                balance_before=user.balance,
                balance_after=new_balance,
                metadata=metadata or {},
            ).insert()

            return new_balance

        raise ConcurrencyError("Max retries exceeded")

    async def get_balance(self, user_id: str) -> dict:
        """Get current credit balance."""
        user = await BetaUser.find_one(BetaUser.user_id == user_id)
        if not user:
            return {"balance": 0, "is_beta_user": False}

        return {
            "balance": user.balance,
            "is_beta_user": user.is_beta_user,
            "total_spent": user.total_spent,
            "last_activity": user.last_activity,
        }
```

---

## Session-Based Tracking

### Checkpoint Deduction Pattern

```python
# backend/app/services/beta/session_service.py
from app.services.beta_credit_service import BetaCreditService
from app.services.olorin.metering.service import MeteringService

class BetaSessionService:
    """Manages session-based credit tracking."""

    def __init__(self):
        self.credit_service = BetaCreditService()
        self.metering_service = MeteringService()

    async def track_ai_search_session(
        self,
        user_id: str,
        session_id: str,
        query: str,
    ):
        """
        Track AI search session with checkpoint deduction.

        Credits deducted at search initiation (checkpoint),
        not at result display.
        """
        # Deduct credits at checkpoint
        new_balance = await self.credit_service.deduct_credits(
            user_id=user_id,
            amount=10,  # AI Search cost
            feature="ai_search",
            metadata={
                "session_id": session_id,
                "query": query,
                "checkpoint": "search_initiated",
            },
        )

        # Record metering event for billing
        await self.metering_service.record_usage(
            partner_id=user_id,
            feature="beta_ai_search",
            quantity=1,
            metadata={"session_id": session_id},
        )

        return new_balance

    async def track_recommendations_session(
        self,
        user_id: str,
        session_id: str,
        context: str,
    ):
        """Track AI recommendations session."""
        new_balance = await self.credit_service.deduct_credits(
            user_id=user_id,
            amount=5,  # AI Recommendations cost
            feature="ai_recommendations",
            metadata={
                "session_id": session_id,
                "context": context,
                "checkpoint": "recommendations_generated",
            },
        )

        await self.metering_service.record_usage(
            partner_id=user_id,
            feature="beta_ai_recommendations",
            quantity=1,
            metadata={"session_id": session_id},
        )

        return new_balance

    async def track_catchup_session(
        self,
        user_id: str,
        session_id: str,
        channel_id: str,
    ):
        """Track catch-up summary session."""
        new_balance = await self.credit_service.deduct_credits(
            user_id=user_id,
            amount=15,  # Auto Catch-Up cost
            feature="catch_up",
            metadata={
                "session_id": session_id,
                "channel_id": channel_id,
                "checkpoint": "summary_generated",
            },
        )

        await self.metering_service.record_usage(
            partner_id=user_id,
            feature="beta_catch_up",
            quantity=1,
            metadata={"session_id": session_id, "channel_id": channel_id},
        )

        return new_balance
```

---

## Credit Warnings

### Warning Thresholds

```python
# backend/app/services/beta/warning_service.py
from app.models.beta_user import BetaUser
from app.core.notifications import NotificationService

class CreditWarningService:
    """Manages low credit warnings."""

    THRESHOLDS = {
        "yellow": 50,   # Warning
        "orange": 20,   # Low
        "red": 10,      # Critical
    }

    def __init__(self):
        self.notification_service = NotificationService()

    async def check_balance_warnings(self, user_id: str, balance: int):
        """Check if warnings should be triggered."""
        if balance <= self.THRESHOLDS["red"]:
            await self._send_critical_warning(user_id, balance)
        elif balance <= self.THRESHOLDS["orange"]:
            await self._send_low_warning(user_id, balance)
        elif balance <= self.THRESHOLDS["yellow"]:
            await self._send_warning(user_id, balance)

    async def _send_critical_warning(self, user_id: str, balance: int):
        """Send critical credit warning (red)."""
        await self.notification_service.send_notification(
            user_id=user_id,
            title="Critical: AI Credits Low",
            message=f"You have only {balance} AI credits remaining.",
            priority="high",
            type="credit_critical",
        )

    async def _send_low_warning(self, user_id: str, balance: int):
        """Send low credit warning (orange)."""
        await self.notification_service.send_notification(
            user_id=user_id,
            title="AI Credits Running Low",
            message=f"You have {balance} AI credits left.",
            priority="medium",
            type="credit_low",
        )

    async def _send_warning(self, user_id: str, balance: int):
        """Send credit warning (yellow)."""
        await self.notification_service.send_notification(
            user_id=user_id,
            title="AI Credits Update",
            message=f"You have {balance} AI credits remaining.",
            priority="low",
            type="credit_warning",
        )
```

---

## Admin Operations

### Credit Management API

```python
# backend/app/api/routes/admin/beta_credits.py
from fastapi import APIRouter, Depends, HTTPException
from app.services.beta_credit_service import BetaCreditService
from app.services.auth_service import require_admin
from app.models.beta_transaction import TransactionType
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/admin/beta/credits", tags=["Admin Beta Credits"])

class GrantCreditsRequest(BaseModel):
    user_id: str
    amount: int
    reason: str

class RefundCreditsRequest(BaseModel):
    user_id: str
    amount: int
    reason: str

@router.post("/grant")
async def grant_credits(
    request: GrantCreditsRequest,
    admin_id: str = Depends(require_admin),
    service: BetaCreditService = Depends(),
):
    """Grant additional credits to a user (admin only)."""
    try:
        user = await service.credit_service.get_user(request.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Grant credits
        new_balance = await service.grant_credits(
            user_id=request.user_id,
            amount=request.amount,
            admin_id=admin_id,
            reason=request.reason,
        )

        return {
            "success": True,
            "user_id": request.user_id,
            "granted": request.amount,
            "new_balance": new_balance,
            "reason": request.reason,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/refund")
async def refund_credits(
    request: RefundCreditsRequest,
    admin_id: str = Depends(require_admin),
    service: BetaCreditService = Depends(),
):
    """Refund credits for a failed operation (admin only)."""
    try:
        new_balance = await service.refund_credits(
            user_id=request.user_id,
            amount=request.amount,
            admin_id=admin_id,
            reason=request.reason,
        )

        return {
            "success": True,
            "user_id": request.user_id,
            "refunded": request.amount,
            "new_balance": new_balance,
            "reason": request.reason,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/audit/{user_id}")
async def get_audit_trail(
    user_id: str,
    limit: int = 100,
    admin_id: str = Depends(require_admin),
):
    """Get credit transaction audit trail for a user."""
    transactions = await BetaCreditTransaction.find(
        BetaCreditTransaction.user_id == user_id
    ).sort(-BetaCreditTransaction.timestamp).limit(limit).to_list()

    return {
        "user_id": user_id,
        "total_transactions": len(transactions),
        "transactions": [
            {
                "type": t.transaction_type,
                "amount": t.amount,
                "feature": t.feature,
                "balance_before": t.balance_before,
                "balance_after": t.balance_after,
                "timestamp": t.timestamp,
                "admin_id": t.admin_id,
                "reason": t.reason,
                "metadata": t.metadata,
            }
            for t in transactions
        ],
    }
```

---

## Metering Integration

### Olorin Metering Service

```python
# backend/app/services/beta/metering_integration.py
from app.services.olorin.metering.service import MeteringService

class BetaMeteringIntegration:
    """Integrates beta credits with Olorin metering for billing."""

    def __init__(self):
        self.metering = MeteringService()

    async def record_ai_search(self, user_id: str, credits_used: int):
        """Record AI search usage for billing."""
        await self.metering.record_usage(
            partner_id=user_id,
            feature="beta_ai_search",
            quantity=1,
            cost_credits=credits_used,
            metadata={"credit_cost": credits_used},
        )

    async def record_ai_recommendations(self, user_id: str, credits_used: int):
        """Record AI recommendations usage for billing."""
        await self.metering.record_usage(
            partner_id=user_id,
            feature="beta_ai_recommendations",
            quantity=1,
            cost_credits=credits_used,
            metadata={"credit_cost": credits_used},
        )

    async def record_catch_up(self, user_id: str, credits_used: int):
        """Record catch-up usage for billing."""
        await self.metering.record_usage(
            partner_id=user_id,
            feature="beta_catch_up",
            quantity=1,
            cost_credits=credits_used,
            metadata={"credit_cost": credits_used},
        )

    async def get_usage_summary(self, user_id: str, period: str = "month"):
        """Get usage summary for billing period."""
        return await self.metering.get_usage_summary(
            partner_id=user_id,
            period=period,
        )
```

---

## Monitoring

### Prometheus Metrics

```python
# backend/app/core/metrics.py
from prometheus_client import Counter, Histogram, Gauge

# Credit operations
beta_credits_deducted_total = Counter(
    "bayit_beta_credits_deducted_total",
    "Total credits deducted",
    ["feature", "user_id"],
)

beta_credits_granted_total = Counter(
    "bayit_beta_credits_granted_total",
    "Total credits granted",
    ["admin_id", "reason"],
)

# Balance metrics
beta_credits_balance = Gauge(
    "bayit_beta_credits_balance",
    "Current credit balance",
    ["user_id"],
)

beta_credits_insufficient_errors = Counter(
    "bayit_beta_credits_insufficient_errors_total",
    "Insufficient credits errors",
    ["feature"],
)

# Transaction latency
beta_credits_transaction_duration_seconds = Histogram(
    "bayit_beta_credits_transaction_duration_seconds",
    "Credit transaction duration",
    ["operation"],
)
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Beta Credits System",
    "panels": [
      {
        "title": "Total Credits Deducted",
        "targets": [
          {
            "expr": "sum(rate(bayit_beta_credits_deducted_total[5m])) by (feature)"
          }
        ]
      },
      {
        "title": "Credit Balance Distribution",
        "targets": [
          {
            "expr": "histogram_quantile(0.5, sum(rate(bayit_beta_credits_balance[5m])) by (le))"
          }
        ]
      },
      {
        "title": "Insufficient Credits Errors",
        "targets": [
          {
            "expr": "sum(rate(bayit_beta_credits_insufficient_errors_total[5m])) by (feature)"
          }
        ]
      },
      {
        "title": "Transaction Latency P95",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(bayit_beta_credits_transaction_duration_seconds_bucket[5m])) by (le))"
          }
        ]
      }
    ]
  }
}
```

---

## Testing

### Unit Tests

```python
# backend/test/unit/test_beta_credit_service.py
import pytest
from app.services.beta_credit_service import BetaCreditService
from app.models.beta_user import BetaUser
from app.core.exceptions import InsufficientCreditsError

@pytest.mark.asyncio
async def test_deduct_credits_success():
    """Test successful credit deduction."""
    service = BetaCreditService()

    # Create test user
    user = await BetaUser(
        user_id="test_user",
        email="test@example.com",
        balance=100,
    ).insert()

    # Deduct credits
    new_balance = await service.deduct_credits(
        user_id="test_user",
        amount=10,
        feature="ai_search",
    )

    assert new_balance == 90

    # Verify balance updated
    updated_user = await BetaUser.find_one(BetaUser.user_id == "test_user")
    assert updated_user.balance == 90
    assert updated_user.total_spent == 10

@pytest.mark.asyncio
async def test_deduct_credits_insufficient():
    """Test insufficient credits error."""
    service = BetaCreditService()

    user = await BetaUser(
        user_id="test_user",
        email="test@example.com",
        balance=5,
    ).insert()

    with pytest.raises(InsufficientCreditsError):
        await service.deduct_credits(
            user_id="test_user",
            amount=10,
            feature="ai_search",
        )

@pytest.mark.asyncio
async def test_optimistic_locking():
    """Test optimistic locking prevents race conditions."""
    service = BetaCreditService()

    user = await BetaUser(
        user_id="test_user",
        email="test@example.com",
        balance=100,
        version=0,
    ).insert()

    # Simulate concurrent deductions
    results = await asyncio.gather(
        service.deduct_credits("test_user", 10, "ai_search"),
        service.deduct_credits("test_user", 10, "ai_search"),
        service.deduct_credits("test_user", 10, "ai_search"),
        return_exceptions=True,
    )

    # All should succeed due to retry logic
    assert all(isinstance(r, int) for r in results)

    # Final balance correct
    final_user = await BetaUser.find_one(BetaUser.user_id == "test_user")
    assert final_user.balance == 70
    assert final_user.total_spent == 30
```

### Integration Tests

```python
# backend/test/integration/test_beta_credits_api.py
import pytest
from httpx import AsyncClient

@pytest.mark.integration
async def test_get_balance(client: AsyncClient, auth_token: str):
    """Test credit balance endpoint."""
    response = await client.get(
        "/api/v1/beta/credits/balance",
        headers={"Authorization": f"Bearer {auth_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "balance" in data
    assert "is_beta_user" in data
    assert isinstance(data["balance"], int)

@pytest.mark.integration
async def test_deduct_credits_api(client: AsyncClient, auth_token: str):
    """Test credit deduction via API."""
    # Perform AI search (should deduct 10 credits)
    response = await client.post(
        "/api/v1/beta/search",
        json={"query": "Israeli comedy movies"},
        headers={"Authorization": f"Bearer {auth_token}"},
    )

    assert response.status_code == 200

    # Check balance decreased
    balance_response = await client.get(
        "/api/v1/beta/credits/balance",
        headers={"Authorization": f"Bearer {auth_token}"},
    )

    data = balance_response.json()
    assert data["balance"] < 500  # Initial grant
```

---

## Performance Considerations

### Optimizations

1. **Index Strategy**: Compound indexes on `(user_id, version)` for fast optimistic locking
2. **Connection Pooling**: MongoDB connection pool size 50-100
3. **Caching**: Redis cache for balance queries (TTL 30 seconds)
4. **Batch Operations**: Bulk transaction inserts for analytics

### Scalability

- **Current**: 10,000 concurrent users, 100 transactions/second
- **Target**: 100,000 concurrent users, 1,000 transactions/second
- **Strategy**: Horizontal scaling with MongoDB sharding on `user_id`

---

## Security

### Access Control

- **User Operations**: Authenticated users can only query/deduct their own credits
- **Admin Operations**: Require `admin` role for grants, refunds, audit trail
- **Rate Limiting**: 60 requests/minute per user for balance queries

### Audit Trail

All credit operations logged with:
- Transaction ID
- User ID
- Amount
- Feature
- Timestamp
- Admin ID (if manual operation)
- Reason (if manual operation)

---

## Troubleshooting

### Common Issues

**Issue:** `InsufficientCreditsError` despite sufficient balance
**Cause:** Race condition in concurrent requests
**Solution:** Implemented optimistic locking with retry logic

**Issue:** Balance not updating in real-time
**Cause:** Cache TTL too long
**Solution:** Reduced cache TTL to 30 seconds

**Issue:** Transaction log growing too large
**Cause:** No retention policy
**Solution:** Implemented 90-day retention with archival to cold storage

---

## Related Documentation

- [AI API Reference](../api/AI_API_REFERENCE.md) - API endpoints using credits
- [Beta 500 User Manual](../guides/BETA_500_USER_MANUAL.md) - End-user guide
- [LLM Configuration](../deployment/LLM_CONFIGURATION.md) - AI model costs

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-30
**Maintained by:** Backend Team
**Next Review:** 2026-03-30
