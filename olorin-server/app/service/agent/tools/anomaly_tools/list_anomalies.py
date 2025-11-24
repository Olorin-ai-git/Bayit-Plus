"""
List Anomalies Tool for LangGraph Agents

Tool for querying detected anomalies with filtering.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from langchain_core.tools import BaseTool
import uuid

from app.service.logging import get_bridge_logger
from app.models.anomaly import AnomalyEvent
from app.persistence.database import get_db

logger = get_bridge_logger(__name__)


class _ListAnomaliesArgs(BaseModel):
    """Arguments for list_anomalies tool."""

    severity: Optional[str] = Field(None, description="Filter by severity (info, warn, critical)")
    metric: Optional[str] = Field(None, description="Filter by metric name")
    detector_id: Optional[str] = Field(None, description="Filter by detector ID")
    status: Optional[str] = Field(None, description="Filter by status (new, triaged, closed)")
    limit: int = Field(100, ge=1, le=1000, description="Maximum number of anomalies to return")


class ListAnomaliesTool(BaseTool):
    """
    Tool for listing detected anomalies.

    Queries anomaly events with optional filtering by severity, metric,
    detector, or status. Returns paginated results.
    """

    name: str = "list_anomalies"
    description: str = (
        "List detected anomalies with optional filtering. "
        "Can filter by severity, metric, detector, or status. "
        "Returns paginated list of anomaly events."
    )
    args_schema: type[BaseModel] = _ListAnomaliesArgs

    def _run(
        self,
        severity: Optional[str] = None,
        metric: Optional[str] = None,
        detector_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
    ) -> Dict[str, Any]:
        """Execute the list_anomalies tool."""
        db = next(get_db())
        try:
            query = db.query(AnomalyEvent)

            if severity:
                query = query.filter(AnomalyEvent.severity == severity)
            if metric:
                query = query.filter(AnomalyEvent.metric == metric)
            if detector_id:
                query = query.filter(AnomalyEvent.detector_id == uuid.UUID(detector_id))
            if status:
                query = query.filter(AnomalyEvent.status == status)

            total = query.count()
            anomalies = query.order_by(AnomalyEvent.created_at.desc()).limit(limit).all()

            return {
                'anomalies': [anomaly.to_dict() for anomaly in anomalies],
                'total': total,
                'limit': limit,
                'count': len(anomalies)
            }

        except Exception as e:
            logger.error(f"List anomalies tool error: {e}", exc_info=True)
            return {'error': str(e), 'anomalies': [], 'total': 0}
        finally:
            db.close()

