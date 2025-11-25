"""
Investigation Controller for Structured Investigations
This module contains the core investigation startup logic and management.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from app.router.models.autonomous_investigation_models import (
    StructuredInvestigationRequest,
    StructuredInvestigationResponse,
)
from app.service.agent.journey_tracker import journey_tracker
from app.service.logging import get_bridge_logger
from app.service.logging.autonomous_investigation_logger import (
    structured_investigation_logger,
)
from app.service.logging.investigation_folder_manager import (
    InvestigationMode,
    get_folder_manager,
)
from app.service.logging.investigation_log_handler import InvestigationLogHandler
from app.service.logging.investigation_log_manager import InvestigationLogManager
from app.service.logging.unified_logging_core import get_unified_logging_core
from app.test.data.mock_transactions.mock_data_loader import load_investigation_scenario

logger = get_bridge_logger(__name__)

# Global tracking of active investigations
active_investigations: Dict[str, Dict[str, Any]] = {}

# Global investigation log manager instance
_investigation_log_manager: Optional[InvestigationLogManager] = None

# Store active investigation log handlers for cleanup
_active_investigation_handlers: Dict[str, InvestigationLogHandler] = {}


def get_investigation_log_manager() -> InvestigationLogManager:
    """Get or create investigation log manager instance"""
    global _investigation_log_manager
    if _investigation_log_manager is None:
        _investigation_log_manager = InvestigationLogManager(get_unified_logging_core())
    return _investigation_log_manager


async def start_structured_investigation(
    request: StructuredInvestigationRequest, execute_investigation_callback
) -> StructuredInvestigationResponse:
    """
    Start a new structured investigation.

    Args:
        request: The investigation request parameters
        execute_investigation_callback: Background task callback for execution

    Returns:
        Investigation response with monitoring endpoints
    """
    # Generate investigation ID if not provided
    if not request.investigation_id:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        request.investigation_id = f"AUTO_INVEST_{request.entity_id}_{timestamp}"

    investigation_id = request.investigation_id

    try:
        # Load investigation scenario if specified
        investigation_context = {}
        if request.scenario:
            try:
                investigation_context = load_investigation_scenario(request.scenario)
                logger.info(
                    f"Loaded scenario '{request.scenario}' for investigation {investigation_id}"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to load scenario '{request.scenario}': {str(e)}",
                )
        else:
            # Create investigation context from entity information
            investigation_context = {
                "investigation_id": investigation_id,
                "entity_id": request.entity_id,
                "entity_type": request.entity_type,
                "trigger_event": {
                    "type": "manual_trigger",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "priority": request.investigation_priority,
                },
                "investigation_data": {},
                "metadata": request.metadata,
            }

            # Add time_range filter if provided
            if request.time_range:
                investigation_context["time_range"] = {
                    "start_time": request.time_range.start_time,
                    "end_time": request.time_range.end_time,
                }

        # Create investigation folder and start investigation logging
        try:
            folder_manager = get_folder_manager()
            investigation_folder, _ = folder_manager.create_investigation_folder(
                investigation_id=investigation_id,
                mode=InvestigationMode.LIVE,
                config=investigation_context,
            )

            # Start investigation logging with InvestigationLogManager
            log_manager = get_investigation_log_manager()
            metadata = {
                "investigation_id": investigation_id,
                "entity_id": request.entity_id,
                "entity_type": request.entity_type,
                "investigation_type": getattr(
                    request, "investigation_type", "structured"
                ),
                "lifecycle_stage": "IN_PROGRESS",
                "status": "IN_PROGRESS",
                **investigation_context,
            }

            handler = log_manager.start_investigation_logging(
                investigation_id=investigation_id,
                metadata=metadata,
                investigation_folder=investigation_folder,
            )

            if handler:
                _active_investigation_handlers[investigation_id] = handler
                logger.info(f"Started investigation logging for {investigation_id}")
        except Exception as e:
            # Log error but don't fail investigation start
            logger.error(
                f"Failed to start investigation logging for {investigation_id}: {e}",
                exc_info=True,
            )

        # Initialize logging systems if enabled (legacy system)
        if request.enable_verbose_logging:
            structured_investigation_logger.start_investigation_logging(
                investigation_id, investigation_context
            )

        if request.enable_journey_tracking:
            journey_tracker.start_journey_tracking(
                investigation_id, investigation_context.get("investigation_data", {})
            )

        # Track investigation
        active_investigations[investigation_id] = {
            "start_time": datetime.now(timezone.utc).isoformat(),
            "status": "starting",
            "request": request.dict(),
            "context": investigation_context,
            "current_phase": "initialization",
            "progress_percentage": 0.0,
            "agent_status": {},
            "findings_summary": {},
            "performance_metrics": {
                "start_time": datetime.now(timezone.utc).isoformat(),
                "estimated_completion_ms": 180900,  # 3 minutes default
            },
        }

        # Start structured investigation in background
        execute_investigation_callback(investigation_id, investigation_context, request)

        # Generate monitoring endpoints
        base_url = "http://localhost:8090/structured"
        monitoring_endpoints = {
            "status": f"{base_url}/investigation/{investigation_id}/status",
            "logs": f"{base_url}/investigation/{investigation_id}/logs",
            "journey": f"{base_url}/investigation/{investigation_id}/journey",
            "websocket": f"ws://localhost:8090/structured/investigation/{investigation_id}/monitor",
        }

        response = StructuredInvestigationResponse(
            investigation_id=investigation_id,
            status="started",
            message=f"Structured investigation started for {request.entity_type}: {request.entity_id}",
            investigation_context=investigation_context,
            monitoring_endpoints=monitoring_endpoints,
            estimated_completion_time_ms=180900,
            created_at=datetime.now(timezone.utc).isoformat(),
        )

        logger.info(f"Started structured investigation: {investigation_id}")
        return response

    except Exception as e:
        logger.error(f"Failed to start structured investigation: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Investigation start failed: {str(e)}"
        )


def get_active_investigations() -> Dict[str, Dict[str, Any]]:
    """Get current active investigations (for testing and monitoring)"""
    return active_investigations.copy()


def update_investigation_status(investigation_id: str, updates: Dict[str, Any]) -> None:
    """Update investigation status with immediate database persistence and audit logging"""
    # Persist to database and create audit entry
    try:
        import json

        from app.models.investigation_state import InvestigationState
        from app.persistence.database import get_db_session
        from app.service.audit_helper import create_audit_entry

        with get_db_session() as db:
            state = (
                db.query(InvestigationState)
                .filter(InvestigationState.investigation_id == investigation_id)
                .first()
            )

            if not state:
                logger.warning(
                    f"Investigation {investigation_id} not found in database - cannot update"
                )
                return

            # Update in-memory state if investigation exists in database
            if investigation_id in active_investigations:
                active_investigations[investigation_id].update(updates)
            else:
                # Investigation exists in database but not in in-memory dict - this is OK for database-backed investigations
                logger.debug(
                    f"Investigation {investigation_id} exists in database but not in active_investigations dict (database-backed investigation)"
                )

            # Track versions for audit
            from_version = state.version or 0

            # Determine action type based on updates
            action_type = "UPDATED"
            investigation_completed = False
            if "status" in updates:
                status_upper = updates["status"].upper()
                if status_upper in ("COMPLETED", "ERROR", "CANCELLED"):
                    action_type = status_upper
                    investigation_completed = True
                elif status_upper in ("IN_PROGRESS", "STARTING", "RUNNING"):
                    action_type = "STARTED" if from_version <= 1 else "PROGRESS"
            elif "current_phase" in updates:
                action_type = "PHASE_CHANGE"
            elif "progress_percentage" in updates:
                action_type = "PROGRESS"

            # Stop investigation logging if investigation completed
            if (
                investigation_completed
                and investigation_id in _active_investigation_handlers
            ):
                try:
                    log_manager = get_investigation_log_manager()
                    handler = _active_investigation_handlers[investigation_id]

                    # Log lifecycle event before stopping
                    status_upper = updates.get("status", "").upper()
                    event_type = (
                        "completion"
                        if status_upper == "COMPLETED"
                        else (
                            "cancellation" if status_upper == "CANCELLED" else "failure"
                        )
                    )
                    log_manager.log_lifecycle_event(
                        investigation_id, event_type, {"status": status_upper}
                    )

                    log_manager.stop_investigation_logging(investigation_id, handler)
                    del _active_investigation_handlers[investigation_id]
                    logger.info(f"Stopped investigation logging for {investigation_id}")
                except Exception as e:
                    logger.error(
                        f"Failed to stop investigation logging for {investigation_id}: {e}",
                        exc_info=True,
                    )

            # Generate confusion table when investigation completes
            if (
                investigation_completed
                and updates.get("status", "").upper() == "COMPLETED"
            ):
                try:
                    from app.service.investigation.confusion_table_generator import (
                        generate_confusion_table_sync,
                    )
                    from app.service.logging.investigation_folder_manager import (
                        get_folder_manager,
                    )

                    folder_manager = get_folder_manager()
                    investigation_folder = folder_manager.get_investigation_folder(
                        investigation_id
                    )

                    # Generate confusion table (non-blocking - runs in background if event loop is running)
                    confusion_table_path = generate_confusion_table_sync(
                        investigation_id, investigation_folder
                    )
                    if confusion_table_path:
                        logger.info(
                            f"✅ Confusion table generated for investigation {investigation_id}: {confusion_table_path}"
                        )
                    else:
                        logger.debug(
                            f"📊 Confusion table generation scheduled for investigation {investigation_id}"
                        )
                except Exception as e:
                    logger.warning(
                        f"⚠️ Failed to generate confusion table for investigation {investigation_id}: {e}",
                        exc_info=True,
                    )
                    # Don't fail the status update if confusion table generation fails

            # Update status
            if "status" in updates:
                # Map status values to valid database enum values
                status_mapping = {
                    "CREATED": "CREATED",
                    "SETTINGS": "SETTINGS",
                    "IN_PROGRESS": "IN_PROGRESS",
                    "COMPLETED": "COMPLETED",
                    "ERROR": "ERROR",
                    "CANCELLED": "CANCELLED",
                    "CRITICAL": "ERROR",  # Map CRITICAL to ERROR (no data to investigate)
                    "FAILED": "ERROR",  # Map FAILED to ERROR
                    "RUNNING": "IN_PROGRESS",  # Map RUNNING to IN_PROGRESS
                    "STARTING": "IN_PROGRESS",  # Map STARTING to IN_PROGRESS
                }
                raw_status = updates["status"].upper()
                new_status = status_mapping.get(raw_status, raw_status)

                # Validate that the mapped status is allowed by the database constraint
                valid_statuses = (
                    "CREATED",
                    "SETTINGS",
                    "IN_PROGRESS",
                    "COMPLETED",
                    "ERROR",
                    "CANCELLED",
                )
                if new_status not in valid_statuses:
                    logger.warning(
                        f"Invalid status '{new_status}' (from '{raw_status}'). Skipping status update."
                    )
                    new_status = None

                if new_status and new_status != state.status:
                    state.status = new_status
                    # Only update lifecycle_stage if the new status is a valid lifecycle value
                    if new_status in (
                        "CREATED",
                        "SETTINGS",
                        "IN_PROGRESS",
                        "COMPLETED",
                    ):
                        state.lifecycle_stage = new_status

            # Update progress data
            progress_data = (
                json.loads(state.progress_json) if state.progress_json else {}
            )

            if "current_phase" in updates:
                progress_data["current_phase"] = updates["current_phase"]

            if "progress_percentage" in updates:
                progress_data["percent_complete"] = int(updates["progress_percentage"])

            # Store error message in progress if provided
            if "error_message" in updates:
                progress_data["error_message"] = updates["error_message"]
                progress_data["error_occurred"] = True

            # Store completion time if provided
            if "completion_time" in updates:
                progress_data["completed_at"] = updates["completion_time"]

            # Store findings_summary in progress_json if provided
            if "findings_summary" in updates:
                try:
                    # Ensure domain_findings are included in findings_summary
                    findings_summary = updates["findings_summary"].copy()

                    # Get domain_findings from progress_json if not already in findings_summary
                    if "domain_findings" not in findings_summary and progress_data.get(
                        "domain_findings"
                    ):
                        findings_summary["domain_findings"] = progress_data[
                            "domain_findings"
                        ]
                        logger.debug(
                            f"Added domain_findings to findings_summary for {investigation_id}"
                        )

                    # CRITICAL: Ensure overall_risk_score is set from risk_score if available
                    # This ensures investigations have overall_risk_score for comparison metrics
                    if (
                        "risk_score" in findings_summary
                        and findings_summary["risk_score"] is not None
                    ):
                        findings_summary["overall_risk_score"] = findings_summary[
                            "risk_score"
                        ]
                        logger.debug(
                            f"Set overall_risk_score={findings_summary['risk_score']} from risk_score for investigation {investigation_id}"
                        )
                    elif progress_data.get("risk_score") is not None:
                        # Fallback: use risk_score from progress_data if not in findings_summary
                        findings_summary["overall_risk_score"] = progress_data[
                            "risk_score"
                        ]
                        logger.debug(
                            f"Set overall_risk_score={progress_data['risk_score']} from progress_data for investigation {investigation_id}"
                        )

                    # Merge findings_summary into progress_data
                    progress_data.update(findings_summary)
                    logger.debug(
                        f"Updated progress_json with findings_summary for investigation {investigation_id}"
                    )
                except Exception as json_error:
                    logger.error(
                        f"Failed to merge findings_summary into progress_json: {str(json_error)}",
                        exc_info=True,
                    )
                    # Don't fail the entire update if JSON serialization fails

            # CRITICAL FIX: Extract risk score from domain_findings.risk.risk_score if not already set or invalid
            # This handles parallel graph investigations where finalize_risk() is not called
            # The risk agent calculates the score and stores it in domain_findings.risk.risk_score
            # but it may not be copied to the top-level risk_score/overall_risk_score
            # Also handles cases where risk_score is invalid (> 1.0) and needs to be replaced
            current_risk_score = progress_data.get("risk_score")
            if (
                current_risk_score is None
                or current_risk_score == 0
                or (
                    isinstance(current_risk_score, (int, float))
                    and current_risk_score > 1.0
                )
            ):
                if (
                    isinstance(current_risk_score, (int, float))
                    and current_risk_score > 1.0
                ):
                    logger.warning(
                        f"⚠️ Invalid risk_score={current_risk_score} detected for investigation {investigation_id}, "
                        f"attempting to extract correct score from domain_findings.risk.risk_score"
                    )
                domain_findings = progress_data.get("domain_findings", {})
                if isinstance(domain_findings, dict):
                    risk_domain = domain_findings.get("risk", {})
                    if isinstance(risk_domain, dict):
                        risk_score_from_domain = risk_domain.get(
                            "risk_score"
                        ) or risk_domain.get("score")
                        if risk_score_from_domain is not None:
                            try:
                                risk_score_float = float(risk_score_from_domain)
                                # Validate it's in [0, 1] range
                                if 0 <= risk_score_float <= 1.0:
                                    old_score = (
                                        current_risk_score
                                        if current_risk_score is not None
                                        else "None/0"
                                    )
                                    progress_data["risk_score"] = risk_score_float
                                    progress_data["overall_risk_score"] = (
                                        risk_score_float
                                    )
                                    logger.info(
                                        f"✅ Extracted risk_score={risk_score_float:.3f} from domain_findings.risk.risk_score "
                                        f"for investigation {investigation_id} (replaced invalid score: {old_score})"
                                    )
                                else:
                                    logger.warning(
                                        f"⚠️ Risk score from domain_findings.risk.risk_score is out of range: {risk_score_float} "
                                        f"for investigation {investigation_id}"
                                    )
                            except (ValueError, TypeError) as e:
                                logger.warning(
                                    f"⚠️ Failed to extract risk_score from domain_findings.risk.risk_score: {e} "
                                    f"for investigation {investigation_id}"
                                )

            # Save progress back to database
            state.progress_json = json.dumps(progress_data)

            # Update timestamp and version
            state.updated_at = datetime.now(timezone.utc)
            state.version = from_version + 1

            # Flush to ensure SQLAlchemy tracks all changes before commit
            db.flush()

            # Persist state changes
            db.commit()

            # Log verification after commit
            if "findings_summary" in updates:
                logger.debug(
                    f"Committed progress_json with findings_summary for investigation {investigation_id}"
                )

            # Create audit entry for this update with enhanced payload
            try:
                # Build enhanced payload with more context
                enhanced_payload = updates.copy()

                # Add progress context for PROGRESS and PHASE_CHANGE events
                if action_type in ["PROGRESS", "PHASE_CHANGE"]:
                    enhanced_payload.update(
                        {
                            "current_phase": progress_data.get("current_phase"),
                            "progress_percentage": progress_data.get(
                                "percent_complete", 0
                            ),
                            "tool_executions_count": len(
                                progress_data.get("tool_executions", [])
                            ),
                            "completed_tools": sum(
                                1
                                for te in progress_data.get("tool_executions", [])
                                if te.get("status") == "completed"
                            ),
                            "domain_findings_count": len(
                                progress_data.get("domain_findings", {})
                            ),
                            "domains_completed": list(
                                progress_data.get("domain_findings", {}).keys()
                            ),
                        }
                    )

                # Add completion context for COMPLETED events
                if action_type == "COMPLETED":
                    enhanced_payload.update(
                        {
                            "final_status": state.status,
                            "lifecycle_stage": state.lifecycle_stage,
                            "total_domains": len(
                                progress_data.get("domain_findings", {})
                            ),
                            "has_results": bool(
                                state.progress_json
                                and any(
                                    key in progress_data
                                    for key in [
                                        "risk_score",
                                        "findings",
                                        "domain_findings",
                                    ]
                                )
                            ),
                        }
                    )
                    # Include risk score if available
                    # Results are now in progress_json
                    if (
                        progress_data.get("risk_score") is not None
                        or progress_data.get("findings")
                        or progress_data.get("domain_findings")
                    ):
                        try:
                            results_data = progress_data
                            if "risk_score" in results_data:
                                enhanced_payload["final_risk_score"] = results_data[
                                    "risk_score"
                                ]
                        except:
                            pass

                create_audit_entry(
                    db=db,
                    investigation_id=investigation_id,
                    user_id=state.user_id,
                    action_type=action_type,
                    changes_json=json.dumps(enhanced_payload),
                    from_version=from_version,
                    to_version=state.version,
                    source="SYSTEM",
                )
                logger.debug(
                    f"Created audit entry for investigation {investigation_id}: {action_type}"
                )
            except Exception as audit_error:
                logger.error(
                    f"Failed to create audit entry: {str(audit_error)}", exc_info=True
                )
                # Don't fail the entire update if audit fails

            # Format status update log for readability
            if isinstance(updates, dict):
                status = updates.get("status", "unknown")
                completion_time = updates.get("completion_time", "N/A")
                findings_summary = updates.get("findings_summary", {})

                if isinstance(findings_summary, dict):
                    risk_score = findings_summary.get("risk_score", "N/A")
                    summary = findings_summary.get("summary", "")
                    # Truncate summary if too long
                    summary_preview = (
                        summary[:200] + "..." if len(summary) > 200 else summary
                    )

                    logger.info(
                        f"✅ Investigation {investigation_id} status updated: {status} | "
                        f"Risk Score: {risk_score} | "
                        f"Completed: {completion_time}"
                    )
                    if summary:
                        logger.debug(f"   Summary preview: {summary_preview}")
                else:
                    logger.info(
                        f"✅ Investigation {investigation_id} status updated: {status} | Completed: {completion_time}"
                    )
            else:
                logger.info(
                    f"✅ Investigation {investigation_id} status updated: {updates}"
                )

    except Exception as e:
        logger.error(
            f"Failed to persist investigation status update: {str(e)}", exc_info=True
        )


def remove_completed_investigation(investigation_id: str) -> bool:
    """Remove a completed investigation from active tracking"""
    if investigation_id in active_investigations:
        del active_investigations[investigation_id]
        logger.info(f"Removed completed investigation: {investigation_id}")
        return True
    return False


def get_investigation_summary(investigation_id: str) -> Optional[Dict[str, Any]]:
    """Get a summary of an investigation's current state"""
    if investigation_id in active_investigations:
        investigation = active_investigations[investigation_id]
        return {
            "investigation_id": investigation_id,
            "status": investigation.get("status"),
            "current_phase": investigation.get("current_phase"),
            "progress_percentage": investigation.get("progress_percentage"),
            "start_time": investigation.get("start_time"),
            "entity_type": investigation.get("request", {}).get("entity_type"),
            "entity_id": investigation.get("request", {}).get("entity_id"),
        }
    return None


def list_active_investigations() -> List[Dict[str, Any]]:
    """List all currently active investigations with summary information"""
    summaries = []
    for investigation_id in active_investigations:
        summary = get_investigation_summary(investigation_id)
        if summary:
            summaries.append(summary)
    return summaries
