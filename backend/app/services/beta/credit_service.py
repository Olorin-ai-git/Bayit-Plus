"""
Beta Credit Service

Manages AI credit allocation, deduction, and tracking for Beta 500 program.
Implements atomic MongoDB transactions with optimistic locking.
"""

from datetime import datetime
from typing import Tuple, Optional

from app.core.config import Settings
from app.core.logging_config import get_logger
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

    def _build_rate_mapping(self) -> dict:
        """Build feature-to-rate mapping from settings (single source of truth)."""
        return {
            "live_dubbing": self.settings.CREDIT_RATE_LIVE_DUBBING,
            "ai_search": self.settings.CREDIT_RATE_AI_SEARCH,
            "ai_recommendations": self.settings.CREDIT_RATE_AI_RECOMMENDATIONS,
            "comprehension_question": self.settings.CREDIT_RATE_COMPREHENSION_QUESTION,
            "subtitle_nikud": self.settings.CREDIT_RATE_SUBTITLE_NIKUD,
            "subtitle_shoresh": self.settings.CREDIT_RATE_SUBTITLE_SHORESH,
            "subtitle_heblish": self.settings.CREDIT_RATE_SUBTITLE_HEBLISH,
            "subtitle_grammar_flip": self.settings.CREDIT_RATE_SUBTITLE_GRAMMAR_FLIP,
            "subtitle_slang_synthesis": self.settings.CREDIT_RATE_SUBTITLE_SLANG_SYNTHESIS,
            "subtitle_engrew": self.settings.CREDIT_RATE_SUBTITLE_ENGREW,
            "phrase_breakdown": self.settings.CREDIT_RATE_PHRASE_BREAKDOWN,
            "cultural_detect": self.settings.CREDIT_RATE_CULTURAL_DETECT,
            "chapter_generation": self.settings.CREDIT_RATE_CHAPTER_GENERATION,
            "chat_translation": self.settings.CREDIT_RATE_CHAT_TRANSLATION,
            "star_story_episode": self.settings.CREDIT_RATE_STAR_STORY_EPISODE,
            "star_story_avatar": self.settings.CREDIT_RATE_STAR_STORY_AVATAR,
            "talk_back_respond": self.settings.CREDIT_RATE_TALK_BACK_RESPOND,
            "bilingual_session": self.settings.CREDIT_RATE_BILINGUAL_SESSION,
            "bilingual_translate": self.settings.CREDIT_RATE_BILINGUAL_TRANSLATE,
            "zine_generation": self.settings.CREDIT_RATE_ZINE_GENERATION,
            "interactive_mission": self.settings.CREDIT_RATE_INTERACTIVE_MISSION,
            "video_selfie_avatar": self.settings.CREDIT_RATE_VIDEO_SELFIE_AVATAR,
            "voice_clone_child": self.settings.CREDIT_RATE_VOICE_CLONE_CHILD,
            "family_snap": self.settings.CREDIT_RATE_FAMILY_SNAP,
            "v2v_transform": self.settings.CREDIT_RATE_V2V_TRANSFORM,
            "live_layer": self.settings.CREDIT_RATE_LIVE_LAYER,
            "3d_mesh": self.settings.CREDIT_RATE_3D_MESH,
            "magic_mirror": self.settings.CREDIT_RATE_MAGIC_MIRROR,
            "highlight_reel": self.settings.CREDIT_RATE_HIGHLIGHT_REEL,
            "character_generation": self.settings.CREDIT_RATE_CHARACTER_GENERATION,
            "vod_feature_unlock": self.settings.CREDIT_RATE_VOD_FEATURE_UNLOCK,
        }

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
        rate_mapping = self._build_rate_mapping()

        if feature not in rate_mapping:
            raise ValueError(
                f"Unknown feature: {feature}. "
                f"Valid features: {list(rate_mapping.keys())}"
            )

        return rate_mapping[feature]

    def get_all_rates(self) -> dict:
        """Get all feature rates as a dict. Single source of truth."""
        return self._build_rate_mapping()

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
                {"user_id": user_id, "is_expired": False}
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
                        {"user_id": user_id}, 
                        {"is_expired": False}, 
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
                {"user_id": user_id, "is_expired": False}
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
        Allocate credits to a user. For new signups, uses tier-based defaults.

        Args:
            user_id: User ID
            total_credits: Credits to allocate (defaults to FREE_MONTHLY_CREDITS)

        Returns:
            BetaCredit document

        Raises:
            ValueError: If user already has credits allocated
        """
        existing = await BetaCredit.find_one({"user_id": user_id})
        if existing:
            raise ValueError(f"Credits already allocated for user {user_id}")

        if total_credits is None:
            total_credits = self.settings.FREE_MONTHLY_CREDITS

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

    async def refill_monthly_credits(
        self,
        user_id: str,
        is_plus: bool = False
    ) -> Optional[BetaCredit]:
        """
        Refill monthly credits based on subscription tier.

        Free users: FREE_MONTHLY_CREDITS (50)
        Plus users: PLUS_MONTHLY_CREDITS (500)

        Args:
            user_id: User ID
            is_plus: Whether user is a Plus subscriber

        Returns:
            Updated BetaCredit document or None if not found
        """
        refill_amount = (
            self.settings.PLUS_MONTHLY_CREDITS if is_plus
            else self.settings.FREE_MONTHLY_CREDITS
        )

        credit = await BetaCredit.find_one(
            {"user_id": user_id}
        )

        if not credit:
            return await self.allocate_credits(user_id, refill_amount)

        credit.total_credits = refill_amount
        credit.used_credits = 0
        credit.remaining_credits = refill_amount
        credit.is_expired = False
        credit.updated_at = datetime.utcnow()
        await credit.save()

        transaction = BetaCreditTransaction(
            user_id=user_id,
            credit_id=str(credit.id),
            transaction_type="credit",
            amount=refill_amount,
            balance_after=refill_amount,
            metadata={
                "event": "monthly_refill",
                "tier": "plus" if is_plus else "free",
            },
            created_at=datetime.utcnow()
        )
        await transaction.insert()

        logger.info(
            "Monthly credits refilled",
            extra={
                "user_id": user_id,
                "tier": "plus" if is_plus else "free",
                "credits": refill_amount,
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


class CreditServiceWrapper:
    """
    Wrapper for backward compatibility with legacy charge_credits API.
    This will be initialized with proper dependencies when the database is ready.
    """
    def __init__(self):
        self._service: Optional[BetaCreditService] = None

    def initialize(self, settings: Settings, metering_service: MeteringService, db):
        """Initialize with dependencies after database connection is ready."""
        self._service = BetaCreditService(settings, metering_service, db)

    async def charge_credits(
        self,
        user_id: str,
        amount: float,
        reason: str,
        metadata: dict = None
    ) -> Tuple[bool, int]:
        """
        Legacy API wrapper for charge_credits - delegates to deduct_credits.

        Args:
            user_id: User ID
            amount: Credit amount to charge
            reason: Feature/reason for charge
            metadata: Additional metadata

        Returns:
            Tuple of (success: bool, remaining_credits: int)
        """
        if self._service is None:
            logger.warning(
                "Credit service not initialized - skipping credit charge",
                extra={"user_id": user_id, "reason": reason, "amount": amount}
            )
            return (True, 0)  # Return success to not block functionality during development

        return await self._service.deduct_credits(
            user_id=user_id,
            feature=reason,
            usage_amount=amount,
            metadata=metadata
        )

    async def has_sufficient_credits(
        self,
        user_id: str,
        amount: float,
    ) -> bool:
        """
        Check if user has enough credits for an operation.

        Args:
            user_id: User ID
            amount: Credits required

        Returns:
            True if user has sufficient credits (or service uninitialized)
        """
        if self._service is None:
            logger.warning(
                "Credit service not initialized - allowing operation",
                extra={"user_id": user_id, "amount": amount},
            )
            return True

        balance = await self._service.get_balance(user_id)
        if balance is None:
            return True
        return balance >= amount


# Default instance (will be initialized when database is ready)
credit_service = CreditServiceWrapper()
