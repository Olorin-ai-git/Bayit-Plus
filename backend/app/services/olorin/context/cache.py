"""
Alias Cache Management

Caches cultural reference aliases for fast pattern matching.
"""

import logging
from typing import Dict

from app.models.cultural_reference import CulturalReference

logger = logging.getLogger(__name__)


class AliasCache:
    """Cache for cultural reference aliases."""

    def __init__(self):
        self._cache: Dict[str, str] = {}  # alias -> reference_id
        self._loaded = False

    @property
    def is_loaded(self) -> bool:
        """Check if cache is loaded."""
        return self._loaded

    @property
    def aliases(self) -> Dict[str, str]:
        """Get alias cache."""
        return self._cache

    async def load(self) -> None:
        """Load alias cache from database."""
        if self._loaded:
            return

        try:
            references = await CulturalReference.find_all().to_list()
            for ref in references:
                # Add canonical names
                self._cache[ref.canonical_name.lower()] = ref.reference_id
                if ref.canonical_name_en:
                    self._cache[ref.canonical_name_en.lower()] = ref.reference_id

                # Add aliases
                for alias in ref.aliases:
                    self._cache[alias.lower()] = ref.reference_id
                for alias in ref.aliases_en:
                    self._cache[alias.lower()] = ref.reference_id

            self._loaded = True
            logger.info(f"Loaded {len(self._cache)} cultural reference aliases")

        except Exception as e:
            logger.error(f"Failed to load alias cache: {e}")

    def invalidate(self) -> None:
        """Invalidate cache for reload."""
        self._loaded = False

    def add_alias(self, alias: str, reference_id: str) -> None:
        """Add single alias to cache."""
        self._cache[alias.lower()] = reference_id
