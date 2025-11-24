"""
Cohort Processor

This module provides functionality for processing cohorts in a detection run.
"""

import uuid
import asyncio
import concurrent.futures
from typing import Dict, Any, List
from datetime import datetime

from app.service.logging import get_bridge_logger
from app.service.anomaly.detector_factory import DetectorFactory
from app.service.anomaly.cohort_detector import detect_cohort_anomalies
from app.service.anomaly.detection_run_logger import (
    log_anomaly_detected,
    log_detection_progress
)
from app.models.anomaly import Detector, AnomalyEvent
from app.service.anomaly.guardrails import Guardrails

logger = get_bridge_logger(__name__)


async def _process_cohorts_async(
    detector_instance,
    detector: Detector,
    cohorts: List[Dict[str, str]],
    window_from: datetime,
    window_to: datetime,
    guardrails: Guardrails,
    run_id: uuid.UUID,
    db_session,
    provider
) -> tuple[int, int]:
    """
    Async function to process all cohorts in a single event loop, reusing the same provider.
    
    This allows us to reuse a single PostgreSQL connection pool across all cohorts.
    """
    anomalies_created = 0
    cohorts_processed = 0
    cohorts_skipped = 0

    for cohort_idx, cohort in enumerate(cohorts):
        try:
            # Reuse the same provider for all cohorts in this async function
            cohort_anomalies, skipped = await _detect_cohort_anomalies_async(
                detector_instance,
                detector,
                cohort,
                window_from,
                window_to,
                guardrails,
                provider=provider
            )
            cohorts_skipped += skipped
            
            # Persist anomalies with deduplication
            # Check for existing anomalies with same window, metric, and cohort to prevent duplicates
            for anomaly_data in cohort_anomalies:
                # Check if this anomaly already exists (same window, metric, cohort, detector)
                existing = db_session.query(AnomalyEvent).filter(
                    AnomalyEvent.detector_id == detector.id,
                    AnomalyEvent.window_start == anomaly_data['window_start'],
                    AnomalyEvent.window_end == anomaly_data['window_end'],
                    AnomalyEvent.metric == anomaly_data['metric'],
                    AnomalyEvent.cohort == anomaly_data['cohort']
                ).first()
                
                if existing:
                    logger.debug(
                        f"Skipping duplicate anomaly: detector={detector.id}, "
                        f"window={anomaly_data['window_start']} to {anomaly_data['window_end']}, "
                        f"metric={anomaly_data['metric']}, cohort={cohort}"
                    )
                    continue
                
                anomaly_id = uuid.uuid4()
                anomaly = AnomalyEvent(
                    id=anomaly_id,
                    run_id=run_id,
                    detector_id=detector.id,
                    **anomaly_data
                )
                db_session.add(anomaly)
                anomalies_created += 1
                
                # Structured logging for anomaly detection event
                log_anomaly_detected(
                    anomaly_id,
                    run_id,
                    detector.id,
                    cohort,
                    anomaly_data
                )

            cohorts_processed += 1
            
            # Log progress every 10 cohorts
            if cohorts_processed % 10 == 0:
                log_detection_progress(
                    run_id,
                    detector.id,
                    cohorts_processed,
                    len(cohorts),
                    anomalies_created
                )

        except Exception as e:
            logger.warning(
                f"Failed to process cohort {cohort}: {e}",
                exc_info=True
            )
            continue

    # Log summary of skipped cohorts at INFO level
    if cohorts_skipped > 0:
        total_attempts = len(cohorts) * len(detector.metrics)
        logger.info(
            f"Skipped {cohorts_skipped} cohort/metric combinations due to insufficient data "
            f"(out of {total_attempts} total). "
            f"Processed {cohorts_processed} cohorts, created {anomalies_created} anomalies."
        )

    return cohorts_processed, anomalies_created


async def _detect_cohort_anomalies_async(
    detector_instance,
    detector: Detector,
    cohort: Dict[str, str],
    window_from: datetime,
    window_to: datetime,
    guardrails: Guardrails,
    provider=None
) -> tuple[List[Dict[str, Any]], int]:
    """
    Async version of detect_cohort_anomalies that can reuse a provider.
    
    Returns:
        Tuple of (anomalies list, skipped_count)
    """
    from app.service.anomaly.data.windows import fetch_windows_snowflake
    from app.service.anomaly.scoring import determine_severity
    from app.config.anomaly_config import get_anomaly_config
    
    anomalies = []
    skipped_count = 0
    config = get_anomaly_config()

    # Fetch window data for each metric
    for metric in detector.metrics:
        try:
            # Reuse the provided provider (created in the same event loop)
            df = await fetch_windows_snowflake(
                window_from=window_from,
                window_to=window_to,
                cohort_by=detector.cohort_by,
                metrics=[metric],
                cohort_filters=cohort,
                provider=provider  # Reuse provider from parent async function
            )

            min_support = detector.params.get('min_support', config.default_min_support)
            if len(df) < min_support:
                skipped_count += 1
                logger.debug(
                    f"Skipping {cohort}/{metric}: insufficient data "
                    f"({len(df)} windows < {min_support} required). "
                    f"Anomaly detection requires multiple data points to establish a baseline."
                )
                continue

            # Extract series
            series = df[metric].values

            # Run detection
            result = detector_instance.detect(series)

            # Process anomalies
            for idx in result.anomalies:
                score = result.scores[idx]
                window_start = df.iloc[idx]['window_start']
                window_end = df.iloc[idx]['window_end']
                observed = series[idx]
                
                # Calculate expected (from trend/seasonal if available)
                expected = observed - (result.evidence.get('residuals', [0])[idx] if 'residuals' in result.evidence else 0)

                # Check persistence
                k_threshold = detector.params.get('k', config.default_k_threshold)
                persisted_n = guardrails.check_persistence(
                    cohort, metric, score, k_threshold
                )

                # Determine severity
                severity = determine_severity(
                    score=score,
                    persisted_n=persisted_n,
                    detector_params=detector.params
                )

                # Check if should raise anomaly (all guardrails)
                persistence_required = detector.params.get('persistence', config.default_persistence)
                if guardrails.should_raise_anomaly(
                    cohort=cohort,
                    metric=metric,
                    score=score,
                    persisted_n=persisted_n,
                    k_threshold=k_threshold,
                    persistence_required=persistence_required,
                    current_time=datetime.now()
                ):
                    anomaly_data = {
                        'cohort': cohort,
                        'window_start': window_start,
                        'window_end': window_end,
                        'metric': metric,
                        'observed': float(observed),
                        'expected': float(expected),
                        'score': float(score),
                        'severity': severity,
                        'persisted_n': persisted_n,
                        'evidence': result.evidence,
                        'status': 'new'
                    }
                    anomalies.append(anomaly_data)

        except Exception as e:
            logger.warning(
                f"Failed to detect anomalies for {cohort}/{metric}: {e}",
                exc_info=True
            )
            continue

    return anomalies, skipped_count


def process_cohorts(
    detector_instance,
    detector: Detector,
    cohorts: List[Dict[str, str]],
    window_from: datetime,
    window_to: datetime,
    guardrails: Guardrails,
    run_id: uuid.UUID,
    db_session,
    provider=None  # Optional: reuse existing provider instead of creating new one
) -> tuple[int, int]:
    """
    Process all cohorts for a detection run.
    
    This function creates a single event loop and processes all cohorts in it,
    reusing the same PostgreSQL connection pool for efficiency.

    Args:
        detector_instance: Detector instance
        detector: Detector configuration
        cohorts: List of cohort dictionaries
        window_from: Start of time window
        window_to: End of time window
        guardrails: Guardrails instance
        run_id: Detection run ID
        db_session: Database session
        provider: Optional provider (not used, but kept for compatibility)

    Returns:
        Tuple of (cohorts_processed, anomalies_created)
    """
    # Process all cohorts in a single async function to reuse connection pool
    # Create a new event loop in a separate thread
    def run_async_processing():
        new_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(new_loop)
        postgres_provider = None
        try:
            # Create a single PostgreSQL provider for all cohorts
            from app.service.agent.tools.database_tool import get_database_provider
            postgres_provider = get_database_provider('postgresql')
            
            # Connect provider once at the start (lazy pool creation)
            postgres_provider.connect()
            
            # Process all cohorts in the same event loop, reusing the provider
            result = new_loop.run_until_complete(
                _process_cohorts_async(
                    detector_instance,
                    detector,
                    cohorts,
                    window_from,
                    window_to,
                    guardrails,
                    run_id,
                    db_session,
                    provider=postgres_provider
                )
            )
            return result
        finally:
            # Disconnect provider before closing the loop
            if postgres_provider:
                try:
                    new_loop.run_until_complete(postgres_provider.disconnect())
                    logger.debug("Disconnected PostgreSQL provider after batch cohort processing")
                except Exception as e:
                    logger.debug(f"Error disconnecting provider: {e}")
            new_loop.close()
    
    with concurrent.futures.ThreadPoolExecutor() as executor:
        future = executor.submit(run_async_processing)
        return future.result()

