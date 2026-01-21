"""
Detection Job Orchestrator

This module orchestrates anomaly detection runs, coordinating detectors,
data access, scoring, guardrails, and persistence.
"""

import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from app.config.anomaly_config import get_anomaly_config
from app.models.anomaly import AnomalyEvent, DetectionRun, Detector
from app.persistence.database import get_db
from app.service.anomaly.cohort_detector import detect_cohort_anomalies
from app.service.anomaly.cohort_fetcher import get_cohorts
from app.service.anomaly.cohort_processor import process_cohorts
from app.service.anomaly.detection_run_handler import handle_detection_error
from app.service.anomaly.detection_run_logger import (
    log_cohorts_retrieved,
    log_detection_completed,
    log_detection_run_start,
)
from app.service.anomaly.detector_factory import DetectorFactory
from app.service.anomaly.guardrails import Guardrails
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DetectionJob:
    """
    Orchestrates anomaly detection runs.

    Coordinates detector execution, data fetching, scoring, guardrails,
    and anomaly persistence.
    """

    def __init__(self):
        """Initialize detection job orchestrator."""
        self.guardrails = Guardrails()
        self.config = get_anomaly_config()

    def run_detection(
        self,
        detector: Detector,
        window_from: datetime,
        window_to: datetime,
        run_id: Optional[uuid.UUID] = None,
    ) -> DetectionRun:
        """
        Execute detection run for a detector on a time window.

        Args:
            detector: Detector configuration
            window_from: Start of time window
            window_to: End of time window
            run_id: Optional run ID (creates new if not provided)

        Returns:
            DetectionRun with status and results

        Raises:
            ValueError: If detector is invalid or data fetch fails
            ConnectionError: If Snowflake connection fails
        """
        if run_id is None:
            run_id = uuid.uuid4()

        db = next(get_db())
        run_start_time = time.time()
        try:
            # Create detection run record
            detection_run = DetectionRun(
                id=run_id,
                detector_id=detector.id,
                status="running",
                window_from=window_from,
                window_to=window_to,
                started_at=datetime.now(),
            )
            db.add(detection_run)
            db.commit()

            # Structured logging for detection run start
            log_detection_run_start(run_id, detector, window_from, window_to)

            anomalies_created = 0
            cohorts_processed = 0
            error_message = None
            cohort_start_time = time.time()

            try:
                # Get all unique cohorts for this detector's cohort_by dimensions
                cohorts = get_cohorts(detector, window_from, window_to)
                log_cohorts_retrieved(
                    run_id,
                    detector.id,
                    len(cohorts),
                    int((time.time() - cohort_start_time) * 1000),
                )

                # Create detector instance
                detector_instance = DetectorFactory.create(
                    detector.type, detector.params
                )

                # Process all cohorts
                # Note: We don't pass a provider because PostgreSQL connection pools are tied to specific event loops
                # Each cohort detection creates its own event loop in a thread, so each will create its own provider
                # Analytics queries ALWAYS use PostgreSQL because transaction_windows is an Olorin-managed table in PostgreSQL
                logger.info(
                    "Processing cohorts with PostgreSQL (analytics always uses PostgreSQL)"
                )

                cohorts_processed, anomalies_created = process_cohorts(
                    detector_instance,
                    detector,
                    cohorts,
                    window_from,
                    window_to,
                    self.guardrails,
                    run_id,
                    db,
                    provider=None,  # Each thread creates its own provider in its event loop
                )

                # Update run status
                run_end_time = time.time()
                execution_time_ms = int((run_end_time - run_start_time) * 1000)
                detection_run.status = "success"
                detection_run.finished_at = datetime.now()
                detection_run.info = {
                    "cohorts_processed": cohorts_processed,
                    "anomalies_detected": anomalies_created,
                    "execution_time_ms": execution_time_ms,
                }
                db.commit()

                # Structured logging for detection run completion
                log_detection_completed(
                    run_id,
                    detector,
                    cohorts_processed,
                    anomalies_created,
                    execution_time_ms,
                )

            except Exception as e:
                handle_detection_error(
                    detection_run,
                    e,
                    run_start_time,
                    cohorts_processed,
                    anomalies_created,
                )
                db.commit()

            # Expunge the object so it can be used outside this session
            # The ID is already set (run_id was used to create the object)
            # so it should be accessible even after expunge
            db.expunge(detection_run)

            # Ensure ID is accessible by setting it explicitly in __dict__
            # This prevents SQLAlchemy from trying to lazy-load it
            detection_run.__dict__["id"] = run_id

            return detection_run

        finally:
            db.close()


def run_detection(
    detector_id: uuid.UUID, window_from: datetime, window_to: datetime
) -> DetectionRun:
    """
    Run anomaly detection for a detector.

    Args:
        detector_id: Detector UUID
        window_from: Start of time window
        window_to: End of time window

    Returns:
        DetectionRun instance

    Raises:
        ValueError: If detector not found or invalid
    """
    db = next(get_db())
    try:
        detector = db.query(Detector).filter(Detector.id == detector_id).first()
        if not detector:
            raise ValueError(f"Detector {detector_id} not found")
        if not detector.enabled:
            raise ValueError(f"Detector {detector_id} is disabled")

        job = DetectionJob()
        return job.run_detection(detector, window_from, window_to)

    finally:
        db.close()
