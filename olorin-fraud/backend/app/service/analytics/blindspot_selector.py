"""
Blindspot-Aware Entity Selector.

Uses blindspot heatmap analysis to weight entity selection,
prioritizing entities in known blindspot zones (low-score, low-GMV).

Feature: blindspot-aware-selection
"""

import asyncio
import os
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

from app.config.threshold_config import get_blindspot_selector_config
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class BlindspotWeightCache:
    """Thread-safe cache for blindspot weights with TTL."""

    def __init__(self, ttl_seconds: int = 3600):
        """Initialize cache with TTL."""
        self._cache: Dict[Tuple[str, str], float] = {}
        self._timestamp: Optional[float] = None
        self._ttl = ttl_seconds
        self._lock = threading.Lock()

    def get(self) -> Optional[Dict[Tuple[str, str], float]]:
        """Get cached weights if still valid."""
        with self._lock:
            if self._timestamp is None:
                return None
            if time.time() - self._timestamp > self._ttl:
                self._cache = {}
                self._timestamp = None
                return None
            return self._cache.copy()

    def set(self, weights: Dict[Tuple[str, str], float]) -> None:
        """Set weights in cache."""
        with self._lock:
            self._cache = weights.copy()
            self._timestamp = time.time()

    def clear(self) -> None:
        """Clear cache."""
        with self._lock:
            self._cache = {}
            self._timestamp = None


class BlindspotSelector:
    """Blindspot-aware entity selection with weight caching."""

    def __init__(self):
        """Initialize with configuration from environment."""
        self._config = get_blindspot_selector_config()
        self._cache = BlindspotWeightCache(ttl_seconds=self._config.cache_ttl)
        self._gmv_bins = self._load_gmv_bins()

    def _load_gmv_bins(self) -> List[int]:
        """Load GMV bins from environment."""
        gmv_bins_str = os.getenv("BLINDSPOT_GMV_BINS", "0,50,100,250,500,1000,5000")
        return [int(x) for x in gmv_bins_str.split(",")]

    async def get_blindspot_weights(
        self, force_refresh: bool = False
    ) -> Dict[Tuple[str, str], float]:
        """
        Get blindspot weights from analyzer output.

        Args:
            force_refresh: Force refresh even if cache is valid.

        Returns:
            Dictionary mapping (score_bin_label, gmv_bin) -> weight.
        """
        if not force_refresh:
            cached = self._cache.get()
            if cached is not None:
                logger.debug(f"Using cached blindspot weights ({len(cached)} cells)")
                return cached

        try:
            from app.service.analytics.model_blindspot_analyzer import (
                ModelBlindspotAnalyzer,
            )

            analyzer = ModelBlindspotAnalyzer()
            analysis = await analyzer.analyze_blindspots(export_csv=False)

            if analysis.get("status") != "success":
                logger.warning("Blindspot analysis failed, using default weights")
                return {}

            weights = self._extract_weights(analysis)
            self._cache.set(weights)
            logger.info(f"Loaded blindspot weights for {len(weights)} cells")
            return weights

        except Exception as e:
            logger.warning(f"Could not load blindspot weights: {e}")
            return {}

    def _extract_weights(
        self, analysis: Dict[str, Any]
    ) -> Dict[Tuple[str, str], float]:
        """Extract weights from blindspot analysis output."""
        weights = {}
        cells = analysis.get("matrix", {}).get("cells", [])

        for cell in cells:
            fn_rate = cell.get("fn_rate", 0)
            fn_count = cell.get("fn", 0)
            score_bin_label = cell.get("score_bin_label", str(cell.get("score_bin", 0)))
            gmv_bin = cell.get("gmv_bin", "0-50")

            # Calculate weight based on FN severity
            weight = 1.0
            if fn_rate >= 0.10:  # Critical blindspot (10%+ FN rate)
                weight = self._config.fn_weight
            elif fn_rate >= 0.05:  # High blindspot
                weight = self._config.fn_weight * 0.7
            elif fn_count > 0:  # Some missed fraud
                weight = 1.5

            weights[(score_bin_label, gmv_bin)] = weight

        return weights

    def get_gmv_bin(self, gmv: float) -> str:
        """Get GMV bin label for a value."""
        for i in range(len(self._gmv_bins) - 1):
            if gmv < self._gmv_bins[i + 1]:
                return f"{self._gmv_bins[i]}-{self._gmv_bins[i + 1]}"
        return f"{self._gmv_bins[-1]}+"

    def get_score_bin_label(self, score: float, num_bins: int = 20) -> str:
        """Get score bin label for a value."""
        bin_size = 1.0 / num_bins
        bin_idx = min(int(score / bin_size), num_bins - 1)
        bin_start = bin_idx * bin_size
        bin_end = min((bin_idx + 1) * bin_size, 1.0)
        return f"{bin_start:.2f}-{bin_end:.2f}"

    def apply_blindspot_weighting(
        self,
        entities: List[Dict[str, Any]],
        weights: Dict[Tuple[str, str], float],
        gmv_field: str = "total_gmv",
        score_field: str = "avg_risk_score",
        value_field: str = "risk_weighted_value",
    ) -> List[Dict[str, Any]]:
        """
        Apply blindspot weighting to entities.

        Args:
            entities: List of entity dictionaries.
            weights: Blindspot weights by (score_bin, gmv_bin).
            gmv_field: Field name for GMV value.
            score_field: Field name for risk score.
            value_field: Field name for risk-weighted value to modify.

        Returns:
            Entities with modified risk_weighted_value.
        """
        if not weights:
            return entities

        weighted_entities = []
        for entity in entities:
            gmv = float(entity.get(gmv_field, 0))
            score = float(entity.get(score_field, 0))
            value = float(entity.get(value_field, 0))

            gmv_bin = self.get_gmv_bin(gmv)
            score_bin = self.get_score_bin_label(score)

            weight = weights.get((score_bin, gmv_bin), 1.0)

            # Apply low-score boost for entities below threshold
            if score < 0.35:
                weight *= self._config.low_score_boost

            entity_copy = entity.copy()
            entity_copy[value_field] = value * weight
            entity_copy["_blindspot_weight"] = weight
            weighted_entities.append(entity_copy)

        return weighted_entities

    def get_weights_sync(self) -> Dict[Tuple[str, str], float]:
        """Synchronous wrapper for getting blindspot weights."""
        cached = self._cache.get()
        if cached is not None:
            return cached

        try:
            loop = asyncio.new_event_loop()
            try:
                return loop.run_until_complete(self.get_blindspot_weights())
            finally:
                loop.close()
        except Exception as e:
            logger.warning(f"Could not load blindspot weights synchronously: {e}")
            return {}
