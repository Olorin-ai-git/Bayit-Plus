"""
Champion/Challenger Framework for Model Deployment.

Manages deployment and promotion of models based on performance.

Week 11 Phase 4 implementation.
"""

import logging
import os
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.service.feedback.champion_helpers import (
    ModelRole,
    PromotionDecision,
    format_model_info,
    retire_model,
    create_champion_model,
    create_challenger_model,
    record_deployment,
    evaluate_models_for_promotion
)


logger = logging.getLogger(__name__)


class ChampionChallengerFramework:
    """
    Manages champion/challenger model deployment.

    Automatically promotes challenger to champion based on performance.
    """

    def __init__(self):
        """Initialize champion/challenger framework."""
        min_challenger_samples_env = os.getenv("CHAMPION_MIN_CHALLENGER_SAMPLES")
        if not min_challenger_samples_env:
            raise RuntimeError("CHAMPION_MIN_CHALLENGER_SAMPLES environment variable is required")
        self.min_challenger_samples = int(min_challenger_samples_env)

        promotion_threshold_env = os.getenv("CHAMPION_PROMOTION_THRESHOLD")
        if not promotion_threshold_env:
            raise RuntimeError("CHAMPION_PROMOTION_THRESHOLD environment variable is required")
        self.promotion_threshold = float(promotion_threshold_env)

        traffic_split_env = os.getenv("CHAMPION_TRAFFIC_SPLIT")
        if not traffic_split_env:
            raise RuntimeError("CHAMPION_TRAFFIC_SPLIT environment variable is required")
        self.traffic_split = float(traffic_split_env)

        evaluation_metric_env = os.getenv("CHAMPION_EVALUATION_METRIC")
        if not evaluation_metric_env:
            raise RuntimeError("CHAMPION_EVALUATION_METRIC environment variable is required")
        self.evaluation_metric = evaluation_metric_env

        self.champion: Optional[Dict[str, Any]] = None
        self.challenger: Optional[Dict[str, Any]] = None
        self.deployment_history: List[Dict[str, Any]] = []

        logger.info(
            f"🏆 ChampionChallengerFramework initialized "
            f"(traffic_split={self.traffic_split}, metric={self.evaluation_metric})"
        )

    def deploy_champion(
        self,
        model_id: str,
        model_version: str,
        model_artifact_path: str,
        baseline_metrics: Dict[str, float]
    ) -> Dict[str, Any]:
        """Deploy a new champion model."""
        if self.champion:
            logger.info(
                f"🏆 Retiring current champion: {self.champion['model_id']} "
                f"v{self.champion['model_version']}"
            )
            retire_model(self.champion, self.deployment_history)

        self.champion = create_champion_model(
            model_id, model_version, model_artifact_path, baseline_metrics
        )

        record_deployment(self.deployment_history, "deploy_champion", model_id, model_version)
        logger.info(f"🏆 Champion deployed: {model_id} v{model_version}")

        return self.champion

    def deploy_challenger(
        self,
        model_id: str,
        model_version: str,
        model_artifact_path: str
    ) -> Dict[str, Any]:
        """Deploy a new challenger model."""
        if not self.champion:
            raise RuntimeError("Cannot deploy challenger without an active champion")

        if self.challenger:
            logger.info(
                f"🥊 Retiring current challenger: {self.challenger['model_id']} "
                f"v{self.challenger['model_version']}"
            )
            retire_model(self.challenger, self.deployment_history)

        self.challenger = create_challenger_model(model_id, model_version, model_artifact_path)

        record_deployment(self.deployment_history, "deploy_challenger", model_id, model_version)
        logger.info(f"🥊 Challenger deployed: {model_id} v{model_version}")

        return self.challenger

    def record_prediction(
        self,
        model_role: ModelRole,
        performance_metrics: Dict[str, float]
    ) -> None:
        """Record a prediction and update model metrics."""
        target_model = self.champion if model_role == ModelRole.CHAMPION else self.challenger

        if not target_model:
            raise RuntimeError(f"No {model_role.value} model deployed")

        target_model["prediction_count"] += 1

        for metric_name, value in performance_metrics.items():
            if metric_name not in target_model["performance_metrics"]:
                target_model["performance_metrics"][metric_name] = []
            target_model["performance_metrics"][metric_name].append(value)

    def evaluate_promotion(self) -> Dict[str, Any]:
        """Evaluate whether to promote challenger to champion."""
        return evaluate_models_for_promotion(
            self.champion,
            self.challenger,
            self.min_challenger_samples,
            self.evaluation_metric,
            self.promotion_threshold
        )

    def promote_challenger(self) -> Dict[str, Any]:
        """Promote challenger to champion."""
        if not self.challenger:
            raise RuntimeError("No challenger model to promote")

        evaluation = self.evaluate_promotion()

        if evaluation["decision"] != PromotionDecision.PROMOTE.value:
            return {
                "success": False,
                "message": "Challenger does not meet promotion criteria",
                "evaluation": evaluation
            }

        logger.info(
            f"🏆 Promoting challenger {self.challenger['model_id']} "
            f"v{self.challenger['model_version']} to champion"
        )

        retire_model(self.champion, self.deployment_history)

        self.challenger["role"] = ModelRole.CHAMPION.value
        self.challenger["promoted_at"] = datetime.utcnow().isoformat()
        self.champion = self.challenger
        self.challenger = None

        record_deployment(
            self.deployment_history,
            "promote_challenger",
            self.champion["model_id"],
            self.champion["model_version"],
            {"evaluation": evaluation}
        )

        logger.info(f"✓ Promotion complete: {self.champion['model_id']} is new champion")

        return {
            "success": True,
            "new_champion": self.champion,
            "evaluation": evaluation
        }

    def get_deployment_status(self) -> Dict[str, Any]:
        """Get current deployment status."""
        return {
            "champion": format_model_info(self.champion) if self.champion else None,
            "challenger": format_model_info(self.challenger) if self.challenger else None,
            "traffic_split": {
                "champion": 1.0 - self.traffic_split if self.challenger else 1.0,
                "challenger": self.traffic_split if self.challenger else 0.0
            },
            "status_at": datetime.utcnow().isoformat()
        }
