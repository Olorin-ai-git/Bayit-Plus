#!/usr/bin/env python3
"""
Test script to verify network agent properly handles missing IP addresses
"""

import asyncio
import json
from app.service.agent.autonomous_context import AutonomousInvestigationContext, EntityType
from app.service.agent.autonomous_agents import autonomous_network_agent
from langchain_core.runnables import RunnableConfig
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

async def test_network_agent_without_ip():
    """Test network agent when no IP address is available"""
    
    # Create context WITHOUT IP address
    context = AutonomousInvestigationContext(
        investigation_id="test_no_ip_001",
        entity_id="TESTUSER123456",
        entity_type=EntityType.USER_ID,
        investigation_type="fraud_investigation"
    )
    
    # Add user data WITHOUT IP address
    context.data_sources["user"] = {
        "user_id": "TESTUSER123456",
        "email": "test@example.com",
        "first_name": "Test",
        "app_id": "test_app"
        # NO ip_address field
    }
    
    context.data_sources["entity"] = {
        "entity_id": "TESTUSER123456",
        "entity_type": "user_id",
        "source": "test"
    }
    
    config = RunnableConfig(
        tags=["test", "no_ip"],
        metadata={
            "investigation_id": context.investigation_id,
            "test": "no_ip_handling"
        },
        configurable={"agent_context": context}
    )
    
    logger.info("=" * 80)
    logger.info("Testing Network Agent WITHOUT IP Address")
    logger.info("=" * 80)
    logger.info(f"Context data sources: {json.dumps(context.data_sources, indent=2)}")
    logger.info("Expected: Agent should SKIP IP-based tools")
    logger.info("-" * 80)
    
    try:
        result = await autonomous_network_agent(context, config)
        logger.info(f"Network Agent Result: {json.dumps(result, indent=2, default=str)}")
        
        if "error" in str(result).lower() and "ip" in str(result).lower():
            logger.error("❌ FAILED: Agent tried to use IP tools without IP address")
        else:
            logger.info("✅ SUCCESS: Agent handled missing IP appropriately")
            
    except Exception as e:
        logger.error(f"❌ Agent failed with error: {e}")

async def test_network_agent_with_ip():
    """Test network agent when IP address IS available"""
    
    # Create context WITH IP address
    context = AutonomousInvestigationContext(
        investigation_id="test_with_ip_001",
        entity_id="TESTUSER789012",
        entity_type=EntityType.USER_ID,
        investigation_type="fraud_investigation"
    )
    
    # Add user data WITH IP address
    context.data_sources["user"] = {
        "user_id": "TESTUSER789012",
        "email": "test@example.com",
        "first_name": "Test",
        "app_id": "test_app",
        "ip_address": "198.51.100.42"  # TEST-NET-2 range
    }
    
    context.data_sources["entity"] = {
        "entity_id": "TESTUSER789012",
        "entity_type": "user_id",
        "source": "test"
    }
    
    config = RunnableConfig(
        tags=["test", "with_ip"],
        metadata={
            "investigation_id": context.investigation_id,
            "test": "with_ip_handling"
        },
        configurable={"agent_context": context}
    )
    
    logger.info("=" * 80)
    logger.info("Testing Network Agent WITH IP Address")
    logger.info("=" * 80)
    logger.info(f"Context data sources: {json.dumps(context.data_sources, indent=2)}")
    logger.info("Expected: Agent should USE IP-based tools with 198.51.100.42")
    logger.info("-" * 80)
    
    try:
        result = await autonomous_network_agent(context, config)
        logger.info(f"Network Agent Result: {json.dumps(result, indent=2, default=str)}")
        
        if "198.51.100.42" in str(result):
            logger.info("✅ SUCCESS: Agent used the correct IP address")
        else:
            logger.warning("⚠️  WARNING: Could not verify IP usage in result")
            
    except Exception as e:
        logger.error(f"❌ Agent failed with error: {e}")

async def main():
    """Run both test scenarios"""
    
    logger.info("\n" + "=" * 80)
    logger.info("NETWORK AGENT IP HANDLING TEST")
    logger.info("=" * 80 + "\n")
    
    # Test 1: Without IP address
    await test_network_agent_without_ip()
    
    await asyncio.sleep(2)
    
    # Test 2: With IP address
    await test_network_agent_with_ip()
    
    logger.info("\n" + "=" * 80)
    logger.info("TEST COMPLETE")
    logger.info("=" * 80)

if __name__ == "__main__":
    asyncio.run(main())