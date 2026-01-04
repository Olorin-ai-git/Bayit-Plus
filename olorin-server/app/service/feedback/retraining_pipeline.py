"""
Retraining Pipeline for Fraud Detection Models.

Automates model retraining based on feedback and performance degradation.

Week 11 Phase 4 implementation.
"""

import logging
import os
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from app.service.feedback.retraining_helpers import (
    RetrainingStatus,
    RetrainingTrigger,
    create_retraining_job,
    update_job_completed,
    update_job_failed,
    update_job_started,
)

logger = logging.getLogger(__name__)


class RetrainingPipeline:
    """
    Manages automated model retraining pipeline.

    Orchestrates data preparation, training, validation, and deployment.
    """

    def __init__(self):
        """Initialize retraining pipeline."""
        retrain_interval_hours_env = os.getenv("RETRAIN_INTERVAL_HOURS")
        if not retrain_interval_hours_env:
            raise RuntimeError(
                "RETRAIN_INTERVAL_HOURS environment variable is required"
            )
        self.retrain_interval_hours = int(retrain_interval_hours_env)

        min_training_samples_env = os.getenv("RETRAIN_MIN_TRAINING_SAMPLES")
        if not min_training_samples_env:
            raise RuntimeError(
                "RETRAIN_MIN_TRAINING_SAMPLES environment variable is required"
            )
        self.min_training_samples = int(min_training_samples_env)

        validation_split_env = os.getenv("RETRAIN_VALIDATION_SPLIT")
        if not validation_split_env:
            raise RuntimeError(
                "RETRAIN_VALIDATION_SPLIT environment variable is required"
            )
        self.validation_split = float(validation_split_env)

        min_validation_f1_env = os.getenv("RETRAIN_MIN_VALIDATION_F1")
        if not min_validation_f1_env:
            raise RuntimeError(
                "RETRAIN_MIN_VALIDATION_F1 environment variable is required"
            )
        self.min_validation_f1 = float(min_validation_f1_env)

        self.current_status = RetrainingStatus.IDLE
        self.last_retrain_time: Optional[datetime] = None
        self.retrain_history: List[Dict[str, Any]] = []
        self.training_callbacks: List[Callable[[Dict[str, Any]], None]] = []

        logger.info(
            f"🔄 RetrainingPipeline initialized (interval={self.retrain_interval_hours}h, "
            f"min_samples={self.min_training_samples})"
        )

    def trigger_retraining(
        self,
        trigger_reason: RetrainingTrigger,
        training_data: List[Dict[str, Any]],
        model_id: str,
        model_version: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Trigger a retraining job."""
        if self.current_status == RetrainingStatus.IN_PROGRESS:
            return {
                "success": False,
                "status": "already_in_progress",
                "message": "Retraining already in progress",
            }

        if len(training_data) < self.min_training_samples:
            return {
                "success": False,
                "status": "insufficient_data",
                "message": f"Need at least {self.min_training_samples} samples, have {len(training_data)}",
            }

        self.current_status = RetrainingStatus.QUEUED

        retrain_job = create_retraining_job(
            trigger_reason, model_id, model_version, len(training_data), metadata or {}
        )

        logger.info(
            f"🔄 Retraining triggered: {trigger_reason.value} for {model_id} v{model_version} "
            f"({len(training_data)} samples)"
        )

        return {"success": True, "job": retrain_job}

    def execute_retraining(
        self,
        job: Dict[str, Any],
        training_data: List[Dict[str, Any]],
        trainer_function: Callable[[List[Dict[str, Any]], float], Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Execute retraining process."""
        if self.current_status != RetrainingStatus.QUEUED:
            raise RuntimeError(
                f"Cannot execute retraining - status is {self.current_status.value}, expected queued"
            )

        self.current_status = RetrainingStatus.IN_PROGRESS
        update_job_started(job)

        logger.info(f"🔄 Starting retraining job {job['job_id']}")

        try:
            training_result = trainer_function(training_data, self.validation_split)

            if (
                training_result["validation_metrics"]["f1_score"]
                < self.min_validation_f1
            ):
                raise ValueError(
                    f"Validation F1 score ({training_result['validation_metrics']['f1_score']:.3f}) "
                    f"below minimum threshold ({self.min_validation_f1})"
                )

            update_job_completed(job, training_result)
            self.current_status = RetrainingStatus.COMPLETED
            self.last_retrain_time = datetime.utcnow()

            self.retrain_history.append(job)
            self._execute_callbacks(job)

            logger.info(
                f"✓ Retraining completed: {job['job_id']} - "
                f"F1={training_result['validation_metrics']['f1_score']:.3f}"
            )

            return {"success": True, "job": job}

        except Exception as e:
            update_job_failed(job, str(e))
            self.current_status = RetrainingStatus.FAILED
            self.retrain_history.append(job)

            logger.error(f"✗ Retraining failed: {job['job_id']} - {e}")

            return {"success": False, "job": job, "error": str(e)}

        finally:
            if self.current_status in [
                RetrainingStatus.COMPLETED,
                RetrainingStatus.FAILED,
            ]:
                self.current_status = RetrainingStatus.IDLE

    def register_callback(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        """Register callback to be called after retraining completion."""
        self.training_callbacks.append(callback)
        logger.info(f"🔄 Registered training callback: {callback.__name__}")

    def _execute_callbacks(self, job: Dict[str, Any]) -> None:
        """Execute all registered callbacks."""
        for callback in self.training_callbacks:
            try:
                callback(job)
            except Exception as e:
                logger.error(f"Training callback {callback.__name__} failed: {e}")

    def get_status(self) -> Dict[str, Any]:
        """Get current retraining pipeline status."""
        return {
            "current_status": self.current_status.value,
            "last_retrain_time": (
                self.last_retrain_time.isoformat() if self.last_retrain_time else None
            ),
            "total_retrains": len(self.retrain_history),
            "successful_retrains": len(
                [j for j in self.retrain_history if j["status"] == "completed"]
            ),
            "failed_retrains": len(
                [j for j in self.retrain_history if j["status"] == "failed"]
            ),
        }

    def get_retrain_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent retraining history."""
        return sorted(
            self.retrain_history, key=lambda j: j.get("queued_at", ""), reverse=True
        )[:limit]
