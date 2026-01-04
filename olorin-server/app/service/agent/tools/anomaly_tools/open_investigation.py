"""
Open Investigation Tool for LangGraph Agents

Tool for creating investigations from detected anomalies.
"""

import uuid
from typing import Any, Dict, Optional

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from app.models.anomaly import AnomalyEvent
from app.persistence.database import get_db
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class _OpenInvestigationArgs(BaseModel):
    """Arguments for open_investigation tool."""

    anomaly_id: str = Field(..., description="Anomaly event UUID")
    entity_type: Optional[str] = Field(
        "merchant_id", description="Primary entity type for investigation"
    )


class OpenInvestigationTool(BaseTool):
    """
    Tool for creating investigations from anomalies.

    Creates a fraud investigation with anomaly context, using merchant_id
    as primary entity and including channel/geo in metadata.
    """

    name: str = "open_investigation"
    description: str = (
        "Create a fraud investigation from a detected anomaly. "
        "Uses merchant_id as primary entity and includes anomaly context "
        "(cohort, metric, window, evidence) in investigation metadata."
    )
    args_schema: type[BaseModel] = _OpenInvestigationArgs

    def _run(
        self,
        anomaly_id: str,
        entity_type: Optional[str] = "merchant_id",
    ) -> Dict[str, Any]:
        """Execute the open_investigation tool."""
        db = next(get_db())
        try:
            anomaly = (
                db.query(AnomalyEvent)
                .filter(AnomalyEvent.id == uuid.UUID(anomaly_id))
                .first()
            )

            if not anomaly:
                return {
                    "error": f"Anomaly {anomaly_id} not found",
                    "investigation_id": None,
                }

            # Extract entity_id from cohort
            cohort = anomaly.cohort
            entity_id = cohort.get(entity_type) if entity_type else None

            if not entity_id:
                return {
                    "error": f"Entity {entity_type} not found in cohort",
                    "investigation_id": None,
                }

            # Build investigation metadata
            metadata = {
                "anomaly_id": str(anomaly.id),
                "detector_id": str(anomaly.detector_id),
                "cohort": cohort,
                "metric": anomaly.metric,
                "score": float(anomaly.score),
                "severity": anomaly.severity,
                "window_start": anomaly.window_start.isoformat(),
                "window_end": anomaly.window_end.isoformat(),
                "evidence": anomaly.evidence,
                "channel": cohort.get("channel"),
                "geo": cohort.get("geo"),
            }

            # Create investigation via investigation service
            from app.schemas.investigation_state import (
                CorrelationMode,
                Entity,
                InvestigationMode,
                InvestigationSettings,
                InvestigationStateCreate,
                InvestigationType,
                TimeRange,
            )
            from app.service.investigation_state_service import (
                InvestigationStateService,
            )

            investigation_service = InvestigationStateService(db)

            # Build investigation settings with entity and time range
            investigation_settings = InvestigationSettings(
                name=f"Anomaly Investigation: {metric} - {entity_id}",
                entities=[
                    Entity(
                        entity_type=entity_type,
                        entity_value=entity_id,
                        metadata=metadata,
                    )
                ],
                time_range=TimeRange(
                    start_time=anomaly.window_start.isoformat(),
                    end_time=anomaly.window_end.isoformat(),
                ),
                investigation_type=InvestigationType.STRUCTURED,
                investigation_mode=InvestigationMode.ENTITY,
                correlation_mode=CorrelationMode.SINGLE_ENTITY,
            )

            # Build investigation state create request
            investigation_data = InvestigationStateCreate(
                settings=investigation_settings
            )

            # Create investigation (synchronous call for tool)
            # Note: Tools are synchronous, so we call the service synchronously
            # The investigation service will handle async operations internally
            import asyncio

            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

            from fastapi import BackgroundTasks

            background_tasks = BackgroundTasks()

            investigation_state = loop.run_until_complete(
                investigation_service.create_state(
                    user_id="system",  # System-initiated from anomaly
                    data=investigation_data,
                    background_tasks=background_tasks,
                )
            )

            investigation_id = investigation_state.investigation_id

            # Update anomaly with investigation_id
            anomaly.investigation_id = uuid.UUID(investigation_id)
            db.commit()
            db.refresh(anomaly)

            logger.info(
                f"Created investigation {investigation_id} from anomaly {anomaly_id} "
                f"for entity {entity_type}={entity_id}"
            )

            return {
                "investigation_id": investigation_id,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "anomaly_id": anomaly_id,
                "metadata": metadata,
            }

        except Exception as e:
            logger.error(f"Open investigation tool error: {e}", exc_info=True)
            return {"error": str(e), "investigation_id": None}
        finally:
            db.close()
