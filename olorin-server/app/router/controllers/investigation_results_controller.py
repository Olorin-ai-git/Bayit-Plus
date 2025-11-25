"""
Investigation Results Controller
Feature: 006-hybrid-graph-integration

Controller for retrieving investigation results from completed investigations.
Validates completion status and returns comprehensive results.

SYSTEM MANDATE Compliance:
- Schema-locked: Uses existing database columns
- Configuration-driven: No hardcoded values
- Complete implementation: No placeholders or TODOs
"""

import json
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.investigation_state import InvestigationState
from app.schemas.investigation_results import InvestigationResultsSchema
from app.service.logging import get_bridge_logger
from config.hybrid_graph_config import get_hybrid_graph_config

logger = get_bridge_logger(__name__)


class InvestigationResultsController:
    """
    Controller for retrieving investigation results.
    Handles result retrieval and validation.
    """

    def __init__(self):
        self.config = get_hybrid_graph_config()

    async def get_results(
        self, investigation_id: str, user_id: str
    ) -> InvestigationResultsSchema:
        """
        Retrieve investigation results.

        Args:
            investigation_id: Investigation identifier
            user_id: User ID for authorization check

        Returns:
            InvestigationResultsSchema with complete results

        Raises:
            HTTPException: 404 if not found, 409 if not completed
        """
        investigation = self._get_investigation(investigation_id, user_id)

        if investigation.status not in ["COMPLETED", "completed"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Investigation {investigation_id} is not completed (status: {investigation.status})",
            )

        if not investigation.progress_json:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Investigation {investigation_id} has no progress/results available",
            )

        try:
            progress_data = json.loads(investigation.progress_json)
            # Extract results data from progress_json
            # Results are stored in progress_json, not a separate results_json field
            results_data = progress_data
        except json.JSONDecodeError as e:
            logger.error(
                f"Failed to parse progress JSON for investigation {investigation_id}: {e}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to parse investigation results",
            )

        # Parse settings for entity info
        settings_data = {}
        if investigation.settings_json:
            try:
                settings_data = json.loads(investigation.settings_json)
            except json.JSONDecodeError:
                settings_data = {}

        # Construct response schema
        return InvestigationResultsSchema(
            investigation_id=investigation.investigation_id,
            entity_type=settings_data.get("entity_type", "unknown"),
            entity_id=settings_data.get("entity_id", "unknown"),
            status="completed",
            risk_score=results_data.get("risk_score", 0),
            risk_level=results_data.get("risk_level", "low"),
            findings=results_data.get("findings", []),
            evidence=results_data.get("evidence", []),
            recommendations=results_data.get("recommendations", []),
            agent_decisions=results_data.get("agent_decisions", {}),
            graph_visualization=results_data.get("graph_visualization", {}),
            timeline=results_data.get("timeline", []),
            metadata=results_data.get("metadata", {}),
            created_at=investigation.created_at,
            completed_at=investigation.updated_at,
        )

    def _get_investigation(
        self, investigation_id: str, user_id: str
    ) -> InvestigationState:
        """
        Retrieve investigation from database.

        Args:
            investigation_id: Investigation identifier
            user_id: User ID for authorization

        Returns:
            InvestigationState object

        Raises:
            HTTPException: 404 if not found or unauthorized
        """
        engine = create_engine(self.config.database_url)
        Session = sessionmaker(bind=engine)
        session = Session()

        try:
            investigation = (
                session.query(InvestigationState)
                .filter(InvestigationState.investigation_id == investigation_id)
                .first()
            )

            if not investigation:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Investigation {investigation_id} not found",
                )

            # Verify user authorization
            if investigation.user_id != user_id:
                logger.warning(
                    f"Unauthorized access attempt for investigation {investigation_id} "
                    f"by user {user_id}"
                )
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Investigation {investigation_id} not found",
                )

            return investigation

        finally:
            session.close()
