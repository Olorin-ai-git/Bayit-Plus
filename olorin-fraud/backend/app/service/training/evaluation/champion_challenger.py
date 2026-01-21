"""
Champion-Challenger Framework
Feature: 026-llm-training-pipeline

Manages model comparison and promotion through shadow mode evaluation.
"""

import os
from datetime import datetime
from typing import List, Optional

from app.service.logging import get_bridge_logger
from app.service.training.evaluation.evaluation_models import ChallengerResult
from app.service.training.evaluation.pr_metrics import PRMetricsCalculator
from app.service.training.training_config_loader import get_training_config

logger = get_bridge_logger(__name__)


class ChampionChallenger:
    """Manages champion-challenger model comparison."""

    def __init__(self):
        """Initialize champion-challenger from config."""
        self._config = get_training_config()
        self._pr_calculator = PRMetricsCalculator()
        self._init_from_config()
        self._comparison_history: List[ChallengerResult] = []

    def _init_from_config(self) -> None:
        """Initialize settings from configuration."""
        self._enabled = os.getenv("LLM_CHAMPION_CHALLENGER", "true").lower() == "true"
        self._shadow_mode = os.getenv("LLM_SHADOW_MODE", "true").lower() == "true"
        self._min_samples = int(os.getenv("LLM_MIN_COMPARISON_SAMPLES", "1000"))
        self._promotion_threshold = float(os.getenv("LLM_PROMOTION_THRESHOLD", "0.02"))
        self._primary_metric = os.getenv("LLM_PRIMARY_METRIC", "pr_auc")

    def is_enabled(self) -> bool:
        """Check if champion-challenger is enabled."""
        return self._enabled

    def compare(
        self,
        champion_scores: List[float],
        challenger_scores: List[float],
        labels: List[bool],
        champion_id: str,
        challenger_id: str,
    ) -> ChallengerResult:
        """
        Compare champion and challenger model performance.

        Args:
            champion_scores: Scores from champion model
            challenger_scores: Scores from challenger model
            labels: True fraud labels
            champion_id: Champion model identifier
            challenger_id: Challenger model identifier

        Returns:
            ChallengerResult with comparison details
        """
        champion_pr = self._pr_calculator.calculate_pr_curve(champion_scores, labels)
        challenger_pr = self._pr_calculator.calculate_pr_curve(challenger_scores, labels)

        champion_f1 = self._calculate_f1(champion_scores, labels)
        challenger_f1 = self._calculate_f1(challenger_scores, labels)

        if self._primary_metric == "pr_auc":
            improvement = challenger_pr.pr_auc - champion_pr.pr_auc
        else:
            improvement = challenger_f1 - champion_f1

        is_promoted = improvement >= self._promotion_threshold
        promotion_reason = None

        if is_promoted:
            promotion_reason = (
                f"Challenger improved {self._primary_metric} by {improvement:.4f} "
                f"(threshold: {self._promotion_threshold})"
            )
            logger.info(f"Challenger {challenger_id} promoted: {promotion_reason}")
        else:
            logger.info(
                f"Challenger {challenger_id} not promoted: "
                f"improvement {improvement:.4f} < threshold {self._promotion_threshold}"
            )

        result = ChallengerResult(
            challenger_id=challenger_id,
            champion_id=champion_id,
            comparison_date=datetime.utcnow(),
            challenger_pr_auc=challenger_pr.pr_auc,
            champion_pr_auc=champion_pr.pr_auc,
            challenger_f1=challenger_f1,
            champion_f1=champion_f1,
            sample_count=len(labels),
            improvement=improvement,
            is_promoted=is_promoted,
            promotion_reason=promotion_reason,
            shadow_mode=self._shadow_mode,
        )

        self._comparison_history.append(result)
        return result

    def _calculate_f1(self, scores: List[float], labels: List[bool]) -> float:
        """Calculate F1 score at default threshold."""
        import numpy as np

        scores_arr = np.array(scores)
        labels_arr = np.array([1 if l else 0 for l in labels])
        predictions = (scores_arr >= 0.5).astype(int)

        tp = np.sum((predictions == 1) & (labels_arr == 1))
        fp = np.sum((predictions == 1) & (labels_arr == 0))
        fn = np.sum((predictions == 0) & (labels_arr == 1))

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

        return float(f1)

    def should_compare(self, sample_count: int) -> bool:
        """Check if sample count is sufficient for comparison."""
        return sample_count >= self._min_samples

    def get_comparison_history(
        self,
        challenger_id: Optional[str] = None,
        limit: int = 10,
    ) -> List[ChallengerResult]:
        """Get comparison history."""
        history = self._comparison_history
        if challenger_id:
            history = [r for r in history if r.challenger_id == challenger_id]
        return history[-limit:]

    def get_promotion_summary(self) -> dict:
        """Get summary of promotions."""
        total = len(self._comparison_history)
        promoted = sum(1 for r in self._comparison_history if r.is_promoted)

        return {
            "total_comparisons": total,
            "promotions": promoted,
            "promotion_rate": promoted / total if total > 0 else 0.0,
            "enabled": self._enabled,
            "shadow_mode": self._shadow_mode,
            "promotion_threshold": self._promotion_threshold,
        }


_champion_challenger: Optional[ChampionChallenger] = None


def get_champion_challenger() -> ChampionChallenger:
    """Get cached champion-challenger instance."""
    global _champion_challenger
    if _champion_challenger is None:
        _champion_challenger = ChampionChallenger()
    return _champion_challenger
