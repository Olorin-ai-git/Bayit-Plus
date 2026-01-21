"""
Replay Comparison Service

Compares replay detection results against production anomalies.
Identifies new-only, missing, and overlapping anomalies with score differences.
NO HARDCODED VALUES - All configuration from environment variables.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List

from app.models.anomaly import AnomalyEvent, DetectionRun, Detector
from app.persistence.database import get_db
from app.service.anomaly.detection_job import DetectionJob
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ReplayComparisonService:
    """Service for comparing replay detection results with production."""

    def compare_replay(
        self,
        detector_config: Detector,
        window_from: datetime,
        window_to: datetime,
        production_detector_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Run replay detection and compare against production anomalies.

        Args:
            detector_config: Detector configuration for replay
            window_from: Start of time window
            window_to: End of time window
            production_detector_id: ID of production detector to compare against

        Returns:
            Comparison results with new-only, missing, and overlapping anomalies
        """
        db = next(get_db())
        try:
            # Get production detector
            production_detector = (
                db.query(Detector).filter(Detector.id == production_detector_id).first()
            )
            if not production_detector:
                raise ValueError(
                    f"Production detector {production_detector_id} not found"
                )

            # Run replay detection
            # Note: detector_config is a temporary Detector object without an id
            # We need to set the detector_id to production_detector_id for the replay run
            # since we're comparing against it anyway
            detection_job = DetectionJob()

            # Temporarily set detector_id on detector_config so DetectionRun can be created
            # This is safe because we're only using it for the replay run creation
            original_id = detector_config.id if hasattr(detector_config, "id") else None
            detector_config.id = production_detector_id

            try:
                replay_run = detection_job.run_detection(
                    detector=detector_config,
                    window_from=window_from,
                    window_to=window_to,
                )
            finally:
                # Restore original id if it existed
                if original_id is not None:
                    detector_config.id = original_id
                elif hasattr(detector_config, "id"):
                    delattr(detector_config, "id")

            # Get replay anomalies
            replay_anomalies = (
                db.query(AnomalyEvent)
                .filter(AnomalyEvent.run_id == replay_run.id)
                .all()
            )

            # Get production anomalies for the same window
            production_anomalies = (
                db.query(AnomalyEvent)
                .filter(
                    AnomalyEvent.detector_id == production_detector_id,
                    AnomalyEvent.window_start >= window_from,
                    AnomalyEvent.window_end <= window_to,
                )
                .all()
            )

            # Compare anomalies
            comparison = self._compare_anomalies(replay_anomalies, production_anomalies)

            # Cleanup replay run (optional - could keep for audit)
            # db.query(AnomalyEvent).filter(AnomalyEvent.run_id == replay_run.id).delete()
            # db.delete(replay_run)
            # db.commit()

            return {"run_id": str(replay_run.id), "comparison": comparison}
        finally:
            db.close()

    def _compare_anomalies(
        self,
        replay_anomalies: List[AnomalyEvent],
        production_anomalies: List[AnomalyEvent],
    ) -> Dict[str, Any]:
        """
        Compare replay and production anomalies.

        Returns:
            Dictionary with new-only, missing, overlapping anomalies and score differences
        """
        # Create lookup maps by window_start, metric, and cohort
        replay_map = {}
        for anomaly in replay_anomalies:
            key = self._anomaly_key(anomaly)
            replay_map[key] = anomaly

        production_map = {}
        for anomaly in production_anomalies:
            key = self._anomaly_key(anomaly)
            production_map[key] = anomaly

        # Find new-only (in replay, not in production)
        new_only = [
            anomaly.to_dict()
            for key, anomaly in replay_map.items()
            if key not in production_map
        ]

        # Find missing (in production, not in replay)
        missing = [
            anomaly.to_dict()
            for key, anomaly in production_map.items()
            if key not in replay_map
        ]

        # Find overlap (in both) with score differences
        overlap = []
        score_differences = []
        for key in replay_map.keys() & production_map.keys():
            replay_anomaly = replay_map[key]
            production_anomaly = production_map[key]

            overlap.append(replay_anomaly.to_dict())

            score_diff = replay_anomaly.score - production_anomaly.score
            score_differences.append(
                {
                    "anomaly_id": str(production_anomaly.id),
                    "replay_score": replay_anomaly.score,
                    "production_score": production_anomaly.score,
                    "diff": score_diff,
                }
            )

        return {
            "replay_anomalies": [a.to_dict() for a in replay_anomalies],
            "production_anomalies": [a.to_dict() for a in production_anomalies],
            "new_anomalies": new_only,
            "missed_anomalies": missing,
            "score_differences": score_differences,
        }

    def _anomaly_key(self, anomaly: AnomalyEvent) -> str:
        """Create a unique key for an anomaly based on window, metric, and cohort."""
        cohort_str = ",".join(f"{k}:{v}" for k, v in sorted(anomaly.cohort.items()))
        return f"{anomaly.window_start.isoformat()}|{anomaly.metric}|{cohort_str}"
