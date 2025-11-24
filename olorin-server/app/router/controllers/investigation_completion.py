"""
Investigation Completion - Results Processing Logic
This module contains the results processing and completion logic for structured investigations.
"""
import logging
import re
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from app.service.logging.autonomous_investigation_logger import structured_investigation_logger
from app.service.agent.journey_tracker import journey_tracker
from app.router.models.autonomous_investigation_models import StructuredInvestigationRequest
from app.router.controllers.investigation_controller import update_investigation_status
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def _execute_results_processing_phase(
    investigation_id: str, 
    result: str, 
    request: StructuredInvestigationRequest
):
    """Execute the results processing phase"""
    
    # Phase 4: Process REAL agent results
    # Always log phases for monitoring and testing
    structured_investigation_logger.log_investigation_progress(
        investigation_id=investigation_id,
        progress_type="phase_progress",
        current_phase="results_processing",
        completed_phases=["agent_initialization", "context_preparation", "agent_execution"],
        findings_summary={"current_phase_description": "Processing REAL agent findings and results"},
        risk_score_progression=[],
        agent_status={"results_processing": "active"},
        estimated_completion_time=None
    )
    
    update_investigation_status(investigation_id, {
        "current_phase": "results_processing",
        "progress_percentage": 85.0
    })

    # Extract actual results from the agent execution
    investigation_result = result if result else ""
    final_risk_score = extract_risk_score_from_result(investigation_result)
    
    if investigation_result:
        logger.info(f"📋 REAL AGENT RESULT CONTENT: {investigation_result[:500]}...")
    
    return final_risk_score, investigation_result


async def _complete_investigation(
    investigation_id: str, 
    result: str, 
    request: StructuredInvestigationRequest
):
    """Complete the investigation with final results"""
    
    final_risk_score, investigation_result = await _execute_results_processing_phase(
        investigation_id, result, request
    )
    
    # Complete the journey tracking with REAL results
    if request.enable_journey_tracking:
        final_state = {
            "investigation_status": "completed",
            "final_risk_score": final_risk_score,
            "investigation_outcome": categorize_investigation_outcome(final_risk_score),
            "agent_execution_duration_ms": 0,  # Will be updated
            "real_agent_execution": True
        }
        journey_tracker.complete_journey(investigation_id, final_state)
    
    # Phase 5: Complete with REAL results
    update_investigation_status(investigation_id, {
        "current_phase": "completion",
        "progress_percentage": 100.0,
        "status": "completed"
    })
    
    # Always log completion for monitoring and testing
    structured_investigation_logger.log_investigation_progress(
        investigation_id=investigation_id,
        progress_type="completed",
        current_phase="completion",
        completed_phases=["agent_initialization", "context_preparation", "agent_execution", "results_processing"],
        findings_summary={
            "investigation_outcome": "REAL structured investigation completed",
            "agent_result_length": len(investigation_result),
            "execution_duration_ms": 0,  # Will be updated
            "real_llm_execution": True
        },
        risk_score_progression=[{"risk_score": final_risk_score}] if final_risk_score is not None else [],
        agent_status={"completion": "completed"},
        estimated_completion_time=None
    )

    # Update final status with REAL results
    # Structure findings_summary to match InvestigationResults schema:
    # - risk_score: Optional[int] (0-100) - NO FALLBACKS, use None if not found
    # - findings: List[Dict[str, Any]] (optional, defaults to empty list)
    # - summary: Optional[str] (optional)
    # - completed_at: Optional[datetime] (optional)
    risk_score_int = int(final_risk_score) if final_risk_score is not None else None
    if risk_score_int is not None:
        risk_score_int = max(0, min(100, risk_score_int))  # Clamp to 0-100 range
    
    update_investigation_status(investigation_id, {
        "status": "completed",
        "completion_time": datetime.now(timezone.utc).isoformat(),
        "findings_summary": {
            "risk_score": risk_score_int,  # Required field for InvestigationResults
            "findings": [
                {
                    "investigation_outcome": "REAL structured investigation completed",
                    "total_agents_used": 5,  # Device, Location, Network, Logs, Risk
                    "investigation_duration_ms": 0,  # Will be updated
                    "real_agent_execution": True
                }
            ],
            "summary": extract_investigation_summary(investigation_result),
            "completed_at": datetime.now(timezone.utc).isoformat()
        }
    })
    
    logger.info(f"Completed structured investigation: {investigation_id}")


def extract_risk_score_from_result(result: str) -> Optional[int]:
    """
    Extract risk score from agent result text.
    NO FALLBACKS - only returns real numeric scores found in the text.
    Returns None if no explicit numeric score is found.
    """
    if not result:
        return None  # NO FALLBACK - return None if no result
    
    result_lower = result.lower()
    
    # Look for explicit risk scores first
    # Try to find numerical risk scores (0-100)
    risk_score_match = re.search(r'risk.{0,20}score.{0,20}(\d{1,3})', result_lower)
    if risk_score_match:
        score = int(risk_score_match.group(1))
        return min(100, max(0, score))  # Clamp to 0-100 range
    
    # Try to find percentage scores
    percentage_match = re.search(r'(\d{1,3})%', result_lower)
    if percentage_match:
        score = int(percentage_match.group(1))
        return min(100, max(0, score))
    
    # NO FALLBACKS - if no explicit numeric score found, return None
    return None


def extract_investigation_summary(result: str, max_length: int = 1000) -> str:
    """Extract a summary from the investigation result"""
    
    if not result:
        return "No detailed investigation result available"
    
    # Truncate to max_length if needed
    if len(result) <= max_length:
        return result
    
    # Try to find a good truncation point (sentence boundary)
    truncated = result[:max_length]
    last_sentence = truncated.rfind('.')
    
    if last_sentence > max_length * 0.8:  # If we can keep most of the text
        return truncated[:last_sentence + 1] + "..."
    else:
        return truncated + "..."


def categorize_investigation_outcome(risk_score: Optional[int]) -> str:
    """Categorize investigation outcome based on risk score"""
    
    # Handle None risk_score
    if risk_score is None:
        return "unknown_risk"
    
    if risk_score >= 80:
        return "high_fraud_risk"
    elif risk_score >= 60:
        return "moderate_fraud_risk"
    elif risk_score >= 40:
        return "low_fraud_risk"
    elif risk_score >= 20:
        return "minimal_risk"
    else:
        return "legitimate"