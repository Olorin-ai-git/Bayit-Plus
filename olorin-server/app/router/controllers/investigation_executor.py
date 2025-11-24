"""
Investigation Executor for Structured Investigations
This module contains the main background task execution orchestration for structured investigations.
"""
from datetime import datetime, timezone
from typing import Dict, Any

from app.service.agent.recursion_guard import get_recursion_guard
from app.router.models.autonomous_investigation_models import StructuredInvestigationRequest
from app.router.controllers.investigation_controller import update_investigation_status
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def execute_structured_investigation(
    investigation_id: str,
    investigation_context: Dict[str, Any],
    request: StructuredInvestigationRequest
):
    """
    Execute REAL structured investigation using actual LangGraph agents and LLM calls.
    
    This function coordinates all REAL agents, tracks progress, and manages
    the complete investigation workflow with actual AI execution.
    
    Args:
        investigation_id: The unique investigation identifier
        investigation_context: Context data for the investigation
        request: The original investigation request parameters
    """
    logger.info(f"⚙️ BACKGROUND TASK STARTED: execute_structured_investigation for {investigation_id}")
    logger.info(f"🚀🚀🚀 STARTING BACKGROUND INVESTIGATION: {investigation_id}")
    
    # CRITICAL: Set status to IN_PROGRESS IMMEDIATELY when executor starts
    # This ensures frontend sees IN_PROGRESS even if investigation completes very quickly
    # Do this BEFORE any verification or execution to guarantee the status transition
    # IMPORTANT: Only update if status is NOT already COMPLETED (to prevent overwriting completion)
    try:
        from app.persistence.database import get_db_session
        from app.models.investigation_state import InvestigationState
        from app.service.investigation_trigger_service import InvestigationTriggerService
        
        with get_db_session() as db:
            state = db.query(InvestigationState).filter(
                InvestigationState.investigation_id == investigation_id
            ).first()
            
            if state:
                # Only update to IN_PROGRESS if not already COMPLETED or ERROR
                # This prevents overwriting a completed status if executor runs after completion
                if state.status not in ("IN_PROGRESS", "COMPLETED", "ERROR", "CANCELLED"):
                    trigger_service = InvestigationTriggerService(db)
                    trigger_service.update_state_to_in_progress(
                        investigation_id=investigation_id,
                        state=state,
                        user_id=state.user_id
                    )
                    logger.info(f"✅ Set investigation {investigation_id} to IN_PROGRESS at executor start (was: {state.status})")
                elif state.status == "IN_PROGRESS":
                    logger.info(f"ℹ️  Investigation {investigation_id} already in IN_PROGRESS status")
                else:
                    logger.warning(f"⚠️  Investigation {investigation_id} is already {state.status}, skipping IN_PROGRESS update")
    except Exception as status_error:
        logger.warning(f"⚠️ Failed to set IN_PROGRESS status at executor start: {str(status_error)}")
        # Continue execution even if status update fails
    
    try:
        logger.info(f"🚀 STARTING REAL AUTONOMOUS INVESTIGATION: {investigation_id}")
        
        # ===== AUTO-SELECT ENTITIES FOR RISK-BASED INVESTIGATIONS =====
        # Check if this is a risk-based investigation that needs entity auto-selection
        if request.entity_id == "risk-based-auto-select":
            logger.info(f"🔍 Risk-based investigation detected - auto-selecting entities for {investigation_id}")
            
            try:
                from app.service.analytics.risk_analyzer import get_risk_analyzer
                
                analyzer = get_risk_analyzer()
                results = await analyzer.get_top_risk_entities(top_percentage=10)
                
                # Check for CRITICAL status - no data found even after all fallbacks
                if results.get('status') == 'critical_no_data':
                    critical_msg = results.get('message', 'CRITICAL: No entities found in any time window. Nothing to investigate.')
                    logger.critical(f"🚨 {critical_msg}")
                    
                    # Terminate investigation with ERROR status (CRITICAL mapped to ERROR)
                    update_investigation_status(investigation_id, {
                        "status": "ERROR",
                        "error_message": critical_msg,
                        "current_phase": "entity_selection",
                        "completion_time": datetime.now(timezone.utc).isoformat()
                    })
                    
                    logger.critical(f"🚨 Investigation {investigation_id} terminated with CRITICAL/ERROR status: No data to investigate")
                    return {
                        'investigation_id': investigation_id,
                        'status': 'CRITICAL',
                        'database_status': 'ERROR',  # CRITICAL maps to ERROR in database
                        'message': critical_msg,
                        'reason': 'No entities found in any time window (7d, 14d, 30d, 60d, 90d)'
                    }
                
                if results.get('status') != 'success':
                    error_msg = f"Failed to fetch top risk entities: {results.get('error', 'Unknown error')}"
                    logger.error(f"❌ {error_msg}")
                    raise ValueError(error_msg)
                
                top_entities = results.get('entities', [])
                
                if not top_entities:
                    error_msg = "No top risk entities returned from analyzer"
                    logger.error(f"❌ {error_msg}")
                    raise ValueError(error_msg)
                
                # Use the first entity from the top risk entities
                first_entity = top_entities[0]
                entity_value = first_entity.get('entity')
                
                if not entity_value:
                    error_msg = "Top risk entity has no entity value"
                    logger.error(f"❌ {error_msg}")
                    raise ValueError(error_msg)
                
                # Convert to string if needed
                if isinstance(entity_value, datetime):
                    entity_value = entity_value.isoformat()
                else:
                    entity_value = str(entity_value).strip()
                
                # Determine entity type based on value (must match EntityType enum and database schema)
                entity_type = "user_id"  # Default
                if ':' in entity_value and '.' in entity_value:
                    entity_type = "ip"
                elif '.' in entity_value and entity_value.count('.') == 3:
                    try:
                        parts = entity_value.split('.')
                        if all(0 <= int(p) <= 255 for p in parts):
                            entity_type = "ip"
                    except (ValueError, AttributeError):
                        pass
                elif '@' in entity_value:
                    entity_type = "email"
                
                # Update request with real entity values
                request.entity_id = entity_value
                request.entity_type = entity_type
                
                logger.info(f"✅ Auto-selected entity for {investigation_id}: {entity_type}={entity_value[:50]}...")
                
                # Update investigation_context as well
                investigation_context['entity_id'] = entity_value
                investigation_context['entity_type'] = entity_type

                # Update investigation state in database with auto-selected entities
                # This ensures the frontend can display the actual entity values instead of null placeholders
                try:
                    from app.persistence.database import get_db_session
                    from app.models.investigation_state import InvestigationState
                    import json

                    with get_db_session() as db:
                        state = db.query(InvestigationState).filter(
                            InvestigationState.investigation_id == investigation_id
                        ).first()

                        if state and state.settings_json:
                            settings_data = json.loads(state.settings_json)

                            # Update entities with actual selected entity
                            if 'entities' in settings_data:
                                settings_data['entities'] = [{
                                    'entityType': entity_type,
                                    'entityValue': entity_value
                                }]

                            # Update settings_json in database
                            state.settings_json = json.dumps(settings_data)
                            state.updated_at = datetime.now(timezone.utc)
                            state.version += 1

                            db.commit()
                            logger.info(
                                f"✅ Updated investigation {investigation_id} settings_json with "
                                f"auto-selected entity ({entity_type}={entity_value[:50]}...) in database"
                            )
                        else:
                            logger.warning(
                                f"⚠️  Could not update investigation {investigation_id} settings: "
                                f"state {'not found' if not state else 'has no settings_json'}"
                            )
                except Exception as update_error:
                    logger.warning(
                        f"⚠️  Failed to update investigation {investigation_id} settings with auto-selected entity: "
                        f"{str(update_error)}"
                    )
                    logger.exception("Settings update error:")
                    # Don't fail the investigation if this update fails - continue with execution

            except Exception as e:
                error_msg = f"Failed to auto-select entities for risk-based investigation: {str(e)}"
                error_type = type(e).__name__
                logger.error(f"❌ {error_msg}")
                logger.exception(f"Full auto-selection error traceback for investigation {investigation_id}:")
                
                # Don't proceed with execution if auto-selection failed
                # Persist error with comprehensive error details
                try:
                    update_investigation_status(investigation_id, {
                        "status": "failed",
                        "error_message": f"{error_type}: {error_msg}",
                        "completion_time": datetime.now(timezone.utc).isoformat()
                    })
                    logger.info(f"✅ Persisted auto-selection error status for investigation {investigation_id}")
                except Exception as update_error:
                    # If update_investigation_status fails, try direct database update as fallback
                    logger.error(f"❌ Failed to update investigation status via update_investigation_status: {str(update_error)}")
                    logger.exception("Exception during status update:")
                    try:
                        from app.persistence.database import get_db_session
                        from app.models.investigation_state import InvestigationState
                        import json
                        
                        with get_db_session() as db:
                            state = db.query(InvestigationState).filter(
                                InvestigationState.investigation_id == investigation_id
                            ).first()
                            
                            if state:
                                # Update status directly
                                state.status = "ERROR"
                                
                                # Update progress_json with error
                                progress_data = json.loads(state.progress_json) if state.progress_json else {}
                                progress_data["error_message"] = f"{error_type}: {error_msg}"
                                progress_data["error_occurred"] = True
                                progress_data["completed_at"] = datetime.now(timezone.utc).isoformat()
                                progress_data["status"] = "failed"
                                
                                state.progress_json = json.dumps(progress_data)
                                state.updated_at = datetime.now(timezone.utc)
                                state.version = (state.version or 0) + 1
                                
                                db.commit()
                                logger.info(f"✅ Persisted auto-selection error status directly to database for investigation {investigation_id}")
                            else:
                                logger.error(f"❌ Investigation {investigation_id} not found in database for error persistence")
                    except Exception as db_error:
                        logger.error(f"❌ CRITICAL: Failed to persist auto-selection error even with direct DB update: {str(db_error)}")
                        logger.exception("Exception during direct database update:")
                return
        
        # ===== VERIFY EXECUTION CAN PROCEED =====
        # Validate that we have valid entity information before proceeding
        if not request.entity_id or request.entity_id == "risk-based-auto-select":
            error_msg = f"Invalid entity_id after auto-selection: {request.entity_id}"
            logger.error(f"❌ {error_msg}")
            try:
                update_investigation_status(investigation_id, {
                    "status": "failed",
                    "error_message": error_msg,
                    "completion_time": datetime.now(timezone.utc).isoformat()
                })
            except Exception:
                # Fallback to direct DB update if update_investigation_status fails
                from app.persistence.database import get_db_session
                from app.models.investigation_state import InvestigationState
                import json
                with get_db_session() as db:
                    state = db.query(InvestigationState).filter(
                        InvestigationState.investigation_id == investigation_id
                    ).first()
                    if state:
                        progress_data = json.loads(state.progress_json) if state.progress_json else {}
                        progress_data["error_message"] = error_msg
                        progress_data["error_occurred"] = True
                        progress_data["completed_at"] = datetime.now(timezone.utc).isoformat()
                        state.progress_json = json.dumps(progress_data)
                        state.status = "ERROR"
                        state.updated_at = datetime.now(timezone.utc)
                        state.version = (state.version or 0) + 1
                        db.commit()
            return
        
        # Validate entity_type is valid
        if not request.entity_type:
            error_msg = "Missing entity_type after auto-selection"
            logger.error(f"❌ {error_msg}")
            try:
                update_investigation_status(investigation_id, {
                    "status": "failed",
                    "error_message": error_msg,
                    "completion_time": datetime.now(timezone.utc).isoformat()
                })
            except Exception:
                # Fallback to direct DB update
                from app.persistence.database import get_db_session
                from app.models.investigation_state import InvestigationState
                import json
                with get_db_session() as db:
                    state = db.query(InvestigationState).filter(
                        InvestigationState.investigation_id == investigation_id
                    ).first()
                    if state:
                        progress_data = json.loads(state.progress_json) if state.progress_json else {}
                        progress_data["error_message"] = error_msg
                        progress_data["error_occurred"] = True
                        progress_data["completed_at"] = datetime.now(timezone.utc).isoformat()
                        state.progress_json = json.dumps(progress_data)
                        state.status = "ERROR"
                        state.updated_at = datetime.now(timezone.utc)
                        state.version = (state.version or 0) + 1
                        db.commit()
            return
        
        logger.info(f"✅ Verified entity information: {request.entity_type}={request.entity_id[:50]}...")
        
        # ===== CREATE RECURSION GUARD CONTEXT =====
        recursion_guard = get_recursion_guard()
        # Match the thread_id format used by AgentContext: "{session_id}-{olorin_experience_id}"
        # Since olorin_experience_id will be None in structured mode, the format is "{investigation_id}-None"
        thread_id = f"{investigation_id}-None"
        
        try:
            recursion_context = recursion_guard.create_context(
                investigation_id=investigation_id,
                thread_id=thread_id,
                max_depth=15,
                max_tool_calls=50,
                max_duration_seconds=600
            )
            logger.info(f"🛡️ Created RecursionGuard context for investigation {investigation_id} with thread_id {thread_id}")
        except Exception as guard_error:
            error_msg = f"Failed to create RecursionGuard context: {str(guard_error)}"
            logger.error(f"❌ {error_msg}")
            logger.exception("RecursionGuard context creation error:")
            try:
                update_investigation_status(investigation_id, {
                    "status": "failed",
                    "error_message": error_msg,
                    "completion_time": datetime.now(timezone.utc).isoformat()
                })
            except Exception:
                # Fallback to direct DB update
                from app.persistence.database import get_db_session
                from app.models.investigation_state import InvestigationState
                import json
                with get_db_session() as db:
                    state = db.query(InvestigationState).filter(
                        InvestigationState.investigation_id == investigation_id
                    ).first()
                    if state:
                        progress_data = json.loads(state.progress_json) if state.progress_json else {}
                        progress_data["error_message"] = error_msg
                        progress_data["error_occurred"] = True
                        progress_data["completed_at"] = datetime.now(timezone.utc).isoformat()
                        state.progress_json = json.dumps(progress_data)
                        state.status = "ERROR"
                        state.updated_at = datetime.now(timezone.utc)
                        state.version = (state.version or 0) + 1
                        db.commit()
            return
        
        # CRITICAL: Update to IN_PROGRESS immediately after verification passes
        # This ensures the frontend sees IN_PROGRESS status even if investigation completes quickly
        # MUST happen before any execution to guarantee frontend sees the transition
        logger.info(f"✅ Verification complete - execution can proceed for {investigation_id}")
        
        # Update state to IN_PROGRESS using the proper service method
        # This is especially important for risk-based investigations that didn't get updated in create_state
        # ALWAYS update to IN_PROGRESS here, even if status is already COMPLETED (shouldn't happen, but defensive)
        from app.persistence.database import get_db_session
        from app.models.investigation_state import InvestigationState
        from app.service.investigation_trigger_service import InvestigationTriggerService
        import json
        
        with get_db_session() as db:
            state = db.query(InvestigationState).filter(
                InvestigationState.investigation_id == investigation_id
            ).first()
            
            if state:
                # ALWAYS update to IN_PROGRESS if not already IN_PROGRESS
                # This ensures frontend sees the transition even if investigation completes very quickly
                if state.status != "IN_PROGRESS":
                    trigger_service = InvestigationTriggerService(db)
                    trigger_service.update_state_to_in_progress(
                        investigation_id=investigation_id,
                        state=state,
                        user_id=state.user_id
                    )
                    logger.info(f"✅ Updated investigation {investigation_id} to IN_PROGRESS after verification (was: {state.status})")
                else:
                    logger.info(f"ℹ️  Investigation {investigation_id} already in IN_PROGRESS status")
                
                # Initialize progress_json if needed (for risk-based investigations that didn't get it in create_state)
                if not state.progress_json:
                    initial_progress = {
                        "status": "running",
                        "lifecycle_stage": "in_progress",
                        "percent_complete": 0,
                        "tool_executions": [],
                        "current_phase": "agent_initialization",
                        "started_at": datetime.now(timezone.utc).isoformat(),
                        "created_at": state.created_at.isoformat() if state.created_at else datetime.now(timezone.utc).isoformat()
                    }
                    state.progress_json = json.dumps(initial_progress)
                    state.version += 1
                    db.commit()
                    logger.info(f"✅ Initialized progress_json for investigation {investigation_id}")
        
        # Also update via status update for consistency (sets current_phase)
        # This ensures progress_json is also updated with current_phase
        update_investigation_status(investigation_id, {
            "status": "in_progress",
            "current_phase": "agent_initialization"
        })
        
        # === REAL AGENT EXECUTION - NO MORE SIMULATION ===
        from .investigation_phases import (
            execute_agent_initialization_phase,
            execute_context_preparation_phase
        )
        
        await execute_agent_initialization_phase(investigation_id, request)
        await execute_context_preparation_phase(investigation_id, investigation_context, request)
        
        # Execute the main agent investigation
        from .investigation_executor_core import _execute_agent_investigation_phase
        result = await _execute_agent_investigation_phase(investigation_id, investigation_context, request, thread_id)
        
        # Process and complete the investigation
        from .investigation_completion import _execute_results_processing_phase, _complete_investigation
        await _execute_results_processing_phase(investigation_id, result, request)
        await _complete_investigation(investigation_id, result, request)
        
        # Clean up RecursionGuard context
        try:
            recursion_guard.remove_context(investigation_id, thread_id)
            logger.info(f"🛡️ Cleaned up RecursionGuard context for investigation {investigation_id}")
        except Exception as cleanup_error:
            logger.warning(f"Failed to cleanup RecursionGuard context: {cleanup_error}")
        
        logger.info(f"Completed structured investigation: {investigation_id}")
        
    except Exception as e:
        error_message = str(e)
        error_type = type(e).__name__
        logger.error(f"❌ Structured investigation failed: {error_message}")
        logger.exception(f"Full exception traceback for investigation {investigation_id}:")
        
        # Clean up RecursionGuard context on failure
        try:
            recursion_guard.remove_context(investigation_id, f"{investigation_id}-None")
            logger.info(f"🛡️ Cleaned up RecursionGuard context after failure for investigation {investigation_id}")
        except Exception as cleanup_error:
            logger.warning(f"Failed to cleanup RecursionGuard context after failure: {cleanup_error}")
        
        # Persist error with comprehensive error details
        try:
            update_investigation_status(investigation_id, {
                "status": "failed",
                "error_message": f"{error_type}: {error_message}",
                "completion_time": datetime.now(timezone.utc).isoformat()
            })
            logger.info(f"✅ Persisted error status for investigation {investigation_id}")
        except Exception as update_error:
            # If update_investigation_status fails, try direct database update as fallback
            logger.error(f"❌ Failed to update investigation status via update_investigation_status: {str(update_error)}")
            logger.exception("Exception during status update:")
            try:
                from app.persistence.database import get_db_session
                from app.models.investigation_state import InvestigationState
                import json
                
                with get_db_session() as db:
                    state = db.query(InvestigationState).filter(
                        InvestigationState.investigation_id == investigation_id
                    ).first()
                    
                    if state:
                        # Update status directly
                        state.status = "ERROR"
                        
                        # Update progress_json with error
                        progress_data = json.loads(state.progress_json) if state.progress_json else {}
                        progress_data["error_message"] = f"{error_type}: {error_message}"
                        progress_data["error_occurred"] = True
                        progress_data["completed_at"] = datetime.now(timezone.utc).isoformat()
                        progress_data["status"] = "failed"
                        
                        state.progress_json = json.dumps(progress_data)
                        state.updated_at = datetime.now(timezone.utc)
                        state.version = (state.version or 0) + 1
                        
                        db.commit()
                        logger.info(f"✅ Persisted error status directly to database for investigation {investigation_id}")
                    else:
                        logger.error(f"❌ Investigation {investigation_id} not found in database for error persistence")
            except Exception as db_error:
                logger.error(f"❌ CRITICAL: Failed to persist error even with direct DB update: {str(db_error)}")
                logger.exception("Exception during direct database update:")


def get_investigation_thread_id(investigation_id: str) -> str:
    """Generate thread ID for investigation in the expected format"""
    return f"{investigation_id}-None"


def create_recursion_guard_context(investigation_id: str, thread_id: str):
    """Create and configure recursion guard context for investigation"""
    recursion_guard = get_recursion_guard()
    return recursion_guard.create_context(
        investigation_id=investigation_id,
        thread_id=thread_id,
        max_depth=15,
        max_tool_calls=50,
        max_duration_seconds=600
    )


def cleanup_recursion_guard_context(investigation_id: str, thread_id: str):
    """Clean up recursion guard context after investigation completion"""
    try:
        recursion_guard = get_recursion_guard()
        recursion_guard.remove_context(investigation_id, thread_id)
        logger.info(f"🛡️ Cleaned up RecursionGuard context for investigation {investigation_id}")
        return True
    except Exception as cleanup_error:
        logger.warning(f"Failed to cleanup RecursionGuard context: {cleanup_error}")
        return False