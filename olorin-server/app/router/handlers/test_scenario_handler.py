"""
Test Scenario Handler for Structured Investigations
This module handles test scenario management and validation logic.
"""

from typing import Any, Dict, List

from fastapi import HTTPException

from app.service.logging import get_bridge_logger
from app.test.data.mock_transactions.mock_data_loader import (
    list_available_test_scenarios,
    validate_investigation_outcome,
)

logger = get_bridge_logger(__name__)


async def list_test_scenarios() -> Dict[str, List[str]]:
    """
    List all available test scenarios for structured investigations.

    Returns:
        Dict mapping scenario categories to scenario names
    """
    try:
        scenarios = list_available_test_scenarios()
        return scenarios
    except Exception as e:
        logger.error(f"Failed to list scenarios: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to list scenarios: {str(e)}"
        )


async def validate_investigation_results(
    investigation_id: str,
    results: Dict[str, Any],
    active_investigations: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Validate structured investigation results against expected outcomes.

    This function validates investigation quality and accuracy
    against predefined scenarios.

    Args:
        investigation_id: The investigation ID to validate
        results: Investigation results to validate
        active_investigations: Current active investigations tracking

    Returns:
        Dict containing validation status and results
    """
    if investigation_id not in active_investigations:
        raise HTTPException(
            status_code=404, detail=f"Investigation {investigation_id} not found"
        )

    try:
        investigation = active_investigations[investigation_id]
        scenario_name = investigation["request"].get("scenario")

        if not scenario_name:
            return {
                "investigation_id": investigation_id,
                "validation_status": "skipped",
                "message": "No scenario specified for validation",
            }

        # Validate results against expected outcomes
        validation_results = validate_investigation_outcome(scenario_name, results)

        return {
            "investigation_id": investigation_id,
            "validation_status": "completed",
            "validation_results": validation_results,
        }

    except Exception as e:
        logger.error(f"Failed to validate investigation results: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")
