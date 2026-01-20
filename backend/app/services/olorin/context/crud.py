"""
Cultural Reference CRUD Operations

Add, update, and query cultural references.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from app.models.cultural_reference import CulturalReference
from app.services.olorin.context.cache import AliasCache

logger = logging.getLogger(__name__)


async def add_reference(
    reference_id: str,
    canonical_name: str,
    category: str,
    short_explanation: str,
    alias_cache: AliasCache,
    **kwargs,
) -> CulturalReference:
    """
    Add a new cultural reference to the knowledge base.

    Args:
        reference_id: Unique identifier
        canonical_name: Hebrew canonical name
        category: Reference category
        short_explanation: Brief Hebrew explanation
        alias_cache: Alias cache to update
        **kwargs: Additional fields

    Returns:
        Created reference document
    """
    existing = await CulturalReference.find_one(
        CulturalReference.reference_id == reference_id
    )
    if existing:
        raise ValueError(f"Reference '{reference_id}' already exists")

    ref = CulturalReference(
        reference_id=reference_id,
        canonical_name=canonical_name,
        category=category,
        short_explanation=short_explanation,
        **kwargs,
    )

    await ref.insert()

    # Update cache
    alias_cache.add_alias(canonical_name, reference_id)

    logger.info(f"Added cultural reference: {reference_id}")
    return ref


async def update_reference(
    reference_id: str,
    alias_cache: AliasCache,
    **updates,
) -> Optional[CulturalReference]:
    """
    Update a cultural reference.

    Args:
        reference_id: Reference to update
        alias_cache: Alias cache to invalidate
        **updates: Fields to update

    Returns:
        Updated reference or None if not found
    """
    ref = await CulturalReference.find_one(
        CulturalReference.reference_id == reference_id
    )
    if not ref:
        return None

    for key, value in updates.items():
        if hasattr(ref, key):
            setattr(ref, key, value)

    ref.updated_at = datetime.now(timezone.utc)
    await ref.save()

    # Invalidate cache for reload
    alias_cache.invalidate()

    return ref


async def get_references_by_category(
    category: str,
    limit: int = 100,
) -> List[CulturalReference]:
    """Get references by category."""
    return await CulturalReference.find(
        CulturalReference.category == category
    ).sort(-CulturalReference.lookup_count).limit(limit).to_list()


async def get_popular_references(
    limit: int = 50,
) -> List[CulturalReference]:
    """Get most frequently accessed references."""
    return await CulturalReference.find_all().sort(
        -CulturalReference.lookup_count
    ).limit(limit).to_list()
