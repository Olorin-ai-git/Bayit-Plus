"""
Detection Run Logging

This module provides structured logging functions for detection runs.
"""

import time
import uuid
from datetime import datetime
from typing import Any, Dict

from app.models.anomaly import DetectionRun, Detector
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def log_detection_run_start(
    run_id: uuid.UUID, detector: Detector, window_from: datetime, window_to: datetime
) -> None:
    """Log detection run start event."""
    logger.info(
        "Detection run started",
        extra={
            "event_type": "detection_run_start",
            "run_id": str(run_id),
            "detector_id": str(detector.id),
            "detector_name": detector.name,
            "detector_type": detector.type,
            "window_from": window_from.isoformat(),
            "window_to": window_to.isoformat(),
            "window_duration_hours": (window_to - window_from).total_seconds() / 3600,
            "cohort_by": detector.cohort_by,
            "metrics": detector.metrics,
        },
    )


def log_cohorts_retrieved(
    run_id: uuid.UUID, detector_id: uuid.UUID, cohort_count: int, duration_ms: int
) -> None:
    """Log cohorts retrieved event."""
    logger.info(
        "Cohorts retrieved for detection run",
        extra={
            "event_type": "detection_run_cohorts_retrieved",
            "run_id": str(run_id),
            "detector_id": str(detector_id),
            "cohort_count": cohort_count,
            "duration_ms": duration_ms,
        },
    )


def log_anomaly_detected(
    anomaly_id: uuid.UUID,
    run_id: uuid.UUID,
    detector_id: uuid.UUID,
    cohort: Dict[str, str],
    anomaly_data: Dict[str, Any],
) -> None:
    """Log anomaly detected and persisted event."""
    logger.info(
        "Anomaly detected and persisted",
        extra={
            "event_type": "anomaly_detected",
            "anomaly_id": str(anomaly_id),
            "run_id": str(run_id),
            "detector_id": str(detector_id),
            "cohort": cohort,
            "metric": anomaly_data.get("metric"),
            "score": float(anomaly_data.get("score", 0)),
            "severity": anomaly_data.get("severity"),
            "observed": float(anomaly_data.get("observed", 0)),
            "expected": float(anomaly_data.get("expected", 0)),
            "persisted_n": anomaly_data.get("persisted_n", 0),
            "window_start": (
                anomaly_data.get("window_start").isoformat()
                if anomaly_data.get("window_start")
                else None
            ),
            "window_end": (
                anomaly_data.get("window_end").isoformat()
                if anomaly_data.get("window_end")
                else None
            ),
        },
    )


def log_detection_progress(
    run_id: uuid.UUID,
    detector_id: uuid.UUID,
    cohorts_processed: int,
    total_cohorts: int,
    anomalies_detected: int,
) -> None:
    """Log detection run progress."""
    logger.info(
        "Detection run progress",
        extra={
            "event_type": "detection_run_progress",
            "run_id": str(run_id),
            "detector_id": str(detector_id),
            "cohorts_processed": cohorts_processed,
            "total_cohorts": total_cohorts,
            "anomalies_detected": anomalies_detected,
            "progress_percent": (
                int((cohorts_processed / total_cohorts) * 100) if total_cohorts else 0
            ),
        },
    )


def log_detection_completed(
    run_id: uuid.UUID,
    detector: Detector,
    cohorts_processed: int,
    anomalies_created: int,
    execution_time_ms: int,
    cohorts_skipped: int = 0,
) -> None:
    """Log detection run completion."""
    from app.config.anomaly_config import get_anomaly_config

    config = get_anomaly_config()
    min_support = detector.params.get("min_support", config.default_min_support)

    message = "Detection run completed successfully"
    if anomalies_created == 0 and cohorts_processed == 0:
        message = (
            f"Detection run completed with no anomalies found. "
            f"All cohorts were skipped due to insufficient data "
            f"(each cohort had < {min_support} windows required for detection). "
            f"Try using a longer time window or lower min_support threshold."
        )
    elif anomalies_created == 0 and cohorts_processed > 0:
        message = (
            f"Detection run completed with no anomalies found. "
            f"Processed {cohorts_processed} cohorts but no anomalies detected. "
            f"This may indicate normal behavior or that thresholds need adjustment."
        )

    logger.info(
        message,
        extra={
            "event_type": "detection_run_completed",
            "run_id": str(run_id),
            "detector_id": str(detector.id),
            "detector_name": detector.name,
            "cohorts_processed": cohorts_processed,
            "cohorts_skipped": cohorts_skipped,
            "anomalies_detected": anomalies_created,
            "execution_time_ms": execution_time_ms,
            "execution_time_seconds": execution_time_ms / 1000,
            "anomalies_per_cohort": (
                anomalies_created / cohorts_processed if cohorts_processed > 0 else 0
            ),
            "cohorts_per_second": (
                cohorts_processed / (execution_time_ms / 1000)
                if execution_time_ms > 0
                else 0
            ),
            "min_support_threshold": min_support,
        },
    )


def log_detection_failed(
    run_id: uuid.UUID,
    detector_id: uuid.UUID,
    error_type: str,
    error_message: str,
    execution_time_ms: int,
    cohorts_processed: int,
    anomalies_detected: int,
) -> None:
    """Log detection run failure."""
    logger.error(
        f"Detection run failed: {error_type}",
        extra={
            "event_type": "detection_run_failed",
            "run_id": str(run_id),
            "detector_id": str(detector_id),
            "error_type": error_type,
            "error_message": error_message,
            "execution_time_ms": execution_time_ms,
            "cohorts_processed": cohorts_processed,
            "anomalies_detected": anomalies_detected,
        },
        exc_info=True,
    )
