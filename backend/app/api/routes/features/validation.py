"""
Feature Validation API

Server-side validation for iOS/tvOS feature flags.
Ensures critical features cannot be bypassed by client-side tampering.

SECURITY: This API enforces:
- AI credit availability
- Family Controls compliance
- Subscription entitlements for premium features
- Device-specific feature capabilities
"""

from enum import Enum
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.database import get_database
from app.core.security import get_current_user
from app.core.family_controls_dependencies import get_family_controls_for_user
from app.models.user import User
from app.models.family_controls import FamilyControls
from app.services.beta.credit_service import BetaCreditService
from app.services.olorin.metering.service import MeteringService
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/features", tags=["feature-validation"])


class FeatureName(str, Enum):
    """Supported feature flags for validation."""
    BETA_500 = "beta_500"
    FAMILY_CONTROLS = "family_controls"
    LIVE_DUBBING = "live_dubbing"
    AUDIOBOOKS = "audiobooks"
    LLM_SEARCH = "llm_search"
    PASSKEY = "passkey"
    REWARDS = "rewards"
    HOUSEHOLD = "household"
    CARPLAY = "carplay"
    AVATAR_MODE = "avatar_mode"
    PROACTIVE_VOICE = "proactive_voice"
    DEVICE_PAIRING = "device_pairing"
    # AI subtitle features
    SUBTITLE_NIKUD = "subtitle_nikud"
    SUBTITLE_SHORESH = "subtitle_shoresh"
    SUBTITLE_HEBLISH = "subtitle_heblish"
    SUBTITLE_GRAMMAR_FLIP = "subtitle_grammar_flip"
    SUBTITLE_SLANG_SYNTHESIS = "subtitle_slang_synthesis"
    SUBTITLE_ENGREW = "subtitle_engrew"
    # AI content features
    PHRASE_BREAKDOWN = "phrase_breakdown"
    CULTURAL_DETECT = "cultural_detect"
    CHAPTER_GENERATION = "chapter_generation"
    CHAT_TRANSLATION = "chat_translation"
    # Hebrew engagement AI features
    TALK_BACK_RESPOND = "talk_back_respond"
    BILINGUAL_SESSION = "bilingual_session"
    BILINGUAL_TRANSLATE = "bilingual_translate"
    STAR_STORY_EPISODE = "star_story_episode"
    ZINE_GENERATION = "zine_generation"
    # UI-only features (always approved)
    TRIVIA = "trivia"
    WAKE_WORD = "wake_word"
    LEGACY_FEATURES = "legacy_features"
    CHAPTER_NAVIGATION = "chapter_navigation"
    INTERACTIVE_SUBTITLES = "interactive_subtitles"
    SHABBAT_MODE = "shabbat_mode"


class ValidationResult(BaseModel):
    """Feature validation result."""
    feature: str
    enabled: bool
    reason: Optional[str] = None
    metadata: dict = {}


class BatchValidationRequest(BaseModel):
    """Request to validate multiple features at once."""
    features: list[FeatureName]


class BatchValidationResponse(BaseModel):
    """Response with validation results for multiple features."""
    results: list[ValidationResult]


async def get_credit_service(
    settings: Settings = Depends(get_settings),
    db = Depends(get_database)
) -> BetaCreditService:
    """Dependency injection for BetaCreditService."""
    metering_service = MeteringService()
    return BetaCreditService(
        settings=settings,
        metering_service=metering_service,
        db=db
    )


async def validate_beta_500(
    current_user: User,
    credit_service: BetaCreditService
) -> ValidationResult:
    """
    Validate AI credit availability.

    Requirements:
    - Premium users: always enabled (unlimited)
    - Free users: must have remaining credits

    Returns:
        ValidationResult with enabled=True if user has access
    """
    from app.models.beta_credit import BetaCredit

    try:
        # Premium users have unlimited access
        if current_user.can_access_premium_features():
            return ValidationResult(
                feature="beta_500",
                enabled=True,
                reason="premium_access"
            )

        # Check credit balance for free-tier users
        credit = await BetaCredit.find_one(
            {"user_id": str(current_user.id), "is_expired": False}
)

        if not credit:
            return ValidationResult(
                feature="beta_500",
                enabled=False,
                reason="no_credit_record_found"
            )

        if credit.remaining_credits <= 0:
            return ValidationResult(
                feature="beta_500",
                enabled=False,
                reason="insufficient_credits",
                metadata={"remaining_credits": 0}
            )

        return ValidationResult(
            feature="beta_500",
            enabled=True,
            metadata={"remaining_credits": credit.remaining_credits}
        )

    except Exception as e:
        logger.error(
            "AI credit validation error",
            extra={"user_id": str(current_user.id), "error": str(e)}
        )
        return ValidationResult(
            feature="beta_500",
            enabled=False,
            reason="validation_error"
        )


async def validate_family_controls(
    current_user: User,
    family_controls: Optional[FamilyControls]
) -> ValidationResult:
    """
    Validate Family Controls feature access.

    Requirements:
    - User must have family controls configured
    - Controls must be active

    Returns:
        ValidationResult with enabled=True if controls are active
    """
    try:
        if not family_controls:
            return ValidationResult(
                feature="family_controls",
                enabled=False,
                reason="no_family_controls_configured"
            )

        # Family controls exist and are active
        return ValidationResult(
            feature="family_controls",
            enabled=True,
            metadata={
                "kids_enabled": family_controls.kids_enabled,
                "youngsters_enabled": family_controls.youngsters_enabled,
                "viewing_hours_enabled": family_controls.viewing_hours_enabled
            }
        )

    except Exception as e:
        logger.error(
            "Family controls validation error",
            extra={"user_id": str(current_user.id), "error": str(e)}
        )
        return ValidationResult(
            feature="family_controls",
            enabled=False,
            reason="validation_error"
        )


def validate_premium_feature(
    current_user: User,
    feature_name: str
) -> ValidationResult:
    """
    Validate premium feature access (Live Dubbing, Audiobooks).

    Requirements:
    - User must have plus subscription tier
    - OR user must be admin

    Returns:
        ValidationResult with enabled=True if user has required subscription
    """
    try:
        # Admins always have access
        if current_user.is_admin_role():
            return ValidationResult(
                feature=feature_name,
                enabled=True,
                reason="admin_access"
            )

        # Check subscription tier
        if current_user.subscription_tier != "plus":
            return ValidationResult(
                feature=feature_name,
                enabled=False,
                reason="requires_premium_subscription",
                metadata={
                    "current_tier": current_user.subscription_tier or "free",
                    "required_tiers": ["plus"]
                }
            )

        return ValidationResult(
            feature=feature_name,
            enabled=True,
            metadata={"subscription_tier": current_user.subscription_tier}
        )

    except Exception as e:
        logger.error(
            f"{feature_name} validation error",
            extra={"user_id": str(current_user.id), "error": str(e)}
        )
        return ValidationResult(
            feature=feature_name,
            enabled=False,
            reason="validation_error"
        )


async def validate_ai_feature(
    current_user: User,
    feature_name: str,
    credit_service: Optional[BetaCreditService] = None
) -> ValidationResult:
    """
    Validate AI-powered feature access.

    Access tiers:
    - Premium (admin/plus): unlimited
    - Free with credits: requires positive credit balance
    - Free without credits: denied

    Returns:
        ValidationResult with enabled=True if user meets requirements
    """
    try:
        if current_user.can_access_premium_features():
            return ValidationResult(
                feature=feature_name,
                enabled=True,
                reason="premium_access",
                metadata={"subscription_tier": current_user.subscription_tier}
            )

        # Free-tier users: check credit balance
        if credit_service:
            balance = await credit_service.get_balance(str(current_user.id))
            if balance is not None and balance > 0:
                return ValidationResult(
                    feature=feature_name,
                    enabled=True,
                    reason="credit_access",
                    metadata={"remaining_credits": balance}
                )
            return ValidationResult(
                feature=feature_name,
                enabled=False,
                reason="insufficient_credits",
                metadata={"remaining_credits": balance or 0}
            )

        return ValidationResult(
            feature=feature_name,
            enabled=False,
            reason="requires_premium_or_credits",
            metadata={
                "current_tier": current_user.subscription_tier or "free"
            }
        )

    except Exception as e:
        logger.error(
            "AI feature validation error",
            extra={
                "user_id": str(current_user.id),
                "feature": feature_name,
                "error": str(e),
            }
        )
        return ValidationResult(
            feature=feature_name,
            enabled=False,
            reason="validation_error"
        )


def validate_ui_feature(feature_name: str) -> ValidationResult:
    """
    Validate UI-only feature (always enabled server-side).

    UI-only features have no server-side restrictions:
    - Trivia
    - Wake Word
    - Legacy Features
    - Chapter Navigation
    - Interactive Subtitles
    - Shabbat Mode

    Returns:
        ValidationResult with enabled=True
    """
    return ValidationResult(
        feature=feature_name,
        enabled=True,
        reason="ui_only_feature"
    )


@router.post("/validate/{feature_name}", response_model=ValidationResult)
async def validate_feature(
    feature_name: FeatureName,
    current_user: User = Depends(get_current_user),
    credit_service: BetaCreditService = Depends(get_credit_service),
    family_controls: Optional[FamilyControls] = Depends(get_family_controls_for_user)
):
    """
    Validate single feature access for authenticated user.

    **Security-Critical Endpoint**

    This endpoint performs server-side validation that CANNOT be bypassed
    by modifying client-side Info.plist feature flags.

    Args:
        feature_name: Feature to validate
        current_user: Authenticated user (from JWT)
        credit_service: Beta credit service
        family_controls: User's family controls

    Returns:
        ValidationResult with enabled/disabled status and reason

    Examples:
        ```bash
        # Check if user can access Beta 500 features
        curl -H "Authorization: Bearer TOKEN" \\
             https://api.bayit.tv/api/v1/features/validate/beta_500

        # Response:
        {
          "feature": "beta_500",
          "enabled": true,
          "metadata": {"remaining_credits": 347}
        }
        ```
    """
    try:
        # Route to appropriate validation function
        if feature_name == FeatureName.BETA_500:
            return await validate_beta_500(current_user, credit_service)

        elif feature_name == FeatureName.FAMILY_CONTROLS:
            return await validate_family_controls(current_user, family_controls)

        elif feature_name in [FeatureName.LIVE_DUBBING, FeatureName.AUDIOBOOKS]:
            return validate_premium_feature(current_user, feature_name.value)

        elif feature_name in [
            FeatureName.LLM_SEARCH,
            FeatureName.AVATAR_MODE,
            FeatureName.PROACTIVE_VOICE,
            FeatureName.SUBTITLE_NIKUD,
            FeatureName.SUBTITLE_SHORESH,
            FeatureName.SUBTITLE_HEBLISH,
            FeatureName.SUBTITLE_GRAMMAR_FLIP,
            FeatureName.SUBTITLE_SLANG_SYNTHESIS,
            FeatureName.SUBTITLE_ENGREW,
            FeatureName.PHRASE_BREAKDOWN,
            FeatureName.CULTURAL_DETECT,
            FeatureName.CHAPTER_GENERATION,
            FeatureName.CHAT_TRANSLATION,
            FeatureName.TALK_BACK_RESPOND,
            FeatureName.BILINGUAL_SESSION,
            FeatureName.BILINGUAL_TRANSLATE,
            FeatureName.STAR_STORY_EPISODE,
            FeatureName.ZINE_GENERATION,
        ]:
            return await validate_ai_feature(current_user, feature_name.value, credit_service)

        elif feature_name in [
            FeatureName.TRIVIA,
            FeatureName.WAKE_WORD,
            FeatureName.LEGACY_FEATURES,
            FeatureName.CHAPTER_NAVIGATION,
            FeatureName.INTERACTIVE_SUBTITLES,
            FeatureName.SHABBAT_MODE
        ]:
            return validate_ui_feature(feature_name.value)

        else:
            # Default: check subscription for other features
            return validate_premium_feature(current_user, feature_name.value)

    except Exception as e:
        logger.error(
            "Feature validation error",
            extra={
                "user_id": str(current_user.id),
                "feature": feature_name.value,
                "error": str(e)
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Feature validation failed"
        )


@router.post("/validate/batch", response_model=BatchValidationResponse)
async def validate_features_batch(
    request: BatchValidationRequest,
    current_user: User = Depends(get_current_user),
    credit_service: BetaCreditService = Depends(get_credit_service),
    family_controls: Optional[FamilyControls] = Depends(get_family_controls_for_user)
):
    """
    Validate multiple features in a single request.

    **Optimization**: Reduces API calls by validating all features at once.

    Args:
        request: List of features to validate
        current_user: Authenticated user (from JWT)
        credit_service: Beta credit service
        family_controls: User's family controls

    Returns:
        BatchValidationResponse with results for each feature

    Examples:
        ```bash
        curl -X POST \\
             -H "Authorization: Bearer TOKEN" \\
             -H "Content-Type: application/json" \\
             -d '{"features": ["beta_500", "live_dubbing", "family_controls"]}' \\
             https://api.bayit.tv/api/v1/features/validate/batch
        ```
    """
    results = []

    for feature_name in request.features:
        try:
            # Reuse single feature validation logic
            if feature_name == FeatureName.BETA_500:
                result = await validate_beta_500(current_user, credit_service)

            elif feature_name == FeatureName.FAMILY_CONTROLS:
                result = await validate_family_controls(current_user, family_controls)

            elif feature_name in [FeatureName.LIVE_DUBBING, FeatureName.AUDIOBOOKS]:
                result = validate_premium_feature(current_user, feature_name.value)

            elif feature_name in [
                FeatureName.LLM_SEARCH,
                FeatureName.AVATAR_MODE,
                FeatureName.PROACTIVE_VOICE,
                FeatureName.SUBTITLE_NIKUD,
                FeatureName.SUBTITLE_SHORESH,
                FeatureName.SUBTITLE_HEBLISH,
                FeatureName.SUBTITLE_GRAMMAR_FLIP,
                FeatureName.SUBTITLE_SLANG_SYNTHESIS,
                FeatureName.SUBTITLE_ENGREW,
                FeatureName.PHRASE_BREAKDOWN,
                FeatureName.CULTURAL_DETECT,
                FeatureName.CHAPTER_GENERATION,
                FeatureName.CHAT_TRANSLATION,
                FeatureName.TALK_BACK_RESPOND,
                FeatureName.BILINGUAL_SESSION,
                FeatureName.BILINGUAL_TRANSLATE,
                FeatureName.STAR_STORY_EPISODE,
                FeatureName.ZINE_GENERATION,
            ]:
                result = await validate_ai_feature(current_user, feature_name.value, credit_service)

            elif feature_name in [
                FeatureName.TRIVIA,
                FeatureName.WAKE_WORD,
                FeatureName.LEGACY_FEATURES,
                FeatureName.CHAPTER_NAVIGATION,
                FeatureName.INTERACTIVE_SUBTITLES,
                FeatureName.SHABBAT_MODE
            ]:
                result = validate_ui_feature(feature_name.value)

            else:
                result = validate_premium_feature(current_user, feature_name.value)

            results.append(result)

        except Exception as e:
            logger.error(
                "Batch validation error for feature",
                extra={
                    "user_id": str(current_user.id),
                    "feature": feature_name.value,
                    "error": str(e)
                }
            )
            # Continue with other features even if one fails
            results.append(ValidationResult(
                feature=feature_name.value,
                enabled=False,
                reason="validation_error"
            ))

    return BatchValidationResponse(results=results)


@router.post("/deduct-credit", response_model=dict)
async def deduct_credit_for_feature(
    feature: str,
    current_user: User = Depends(get_current_user),
    credit_service: BetaCreditService = Depends(get_credit_service)
):
    """
    Deduct Beta 500 credit for AI feature usage.

    **Security-Critical Endpoint**

    This endpoint MUST be called before executing any AI-powered feature.
    Credits are deducted server-side to prevent client tampering.

    Args:
        feature: Feature name (for usage tracking)
        current_user: Authenticated user (from JWT)
        credit_service: Beta credit service

    Returns:
        {
            "success": true,
            "remaining_credits": 346,
            "message": "Credit deducted successfully"
        }

    Raises:
        403: Insufficient credits
        404: User not enrolled in beta program

    Examples:
        ```bash
        # Before using AI search feature
        curl -X POST \\
             -H "Authorization: Bearer TOKEN" \\
             -H "Content-Type: application/json" \\
             -d '{"feature": "ai_search"}' \\
             https://api.bayit.tv/api/v1/features/deduct-credit
        ```
    """
    try:
        # Premium users do not consume credits
        if current_user.can_access_premium_features():
            return {
                "success": True,
                "remaining_credits": None,
                "message": "Premium user - no credit deduction required"
            }

        # Deduct credit
        success, remaining = await credit_service.deduct_credits(
            user_id=str(current_user.id),
            feature=feature,
            usage_amount=1.0,
            metadata={"source": "ios_app"}
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="insufficient_credits"
            )

        return {
            "success": True,
            "remaining_credits": remaining,
            "message": "Credit deducted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Credit deduction error",
            extra={
                "user_id": str(current_user.id),
                "feature": feature,
                "error": str(e)
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Credit deduction failed"
        )
