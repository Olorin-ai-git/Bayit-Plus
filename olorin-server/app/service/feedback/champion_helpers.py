"""
Helper Utilities for Champion/Challenger Framework.

Extracted utilities for model management and metrics.

Week 11 Phase 4 implementation.
"""

from typing import Dict, Any, List
from datetime import datetime
from enum import Enum
import numpy as np


class ModelRole(Enum):
    """Role of a model in the framework."""
    CHAMPION = "champion"
    CHALLENGER = "challenger"
    RETIRED = "retired"


class PromotionDecision(Enum):
    """Decision for promoting challenger."""
    PROMOTE = "promote"
    KEEP_CHAMPION = "keep_champion"
    INSUFFICIENT_DATA = "insufficient_data"


def calculate_average_metric(metrics: Dict[str, List[float]], metric_name: str) -> float:
    """Calculate average value for a metric."""
    if metric_name not in metrics or not metrics[metric_name]:
        raise ValueError(f"Metric {metric_name} not available")
    return float(np.mean(metrics[metric_name]))


def format_model_info(model: Dict[str, Any]) -> Dict[str, Any]:
    """Format model info for output."""
    return {
        "model_id": model["model_id"],
        "model_version": model["model_version"],
        "role": model["role"],
        "deployed_at": model["deployed_at"],
        "prediction_count": model["prediction_count"]
    }


def retire_model(model: Dict[str, Any], deployment_history: List[Dict[str, Any]]) -> None:
    """Retire a model and record in history."""
    model["role"] = ModelRole.RETIRED.value
    model["retired_at"] = datetime.utcnow().isoformat()

    deployment_history.append({
        "action": "retire_model",
        "model_id": model["model_id"],
        "model_version": model["model_version"],
        "timestamp": datetime.utcnow().isoformat()
    })


def create_champion_model(
    model_id: str,
    model_version: str,
    model_artifact_path: str,
    baseline_metrics: Dict[str, float]
) -> Dict[str, Any]:
    """Create champion model data structure."""
    return {
        "model_id": model_id,
        "model_version": model_version,
        "artifact_path": model_artifact_path,
        "role": ModelRole.CHAMPION.value,
        "baseline_metrics": baseline_metrics,
        "deployed_at": datetime.utcnow().isoformat(),
        "prediction_count": 0,
        "performance_metrics": {}
    }


def create_challenger_model(
    model_id: str,
    model_version: str,
    model_artifact_path: str
) -> Dict[str, Any]:
    """Create challenger model data structure."""
    return {
        "model_id": model_id,
        "model_version": model_version,
        "artifact_path": model_artifact_path,
        "role": ModelRole.CHALLENGER.value,
        "deployed_at": datetime.utcnow().isoformat(),
        "prediction_count": 0,
        "performance_metrics": {}
    }


def record_deployment(
    deployment_history: List[Dict[str, Any]],
    action: str,
    model_id: str,
    model_version: str,
    extra_data: Dict[str, Any] = None
) -> None:
    """Record deployment action in history."""
    record = {
        "action": action,
        "model_id": model_id,
        "model_version": model_version,
        "timestamp": datetime.utcnow().isoformat()
    }
    if extra_data:
        record.update(extra_data)
    deployment_history.append(record)


def evaluate_models_for_promotion(
    champion: Optional[Dict[str, Any]],
    challenger: Optional[Dict[str, Any]],
    min_challenger_samples: int,
    evaluation_metric: str,
    promotion_threshold: float
) -> Dict[str, Any]:
    """Evaluate whether to promote challenger to champion."""
    if not champion:
        return {
            "decision": PromotionDecision.INSUFFICIENT_DATA.value,
            "message": "No champion model deployed"
        }

    if not challenger:
        return {
            "decision": PromotionDecision.INSUFFICIENT_DATA.value,
            "message": "No challenger model deployed"
        }

    if challenger["prediction_count"] < min_challenger_samples:
        return {
            "decision": PromotionDecision.INSUFFICIENT_DATA.value,
            "message": f"Challenger has {challenger['prediction_count']} predictions, "
                       f"need {min_challenger_samples}"
        }

    champion_metric = calculate_average_metric(
        champion["performance_metrics"],
        evaluation_metric
    )

    challenger_metric = calculate_average_metric(
        challenger["performance_metrics"],
        evaluation_metric
    )

    improvement = challenger_metric - champion_metric

    if improvement > promotion_threshold:
        return {
            "decision": PromotionDecision.PROMOTE.value,
            "message": f"Challenger outperforms champion by {improvement:.3f}",
            "champion_metric": champion_metric,
            "challenger_metric": challenger_metric,
            "improvement": improvement
        }
    else:
        return {
            "decision": PromotionDecision.KEEP_CHAMPION.value,
            "message": f"Champion still performs better (improvement: {improvement:.3f})",
            "champion_metric": champion_metric,
            "challenger_metric": challenger_metric,
            "improvement": improvement
        }
