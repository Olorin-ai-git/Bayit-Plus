"""
Comparison Execution Module

Extracted comparison execution logic from auto_comparison.py
"""

import asyncio
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from app.service.investigation.comparison_modules.comparison_data_loader import (
    ComparisonDataLoader,
)
from app.service.logging import get_bridge_logger

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
        max_wait_seconds: int = 6000,
        merchant_name: Optional[str] = None,
        fraud_tx_count: int = 0,
        total_tx_count: int = 0,
        selector_metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Create a new investigation and wait for it to complete.

        Args:
            entity_type: Entity type
            entity_value: Entity value
            window_start: Investigation window start
            window_end: Investigation window end
            max_wait_seconds: Maximum time to wait for completion (default: 10 minutes)
            merchant_name: Optional merchant name for context
            fraud_tx_count: Number of fraudulent transactions detected
            total_tx_count: Total number of transactions in the window

        Returns:
            Investigation dict if completed successfully, None otherwise
        """
        try:
            from sqlalchemy.orm import Session

            from app.persistence.database import get_db
            from app.schemas.investigation_state import Entity as EntitySchema
            from app.schemas.investigation_state import (
                InvestigationSettings,
                InvestigationStateCreate,
                InvestigationType,
            )
            from app.schemas.investigation_state import TimeRange as TimeRangeSchema
            from app.service.investigation_state_service import (
                InvestigationStateService,
            )

            # Generate investigation ID
            investigation_id = f"auto-comp-{uuid.uuid4().hex[:12]}"

            self.logger.info(
                f"🔨 Creating investigation {investigation_id} for {entity_type}={entity_value}"
            )
            if merchant_name:
                self.logger.info(f"   Context: Merchant={merchant_name}, Fraud Tx={fraud_tx_count}/{total_tx_count}")
            self.logger.info(f"   Window: {window_start.date()} to {window_end.date()}")

            # Create investigation settings
            # We can store merchant_name in auto_select_context or custom field if needed
            # For now, just logging it. Could pass as a second entity if correlation needed.
            
            entities = [
                EntitySchema(entity_type=entity_type, entity_value=entity_value)
            ]
            
            # Create investigation settings
            # Build metadata dictionary
            metadata = {
                "merchant_name": merchant_name,
                "fraud_tx_count": fraud_tx_count,
                "total_tx_count": total_tx_count,
                "auto_generated": True
            }
            
            # Add selector_metadata if provided
            if selector_metadata:
                metadata["selector_metadata"] = selector_metadata
            
            settings = InvestigationSettings(
                name=f"Auto-comparison investigation for {entity_value}" + (f" (Merchant: {merchant_name})" if merchant_name else ""),
                entities=entities,
                time_range=TimeRangeSchema(
                    start_time=window_start.isoformat(), end_time=window_end.isoformat()
                ),
                tools=[],  # Empty tools - LLM will auto-select for hybrid investigations
                correlation_mode="OR",
                investigation_type=InvestigationType.HYBRID,
                auto_select_entities=False,
                metadata=metadata
            )

            # Create investigation state
            create_data = InvestigationStateCreate(
                investigation_id=investigation_id,
                lifecycle_stage="IN_PROGRESS",
                status="IN_PROGRESS",
                settings=settings,
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
                    background_tasks=None,
                )

                # Manually trigger investigation execution
                from app.router.controllers.investigation_executor import (
                    execute_structured_investigation,
                )
                from app.service.investigation_trigger_service import (
                    InvestigationTriggerService,
                )

                trigger_service = InvestigationTriggerService(db)
                structured_request = trigger_service.extract_structured_request(
                    investigation_id=investigation_id, settings=settings
                )

                if not structured_request:
                    self.logger.error(
                        f"❌ Failed to extract structured request for investigation {investigation_id}"
                    )
                    return None

                entity = settings.entities[0] if settings.entities else None
                investigation_context = trigger_service.get_investigation_context(
                    investigation_id=investigation_id, entity=entity, settings=settings
                )

                # Get state from database and update to IN_PROGRESS
                from app.service.state_query_helper import get_state_by_id

                state = get_state_by_id(db, investigation_id, "auto-comparison-system")
                trigger_service.update_state_to_in_progress(
                    investigation_id=investigation_id,
                    state=state,
                    user_id="auto-comparison-system",
                )
                db.commit()
                db.refresh(state)

                # Execute investigation
                self.logger.info(f"🚀 Executing investigation {investigation_id}")
                result = await execute_structured_investigation(
                    investigation_id=investigation_id,
                    request=structured_request,
                    investigation_context=investigation_context,
                )

                # Wait for completion
                start_time = datetime.now()
                while (datetime.now() - start_time).total_seconds() < max_wait_seconds:
                    # Expire cached objects to force fresh database read
                    db.expire_all()
                    state = get_state_by_id(
                        db, investigation_id, "auto-comparison-system"
                    )
                    if state and state.status in ["COMPLETED", "FAILED"]:
                        break
                    await asyncio.sleep(5)

                # Get final state (expire again to ensure fresh read)
                db.expire_all()
                state = get_state_by_id(db, investigation_id, "auto-comparison-system")
                if state and state.status == "COMPLETED":
                    self.logger.info(
                        f"✅ Investigation {investigation_id} completed successfully"
                    )
                    
                    # Store merchant_name in result for grouping later
                    return {
                        "investigation_id": investigation_id,
                        "status": "completed",
                        "result": result,
                        "merchant_name": merchant_name
                    }
                else:
                    self.logger.warning(
                        f"⚠️ Investigation {investigation_id} did not complete in time"
                    )
                    return None

            finally:
                db.close()

        except Exception as e:
            self.logger.error(f"❌ Failed to create investigation: {e}")
            return None

    async def create_and_wait_for_compound_investigation(
        self,
        entities: list,
        window_start: datetime,
        window_end: datetime,
        max_wait_seconds: int = 6000,
        merchant_name: Optional[str] = None,
        fraud_tx_count: int = 0,
        total_tx_count: int = 0,
        selector_metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Create a compound entity investigation with multiple entities.

        Compound entities (e.g., EMAIL + DEVICE_ID + PAYMENT_METHOD_TOKEN)
        have significantly lower false positive rates compared to single entities.

        Args:
            entities: List of dicts with 'entity_type' and 'entity_value' keys
            window_start: Investigation window start
            window_end: Investigation window end
            max_wait_seconds: Maximum time to wait for completion
            merchant_name: Optional merchant name for context
            fraud_tx_count: Number of fraudulent transactions detected
            total_tx_count: Total number of transactions in the window
            selector_metadata: Optional selector metadata

        Returns:
            Investigation dict if completed successfully, None otherwise
        """
        try:
            from sqlalchemy.orm import Session

            from app.persistence.database import get_db
            from app.schemas.investigation_state import Entity as EntitySchema
            from app.schemas.investigation_state import (
                InvestigationSettings,
                InvestigationStateCreate,
                InvestigationType,
            )
            from app.schemas.investigation_state import TimeRange as TimeRangeSchema
            from app.service.investigation_state_service import (
                InvestigationStateService,
            )

            # Generate investigation ID
            investigation_id = f"auto-comp-{uuid.uuid4().hex[:12]}"

            # Build entity description for logging
            entity_desc = " + ".join(
                [f"{e['entity_type']}={e['entity_value'][:15]}..." for e in entities[:3]]
            )
            self.logger.info(
                f"🔨 Creating compound investigation {investigation_id} for {entity_desc}"
            )
            if merchant_name:
                self.logger.info(
                    f"   Context: Merchant={merchant_name}, Fraud Tx={fraud_tx_count}/{total_tx_count}"
                )
            self.logger.info(f"   Window: {window_start.date()} to {window_end.date()}")

            # Create entity list from input
            entity_schemas = [
                EntitySchema(
                    entity_type=e.get("entity_type"), entity_value=e.get("entity_value")
                )
                for e in entities
                if e.get("entity_type") and e.get("entity_value")
            ]

            if not entity_schemas:
                self.logger.error("❌ No valid entities provided for compound investigation")
                return None

            # Build metadata dictionary
            metadata = {
                "merchant_name": merchant_name,
                "fraud_tx_count": fraud_tx_count,
                "total_tx_count": total_tx_count,
                "auto_generated": True,
                "entity_mode": "compound",
                "entity_count": len(entity_schemas),
            }

            # Add selector_metadata if provided
            if selector_metadata:
                metadata["selector_metadata"] = selector_metadata

            # Create investigation settings with correlation_mode="AND" for compound entities
            settings = InvestigationSettings(
                name=f"Compound investigation ({len(entity_schemas)} entities)"
                + (f" - Merchant: {merchant_name}" if merchant_name else ""),
                entities=entity_schemas,
                time_range=TimeRangeSchema(
                    start_time=window_start.isoformat(), end_time=window_end.isoformat()
                ),
                tools=[],
                correlation_mode="AND",  # Compound entities use AND logic
                investigation_type=InvestigationType.HYBRID,
                auto_select_entities=False,
                metadata=metadata,
            )

            # Create investigation state
            create_data = InvestigationStateCreate(
                investigation_id=investigation_id,
                lifecycle_stage="IN_PROGRESS",
                status="IN_PROGRESS",
                settings=settings,
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
                    background_tasks=None,
                )

                # Manually trigger investigation execution
                from app.router.controllers.investigation_executor import (
                    execute_structured_investigation,
                )
                from app.service.investigation_trigger_service import (
                    InvestigationTriggerService,
                )

                trigger_service = InvestigationTriggerService(db)
                structured_request = trigger_service.extract_structured_request(
                    investigation_id=investigation_id, settings=settings
                )

                if not structured_request:
                    self.logger.error(
                        f"❌ Failed to extract structured request for compound investigation {investigation_id}"
                    )
                    return None

                # Use first entity for context (all entities are in settings.entities)
                entity = settings.entities[0] if settings.entities else None
                investigation_context = trigger_service.get_investigation_context(
                    investigation_id=investigation_id, entity=entity, settings=settings
                )

                # Get state from database and update to IN_PROGRESS
                from app.service.state_query_helper import get_state_by_id

                state = get_state_by_id(db, investigation_id, "auto-comparison-system")
                trigger_service.update_state_to_in_progress(
                    investigation_id=investigation_id,
                    state=state,
                    user_id="auto-comparison-system",
                )
                db.commit()
                db.refresh(state)

                # Execute investigation
                self.logger.info(f"🚀 Executing compound investigation {investigation_id}")
                result = await execute_structured_investigation(
                    investigation_id=investigation_id,
                    request=structured_request,
                    investigation_context=investigation_context,
                )

                # Wait for completion
                start_time = datetime.now()
                while (datetime.now() - start_time).total_seconds() < max_wait_seconds:
                    # Expire cached objects to force fresh database read
                    db.expire_all()
                    state = get_state_by_id(
                        db, investigation_id, "auto-comparison-system"
                    )
                    if state and state.status in ["COMPLETED", "FAILED"]:
                        break
                    await asyncio.sleep(5)

                # Get final state (expire again to ensure fresh read)
                db.expire_all()
                state = get_state_by_id(db, investigation_id, "auto-comparison-system")
                if state and state.status == "COMPLETED":
                    self.logger.info(
                        f"✅ Compound investigation {investigation_id} completed successfully"
                    )

                    return {
                        "investigation_id": investigation_id,
                        "status": "completed",
                        "result": result,
                        "merchant_name": merchant_name,
                        "entity_mode": "compound",
                        "entity_count": len(entity_schemas),
                    }
                else:
                    self.logger.warning(
                        f"⚠️ Compound investigation {investigation_id} did not complete in time"
                    )
                    return None

            finally:
                db.close()

        except Exception as e:
            self.logger.error(f"❌ Failed to create compound investigation: {e}")
            return None

    async def generate_confusion_matrix(self, investigation_id: str) -> None:
        """
        Trigger post-investigation packaging to generate confusion matrix.
        """
        try:
            from app.service.investigation.post_investigation_packager import (
                generate_post_investigation_package
            )
            
            self.logger.info(f"📊 Generating confusion matrix for {investigation_id}")
            
            confusion_matrix_path = await generate_post_investigation_package(investigation_id)
            
            if confusion_matrix_path:
                self.logger.info(
                    f"✅ Confusion matrix created: {confusion_matrix_path.name}"
                )
            else:
                self.logger.warning(
                    f"⚠️ Post-investigation packaging failed for {investigation_id}"
                )
        except Exception as e:
            self.logger.error(
                f"❌ Error in post-investigation packaging for {investigation_id}: {e}",
                exc_info=True
            )
