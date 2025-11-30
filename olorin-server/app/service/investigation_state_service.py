"""
Investigation State Service
Feature: 005-polling-and-persistence
Enhanced for 001-investigation-state-management

Provides CRUD operations for investigation state management with optimistic locking.
All operations create audit log entries for complete traceability.

Investigation Lifecycle: CREATED → SETTINGS → IN_PROGRESS → COMPLETED/ERROR/CANCELLED

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.models.investigation_audit_log import InvestigationAuditLog
from app.models.investigation_state import InvestigationState
from app.schemas.investigation_state import (
    InvestigationStateCreate,
    InvestigationStateResponse,
    InvestigationStateUpdate,
    InvestigationStatus,
    LifecycleStage,
)
from app.service.audit_helper import create_audit_entry
from app.service.auto_select_entity_helper import populate_auto_select_entities
from app.service.investigation_state_auth_helper import InvestigationStateAuthHelper
from app.service.investigation_trigger_service import InvestigationTriggerService
from app.service.state_query_helper import (
    check_duplicate_state,
    check_version_conflict,
    get_state_by_id,
)
from app.service.state_update_helper import apply_state_updates

logger = logging.getLogger(__name__)


class InvestigationStateService:
    """Service for investigation state CRUD operations with audit logging."""

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db
        self.auth_helper = InvestigationStateAuthHelper(db)

    async def create_state(
        self,
        user_id: str,
        data: InvestigationStateCreate,
        background_tasks: Optional[BackgroundTasks] = None,
    ) -> InvestigationStateResponse:
        """Create investigation state with auto-select entity population and auto-trigger execution. Raises 409 if already exists."""
        # Generate investigation ID if not provided
        import uuid

        investigation_id = data.investigation_id or str(uuid.uuid4())

        check_duplicate_state(self.db, investigation_id)

        # Convert settings to dict with JSON-serializable values
        settings_dict = data.settings.model_dump(mode="json") if data.settings else {}

        # Populate auto-select entities if placeholder is present
        if settings_dict:
            settings_dict = await populate_auto_select_entities(settings_dict)

        state = InvestigationState(
            investigation_id=investigation_id,
            user_id=user_id,
            lifecycle_stage=data.lifecycle_stage,
            settings_json=json.dumps(settings_dict) if settings_dict else None,
            progress_json=None,
            status=data.status,
            version=1,
        )

        self.db.add(state)
        self.db.commit()
        self.db.refresh(state)

        create_audit_entry(
            db=self.db,
            investigation_id=state.investigation_id,
            user_id=user_id,
            action_type="CREATED",
            from_version=None,
            to_version=1,
            source="API",
        )

        # Trigger structured investigation if settings present and background_tasks available
        if background_tasks and data.settings:
            trigger_service = InvestigationTriggerService(self.db)
            structured_request = trigger_service.extract_structured_request(
                investigation_id=investigation_id, settings=data.settings
            )

            if structured_request:
                # Check if this is a risk-based investigation (auto-select entities)
                is_risk_based = data.settings.auto_select_entities is True or (
                    data.settings.entities
                    and len(data.settings.entities) > 0
                    and data.settings.entities[0].entity_type is None
                    and data.settings.entities[0].entity_value is None
                )

                # For risk-based investigations, we still trigger execution even with null entities
                # The executor will handle auto-selection
                if not is_risk_based and (
                    not data.settings.entities or len(data.settings.entities) == 0
                ):
                    logger.warning(
                        f"Investigation {investigation_id} has structured request "
                        f"but no entities in settings. Skipping auto-trigger execution."
                    )
                else:
                    # For risk-based investigations, use placeholder entity values
                    if is_risk_based:
                        # Use placeholder entity for risk-based investigations
                        entity = (
                            data.settings.entities[0]
                            if data.settings.entities
                            else None
                        )
                        if not entity or entity.entity_type is None:
                            # Create a placeholder entity for risk-based mode
                            from app.schemas.investigation_state import Entity

                            entity = Entity(entity_type=None, entity_value=None)
                    else:
                        entity = data.settings.entities[0]

                    investigation_context = trigger_service.get_investigation_context(
                        investigation_id=investigation_id,
                        entity=entity,
                        settings=data.settings,
                    )

                    # Import executor here to avoid circular imports
                    from app.router.controllers.investigation_executor import (
                        execute_structured_investigation,
                    )

                    # CRITICAL: Set status to IN_PROGRESS IMMEDIATELY before queuing background task
                    # This ensures frontend sees IN_PROGRESS even if executor completes very quickly
                    # Do this for BOTH risk-based and entity-based investigations
                    # IMPORTANT: Refresh state from DB to ensure we have latest version before updating
                    self.db.refresh(state)
                    trigger_service.update_state_to_in_progress(
                        investigation_id=investigation_id, state=state, user_id=user_id
                    )
                    # CRITICAL: Commit and refresh again to ensure IN_PROGRESS is persisted before queuing task
                    self.db.commit()
                    self.db.refresh(state)
                    logger.info(
                        f"✅ Set investigation {investigation_id} to IN_PROGRESS before queuing executor "
                        f"(risk_based={is_risk_based}, status={state.status}, lifecycle_stage={state.lifecycle_stage})"
                    )

                    # Queue background execution
                    background_tasks.add_task(
                        execute_structured_investigation,
                        investigation_id,
                        investigation_context,
                        structured_request,
                    )

                    logger.info(
                        f"Investigation {investigation_id} queued for structured execution. "
                        f"Entity: {structured_request.entity_id if structured_request else 'auto-select'} "
                        f"({structured_request.entity_type if structured_request else 'risk-based'})"
                    )
            else:
                # For risk-based investigations with placeholder entities, structured_request is None
                # but we should still initialize progress_json if state is IN_PROGRESS
                if (
                    data.status == InvestigationStatus.IN_PROGRESS
                    or data.lifecycle_stage == LifecycleStage.IN_PROGRESS
                ):
                    trigger_service = InvestigationTriggerService(self.db)
                    trigger_service.update_state_to_in_progress(
                        investigation_id=investigation_id, state=state, user_id=user_id
                    )
                    logger.info(
                        f"Investigation {investigation_id} is risk-based with placeholder entities. "
                        f"Initialized progress_json but execution will wait for entity population."
                    )

        return InvestigationStateResponse.model_validate(state, from_attributes=True)

    def get_state(
        self, investigation_id: str, user_id: str
    ) -> InvestigationStateResponse:
        """Retrieve investigation state. Updates last_accessed. Raises 404 if not found."""
        state = get_state_by_id(self.db, investigation_id, user_id)

        state.last_accessed = datetime.utcnow()
        self.db.commit()

        return InvestigationStateResponse.model_validate(state, from_attributes=True)

    def get_state_with_auth(
        self, investigation_id: str, user_id: str
    ) -> InvestigationStateResponse:
        """
        Retrieve investigation state with authorization check and enhanced progress.

        Delegates to InvestigationStateAuthHelper for authorization and progress calculation.

        Args:
            investigation_id: The investigation ID to retrieve
            user_id: The current user's ID for authorization

        Returns:
            InvestigationStateResponse with complete state and calculated progress

        Raises:
            404: If investigation not found
            403: If user not authorized to access investigation
        """
        return self.auth_helper.get_state_with_auth(investigation_id, user_id)

    def update_state(
        self, investigation_id: str, user_id: str, data: InvestigationStateUpdate
    ) -> InvestigationStateResponse:
        """Update state with optimistic locking. Raises 404 if not found, 409 if version mismatch."""
        state = get_state_by_id(self.db, investigation_id, user_id)
        check_version_conflict(state, data.version)

        from_version = state.version
        changes = apply_state_updates(state, data)

        # Check if investigation was just completed for registry indexing
        was_completed = changes.get("status") in (
            "COMPLETED",
            "completed",
            "COMPLETE",
            "complete",
        ) or (
            state.status in ("COMPLETED", "completed", "COMPLETE", "complete")
            and changes.get("status") is not None
        )

        self.db.commit()
        self.db.refresh(state)

        # Index investigation in registry if it was just completed
        if was_completed:
            try:
                from app.service.investigation.workspace_registry import get_registry
                from app.service.logging.investigation_folder_manager import (
                    get_folder_manager,
                )

                registry = get_registry()
                folder_manager = get_folder_manager()

                # Get investigation folder path
                investigation_folder = folder_manager.get_investigation_folder(
                    investigation_id
                )
                canonical_path = (
                    str(investigation_folder) if investigation_folder else None
                )

                # Extract metadata from state
                settings_dict = {}
                if state.settings_json:
                    try:
                        settings_dict = json.loads(state.settings_json)
                    except json.JSONDecodeError:
                        pass

                # Extract entity information
                entities = settings_dict.get("entities", [])
                entity_type = None
                entity_ids = []

                if entities and len(entities) > 0:
                    entity_type = (
                        entities[0].get("entity_type")
                        if isinstance(entities[0], dict)
                        else getattr(entities[0], "entity_type", None)
                    )
                    for entity in entities:
                        entity_value = (
                            entity.get("entity_value")
                            if isinstance(entity, dict)
                            else getattr(entity, "entity_value", None)
                        )
                        if entity_value:
                            entity_ids.append(entity_value)

                # Extract other metadata
                investigation_type = settings_dict.get("investigation_type")
                graph_type = settings_dict.get("graph_type") or settings_dict.get(
                    "graph"
                )
                trigger_source = settings_dict.get("trigger_source") or "unknown"
                title = (
                    settings_dict.get("name") or f"Investigation {investigation_id[:8]}"
                )

                # Index investigation
                registry.index_investigation(
                    investigation_id=investigation_id,
                    title=title,
                    investigation_type=investigation_type,
                    graph_type=graph_type,
                    trigger_source=trigger_source,
                    status=state.status,
                    entity_type=entity_type,
                    entity_ids=entity_ids if entity_ids else None,
                    tags=None,
                    canonical_path=canonical_path,
                    created_at=state.created_at,
                    updated_at=state.updated_at,
                    completed_at=state.updated_at,
                    metadata={
                        "user_id": state.user_id,
                        "version": state.version,
                        "lifecycle_stage": state.lifecycle_stage,
                    },
                )

                logger.debug(
                    f"Indexed completed investigation {investigation_id} in workspace registry"
                )
            except Exception as e:
                # Don't fail state update if registry indexing fails
                logger.warning(
                    f"Failed to index investigation {investigation_id} in registry: {e}"
                )

        create_audit_entry(
            db=self.db,
            investigation_id=investigation_id,
            user_id=user_id,
            action_type="UPDATED",
            changes_json=json.dumps(changes),
            from_version=from_version,
            to_version=state.version,
            source="API",
        )

        return InvestigationStateResponse.model_validate(state, from_attributes=True)

    def delete_state(self, investigation_id: str, user_id: str) -> None:
        """Delete investigation state. Raises 404 if not found."""
        state = get_state_by_id(self.db, investigation_id, user_id)

        create_audit_entry(
            db=self.db,
            investigation_id=investigation_id,
            user_id=user_id,
            action_type="DELETED",
            from_version=state.version,
            to_version=None,
            source="API",
        )

        self.db.delete(state)
        self.db.commit()

    def get_history(
        self, investigation_id: str, user_id: str, limit: int = 20, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Retrieve paginated investigation history. Raises 404 if not found."""
        get_state_by_id(self.db, investigation_id, user_id)

        entries = (
            self.db.query(InvestigationAuditLog)
            .filter(InvestigationAuditLog.investigation_id == investigation_id)
            .order_by(InvestigationAuditLog.timestamp.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

        return [entry.to_dict() for entry in entries]

    def get_states(
        self,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """Retrieve paginated investigation states with filtering."""
        query = self.db.query(InvestigationState)

        # Filter by user_id if provided
        if user_id:
            query = query.filter(InvestigationState.user_id == user_id)

        # Filter by status if provided
        if status:
            query = query.filter(InvestigationState.status == status)

        # Filter by search term (investigation_id)
        if search:
            query = query.filter(InvestigationState.investigation_id.ilike(f"%{search}%"))

        # Calculate pagination
        total_count = query.count()
        offset = (page - 1) * page_size
        
        # Get items
        items = (
            query.order_by(InvestigationState.updated_at.desc())
            .offset(offset)
            .limit(page_size)
            .all()
        )
        
        return {
            "investigations": [
                InvestigationStateResponse.model_validate(item, from_attributes=True)
                for item in items
            ],
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "has_next_page": offset + len(items) < total_count,
            "has_previous_page": page > 1,
        }
