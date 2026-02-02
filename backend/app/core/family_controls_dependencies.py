"""
Family Controls Dependency Injection.

Provides FastAPI dependencies for enforcing family controls across content endpoints.
Integrates with household system and profile-level overrides.
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import Depends, Header, HTTPException, status

from app.core.security import get_optional_user
from app.models.family_controls import FamilyControls
from app.models.user import User
from app.services.family_controls_service import family_controls_service
from app.services.household_service import household_service
from app.services.profile_controls_service import profile_controls_service

logger = logging.getLogger(__name__)


async def get_family_controls_for_user(
    current_user: Optional[User] = Depends(get_optional_user),
) -> Optional[FamilyControls]:
    """
    Get family controls for authenticated user.

    Control hierarchy:
    1. Household shared controls (if user belongs to household)
    2. User-level personal controls
    3. None (no controls)

    Returns None if:
    - User is not authenticated
    - No family controls are set up

    Args:
        current_user: Currently authenticated user (optional)

    Returns:
        FamilyControls instance or None
    """
    if not current_user:
        return None

    try:
        # 1. Check if user belongs to household with shared controls
        household = await household_service.get_household_for_user(str(current_user.id))
        if household and household.shared_controls_id:
            controls = await family_controls_service.get_by_id(household.shared_controls_id)
            if controls:
                logger.debug(
                    f"Using household shared controls for user {current_user.id} from household {household.household_id}"
                )
                return controls

        # 2. Fallback to user's personal controls
        controls = await family_controls_service.get_controls(str(current_user.id))
        if controls:
            logger.debug(f"Using personal controls for user {current_user.id}")
        return controls
    except Exception as e:
        logger.error(
            f"Error retrieving family controls for user {current_user.id}: {str(e)}"
        )
        return None


async def check_kids_section_allowed(
    current_user: Optional[User] = Depends(get_optional_user),
) -> Optional[FamilyControls]:
    """
    Verify kids section is enabled and time restrictions are met.

    Raises HTTPException(403) if:
    - Kids section is disabled by family controls
    - Current time is outside allowed viewing hours

    Args:
        current_user: Currently authenticated user (optional)

    Returns:
        FamilyControls instance (for further filtering) or None if no controls

    Raises:
        HTTPException: 403 if section disabled or outside viewing hours
    """
    if not current_user:
        return None

    controls = await get_family_controls_for_user(current_user)
    if not controls:
        return None

    # Check if kids section is disabled
    if not controls.kids_enabled:
        logger.warning(
            f"Kids section access blocked for user {current_user.id} - section disabled"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "kids_section_disabled",
                "message": "Kids section is currently disabled by family controls",
            },
        )

    # Check viewing hours
    if controls.viewing_hours_enabled and not controls.is_viewing_allowed_now():
        logger.warning(
            f"Kids section access blocked for user {current_user.id} - outside viewing hours"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "outside_viewing_hours",
                "message": f"Viewing is only allowed between {controls.viewing_start_hour}:00 and {controls.viewing_end_hour}:00",
            },
        )

    return controls


async def check_youngsters_section_allowed(
    current_user: Optional[User] = Depends(get_optional_user),
) -> Optional[FamilyControls]:
    """
    Verify youngsters section is enabled and time restrictions are met.

    Raises HTTPException(403) if:
    - Youngsters section is disabled by family controls
    - Current time is outside allowed viewing hours

    Args:
        current_user: Currently authenticated user (optional)

    Returns:
        FamilyControls instance (for further filtering) or None if no controls

    Raises:
        HTTPException: 403 if section disabled or outside viewing hours
    """
    if not current_user:
        return None

    controls = await get_family_controls_for_user(current_user)
    if not controls:
        return None

    # Check if youngsters section is disabled
    if not controls.youngsters_enabled:
        logger.warning(
            f"Youngsters section access blocked for user {current_user.id} - section disabled"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "youngsters_section_disabled",
                "message": "Youngsters section is currently disabled by family controls",
            },
        )

    # Check viewing hours
    if controls.viewing_hours_enabled and not controls.is_viewing_allowed_now():
        logger.warning(
            f"Youngsters section access blocked for user {current_user.id} - outside viewing hours"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "outside_viewing_hours",
                "message": f"Viewing is only allowed between {controls.viewing_start_hour}:00 and {controls.viewing_end_hour}:00",
            },
        )

    return controls


def check_content_rating_allowed(
    controls: FamilyControls,
    content_rating: str,
    is_kids: bool = False,
) -> bool:
    """
    Check if content rating is within allowed limits.

    Args:
        controls: FamilyControls instance
        content_rating: Content rating (G, PG, PG-13, R, TV-MA, etc.)
        is_kids: Whether this is kids content (affects section enable check)

    Returns:
        True if content is allowed, False otherwise
    """
    if not controls:
        return True

    return controls.is_content_allowed(content_rating, is_kids=is_kids)


def check_viewing_hours_allowed(
    controls: Optional[FamilyControls],
) -> tuple[bool, Optional[str]]:
    """
    Check if current time is within allowed viewing hours.

    Args:
        controls: FamilyControls instance (optional)

    Returns:
        Tuple of (is_allowed, reason_if_blocked)
    """
    if not controls:
        return True, None

    if controls.is_viewing_allowed_now():
        return True, None

    return (
        False,
        f"Viewing is only allowed between {controls.viewing_start_hour}:00 and {controls.viewing_end_hour}:00",
    )


async def get_profile_aware_controls(
    current_user: Optional[User] = Depends(get_optional_user),
    profile_id: Optional[str] = Header(None, alias="X-Profile-ID"),
) -> Optional[FamilyControls]:
    """
    Get family controls considering active profile.

    Control hierarchy:
    1. Profile-specific controls (if profile_id provided and profile has override)
    2. Household shared controls (if user in household)
    3. User-level controls
    4. No controls (None)

    Args:
        current_user: Currently authenticated user (optional)
        profile_id: Active profile ID from X-Profile-ID header (optional)

    Returns:
        FamilyControls instance or None
    """
    if not current_user:
        return None

    # Check profile-specific controls (Phase 4 - now implemented)
    if profile_id:
        try:
            controls = await profile_controls_service.get_effective_controls(
                profile_id
            )
            if controls:
                logger.debug(
                    f"Using profile-specific controls for profile {profile_id}"
                )
                return controls
        except Exception as e:
            logger.error(
                f"Error getting profile controls for {profile_id}: {str(e)}"
            )

    # Fallback to household/user-level controls
    return await get_family_controls_for_user(current_user)


# Utility function for filtering content by family controls
def filter_content_by_controls(
    content_items: list,
    controls: Optional[FamilyControls],
    is_kids: bool = False,
) -> list:
    """
    Filter content items based on family controls.

    Filters out content that exceeds:
    - Maximum content rating
    - Age limits

    Args:
        content_items: List of content items with 'content_rating' and 'age_rating' fields
        controls: FamilyControls instance (None = no filtering)
        is_kids: Whether this is kids content (affects section enable check)

    Returns:
        Filtered list of content items
    """
    if not controls:
        return content_items

    filtered = []
    for item in content_items:
        # Check content rating
        content_rating = getattr(item, "content_rating", "G")
        if not controls.is_content_allowed(content_rating, is_kids=is_kids):
            logger.debug(
                f"Filtering out content with rating {content_rating} (max: {controls.max_content_rating})"
            )
            continue

        # Check age rating
        age_rating = getattr(item, "age_rating", None)
        if age_rating is not None:
            max_age = controls.kids_age_limit if is_kids else controls.youngsters_age_limit
            if age_rating > max_age:
                logger.debug(
                    f"Filtering out content with age rating {age_rating} (max: {max_age})"
                )
                continue

        filtered.append(item)

    logger.info(
        f"Filtered {len(content_items)} content items to {len(filtered)} after applying family controls"
    )
    return filtered
