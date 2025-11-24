import logging
from app.service.logging import get_bridge_logger

from fastapi import FastAPI

from app.router import agent_router
from app.service.agent.agent import create_and_get_agent_graph

logger = get_bridge_logger(__name__)


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
    # Initialize traditional graphs for backward compatibility
    # These will be used when no investigation_id is available
<<<<<<< HEAD
    app.state.graph_parallel = await create_and_get_agent_graph(parallel=True)
    app.state.graph_sequential = await create_and_get_agent_graph(parallel=False)
    logger.info("Both parallel and sequential graphs initialized")
=======
    # Continue if graph creation fails (non-critical)
    try:
        app.state.graph_parallel = await create_and_get_agent_graph(parallel=True)
        logger.info("✅ Parallel graph initialized")
    except Exception as e:
        logger.warning(f"⚠️ Failed to initialize parallel graph (non-critical): {e}")
        app.state.graph_parallel = None
    
    try:
        app.state.graph_sequential = await create_and_get_agent_graph(parallel=False)
        logger.info("✅ Sequential graph initialized")
    except Exception as e:
        logger.warning(f"⚠️ Failed to initialize sequential graph (non-critical): {e}")
        app.state.graph_sequential = None
    
    if app.state.graph_parallel or app.state.graph_sequential:
        logger.info("✅ At least one agent graph initialized")
    else:
        logger.warning("⚠️ No agent graphs initialized - agent features will be unavailable")
>>>>>>> 001-modify-analyzer-method
    
    # Initialize hybrid system feature flags
    try:
        from app.service.agent.orchestration.hybrid.migration_utilities import get_feature_flags
        feature_flags = get_feature_flags()
        app.state.hybrid_feature_flags = feature_flags
        logger.info("🧠 Hybrid Intelligence Graph system initialized")
        logger.info(f"🚩 Feature flags status:")
        for flag_name in ["hybrid_graph_v1", "ai_confidence_engine", "ab_test_hybrid_vs_clean"]:
            status = feature_flags.get_flag_status(flag_name)
            enabled = status.get("enabled", False)
            rollout = status.get("rollout_percentage", 0)
            logger.info(f"   {flag_name}: {'✅' if enabled else '❌'} ({rollout}% rollout)")
    except ImportError:
        logger.info("🧠 Hybrid system not available, using traditional graphs only")
        app.state.hybrid_feature_flags = None
    except Exception as e:
        logger.warning(f"🧠 Failed to initialize hybrid system: {e}")
        app.state.hybrid_feature_flags = None
    
    app.include_router(agent_router.router)
