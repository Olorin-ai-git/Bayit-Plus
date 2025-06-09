import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from starlette.requests import Request

from app.persistence import ensure_investigation_exists
from app.service.network_analysis_service import NetworkAnalysisService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/network")


@router.get("/{user_id}")
async def analyze_network(
    user_id: str,
    request: Request,
    investigation_id: str,
    time_range: str = "1m",
    splunk_host: Optional[str] = None,
    raw_splunk_override: Optional[List[Dict[str, Any]]] = None,
) -> dict:
    """Analyze network risk for a user.

    This is a thin wrapper around NetworkAnalysisService.analyze_network().
    The actual business logic is handled by the service layer.
    """
    try:
        logger.info(f"=== NETWORK ENDPOINT HIT (router) ===")
        logger.info(f"Network risk analysis requested for user: {user_id}")

        # Ensure investigation exists
        ensure_investigation_exists(investigation_id, user_id)

        # Delegate to service layer
        service = NetworkAnalysisService()
        result = await service.analyze_network(
            user_id=user_id,
            request=request,
            investigation_id=investigation_id,
            time_range=time_range,
            splunk_host=splunk_host,
            raw_splunk_override=raw_splunk_override,
        )

        return result

    except Exception as e:
        logger.error(f"Error in network router for user {user_id}: {e}", exc_info=True)
        # Return a fallback response
        fallback_assessment = {
            "risk_level": 0.0,
            "risk_factors": [f"Error: {str(e)}"],
            "anomaly_details": [],
            "confidence": 0.0,
            "summary": "Error during network risk assessment.",
            "thoughts": "No LLM assessment due to error.",
        }
        return {
            "user_id": user_id,
            "raw_splunk_results_count": 0,
            "extracted_network_signals": [],
            "network_risk_assessment": fallback_assessment,
        }
