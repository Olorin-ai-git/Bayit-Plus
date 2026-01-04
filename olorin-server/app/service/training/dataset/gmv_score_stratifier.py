"""
GMV and Score Stratified Sampler.

Stratifies training samples across GMV × Score grid to ensure
coverage of blindspot zones (low-score, low-GMV).

Feature: blindspot-aware-training
"""

import os
import random
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

from app.service.logging import get_bridge_logger
from app.service.training.dataset.dataset_models import BlindspotSamplingConfig
from app.service.training.training_models import TrainingSample

logger = get_bridge_logger(__name__)


class GMVScoreStratifier:
    """Stratify training samples by GMV and score bins."""

    def __init__(self, config: Optional[BlindspotSamplingConfig] = None):
        """Initialize with configuration."""
        self._config = config or self._load_config()

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

    def get_gmv_bin_labels(self) -> List[str]:
        """Get all GMV bin labels."""
        bins = self._config.gmv_bins
        labels = [f"{bins[i]}-{bins[i + 1]}" for i in range(len(bins) - 1)]
        labels.append(f"{bins[-1]}+")
        return labels

    def get_score_bin_labels(self) -> List[str]:
        """Get all score bin labels."""
        num_bins = self._config.score_bins
        bin_size = 1.0 / num_bins
        labels = []
        for i in range(num_bins):
            bin_start = round(i * bin_size, 2)
            bin_end = round(min((i + 1) * bin_size, 1.0), 2)
            labels.append(f"{bin_start:.2f}-{bin_end:.2f}")
        return labels

    def stratify(
        self,
        samples: List[TrainingSample],
        target_count: int,
        gmv_field: str = "total_gmv",
        score_field: str = "avg_risk_score",
        random_seed: Optional[int] = None,
    ) -> List[TrainingSample]:
        """
        Stratify samples across GMV × Score grid.

        Args:
            samples: List of training samples
            target_count: Target number of samples to return
            gmv_field: Feature field containing GMV value
            score_field: Feature field containing score value (optional)
            random_seed: Random seed for reproducibility

        Returns:
            Stratified sample list with GMV coverage guarantee
        """
        if random_seed is not None:
            random.seed(random_seed)

        if not samples:
            return []

        # Check if score field is available in features
        has_scores = any(score_field in s.features for s in samples)

        if has_scores:
            return self._stratify_by_gmv_and_score(
                samples, target_count, gmv_field, score_field
            )
        else:
            return self._stratify_by_gmv_only(samples, target_count, gmv_field)

    def _stratify_by_gmv_only(
        self,
        samples: List[TrainingSample],
        target_count: int,
        gmv_field: str,
    ) -> List[TrainingSample]:
        """Stratify by GMV bins only (when scores not available)."""
        by_gmv: Dict[str, List[TrainingSample]] = defaultdict(list)

        for sample in samples:
            gmv = float(sample.features.get(gmv_field, 0))
            gmv_bin = self.get_gmv_bin(gmv)
            by_gmv[gmv_bin].append(sample)

        gmv_bins = self.get_gmv_bin_labels()
        min_per_bin = max(
            1, self._config.min_samples_per_cell // self._config.score_bins
        )

        result = []
        selected_ids = set()

        # Phase 1: Minimum from each bin
        for gmv_bin in gmv_bins:
            bin_samples = by_gmv.get(gmv_bin, [])
            take_count = min(len(bin_samples), min_per_bin)
            for sample in bin_samples[:take_count]:
                if id(sample) not in selected_ids:
                    result.append(sample)
                    selected_ids.add(id(sample))

        # Phase 2: Fill remaining
        remaining = target_count - len(result)
        if remaining > 0:
            all_remaining = [s for s in samples if id(s) not in selected_ids]
            random.shuffle(all_remaining)
            result.extend(all_remaining[:remaining])

        logger.info(
            f"GMV-only stratification: {len(result)} samples from {len(samples)} input"
        )
        return result

    def _stratify_by_gmv_and_score(
        self,
        samples: List[TrainingSample],
        target_count: int,
        gmv_field: str,
        score_field: str,
    ) -> List[TrainingSample]:
        """Stratify by GMV × Score grid."""
        by_cell: Dict[Tuple[str, str], List[TrainingSample]] = defaultdict(list)

        for sample in samples:
            gmv = float(sample.features.get(gmv_field, 0))
            score = float(sample.features.get(score_field, 0.5))
            gmv_bin = self.get_gmv_bin(gmv)
            score_bin = self.get_score_bin(score)
            by_cell[(gmv_bin, score_bin)].append(sample)

        min_per_cell = self._config.min_samples_per_cell
        result = []
        selected_ids = set()

        # Phase 1: Minimum from each cell
        for gmv_bin in self.get_gmv_bin_labels():
            for score_bin in self.get_score_bin_labels():
                cell_samples = by_cell.get((gmv_bin, score_bin), [])
                take_count = min(len(cell_samples), min_per_cell)
                random.shuffle(cell_samples)
                for sample in cell_samples[:take_count]:
                    if id(sample) not in selected_ids:
                        result.append(sample)
                        selected_ids.add(id(sample))

        # Phase 2: Fill remaining randomly
        remaining = target_count - len(result)
        if remaining > 0:
            all_remaining = [s for s in samples if id(s) not in selected_ids]
            random.shuffle(all_remaining)
            result.extend(all_remaining[:remaining])

        logger.info(
            f"GMV×Score stratification: {len(result)} samples from {len(samples)} input"
        )
        return result

    def get_distribution_report(
        self,
        samples: List[TrainingSample],
        gmv_field: str = "total_gmv",
    ) -> Dict[str, Any]:
        """Generate distribution report by GMV bin."""
        by_gmv: Dict[str, Dict[str, int]] = defaultdict(
            lambda: {"fraud": 0, "legit": 0}
        )

        for sample in samples:
            gmv = float(sample.features.get(gmv_field, 0))
            gmv_bin = self.get_gmv_bin(gmv)
            key = "fraud" if sample.is_fraud else "legit"
            by_gmv[gmv_bin][key] += 1

        total = len(samples)
        report = {
            "total_samples": total,
            "bins": {},
            "coverage_gaps": [],
        }

        for gmv_bin in self.get_gmv_bin_labels():
            counts = by_gmv.get(gmv_bin, {"fraud": 0, "legit": 0})
            bin_total = counts["fraud"] + counts["legit"]
            pct = (bin_total / total * 100) if total > 0 else 0
            report["bins"][gmv_bin] = {
                "fraud": counts["fraud"],
                "legit": counts["legit"],
                "total": bin_total,
                "percentage": round(pct, 2),
            }
            if bin_total == 0:
                report["coverage_gaps"].append(gmv_bin)

        return report
