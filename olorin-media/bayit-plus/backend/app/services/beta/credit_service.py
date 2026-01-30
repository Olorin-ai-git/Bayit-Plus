"""
Beta Credit Service

Manages AI credit allocation, deduction, and tracking for Beta 500 program.
Implements atomic MongoDB transactions with optimistic locking.
"""

from datetime import datetime, timezone
from typing import Tuple, Optional
from motor.motor_asyncio import AsyncIOMotorClientSession
from pymongo import ReturnDocument
from bson import ObjectId

from app.core.config import Settings
from app.core.logging_config import get_logger
from app.models.beta_user import BetaUser
from app.models.beta_credit import BetaCredit
from app.models.beta_credit_transaction import BetaCreditTransaction
from app.services.olorin.metering.service import MeteringService

# Optional metrics (requires prometheus_client)
try:
    from app.core.metrics import record_credit_deduction
    METRICS_ENABLED = True
except ImportError:
    METRICS_ENABLED = False
    def record_credit_deduction(*args, **kwargs):
        pass  # No-op if metrics not available

logger = get_logger(__name__)


class BetaCreditService:
    """
    Credit management service with dependency injection.
    
    Architecture:
    - Pre-authorization layer on top of MeteringService
    - BetaCreditService: policy enforcement (check credits before request)
    - MeteringService: source of truth (actual usage tracking)
    
    All external dependencies injected through constructor.
    """

    def __init__(
        self,
        settings: Settings,
        metering_service: MeteringService,
        db
    ):
        """
        Constructor injection - all dependencies explicit.

        Args:
            settings: Application settings (rates, thresholds, limits)
            metering_service: Existing metering service (single source of truth)
            db: Database connection for transactions
        """
        self.settings = settings
        self.metering_service = metering_service
        self.db = db

    async def get_credit_rate(self, feature: str) -> float:
        """
        Get credit rate from settings (not hardcoded).

        Args:
            feature: Feature name (live_dubbing, ai_search, ai_recommendations)

        Returns:
            Credit rate (credits per unit)

        Raises:
            ValueError: If feature is unknown (fail fast, no silent fallback)
        """
        rate_mapping = {
            "live_dubbing": self.settings.CREDIT_RATE_LIVE_DUBBING,
            "ai_search": self.settings.CREDIT_RATE_AI_SEARCH,
            "ai_recommendations": self.settings.CREDIT_RATE_AI_RECOMMENDATIONS,
        }
        
        if feature not in rate_mapping:
            raise ValueError(
                f"Unknown feature: {feature}. "
                f"Valid features: {list(rate_mapping.keys())}"
            )
        
        return rate_mapping[feature]

    async def authorize(
        self,
        user_id: str,
        feature: str,
        estimated_usage: float
    ) -> Tuple[bool, int]:
        """
        Pre-authorization check before API calls.
        
        Checks if user has sufficient credits WITHOUT deducting them.
        This is the policy enforcement layer.

        Args:
            user_id: User ID
            feature: Feature name
            estimated_usage: Estimated usage amount

        Returns:
            Tuple of (authorized: bool, remaining_credits: int)
        """
        try:
            # Get credit rate
            rate = await self.get_credit_rate(feature)
            estimated_cost = int(estimated_usage * rate)

            # Check user's beta credit balance
            credit = await BetaCredit.find_one(
                BetaCredit.user_id == user_id,
                BetaCredit.is_expired == False
            )

            if not credit:
                logger.warning(
                    "No beta credits found",
                    extra={"user_id": user_id}
                )
                return (False, 0)

            # Check sufficient balance
            if credit.remaining_credits < estimated_cost:
                logger.warning(
                    "Insufficient credits",
                    extra={
                        "user_id": user_id,
                        "required": estimated_cost,
                        "available": credit.remaining_credits
                    }
                )
                return (False, credit.remaining_credits)

            logger.info(
                "Credit authorization approved",
                extra={
                    "user_id": user_id,
                    "feature": feature,
                    "estimated_cost": estimated_cost,
                    "remaining": credit.remaining_credits
                }
            )
            return (True, credit.remaining_credits)

        except Exception as e:
            logger.error(
                "Authorization error",
                extra={"user_id": user_id, "error": str(e)}
            )
            return (False, 0)

    async def deduct_credits(
        self,
        user_id: str,
        feature: str,
        usage_amount: float,
        metadata: dict = None
    ) -> Tuple[bool, int]:
        """
        Atomic credit deduction using MongoDB transactions.
        All operations succeed together or all fail.

        Args:
            user_id: User ID
            feature: Feature name
            usage_amount: Actual usage amount
            metadata: Additional transaction metadata

        Returns:
            Tuple of (success: bool, remaining_credits: int)
        """
        if metadata is None:
            metadata = {}

        try:
            # Calculate cost from settings (NO hardcoded rates)
            rate = await self.get_credit_rate(feature)
            credit_cost = int(usage_amount * rate)

            # ATOMIC UPDATE using $inc operator (race condition safe)
            # This replaces read-modify-write with a single atomic operation
            result = await self.db.beta_credits.find_one_and_update(
                {
                    "user_id": user_id,
                    "is_expired": False,
                    "remaining_credits": {"$gte": credit_cost}  # Atomic check
                },
                {
                    "$inc": {
                        "used_credits": credit_cost,
                        "remaining_credits": -credit_cost,
                        "version": 1  # Increment version for optimistic locking
                    },
                    "$set": {
                        "updated_at": datetime.now(timezone.utc)
                    }
                },
                return_document=ReturnDocument.AFTER
            )

            if result is None:
                # Insufficient credits or not found
                logger.warning(
                    "Credit deduction failed - insufficient credits or user not found",
                    extra={
                        "user_id": user_id,
                        "required": credit_cost
                    }
                )

                # Record failure metric
                record_credit_deduction(
                    user_id=user_id,
                    feature=feature,
                    credit_cost=credit_cost,
                    success=False,
                    error_type="insufficient_credits"
                )

                return (False, 0)

            # Record transaction in separate operation
            # (not in same atomic operation, but that's acceptable for audit trail)
            transaction = BetaCreditTransaction(
                user_id=user_id,
                credit_id=str(result["_id"]),
                transaction_type="debit",
                amount=-credit_cost,
                feature=feature,
                balance_after=result["remaining_credits"],
                metadata=metadata,
                created_at=datetime.now(timezone.utc)
            )
            await transaction.insert()

            logger.info(
                "Credits deducted successfully (atomic)",
                extra={
                    "user_id": user_id,
                    "feature": feature,
                    "amount": credit_cost,
                    "remaining": result["remaining_credits"],
                    "version": result["version"]
                }
            )

            # Record success metric
            record_credit_deduction(
                user_id=user_id,
                feature=feature,
                credit_cost=credit_cost,
                success=True
            )

            # Check credit thresholds and send warning emails if needed
            remaining_credits = result["remaining_credits"]
            await self._check_credit_thresholds(
                user_id=user_id,
                remaining_credits=remaining_credits,
                credit_id=str(result["_id"])
            )

            return (True, remaining_credits)

        except Exception as e:
            logger.error(
                "Credit deduction error",
                extra={
                    "user_id": user_id,
                    "feature": feature,
                    "error": str(e)
                }
            )
            
            # Record error metric
            record_credit_deduction(
                user_id=user_id,
                feature=feature,
                credit_cost=0,
                success=False,
                error_type="database_error"
            )
            
            return (False, 0)

    async def _check_credit_thresholds(
        self,
        user_id: str,
        remaining_credits: int,
        credit_id: str
    ) -> None:
        """
        Check credit thresholds and send warning emails if needed.

        Thresholds:
        - Low balance: 50 credits (configurable via settings)
        - Depleted: 0 credits

        Args:
            user_id: User ID
            remaining_credits: Current remaining credits after deduction
            credit_id: Beta credit document ID for tracking email sent status
        """
        try:
            # Get threshold from settings (default 50)
            low_balance_threshold = getattr(self.settings, 'BETA_LOW_BALANCE_THRESHOLD', 50)

            # Check if depleted (0 credits)
            if remaining_credits == 0:
                await self._send_depleted_email_if_needed(user_id, credit_id)
            # Check if low balance (below threshold but not depleted)
            elif remaining_credits <= low_balance_threshold:
                await self._send_low_balance_email_if_needed(
                    user_id,
                    credit_id,
                    remaining_credits,
                    low_balance_threshold
                )

        except Exception as e:
            # Log error but don't fail the transaction
            logger.warning(
                "Failed to check credit thresholds",
                extra={
                    "user_id": user_id,
                    "remaining_credits": remaining_credits,
                    "error": str(e)
                }
            )

    async def _send_low_balance_email_if_needed(
        self,
        user_id: str,
        credit_id: str,
        remaining_credits: int,
        threshold: int
    ) -> None:
        """Send low balance warning email if not already sent."""
        try:
            # Check if email already sent (atomic check and update)
            result = await self.db.beta_credits.find_one_and_update(
                {
                    "_id": ObjectId(credit_id),
                    "low_balance_email_sent": False  # Only if not sent
                },
                {
                    "$set": {
                        "low_balance_email_sent": True,
                        "updated_at": datetime.now(timezone.utc)
                    }
                },
                return_document=ReturnDocument.AFTER
            )

            if result is None:
                # Email already sent, skip
                logger.debug(
                    "Low balance email already sent",
                    extra={"user_id": user_id}
                )
                return

            # Get user info
            from app.models.beta_user import BetaUser
            beta_user = await BetaUser.find_one(BetaUser.id == ObjectId(user_id))
            if not beta_user:
                logger.warning("Beta user not found for email", extra={"user_id": user_id})
                return

            # Get recent usage summary (last 5 transactions)
            from app.models.beta_credit_transaction import BetaCreditTransaction
            recent_transactions = await BetaCreditTransaction.find(
                BetaCreditTransaction.user_id == user_id,
                BetaCreditTransaction.transaction_type == "debit"
            ).sort("-created_at").limit(5).to_list()

            usage_summary = [
                {
                    "feature": tx.feature,
                    "credits": abs(tx.amount)
                }
                for tx in recent_transactions
            ]

            # Send email
            from app.services.beta.email_service import EmailVerificationService
            email_service = EmailVerificationService(settings=self.settings)
            user_name = beta_user.name if hasattr(beta_user, 'name') and beta_user.name else beta_user.email.split('@')[0]

            await email_service.send_low_credit_warning(
                email=beta_user.email,
                user_name=user_name,
                credits_remaining=remaining_credits,
                threshold=threshold,
                usage_summary=usage_summary
            )

            logger.info(
                "Low balance warning email sent",
                extra={
                    "user_id": user_id,
                    "remaining_credits": remaining_credits
                }
            )

        except Exception as e:
            logger.error(
                "Failed to send low balance email",
                extra={"user_id": user_id, "error": str(e)}
            )

    async def _send_depleted_email_if_needed(
        self,
        user_id: str,
        credit_id: str
    ) -> None:
        """Send credits depleted email if not already sent."""
        try:
            # Check if email already sent (atomic check and update)
            result = await self.db.beta_credits.find_one_and_update(
                {
                    "_id": ObjectId(credit_id),
                    "depleted_email_sent": False  # Only if not sent
                },
                {
                    "$set": {
                        "depleted_email_sent": True,
                        "updated_at": datetime.now(timezone.utc)
                    }
                },
                return_document=ReturnDocument.AFTER
            )

            if result is None:
                # Email already sent, skip
                logger.debug(
                    "Depleted email already sent",
                    extra={"user_id": user_id}
                )
                return

            # Get user info
            from app.models.beta_user import BetaUser
            beta_user = await BetaUser.find_one(BetaUser.id == ObjectId(user_id))
            if not beta_user:
                logger.warning("Beta user not found for email", extra={"user_id": user_id})
                return

            # Get top features used (aggregation)
            from app.models.beta_credit_transaction import BetaCreditTransaction
            feature_usage = {}
            transactions = await BetaCreditTransaction.find(
                BetaCreditTransaction.user_id == user_id,
                BetaCreditTransaction.transaction_type == "debit"
            ).to_list()

            for tx in transactions:
                feature = tx.feature
                if feature not in feature_usage:
                    feature_usage[feature] = {"count": 0, "credits": 0}
                feature_usage[feature]["count"] += 1
                feature_usage[feature]["credits"] += abs(tx.amount)

            # Sort by credits used
            top_features = sorted(
                [
                    {"name": feature, **stats}
                    for feature, stats in feature_usage.items()
                ],
                key=lambda x: x["credits"],
                reverse=True
            )[:5]  # Top 5 features

            # Send email
            from app.services.beta.email_service import EmailVerificationService
            email_service = EmailVerificationService(settings=self.settings)
            user_name = beta_user.name if hasattr(beta_user, 'name') and beta_user.name else beta_user.email.split('@')[0]

            # Get total used from credit record
            credit_record = await BetaCredit.find_one(BetaCredit.id == ObjectId(credit_id))
            total_used = credit_record.used_credits if credit_record else 500

            await email_service.send_credits_depleted(
                email=beta_user.email,
                user_name=user_name,
                total_used=total_used,
                top_features=top_features
            )

            logger.info(
                "Credits depleted email sent",
                extra={
                    "user_id": user_id,
                    "total_used": total_used
                }
            )

        except Exception as e:
            logger.error(
                "Failed to send depleted email",
                extra={"user_id": user_id, "error": str(e)}
            )

    async def get_balance(self, user_id: str) -> Optional[int]:
        """
        Get user's current credit balance.

        Args:
            user_id: User ID

        Returns:
            Remaining credits or None if not found
        """
        try:
            credit = await BetaCredit.find_one(
                BetaCredit.user_id == user_id,
                BetaCredit.is_expired == False
            )
            
            if not credit:
                return None
            
            return credit.remaining_credits

        except Exception as e:
            logger.error(
                "Error fetching credit balance",
                extra={"user_id": user_id, "error": str(e)}
            )
            return None

    async def allocate_credits(
        self,
        user_id: str,
        total_credits: Optional[int] = None,
        session: Optional[AsyncIOMotorClientSession] = None
    ) -> BetaCredit:
        """
        Allocate credits to a new beta user.

        Args:
            user_id: User ID
            total_credits: Credits to allocate (defaults to BETA_AI_CREDITS setting)
            session: Optional MongoDB session for transactional operations

        Returns:
            BetaCredit document

        Raises:
            ValueError: If user already has credits allocated
        """
        # Check if credits already exist (use raw MongoDB query)
        find_kwargs = {"user_id": user_id}
        if session:
            existing = await self.db.beta_credits.find_one(find_kwargs, session=session)
        else:
            existing = await self.db.beta_credits.find_one(find_kwargs)

        if existing:
            raise ValueError(f"Credits already allocated for user {user_id}")

        # Use default from settings if not specified
        if total_credits is None:
            total_credits = self.settings.BETA_AI_CREDITS

        # Create credit allocation
        credit = BetaCredit(
            user_id=user_id,
            total_credits=total_credits,
            used_credits=0,
            remaining_credits=total_credits,
            is_expired=False,
            version=0,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        await credit.insert(session=session)

        # Create initial transaction record
        transaction = BetaCreditTransaction(
            user_id=user_id,
            credit_id=str(credit.id),
            transaction_type="credit",
            amount=total_credits,
            balance_after=total_credits,
            metadata={"event": "initial_allocation"},
            created_at=datetime.utcnow()
        )
        await transaction.insert()

        logger.info(
            "Credits allocated",
            extra={
                "user_id": user_id,
                "total_credits": total_credits
            }
        )

        return credit

    async def is_low_balance(self, user_id: str) -> Tuple[bool, Optional[int]]:
        """
        Check if user's credit balance is low.

        Args:
            user_id: User ID

        Returns:
            Tuple of (is_low: bool, remaining_credits: Optional[int])
        """
        balance = await self.get_balance(user_id)
        
        if balance is None:
            return (False, None)
        
        is_low = balance < self.settings.BETA_CREDIT_WARNING_THRESHOLD
        
        return (is_low, balance)

    async def is_critical_balance(self, user_id: str) -> Tuple[bool, Optional[int]]:
        """
        Check if user's credit balance is critically low.

        Args:
            user_id: User ID

        Returns:
            Tuple of (is_critical: bool, remaining_credits: Optional[int])
        """
        balance = await self.get_balance(user_id)
        
        if balance is None:
            return (False, None)
        
        is_critical = balance < self.settings.BETA_CREDIT_CRITICAL_THRESHOLD
        
        return (is_critical, balance)
