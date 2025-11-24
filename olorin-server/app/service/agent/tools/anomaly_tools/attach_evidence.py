"""
Attach Evidence Tool for LangGraph Agents

Tool for attaching evidence (e.g., incident summaries) to investigations.
"""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
from langchain_core.tools import BaseTool
import uuid

from app.service.logging import get_bridge_logger
from app.persistence.database import get_db
from app.models.investigation_state import InvestigationState

logger = get_bridge_logger(__name__)


class _AttachEvidenceArgs(BaseModel):
    """Arguments for attach_evidence tool."""

    investigation_id: str = Field(..., description="Investigation UUID")
    evidence_type: str = Field(
        "incident_summary",
        description="Type of evidence (e.g., 'incident_summary', 'anomaly_details')"
    )
    content: str = Field(..., description="Evidence content (markdown or text)")
    source: Optional[str] = Field(
        "anomaly_detection",
        description="Source of evidence (e.g., 'anomaly_detection', 'rag')"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional metadata for the evidence"
    )


class AttachEvidenceTool(BaseTool):
    """
    Tool for attaching evidence to investigations.

    Attaches evidence (e.g., incident summaries, anomaly details) to an investigation
    by updating the investigation state with the evidence in the messages or metadata.
    """

    name: str = "attach_evidence"
    description: str = (
        "Attach evidence (e.g., incident summary, anomaly details) to an investigation. "
        "The evidence will be stored in the investigation state and visible to analysts."
    )
    args_schema: type[BaseModel] = _AttachEvidenceArgs

    def _run(
        self,
        investigation_id: str,
        evidence_type: str = "incident_summary",
        content: str = "",
        source: Optional[str] = "anomaly_detection",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Execute the attach_evidence tool."""
        db = next(get_db())
        try:
            try:
                investigation_uuid = uuid.UUID(investigation_id)
            except ValueError:
                return {
                    'error': f'Invalid investigation_id format: {investigation_id}',
                    'success': False
                }

            investigation = db.query(InvestigationState).filter(
                InvestigationState.investigation_id == investigation_id
            ).first()

            if not investigation:
                return {
                    'error': f'Investigation {investigation_id} not found',
                    'success': False
                }

            # Parse existing progress_json or create new structure
            import json
            progress_data = {}
            if investigation.progress_json:
                try:
                    progress_data = json.loads(investigation.progress_json)
                except json.JSONDecodeError:
                    progress_data = {}

            # Initialize evidence list if not present
            if 'evidence' not in progress_data:
                progress_data['evidence'] = []

            # Create evidence entry
            evidence_entry = {
                'evidence_id': str(uuid.uuid4()),
                'evidence_type': evidence_type,
                'content': content,
                'source': source,
                'metadata': metadata or {},
                'timestamp': investigation.updated_at.isoformat() if investigation.updated_at else None,
            }

            # Add evidence to progress
            progress_data['evidence'].append(evidence_entry)

            # Update progress_json
            investigation.progress_json = json.dumps(progress_data)
            investigation.version += 1
            db.commit()
            db.refresh(investigation)

            logger.info(
                f"Attached {evidence_type} evidence to investigation {investigation_id} "
                f"(evidence_id: {evidence_entry['evidence_id']})"
            )

            return {
                'success': True,
                'investigation_id': investigation_id,
                'evidence_id': evidence_entry['evidence_id'],
                'evidence_type': evidence_type,
            }

        except Exception as e:
            logger.error(f"Attach evidence tool error: {e}", exc_info=True)
            db.rollback()
            return {'error': str(e), 'success': False}
        finally:
            db.close()

