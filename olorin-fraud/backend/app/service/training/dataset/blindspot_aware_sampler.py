"""
Blindspot-Aware Training Sampler.

Over-samples from known blindspot zones (high FN rate areas)
to improve model performance in weak prediction regions.

Feature: blindspot-aware-training
"""

import asyncio
import os
import random
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

from app.service.logging import get_bridge_logger
from app.service.training.dataset.dataset_models import BlindspotSamplingConfig
from app.service.training.training_models import TrainingSample

logger = get_bridge_logger(__name__)


class BlindspotAwareSampler:
    """Over-sample training data from blindspot zones."""

    def __init__(self, config: Optional[BlindspotSamplingConfig] = None):
        """Initialize with configuration."""
        self._config = config or self._load_config()
        self._blindspot_weights: Optional[Dict[Tuple[str, str], float]] = None

    def _load_config(self) -> BlindspotSamplingConfig:
        """Load configuration from environment."""
        gmv_bins_str = os.getenv("TRAINING_GMV_BINS", "0,50,100,250,500,1000,5000")
        return BlindspotSamplingConfig(
            gmv_bins=[int(x) for x in gmv_bins_str.split(",")],
            score_bins=int(os.getenv("TRAINING_SCORE_BINS", "10")),
            min_samples_per_cell=int(os.getenv("TRAINING_MIN_SAMPLES_PER_CELL", "50")),
            oversample_blindspots=os.getenv(
                "TRAINING_OVERSAMPLE_BLINDSPOTS", "true"
            ).lower()
            == "true",
            blindspot_oversample_factor=float(
                os.getenv("TRAINING_BLINDSPOT_OVERSAMPLE_FACTOR", "2.0")
            ),
            blindspot_fn_threshold=float(
                os.getenv("TRAINING_BLINDSPOT_FN_THRESHOLD", "0.05")
            ),
        )

    def get_gmv_bin(self, gmv: float) -> str:
        """Get GMV bin label for a value."""
        bins = self._config.gmv_bins
        for i in range(len(bins) - 1):
            if gmv < bins[i + 1]:
                return f"{bins[i]}-{bins[i + 1]}"
        return f"{bins[-1]}+"

    def get_score_bin(self, score: float) -> str:
        """Get score bin label for a value."""
        num_bins = self._config.score_bins
        bin_size = 1.0 / num_bins
        bin_idx = min(int(score / bin_size), num_bins - 1)
        bin_start = round(bin_idx * bin_size, 2)
        bin_end = round(min((bin_idx + 1) * bin_size, 1.0), 2)
        return f"{bin_start:.2f}-{bin_end:.2f}"

    async def load_blindspot_weights(self) -> Dict[Tuple[str, str], float]:
        """Load blindspot weights from analyzer."""
        if self._blindspot_weights is not None:
            return self._blindspot_weights

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
            self._blindspot_weights = weights
            logger.info(f"Loaded {len(weights)} blindspot weights for training")
            return weights

        except Exception as e:
            logger.warning(f"Could not load blindspot weights: {e}")
            return {}

    def _extract_weights(
        self, analysis: Dict[str, Any]
    ) -> Dict[Tuple[str, str], float]:
        """Extract oversampling weights from blindspot analysis."""
        weights = {}
        cells = analysis.get("matrix", {}).get("cells", [])
        fn_threshold = self._config.blindspot_fn_threshold
        factor = self._config.blindspot_oversample_factor

        for cell in cells:
            fn_rate = cell.get("fn_rate", 0)
            score_bin = cell.get("score_bin_label", str(cell.get("score_bin", 0)))
            gmv_bin = cell.get("gmv_bin", "0-50")

            # Calculate oversample weight based on FN severity
            if fn_rate >= fn_threshold * 2:
                weight = factor  # Full oversample factor for severe blindspots
            elif fn_rate >= fn_threshold:
                weight = 1.0 + (factor - 1.0) * 0.5  # Half oversample factor
            else:
                weight = 1.0  # No oversampling

            weights[(score_bin, gmv_bin)] = weight

        return weights

    def sample_with_blindspot_awareness(
        self,
        samples: List[TrainingSample],
        weights: Dict[Tuple[str, str], float],
        gmv_field: str = "total_gmv",
        score_field: str = "avg_risk_score",
        random_seed: Optional[int] = None,
    ) -> List[TrainingSample]:
        """
        Sample training data with blindspot-aware oversampling.

        Args:
            samples: List of training samples
            weights: Blindspot weights by (score_bin, gmv_bin)
            gmv_field: Feature field for GMV value
            score_field: Feature field for score value
            random_seed: Random seed for reproducibility

        Returns:
            Oversampled training data with blindspot emphasis
        """
        if random_seed is not None:
            random.seed(random_seed)

        if not samples or not weights:
            return list(samples)

        if not self._config.oversample_blindspots:
            logger.debug("Blindspot oversampling disabled")
            return list(samples)

        # Group samples by cell and fraud status
        by_cell: Dict[Tuple[str, str, bool], List[TrainingSample]] = defaultdict(list)

        for sample in samples:
            gmv = float(sample.features.get(gmv_field, 0))
            score = float(sample.features.get(score_field, 0.5))
            gmv_bin = self.get_gmv_bin(gmv)
            score_bin = self.get_score_bin(score)
            by_cell[(score_bin, gmv_bin, sample.is_fraud)].append(sample)

        result = []
        oversample_stats = {"original": len(samples), "added": 0}

        for (score_bin, gmv_bin, is_fraud), cell_samples in by_cell.items():
            weight = weights.get((score_bin, gmv_bin), 1.0)

            # Add original samples
            result.extend(cell_samples)

            # Over-sample if weight > 1
            if weight > 1.0 and cell_samples:
                extra_count = int(len(cell_samples) * (weight - 1.0))
                if extra_count > 0:
                    extra = random.choices(cell_samples, k=extra_count)
                    result.extend(extra)
                    oversample_stats["added"] += extra_count

        logger.info(
            f"Blindspot oversampling: {oversample_stats['original']} -> "
            f"{len(result)} samples (+{oversample_stats['added']} added)"
        )

        random.shuffle(result)
        return result

    def sample_sync(
        self,
        samples: List[TrainingSample],
        gmv_field: str = "total_gmv",
        score_field: str = "avg_risk_score",
        random_seed: Optional[int] = None,
    ) -> List[TrainingSample]:
        """Synchronous wrapper for blindspot-aware sampling."""
        try:
            loop = asyncio.new_event_loop()
            try:
                weights = loop.run_until_complete(self.load_blindspot_weights())
            finally:
                loop.close()

            return self.sample_with_blindspot_awareness(
                samples, weights, gmv_field, score_field, random_seed
            )
        except Exception as e:
            logger.warning(f"Blindspot-aware sampling failed: {e}")
            return list(samples)

    def get_oversample_report(
        self,
        samples: List[TrainingSample],
        weights: Dict[Tuple[str, str], float],
        gmv_field: str = "total_gmv",
        score_field: str = "avg_risk_score",
    ) -> Dict[str, Any]:
        """Generate report of potential oversampling impact."""
        cell_counts: Dict[Tuple[str, str], Dict[str, int]] = defaultdict(
            lambda: {"original": 0, "projected": 0, "weight": 1.0}
        )

        for sample in samples:
            gmv = float(sample.features.get(gmv_field, 0))
            score = float(sample.features.get(score_field, 0.5))
            gmv_bin = self.get_gmv_bin(gmv)
            score_bin = self.get_score_bin(score)
            cell_key = (score_bin, gmv_bin)
            weight = weights.get(cell_key, 1.0)

            cell_counts[cell_key]["original"] += 1
            cell_counts[cell_key]["projected"] += int(weight)
            cell_counts[cell_key]["weight"] = weight

        blindspot_cells = [k for k, v in cell_counts.items() if v["weight"] > 1.0]

        return {
            "total_samples": len(samples),
            "blindspot_cells": len(blindspot_cells),
            "total_oversample_factor": (
                sum(v["projected"] for v in cell_counts.values()) / len(samples)
                if samples
                else 1.0
            ),
            "cells": dict(cell_counts),
        }
