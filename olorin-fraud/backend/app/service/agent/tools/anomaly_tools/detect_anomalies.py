"""
Detect Anomalies Tool for LangGraph Agents

Tool for running anomaly detection on time series data.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from app.service.anomaly.detection_job import run_detection
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class _DetectAnomaliesArgs(BaseModel):
    """Arguments for detect_anomalies tool."""

    detector_id: str = Field(..., description="Detector UUID")
    window_from: str = Field(..., description="Start of time window (ISO format)")
    window_to: str = Field(..., description="End of time window (ISO format)")


class DetectAnomaliesTool(BaseTool):
    """
    Tool for running anomaly detection.

    Triggers anomaly detection run for a detector on a time window.
    Returns run ID for tracking detection progress.
    """

    name: str = "detect_anomalies"
    description: str = (
        "Run anomaly detection for a detector on a time window. "
        "Returns run_id for tracking detection progress. "
        "Detection runs asynchronously."
    )
    args_schema: type[BaseModel] = _DetectAnomaliesArgs

    def _run(
        self,
        detector_id: str,
        window_from: str,
        window_to: str,
    ) -> Dict[str, Any]:
        """Execute the detect_anomalies tool."""
        try:
            detector_uuid = uuid.UUID(detector_id)
            window_from_dt = datetime.fromisoformat(window_from.replace("Z", "+00:00"))
            window_to_dt = datetime.fromisoformat(window_to.replace("Z", "+00:00"))

            detection_run = run_detection(
                detector_id=detector_uuid,
                window_from=window_from_dt,
                window_to=window_to_dt,
            )

            return {
                "run_id": str(detection_run.id),
                "status": detection_run.status,
                "detector_id": detector_id,
                "window_from": window_from,
                "window_to": window_to,
            }

        except ValueError as e:
            logger.error(f"Detect anomalies tool validation error: {e}")
            return {"error": str(e), "run_id": None}
        except Exception as e:
            logger.error(f"Detect anomalies tool error: {e}", exc_info=True)
            return {"error": str(e), "run_id": None}
