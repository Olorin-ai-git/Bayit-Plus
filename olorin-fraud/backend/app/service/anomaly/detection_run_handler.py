"""
Detection Run Error Handling

This module provides error handling functions for detection runs.
"""

import time
import uuid
from datetime import datetime
from typing import Any, Dict

from app.models.anomaly import DetectionRun
from app.service.anomaly.detection_run_logger import log_detection_failed
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def handle_detection_error(
    detection_run: DetectionRun,
    error: Exception,
    run_start_time: float,
    cohorts_processed: int,
    anomalies_created: int,
) -> None:
    """
    Handle detection run error and update run status.

    Args:
        detection_run: DetectionRun instance to update
        error: Exception that occurred
        run_start_time: Start time of the run
        cohorts_processed: Number of cohorts processed
        anomalies_created: Number of anomalies created
    """
    run_end_time = time.time()
    execution_time_ms = int((run_end_time - run_start_time) * 1000)
    error_message = str(error)
    error_type = type(error).__name__

    detection_run.status = "failed"
    detection_run.finished_at = datetime.now()

    if isinstance(error, ConnectionError):
        detection_run.info = {
            "error_message": f"Snowflake connection failed: {error_message}",
            "error_type": "ConnectionError",
            "execution_time_ms": execution_time_ms,
            "cohorts_processed": cohorts_processed,
            "anomalies_detected": anomalies_created,
        }
        error_type = "ConnectionError"
    elif isinstance(error, ValueError):
        detection_run.info = {
            "error_message": f"Validation error: {error_message}",
            "error_type": "ValueError",
            "execution_time_ms": execution_time_ms,
            "cohorts_processed": cohorts_processed,
            "anomalies_detected": anomalies_created,
        }
        error_type = "ValueError"
    else:
        detection_run.info = {
            "error_message": error_message,
            "error_type": error_type,
            "execution_time_ms": execution_time_ms,
            "cohorts_processed": cohorts_processed,
            "anomalies_detected": anomalies_created,
        }

    log_detection_failed(
        run_id=detection_run.id,
        detector_id=detection_run.detector_id,
        error_type=error_type,
        error_message=error_message,
        execution_time_ms=execution_time_ms,
        cohorts_processed=cohorts_processed,
        anomalies_detected=anomalies_created,
    )
