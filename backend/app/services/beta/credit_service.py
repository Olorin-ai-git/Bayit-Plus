"""
Beta Credit Service

Manages AI credit allocation, deduction, and tracking for Beta 500 program.
Implements atomic MongoDB transactions with optimistic locking.
"""

from datetime import datetime
from typing import Tuple, Optional
from motor.motor_asyncio import AsyncIOMotorClientSession

from app.core.config import Settings
from app.core.logging_config import get_logger
from app.models.beta_user import BetaUser
from app.models.beta_credit import BetaCredit
from app.models.beta_credit_transaction import BetaCreditTransaction
from app.services.olorin.metering.service import MeteringService
from app.core.metrics import record_credit_deduction

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

            # START TRANSACTION
            async with await self.db.client.start_session() as session:
                async with session.start_transaction():
                    # 1. Lock and check balance (atomic)
                    credit = await BetaCredit.find_one(
                        BetaCredit.user_id == user_id,
                        BetaCredit.is_expired == False,
                        BetaCredit.remaining_credits >= credit_cost,
                        session=session
                    )

                    if not credit:
                        await session.abort_transaction()
                        logger.warning(
                            "Credit deduction failed - insufficient credits",
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

                    # 2. Deduct credits (atomic update)
                    credit.used_credits += credit_cost
                    credit.remaining_credits -= credit_cost
                    credit.updated_at = datetime.utcnow()
                    await credit.save(session=session)

                    # 3. Create transaction record (atomic with credit update)
                    transaction = BetaCreditTransaction(
                        user_id=user_id,
                        credit_id=str(credit.id),
                        transaction_type="debit",
                        amount=-credit_cost,
                        feature=feature,
                        balance_after=credit.remaining_credits,
                        metadata=metadata,
                        created_at=datetime.utcnow()
                    )
                    await transaction.insert(session=session)

                    # COMMIT TRANSACTION
                    logger.info(
                        "Credits deducted successfully",
                        extra={
                            "user_id": user_id,
                            "feature": feature,
                            "amount": credit_cost,
                            "remaining": credit.remaining_credits
                        }
                    )

                    # Record success metric
                    record_credit_deduction(
                        user_id=user_id,
                        feature=feature,
                        credit_cost=credit_cost,
                        success=True
                    )

                    return (True, credit.remaining_credits)

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
        total_credits: Optional[int] = None
    ) -> BetaCredit:
        """
        Allocate credits to a new beta user.

        Args:
            user_id: User ID
            total_credits: Credits to allocate (defaults to BETA_AI_CREDITS setting)

        Returns:
            BetaCredit document

        Raises:
            ValueError: If user already has credits allocated
        """
        # Check if credits already exist
        existing = await BetaCredit.find_one(BetaCredit.user_id == user_id)
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
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        await credit.insert()

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
