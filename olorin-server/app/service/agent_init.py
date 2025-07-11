import logging

from fastapi import FastAPI

from app.router import agent_router
from app.service.agent.agent import create_and_get_agent_graph

logger = logging.getLogger(__name__)


def validate_user_authorization(olorin_header) -> bool:
    """
    Validate user authorization including AAL level and fraudulent user checks.

    Args:
        olorin_header: Header containing authentication context

    Returns:
        bool: True if user is authorized, False otherwise
    """
    try:
        auth_context = olorin_header.auth_context

        # Check if user authentication context exists
        if not auth_context or not auth_context.olorin_user_id:
            logger.warning("Missing authentication context or user ID")
            return False

        # Placeholder for AAL (Authentication Assurance Level) validation
        # In production, this would validate against user's AAL requirements
        user_id = auth_context.olorin_user_id

        # Placeholder for fraudulent user checks
        # In production, this would check against fraud user blacklist/risk scores
        if user_id.startswith("fraud_") or user_id.startswith("blocked_"):
            logger.warning(f"Access denied for potentially fraudulent user: {user_id}")
            return False

        logger.debug(f"User authorization validated for user: {user_id}")
        return True

    except Exception as e:
        logger.error(f"Error validating user authorization: {e}")
        return False


async def initialize_agent(app: FastAPI):
    # Initialize both parallel and sequential graphs
    app.state.graph_parallel = create_and_get_agent_graph(parallel=True)
    app.state.graph_sequential = create_and_get_agent_graph(parallel=False)
    logger.info("Both parallel and sequential graphs initialized")
    app.include_router(agent_router.router)
