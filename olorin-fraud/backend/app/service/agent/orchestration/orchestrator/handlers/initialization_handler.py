"""
Initialization Handler

Handles the initialization phase of investigations.
"""

from typing import Any, Dict

from langchain_core.messages import SystemMessage

from app.service.agent.orchestration.state_schema import InvestigationState
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class InitializationHandler:
    """Handles the initialization phase of investigations."""

    @staticmethod
    async def handle_initialization(state: InvestigationState) -> Dict[str, Any]:
        """Handle the initialization phase."""
        logger.debug(
            "[Step 3.2.3.1] Initialization Handler entry - Creating initial system message"
        )

        logger.info(
            f"🚀 Starting investigation for {state['entity_type']}: {state['entity_id']}"
        )
        logger.debug(f"🚀 INITIALIZATION PHASE DEBUG:")
        logger.debug(f"   Investigation ID: {state['investigation_id']}")
        logger.debug(f"   Entity type: {state['entity_type']}")
        logger.debug(f"   Entity ID: {state['entity_id']}")

        # Get configuration from state
        date_range_days = state.get("date_range_days", 7)
        logger.debug(f"   Date range: {date_range_days} days")
        logger.debug(
            f"[Step 3.2.3.1] Configuration retrieved: {date_range_days}-day lookback analysis"
        )

        # Create initial message
        init_message = SystemMessage(
            content=f"""
        Starting comprehensive fraud investigation.
        Investigation ID: {state['investigation_id']}
        Entity: {state['entity_type']} - {state['entity_id']}

        Investigation phases:
        1. Snowflake Analysis ({date_range_days}-day lookback) - MANDATORY
        2. Tool Execution (based on Snowflake findings)
        3. Domain Analysis (6 specialized agents)
        4. Risk Assessment and Summary
        """
        )

        # Immediately move to Snowflake analysis phase
        logger.debug(
            "[Step 3.2.3.1] Immediate transition to 'snowflake_analysis' phase - No analysis in initialization"
        )
        logger.info("📊 Moving from initialization to snowflake_analysis phase")

        logger.debug(
            "   ✅ Initialization complete, moving to snowflake_analysis phase"
        )
        logger.debug(
            "[Step 3.2.3.1] Return state: {'messages': [SystemMessage], 'current_phase': 'snowflake_analysis'}"
        )

        return {"messages": [init_message], "current_phase": "snowflake_analysis"}
