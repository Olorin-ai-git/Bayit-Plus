#!/usr/bin/env python3
"""
Test script to verify LangGraph journey initialization is working correctly.

This script runs a simple investigation to ensure journey tracking is initialized
before agents execute, preventing "No active journey" warnings.
"""

import asyncio
import sys
import os

# Add the server directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app.service.agent.journey_tracker import get_journey_tracker
from app.service.agent.orchestration.investigation_coordinator import start_investigation
from app.models.agent_context import AgentContext
from app.service.agent.autonomous_context import EntityType
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def test_journey_initialization():
    """Test that journey tracking is properly initialized."""
    
    logger.info("🧪 Testing LangGraph journey initialization...")
    
    # Create test investigation context
    investigation_id = "test-journey-init-001"
    entity_id = "test-entity-123"
    entity_type = EntityType.IP_ADDRESS
    
    # Create agent context
    agent_context = AgentContext(
        entity_id=entity_id,
        entity_type=entity_type,
        metadata={
            "investigation_id": investigation_id,
            "entityId": entity_id,
            "entityType": entity_type.value,
            "additional_metadata": {
                "test": True,
                "purpose": "journey_initialization_test"
            }
        }
    )
    
    # Create config for start_investigation
    config = {
        "configurable": {
            "thread_id": "test-thread",
            "agent_context": agent_context,
            "request": None
        }
    }
    
    # Get journey tracker
    journey_tracker = get_journey_tracker()
    
    # Check journey status before initialization
    logger.info(f"📊 Journey status before start_investigation:")
    logger.info(f"   Active journeys: {len(journey_tracker._active_journeys)}")
    
    # Call start_investigation which should initialize journey tracking
    try:
        state = {"messages": []}
        result = await start_investigation(state, config)
        
        logger.info("✅ start_investigation completed successfully")
        
        # Check journey status after initialization
        logger.info(f"📊 Journey status after start_investigation:")
        logger.info(f"   Active journeys: {len(journey_tracker._active_journeys)}")
        logger.info(f"   Investigation {investigation_id} tracked: {investigation_id in journey_tracker._active_journeys}")
        
        if investigation_id in journey_tracker._active_journeys:
            journey = journey_tracker._active_journeys[investigation_id]
            logger.info(f"   Journey status: {journey.status}")
            logger.info(f"   Journey start time: {journey.start_timestamp}")
            logger.info(f"   Journey metadata keys: {list(journey.journey_metadata.keys())}")
            
            return True
        else:
            logger.error(f"❌ Investigation {investigation_id} not found in active journeys")
            return False
            
    except Exception as e:
        logger.error(f"❌ start_investigation failed: {e}")
        return False


async def main():
    """Main test function."""
    logger.info("🚀 Starting journey initialization test...")
    
    success = await test_journey_initialization()
    
    if success:
        logger.info("✅ Journey initialization test PASSED!")
        logger.info("   LangGraph journey tracking is properly initialized")
        logger.info("   No more 'No active journey' warnings should occur")
        return 0
    else:
        logger.error("❌ Journey initialization test FAILED!")
        logger.error("   Journey tracking is not working correctly")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)