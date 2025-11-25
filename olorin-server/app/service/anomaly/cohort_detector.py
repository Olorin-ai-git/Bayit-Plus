"""
Cohort Detector

This module provides functionality for detecting anomalies in a specific cohort.
"""

from datetime import datetime
from typing import Any, Dict, List

import numpy as np
import pandas as pd

from app.config.anomaly_config import get_anomaly_config
from app.models.anomaly import Detector
from app.service.anomaly.data.windows import fetch_windows_snowflake
from app.service.anomaly.guardrails import Guardrails
from app.service.anomaly.scoring import determine_severity
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def detect_cohort_anomalies(
    detector_instance,
    detector: Detector,
    cohort: Dict[str, str],
    window_from: datetime,
    window_to: datetime,
    guardrails: Guardrails,
    provider=None,  # Optional: reuse existing provider instead of creating new one
) -> List[Dict[str, Any]]:
    """
    Detect anomalies for a specific cohort.

    Args:
        detector_instance: Detector instance
        detector: Detector configuration
        cohort: Cohort dimensions
        window_from: Start of time window
        window_to: End of time window
        guardrails: Guardrails instance

    Returns:
        List of anomaly data dictionaries
    """
    anomalies = []
    config = get_anomaly_config()

    # Fetch window data for each metric
    for metric in detector.metrics:
        try:
            import asyncio
            import concurrent.futures

            # Note: fetch_windows_snowflake is async, but this method is sync
            # Use a new event loop in a separate thread to avoid conflicts
            # IMPORTANT: Don't pass provider when creating new event loop - PostgreSQL pools are tied to specific loops
            # Let fetch_windows_snowflake create its own provider in the new loop
            def run_async_fetch():
                # Create a new event loop in this thread
                new_loop = asyncio.new_event_loop()
                asyncio.set_event_loop(new_loop)
                try:
                    # Don't pass provider - PostgreSQL connection pools can't be reused across event loops
                    # Each thread will create its own provider connection
                    return new_loop.run_until_complete(
                        fetch_windows_snowflake(
                            window_from=window_from,
                            window_to=window_to,
                            cohort_by=detector.cohort_by,
                            metrics=[metric],
                            cohort_filters=cohort,
                            provider=None,  # Create new provider in this event loop
                        )
                    )
                finally:
                    new_loop.close()

            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(run_async_fetch)
                df = future.result()

            min_support = detector.params.get("min_support", config.default_min_support)
            if len(df) < min_support:
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
                window_start = df.iloc[idx]["window_start"]
                window_end = df.iloc[idx]["window_end"]
                observed = series[idx]

                # Calculate expected (from trend/seasonal if available)
                expected = observed - (
                    result.evidence.get("residuals", [0])[idx]
                    if "residuals" in result.evidence
                    else 0
                )

                # Check persistence
                k_threshold = detector.params.get("k", config.default_k_threshold)
                persisted_n = guardrails.check_persistence(
                    cohort, metric, score, k_threshold
                )

                # Determine severity
                severity = determine_severity(
                    score=score,
                    persisted_n=persisted_n,
                    detector_params=detector.params,
                )

                # Check if should raise anomaly (all guardrails)
                persistence_required = detector.params.get(
                    "persistence", config.default_persistence
                )
                if guardrails.should_raise_anomaly(
                    cohort=cohort,
                    metric=metric,
                    score=score,
                    persisted_n=persisted_n,
                    k_threshold=k_threshold,
                    persistence_required=persistence_required,
                    current_time=datetime.now(),
                ):
                    anomaly_data = {
                        "cohort": cohort,
                        "window_start": window_start,
                        "window_end": window_end,
                        "metric": metric,
                        "observed": float(observed),
                        "expected": float(expected),
                        "score": float(score),
                        "severity": severity,
                        "persisted_n": persisted_n,
                        "evidence": result.evidence,
                        "status": "new",
                    }
                    anomalies.append(anomaly_data)

        except Exception as e:
            logger.warning(
                f"Failed to detect anomalies for {cohort}/{metric}: {e}", exc_info=True
            )
            continue

    return anomalies
