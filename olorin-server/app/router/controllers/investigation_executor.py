"""
Investigation Executor for Autonomous Investigations
This module contains the main background task execution orchestration for autonomous investigations.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any

from app.service.agent.recursion_guard import get_recursion_guard
from app.router.models.autonomous_investigation_models import AutonomousInvestigationRequest
from app.router.controllers.investigation_controller_v2 import update_investigation_status

logger = logging.getLogger(__name__)


async def execute_autonomous_investigation(
    investigation_id: str,
    investigation_context: Dict[str, Any],
    request: AutonomousInvestigationRequest
):
    """
    Execute REAL autonomous investigation using actual LangGraph agents and LLM calls.
    
    This function coordinates all REAL agents, tracks progress, and manages
    the complete investigation workflow with actual AI execution.
    
    Args:
        investigation_id: The unique investigation identifier
        investigation_context: Context data for the investigation
        request: The original investigation request parameters
    """
    logger.info(f"⚙️ BACKGROUND TASK STARTED: execute_autonomous_investigation for {investigation_id}")
    logger.info(f"🚀🚀🚀 STARTING BACKGROUND INVESTIGATION: {investigation_id}")
    
    try:
        logger.info(f"🚀 STARTING REAL AUTONOMOUS INVESTIGATION: {investigation_id}")
        
        # ===== CREATE RECURSION GUARD CONTEXT =====
        recursion_guard = get_recursion_guard()
        # Match the thread_id format used by AgentContext: "{session_id}-{olorin_experience_id}"
        # Since olorin_experience_id will be None in autonomous mode, the format is "{investigation_id}-None"
        thread_id = f"{investigation_id}-None"
        
        recursion_context = recursion_guard.create_context(
            investigation_id=investigation_id,
            thread_id=thread_id,
            max_depth=15,
            max_tool_calls=50,
            max_duration_seconds=600
        )
        
        logger.info(f"🛡️ Created RecursionGuard context for investigation {investigation_id} with thread_id {thread_id}")
        
        # Update investigation status
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
        from .investigation_executor_completion import _execute_results_processing_phase, _complete_investigation
        await _execute_results_processing_phase(investigation_id, result, request)
        await _complete_investigation(investigation_id, result, request)
        
        # Clean up RecursionGuard context
        try:
            recursion_guard.remove_context(investigation_id, thread_id)
            logger.info(f"🛡️ Cleaned up RecursionGuard context for investigation {investigation_id}")
        except Exception as cleanup_error:
            logger.warning(f"Failed to cleanup RecursionGuard context: {cleanup_error}")
        
        logger.info(f"Completed autonomous investigation: {investigation_id}")
        
    except Exception as e:
        logger.error(f"Autonomous investigation failed: {str(e)}")
        
        # Clean up RecursionGuard context on failure
        try:
            recursion_guard.remove_context(investigation_id, f"{investigation_id}-None")
            logger.info(f"🛡️ Cleaned up RecursionGuard context after failure for investigation {investigation_id}")
        except Exception as cleanup_error:
            logger.warning(f"Failed to cleanup RecursionGuard context after failure: {cleanup_error}")
        
        update_investigation_status(investigation_id, {
            "status": "failed",
            "error_message": str(e),
            "completion_time": datetime.now(timezone.utc).isoformat()
        })


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