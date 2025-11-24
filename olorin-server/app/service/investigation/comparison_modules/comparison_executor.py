"""
Comparison Execution Module

Extracted comparison execution logic from auto_comparison.py
"""

import uuid
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional

from app.service.logging import get_bridge_logger
from app.service.investigation.comparison_modules.comparison_data_loader import ComparisonDataLoader

logger = get_bridge_logger(__name__)


class ComparisonExecutor:
    """Handles execution of comparison investigations"""
    
    def __init__(self):
        self.logger = logger
        self.data_loader = ComparisonDataLoader()
    
    async def create_and_wait_for_investigation(
        self,
        entity_type: str,
        entity_value: str,
        window_start: datetime,
        window_end: datetime,
        max_wait_seconds: int = 600
    ) -> Optional[Dict[str, Any]]:
        """
        Create a new investigation and wait for it to complete.
        
        Args:
            entity_type: Entity type
            entity_value: Entity value
            window_start: Investigation window start
            window_end: Investigation window end
            max_wait_seconds: Maximum time to wait for completion (default: 10 minutes)
            
        Returns:
            Investigation dict if completed successfully, None otherwise
        """
        try:
            from sqlalchemy.orm import Session
            from app.persistence.database import get_db
            from app.service.investigation_state_service import InvestigationStateService
            from app.schemas.investigation_state import (
                InvestigationStateCreate,
                InvestigationSettings,
                InvestigationType,
                Entity as EntitySchema,
                TimeRange as TimeRangeSchema
            )
            
            # Generate investigation ID
            investigation_id = f"auto-comp-{uuid.uuid4().hex[:12]}"
            
            self.logger.info(f"🔨 Creating investigation {investigation_id} for {entity_type}={entity_value}")
            self.logger.info(f"   Window: {window_start.date()} to {window_end.date()}")
            
            # Create investigation settings
            settings = InvestigationSettings(
                name=f"Auto-comparison investigation for {entity_value}",
                entities=[EntitySchema(entity_type=entity_type, entity_value=entity_value)],
                time_range=TimeRangeSchema(
                    start_time=window_start.isoformat(),
                    end_time=window_end.isoformat()
                ),
                tools=[],  # Empty tools - LLM will auto-select for hybrid investigations
                correlation_mode="OR",
                investigation_type=InvestigationType.HYBRID,
                auto_select_entities=False
            )
            
            # Create investigation state
            create_data = InvestigationStateCreate(
                investigation_id=investigation_id,
                lifecycle_stage="IN_PROGRESS",
                status="IN_PROGRESS",
                settings=settings
            )
            
            # Get database session
            db_gen = get_db()
            db: Session = next(db_gen)
            
            try:
                service = InvestigationStateService(db)
                
                # Create investigation state
                state_response = await service.create_state(
                    user_id="auto-comparison-system",
                    data=create_data,
                    background_tasks=None
                )
                
                # Manually trigger investigation execution
                from app.service.investigation_trigger_service import InvestigationTriggerService
                from app.router.controllers.investigation_executor import execute_structured_investigation
                
                trigger_service = InvestigationTriggerService(db)
                structured_request = trigger_service.extract_structured_request(
                    investigation_id=investigation_id,
                    settings=settings
                )
                
                if not structured_request:
                    self.logger.error(f"❌ Failed to extract structured request for investigation {investigation_id}")
                    return None
                
                entity = settings.entities[0] if settings.entities else None
                investigation_context = trigger_service.get_investigation_context(
                    investigation_id=investigation_id,
                    entity=entity,
                    settings=settings
                )
                
                # Get state from database and update to IN_PROGRESS
                from app.service.state_query_helper import get_state_by_id
                state = get_state_by_id(db, investigation_id, "auto-comparison-system")
                trigger_service.update_state_to_in_progress(
                    investigation_id=investigation_id,
                    state=state,
                    user_id="auto-comparison-system"
                )
                db.commit()
                db.refresh(state)
                
                # Execute investigation
                self.logger.info(f"🚀 Executing investigation {investigation_id}")
                result = await execute_structured_investigation(
                    investigation_id=investigation_id,
                    request=structured_request,
                    context=investigation_context
                )
                
                # Wait for completion
                start_time = datetime.now()
                while (datetime.now() - start_time).total_seconds() < max_wait_seconds:
                    state = get_state_by_id(db, investigation_id, "auto-comparison-system")
                    if state and state.status in ["COMPLETED", "FAILED"]:
                        break
                    await asyncio.sleep(5)
                
                # Get final state
                state = get_state_by_id(db, investigation_id, "auto-comparison-system")
                if state and state.status == "COMPLETED":
                    self.logger.info(f"✅ Investigation {investigation_id} completed successfully")
                    return {
                        "investigation_id": investigation_id,
                        "status": "completed",
                        "result": result
                    }
                else:
                    self.logger.warning(f"⚠️ Investigation {investigation_id} did not complete in time")
                    return None
                    
            finally:
                db.close()
                
        except Exception as e:
            self.logger.error(f"❌ Failed to create investigation: {e}")
            return None

