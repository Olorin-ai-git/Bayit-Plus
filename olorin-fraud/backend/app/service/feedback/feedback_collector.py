"""
Feedback Collector for Fraud Detection Models.

Collects human feedback on predictions for continuous learning.

Week 11 Phase 4 implementation.
"""

import logging
import os
from collections import deque
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class FeedbackType(Enum):
    """Types of feedback."""

    TRUE_POSITIVE = "true_positive"  # Correct fraud detection
    FALSE_POSITIVE = "false_positive"  # Incorrectly flagged as fraud
    TRUE_NEGATIVE = "true_negative"  # Correctly identified as legitimate
    FALSE_NEGATIVE = "false_negative"  # Missed fraud
    UNCERTAIN = "uncertain"  # Reviewer unsure


class FeedbackCollector:
    """
    Collects and manages human feedback on model predictions.

    Tracks feedback for continuous model improvement.
    """

    def __init__(self):
        """Initialize feedback collector."""
        window_size_env = os.getenv("FEEDBACK_WINDOW_SIZE")
        if not window_size_env:
            raise RuntimeError("FEEDBACK_WINDOW_SIZE environment variable is required")
        self.window_size = int(window_size_env)

        min_feedback_for_retrain_env = os.getenv("FEEDBACK_MIN_FOR_RETRAIN")
        if not min_feedback_for_retrain_env:
            raise RuntimeError(
                "FEEDBACK_MIN_FOR_RETRAIN environment variable is required"
            )
        self.min_feedback_for_retrain = int(min_feedback_for_retrain_env)

        fp_threshold_env = os.getenv("FEEDBACK_FP_THRESHOLD")
        if not fp_threshold_env:
            raise RuntimeError("FEEDBACK_FP_THRESHOLD environment variable is required")
        self.fp_threshold = float(fp_threshold_env)

        fn_threshold_env = os.getenv("FEEDBACK_FN_THRESHOLD")
        if not fn_threshold_env:
            raise RuntimeError("FEEDBACK_FN_THRESHOLD environment variable is required")
        self.fn_threshold = float(fn_threshold_env)

        self.feedback_items: deque = deque(maxlen=self.window_size)
        self.feedback_by_type: Dict[str, int] = {
            "true_positive": 0,
            "false_positive": 0,
            "true_negative": 0,
            "false_negative": 0,
            "uncertain": 0,
        }
        logger.info(
            f"📝 FeedbackCollector initialized (window={self.window_size}, "
            f"min_for_retrain={self.min_feedback_for_retrain})"
        )

    def record_feedback(
        self,
        prediction_id: str,
        predicted_score: float,
        predicted_label: bool,
        actual_label: bool,
        feedback_type: FeedbackType,
        reviewer_id: str,
        features: Optional[Dict[str, Any]] = None,
        notes: Optional[str] = None,
    ) -> None:
        """Record human feedback on a prediction."""
        feedback_item = {
            "prediction_id": prediction_id,
            "predicted_score": predicted_score,
            "predicted_label": predicted_label,
            "actual_label": actual_label,
            "feedback_type": feedback_type.value,
            "reviewer_id": reviewer_id,
            "features": features or {},
            "notes": notes,
            "timestamp": datetime.utcnow().isoformat(),
        }

        self.feedback_items.append(feedback_item)
        self.feedback_by_type[feedback_type.value] += 1

        logger.info(
            f"📝 Feedback recorded: {feedback_type.value} for prediction {prediction_id} "
            f"(score={predicted_score:.3f}, actual={'fraud' if actual_label else 'legitimate'})"
        )

    def get_feedback_summary(self) -> Dict[str, Any]:
        """Get summary of collected feedback."""
        total = len(self.feedback_items)
        if total == 0:
            return {
                "total_feedback": 0,
                "ready_for_retrain": False,
                "message": "No feedback collected yet",
            }

        tp = self.feedback_by_type["true_positive"]
        fp = self.feedback_by_type["false_positive"]
        tn = self.feedback_by_type["true_negative"]
        fn = self.feedback_by_type["false_negative"]

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        accuracy = (tp + tn) / total if total > 0 else 0.0

        fp_rate = fp / total if total > 0 else 0.0
        fn_rate = fn / total if total > 0 else 0.0

        return {
            "total_feedback": total,
            "by_type": dict(self.feedback_by_type),
            "metrics": {
                "precision": precision,
                "recall": recall,
                "accuracy": accuracy,
                "false_positive_rate": fp_rate,
                "false_negative_rate": fn_rate,
            },
            "ready_for_retrain": self._check_retrain_trigger(total, fp_rate, fn_rate),
            "collected_at": datetime.utcnow().isoformat(),
        }

    def _check_retrain_trigger(
        self, total: int, fp_rate: float, fn_rate: float
    ) -> bool:
        """Check if retraining should be triggered."""
        if total < self.min_feedback_for_retrain:
            return False

        if fp_rate > self.fp_threshold:
            logger.warning(
                f"⚠️  False positive rate ({fp_rate:.2%}) exceeds threshold ({self.fp_threshold:.2%})"
            )
            return True

        if fn_rate > self.fn_threshold:
            logger.warning(
                f"⚠️  False negative rate ({fn_rate:.2%}) exceeds threshold ({self.fn_threshold:.2%})"
            )
            return True

        return False

    def get_feedback_for_retraining(self) -> List[Dict[str, Any]]:
        """Get feedback items for model retraining."""
        return list(self.feedback_items)

    def get_misclassifications(self) -> Dict[str, List[Dict[str, Any]]]:
        """Get false positives and false negatives for analysis."""
        false_positives = [
            item
            for item in self.feedback_items
            if item["feedback_type"] == "false_positive"
        ]

        false_negatives = [
            item
            for item in self.feedback_items
            if item["feedback_type"] == "false_negative"
        ]

        return {
            "false_positives": false_positives,
            "false_negatives": false_negatives,
            "fp_count": len(false_positives),
            "fn_count": len(false_negatives),
        }

    def clear_feedback(self) -> int:
        """Clear all feedback data and return count cleared."""
        cleared_count = len(self.feedback_items)
        self.feedback_items.clear()
        for key in self.feedback_by_type:
            self.feedback_by_type[key] = 0
        logger.info(f"📝 Cleared {cleared_count} feedback items")
        return cleared_count
