"""
Tool Execution Service
Feature: Tool Execution Persistence

Service for persisting agent tool executions to database and retrieving them for progress tracking.
Connects the structured_investigation_logger to database persistence layer.

SYSTEM MANDATE Compliance:
- No hardcoded values: All data from actual execution
- Complete implementation: Fully functional persistence
- Type-safe: All parameters and returns properly typed
- No mocks/stubs: Real database operations only
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from decimal import Decimal
import json
import uuid
from sqlalchemy.orm import Session

from app.models.investigation_state import InvestigationState
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def _serialize_datetime_for_json(obj: Any) -> Any:
    """
    Recursively convert non-JSON-serializable objects for JSON serialization.

    Handles:
    - datetime objects -> ISO format strings
    - Decimal objects -> float (for numeric database columns)
    - bytes objects -> string (decoded as UTF-8)
    - dict, list, tuple -> recursive serialization

    Args:
        obj: Object that may contain non-JSON-serializable types

    Returns:
        Object with all types converted to JSON-serializable format
    """
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, bytes):
        return obj.decode('utf-8', errors='replace')
    elif isinstance(obj, dict):
        return {key: _serialize_datetime_for_json(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [_serialize_datetime_for_json(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(_serialize_datetime_for_json(item) for item in obj)
    else:
        return obj


class ToolExecutionService:
    """Service for persisting and retrieving tool executions"""

    def __init__(self, db: Session):
        """Initialize service with database session"""
        self.db = db

    def persist_tool_execution(
        self,
        investigation_id: str,
        agent_name: str,
        tool_name: str,
        status: str,
        input_parameters: Dict[str, Any],
        output_result: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        duration_ms: Optional[int] = None,
        tokens_used: Optional[int] = None,
        cost: Optional[float] = None
    ) -> str:
        """
        Persist tool execution to database in progress_json field

        Args:
            investigation_id: Investigation identifier
            agent_name: Name of the agent executing tool
            tool_name: Name of the tool being executed
            status: Execution status (pending, running, completed, failed)
            input_parameters: Tool input parameters
            output_result: Tool execution result (if completed)
            error_message: Error message (if failed)
            duration_ms: Execution duration in milliseconds
            tokens_used: Number of tokens consumed (for LLM tools)
            cost: Estimated cost of execution

        Returns:
            Tool execution ID

        Raises:
            ValueError: If investigation not found
        """
        try:
            # Get current investigation state
            state = self.db.query(InvestigationState).filter(
                InvestigationState.investigation_id == investigation_id
            ).first()

            if not state:
                raise ValueError(f"Investigation {investigation_id} not found")

            # CRITICAL: Initialize progress_json if NULL
            if not state.progress_json:
                logger.info(f"Initializing progress_json for investigation {investigation_id}")
                initial_progress = {
                    "status": "running",
                    "lifecycle_stage": state.lifecycle_stage.lower() if state.lifecycle_stage else "in_progress",
                    "percent_complete": 0,
                    "tool_executions": [],
                    "current_phase": "initialization",
                    "started_at": datetime.now(timezone.utc).isoformat(),
                    "created_at": (state.created_at.isoformat() if state.created_at else datetime.now(timezone.utc).isoformat())
                }
                state.progress_json = json.dumps(initial_progress)
                state.version = (state.version or 0) + 1
                self.db.commit()
                logger.info(f"✅ Initialized progress_json for investigation {investigation_id}")

            # Parse existing progress or create new
            progress_data = json.loads(state.progress_json) if state.progress_json else {}

            # Initialize tool_executions list if not exists
            if "tool_executions" not in progress_data:
                progress_data["tool_executions"] = []

            # Create new tool execution entry
            tool_exec_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc)

            tool_execution = {
                "id": tool_exec_id,
                "agent_name": agent_name,
                "agent_type": agent_name.replace("_agent", "") if "_agent" in agent_name else agent_name,
                "tool_name": tool_name,
                "tool_type": tool_name,
                "status": status,
                "started_at": now.isoformat() if status in ["running", "completed", "failed"] else None,
                "completed_at": now.isoformat() if status in ["completed", "failed"] else None,
                "duration_ms": duration_ms,
                "input_parameters": input_parameters,
                "output_result": output_result,
                "error_message": error_message,
                "tokens_used": tokens_used,
                "cost": cost,
                "timestamp": now.isoformat()
            }

            # Append to tool executions
            progress_data["tool_executions"].append(tool_execution)

            # Update progress percentage based on completed tools
            total_tools = len(progress_data["tool_executions"])
            completed_tools = sum(1 for t in progress_data["tool_executions"] if t["status"] == "completed")
            progress_data["percent_complete"] = int((completed_tools / total_tools * 100) if total_tools > 0 else 0)

            # Update current phase if provided
            if agent_name:
                phase_mapping = {
                    "device_agent": "device_analysis",
                    "location_agent": "location_analysis",
                    "network_agent": "network_analysis",
                    "logs_agent": "logs_analysis",
                    "authentication_agent": "authentication_analysis",
                    "risk_agent": "risk_assessment"
                }
                progress_data["current_phase"] = phase_mapping.get(agent_name, "processing")

            # Serialize datetime objects before JSON encoding
            serialized_progress_data = _serialize_datetime_for_json(progress_data)

            # Save back to database
            state.progress_json = json.dumps(serialized_progress_data)
            state.updated_at = datetime.now(timezone.utc)

            # Update version for optimistic locking
            state.version = (state.version or 0) + 1

            self.db.commit()

            logger.info(
                f"Persisted tool execution {tool_exec_id} for investigation {investigation_id}: "
                f"{agent_name}/{tool_name} - {status}"
            )

            return tool_exec_id

        except Exception as e:
            logger.error(f"Failed to persist tool execution: {str(e)}", exc_info=True)
            self.db.rollback()
            raise

    def get_tool_executions(self, investigation_id: str) -> List[Dict[str, Any]]:
        """
        Get all tool executions for an investigation

        Args:
            investigation_id: Investigation identifier

        Returns:
            List of tool execution records
        """
        try:
            state = self.db.query(InvestigationState).filter(
                InvestigationState.investigation_id == investigation_id
            ).first()

            if not state or not state.progress_json:
                return []

            progress_data = json.loads(state.progress_json)
            return progress_data.get("tool_executions", [])

        except Exception as e:
            logger.error(f"Failed to get tool executions: {str(e)}", exc_info=True)
            return []

    def update_tool_execution_status(
        self,
        investigation_id: str,
        tool_exec_id: str,
        status: str,
        output_result: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        duration_ms: Optional[int] = None
    ) -> bool:
        """
        Update status of an existing tool execution

        Args:
            investigation_id: Investigation identifier
            tool_exec_id: Tool execution identifier
            status: New status
            output_result: Execution result (if completed)
            error_message: Error message (if failed)
            duration_ms: Actual execution duration

        Returns:
            True if updated successfully, False otherwise
        """
        try:
            state = self.db.query(InvestigationState).filter(
                InvestigationState.investigation_id == investigation_id
            ).first()

            if not state or not state.progress_json:
                return False

            progress_data = json.loads(state.progress_json)
            tool_executions = progress_data.get("tool_executions", [])

            # Find and update the specific tool execution
            for tool_exec in tool_executions:
                if tool_exec.get("id") == tool_exec_id:
                    tool_exec["status"] = status

                    if status in ["completed", "failed"]:
                        tool_exec["completed_at"] = datetime.now(timezone.utc).isoformat()

                    if output_result is not None:
                        tool_exec["output_result"] = output_result

                    if error_message is not None:
                        tool_exec["error_message"] = error_message

                    if duration_ms is not None:
                        tool_exec["duration_ms"] = duration_ms

                    # Recalculate progress
                    total_tools = len(tool_executions)
                    completed_tools = sum(1 for t in tool_executions if t["status"] == "completed")
                    progress_data["percent_complete"] = int((completed_tools / total_tools * 100) if total_tools > 0 else 0)

                    # Serialize datetime objects before JSON encoding
                    serialized_progress_data = _serialize_datetime_for_json(progress_data)

                    # Save back to database
                    state.progress_json = json.dumps(serialized_progress_data)
                    state.updated_at = datetime.now(timezone.utc)
                    new_version = (state.version or 0) + 1
                    state.version = new_version

                    self.db.commit()

                    # Create audit entry for tool execution event (only for completed/failed)
                    if status in ["completed", "failed"]:
                        try:
                            from app.service.audit_helper import create_audit_entry
                            
                            # Create rich payload with tool execution details
                            payload = {
                                "tool_name": tool_exec.get("tool_name"),
                                "tool_exec_id": tool_exec_id,
                                "status": status,
                                "agent_type": tool_exec.get("agent_type"),
                                "execution_time_ms": duration_ms or tool_exec.get("duration_ms", 0),
                                "has_result": bool(output_result),
                                "has_error": bool(error_message),
                                "error_message": error_message[:200] if error_message else None,  # Truncate long errors
                                # Include summary of output result (first 300 chars)
                                "result_preview": (
                                    str(output_result)[:300] if output_result
                                    else None
                                )
                            }
                            
                            create_audit_entry(
                                db=self.db,
                                investigation_id=investigation_id,
                                user_id="SYSTEM",  # Tool executions run as SYSTEM
                                action_type="TOOL_EXECUTION",
                                changes_json=json.dumps(payload),  # Payload is the changes_json directly
                                from_version=state.version - 1,
                                to_version=state.version,
                                source="SYSTEM"
                            )
                            self.db.commit()
                        except Exception as audit_error:
                            # Don't fail tool execution update if audit entry creation fails
                            logger.warning(f"Failed to create audit entry for tool execution: {str(audit_error)}")

                    logger.info(f"Updated tool execution {tool_exec_id} status to {status}")
                    return True

            logger.warning(f"Tool execution {tool_exec_id} not found")
            return False

        except Exception as e:
            logger.error(f"Failed to update tool execution status: {str(e)}", exc_info=True)
            self.db.rollback()
            return False

    def get_latest_tool_executions(
        self,
        investigation_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get the latest N tool executions for an investigation

        Args:
            investigation_id: Investigation identifier
            limit: Maximum number of executions to return

        Returns:
            List of most recent tool execution records
        """
        tool_executions = self.get_tool_executions(investigation_id)

        # Sort by timestamp (most recent first)
        tool_executions.sort(
            key=lambda x: x.get("timestamp", x.get("started_at", "")),
            reverse=True
        )

        return tool_executions[:limit]

    def get_tool_execution_stats(self, investigation_id: str) -> Dict[str, Any]:
        """
        Get statistics about tool executions for an investigation

        Args:
            investigation_id: Investigation identifier

        Returns:
            Statistics dictionary with counts and metrics
        """
        tool_executions = self.get_tool_executions(investigation_id)

        if not tool_executions:
            return {
                "total": 0,
                "completed": 0,
                "failed": 0,
                "running": 0,
                "pending": 0,
                "average_duration_ms": 0,
                "total_tokens": 0,
                "total_cost": 0.0
            }

        # Calculate statistics
        stats = {
            "total": len(tool_executions),
            "completed": sum(1 for t in tool_executions if t.get("status") == "completed"),
            "failed": sum(1 for t in tool_executions if t.get("status") == "failed"),
            "running": sum(1 for t in tool_executions if t.get("status") == "running"),
            "pending": sum(1 for t in tool_executions if t.get("status") == "pending"),
            "average_duration_ms": 0,
            "total_tokens": sum(t.get("tokens_used") or 0 for t in tool_executions),
            "total_cost": sum(t.get("cost") or 0.0 for t in tool_executions)
        }

        # Calculate average duration for completed tools
        completed_durations = [
            t.get("duration_ms", 0)
            for t in tool_executions
            if t.get("status") == "completed" and t.get("duration_ms")
        ]

        if completed_durations:
            stats["average_duration_ms"] = int(sum(completed_durations) / len(completed_durations))

        return stats