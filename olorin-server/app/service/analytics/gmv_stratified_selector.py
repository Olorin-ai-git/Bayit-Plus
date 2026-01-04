"""
GMV-Stratified Entity Selector.

Ensures entity selection covers all GMV ranges by guaranteeing
minimum representation from each GMV bin.

Feature: blindspot-aware-selection
"""

import os
from collections import defaultdict
from typing import Any, Dict, List

from app.config.threshold_config import get_blindspot_selector_config
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class GMVStratifiedSelector:
    """Ensures entity selection covers all GMV ranges."""

    def __init__(self):
        """Initialize with configuration."""
        self._config = get_blindspot_selector_config()
        self._gmv_bins = self._load_gmv_bins()

    def _load_gmv_bins(self) -> List[int]:
        """Load GMV bins from environment."""
        gmv_bins_str = os.getenv("BLINDSPOT_GMV_BINS", "0,50,100,250,500,1000,5000")
        return [int(x) for x in gmv_bins_str.split(",")]

    def get_gmv_bin(self, gmv: float) -> str:
        """Get GMV bin label for a value."""
        for i in range(len(self._gmv_bins) - 1):
            if gmv < self._gmv_bins[i + 1]:
                return f"{self._gmv_bins[i]}-{self._gmv_bins[i + 1]}"
        return f"{self._gmv_bins[-1]}+"

    def get_gmv_bin_labels(self) -> List[str]:
        """Get all GMV bin labels."""
        labels = []
        for i in range(len(self._gmv_bins) - 1):
            labels.append(f"{self._gmv_bins[i]}-{self._gmv_bins[i + 1]}")
        labels.append(f"{self._gmv_bins[-1]}+")
        return labels

    def select_with_gmv_coverage(
        self,
        entities: List[Dict[str, Any]],
        target_count: int,
        gmv_field: str = "total_gmv",
        value_field: str = "risk_weighted_value",
        min_per_bin_pct: float = None,
    ) -> List[Dict[str, Any]]:
        """
        Select entities ensuring minimum coverage per GMV bin.

        Algorithm:
        1. Assign each entity to GMV bin
        2. Calculate minimum per bin: target_count * min_per_bin_pct / 100
        3. For each bin, select top entities up to minimum
        4. Fill remaining slots with highest risk-weighted from any bin

        Args:
            entities: List of entity dictionaries with GMV and risk values.
            target_count: Total number of entities to select.
            gmv_field: Field name for GMV value.
            value_field: Field name for risk-weighted value for ranking.
            min_per_bin_pct: Minimum percentage per bin (default from config).

        Returns:
            Selected entities with GMV coverage guarantee.
        """
        if not entities:
            return []

        if min_per_bin_pct is None:
            min_per_bin_pct = self._config.gmv_bin_min_pct

        # Group entities by GMV bin
        by_gmv_bin: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for entity in entities:
            gmv = float(entity.get(gmv_field, 0))
            bin_label = self.get_gmv_bin(gmv)
            by_gmv_bin[bin_label].append(entity)

        # Sort each bin by risk-weighted value (descending)
        for bin_label in by_gmv_bin:
            by_gmv_bin[bin_label].sort(
                key=lambda e: float(e.get(value_field, 0)), reverse=True
            )

        # Calculate minimum per bin
        num_bins = len(self.get_gmv_bin_labels())
        min_per_bin = max(1, int(target_count * min_per_bin_pct / 100))

        logger.info(
            f"GMV stratification: target={target_count}, bins={num_bins}, "
            f"min_per_bin={min_per_bin} ({min_per_bin_pct}%)"
        )

        # Phase 1: Select minimum from each bin
        selected = []
        selected_ids = set()
        bin_counts = {}

        for bin_label in self.get_gmv_bin_labels():
            bin_entities = by_gmv_bin.get(bin_label, [])
            take_count = min(len(bin_entities), min_per_bin)

            for entity in bin_entities[:take_count]:
                entity_id = id(entity)
                if entity_id not in selected_ids:
                    selected.append(entity)
                    selected_ids.add(entity_id)

            bin_counts[bin_label] = take_count

        logger.debug(f"Phase 1 selection by bin: {bin_counts}")

        # Phase 2: Fill remaining with highest risk-weighted
        remaining = target_count - len(selected)
        if remaining > 0:
            all_remaining = []
            for bin_entities in by_gmv_bin.values():
                for entity in bin_entities:
                    if id(entity) not in selected_ids:
                        all_remaining.append(entity)

            # Sort by risk-weighted value
            all_remaining.sort(key=lambda e: float(e.get(value_field, 0)), reverse=True)

            for entity in all_remaining[:remaining]:
                selected.append(entity)
                selected_ids.add(id(entity))

        # Final sort by risk-weighted value
        selected.sort(key=lambda e: float(e.get(value_field, 0)), reverse=True)

        # Log final distribution
        final_distribution = self._count_by_bin(selected, gmv_field)
        logger.info(f"Final GMV distribution: {final_distribution}")

        return selected

    def _count_by_bin(
        self, entities: List[Dict[str, Any]], gmv_field: str
    ) -> Dict[str, int]:
        """Count entities by GMV bin."""
        counts: Dict[str, int] = defaultdict(int)
        for entity in entities:
            gmv = float(entity.get(gmv_field, 0))
            bin_label = self.get_gmv_bin(gmv)
            counts[bin_label] += 1
        return dict(counts)

    def get_coverage_report(
        self,
        entities: List[Dict[str, Any]],
        gmv_field: str = "total_gmv",
    ) -> Dict[str, Any]:
        """Generate a report of GMV bin coverage."""
        counts = self._count_by_bin(entities, gmv_field)
        total = len(entities)

        report = {
            "total_entities": total,
            "bins": {},
            "coverage_gaps": [],
        }

        for bin_label in self.get_gmv_bin_labels():
            count = counts.get(bin_label, 0)
            pct = (count / total * 100) if total > 0 else 0
            report["bins"][bin_label] = {"count": count, "percentage": round(pct, 2)}

            if pct < self._config.gmv_bin_min_pct:
                report["coverage_gaps"].append(
                    {"bin": bin_label, "actual_pct": round(pct, 2)}
                )

        return report
