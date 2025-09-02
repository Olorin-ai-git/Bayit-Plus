#!/usr/bin/env python3
"""Simple test to see what autonomous_network_agent returns."""

import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.service.agent.autonomous_context import (
    AutonomousInvestigationContext,
    EntityType,
)
from app.service.agent.autonomous_agents import autonomous_network_agent
from langchain_core.runnables.config import RunnableConfig


async def test_single_agent():
    """Test what a single agent returns."""
    # Set mock environment
    os.environ["USE_MOCK_IPS_CACHE"] = "true"
    
    # Create simple context
    context = AutonomousInvestigationContext(
        investigation_id="test_123",
        entity_id="test_entity_123",
        entity_type=EntityType.USER_ID,
        investigation_type="fraud_investigation"
    )
    
    # Create config with context
    config = RunnableConfig(
        tags=["test"],
        metadata={"test_type": "debug"},
        configurable={"agent_context": context}
    )
    
    print("Testing autonomous_network_agent...")
    result = await autonomous_network_agent(context, config)
    
    print(f"Result type: {type(result)}")
    print(f"Result: {result}")
    
    if hasattr(result, '__dict__'):
        print(f"Result attributes: {result.__dict__}")


if __name__ == "__main__":
    asyncio.run(test_single_agent())