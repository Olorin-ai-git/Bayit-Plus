from app.service.logging import get_bridge_logger
logger = get_bridge_logger(__name__)

#!/usr/bin/env python3
"""
Test script for Raw Data Node LangGraph Integration (Phase 3)

This script tests the integration of the RawDataNode into the LangGraph workflow,
including CSV data detection, routing, and state management.
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, Any

from langchain_core.messages import HumanMessage

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test CSV data
TEST_CSV_DATA = """transaction_id,amount,timestamp,merchant,currency
TXN-001,125.50,2025-01-02T10:30:00Z,Coffee Shop Inc,USD
TXN-002,45.99,2025-01-02T11:15:00Z,Amazon,USD
TXN-003,250000.00,2025-01-02T12:00:00Z,Luxury Store,USD
TXN-004,25.00,2025-01-02T13:30:00Z,Gas Station,USD
TXN-005,-50.00,2025-01-02T14:00:00Z,Invalid Transaction,USD"""

async def test_csv_detection():
    """Test CSV data detection in messages."""
    logger.info("\n=== Testing CSV Data Detection ===")
    
    from app.service.agent.orchestration.enhanced_routing import _detect_csv_data_in_messages
    
    # Test 1: Message with CSV data in additional_kwargs
    msg1 = HumanMessage(
        content="Start investigation",
        additional_kwargs={
            'csv_data': TEST_CSV_DATA,
            'filename': 'test_transactions.csv'
        }
    )
    
    result1 = _detect_csv_data_in_messages([msg1])
    logger.info(f"✓ CSV detection with additional_kwargs: {result1}")
    assert result1 == True, "Should detect CSV in additional_kwargs"
    
    # Test 2: Message with CSV-like content
    msg2 = HumanMessage(
        content=f"Process this data:\n{TEST_CSV_DATA}"
    )
    
    result2 = _detect_csv_data_in_messages([msg2])
    logger.info(f"✓ CSV detection with content pattern: {result2}")
    assert result2 == True, "Should detect CSV pattern in content"
    
    # Test 3: Message without CSV data
    msg3 = HumanMessage(
        content="Start fraud investigation for user_123"
    )
    
    result3 = _detect_csv_data_in_messages([msg3])
    logger.info(f"✓ No CSV detection: {result3}")
    assert result3 == False, "Should not detect CSV in regular message"
    
    logger.info("✅ All CSV detection tests passed!")

async def test_routing_functions():
    """Test routing functions for raw data vs investigation flow."""
    logger.info("\n=== Testing Routing Functions ===")
    
    from app.service.agent.orchestration.enhanced_routing import (
        raw_data_or_investigation_routing,
        csv_data_routing
    )
    
    # Test 1: State with CSV data should route to raw_data_node
    state_with_csv = {
        "messages": [
            HumanMessage(
                content="Process investigation data",
                additional_kwargs={
                    'csv_data': TEST_CSV_DATA,
                    'filename': 'transactions.csv',
                    'investigation_id': 'test-001'
                }
            )
        ]
    }
    
    route1 = raw_data_or_investigation_routing(state_with_csv)
    logger.info(f"✓ Routing with CSV data: {route1}")
    assert route1 == "raw_data_node", "Should route to raw_data_node"
    
    route1_alt = csv_data_routing(state_with_csv)
    logger.info(f"✓ CSV routing function: {route1_alt}")
    assert route1_alt == "raw_data_node", "CSV routing should route to raw_data_node"
    
    # Test 2: State without CSV data should route to fraud_investigation
    state_without_csv = {
        "messages": [
            HumanMessage(
                content="Start fraud investigation for user_456",
                additional_kwargs={
                    'investigation_id': 'test-002',
                    'entity_id': 'user_456',
                    'entity_type': 'user_id'
                }
            )
        ]
    }
    
    route2 = raw_data_or_investigation_routing(state_without_csv)
    logger.info(f"✓ Routing without CSV data: {route2}")
    assert route2 == "fraud_investigation", "Should route to fraud_investigation"
    
    logger.info("✅ All routing tests passed!")

async def test_raw_data_node():
    """Test the RawDataNode processing."""
    logger.info("\n=== Testing RawDataNode Processing ===")
    
    from app.service.agent.nodes.raw_data_node import raw_data_node
    
    # Create test state with CSV data
    test_state = {
        "messages": [
            HumanMessage(
                content="Process raw transaction data",
                additional_kwargs={
                    'csv_data': TEST_CSV_DATA,
                    'filename': 'test_transactions.csv',
                    'investigation_id': 'test-rawdata-001'
                }
            )
        ]
    }
    
    # Process through RawDataNode
    result_state = await raw_data_node(test_state)
    
    logger.info("✓ RawDataNode processing completed")
    
    # Verify results
    assert "messages" in result_state, "Should return updated state with messages"
    assert len(result_state["messages"]) > len(test_state["messages"]), "Should add response message"
    
    # Check the response message
    response_message = result_state["messages"][-1]
    logger.info(f"✓ Response message: {response_message.content}")
    
    # Check additional_kwargs for results
    if hasattr(response_message, 'additional_kwargs') and response_message.additional_kwargs:
        raw_results = response_message.additional_kwargs.get('raw_data_results')
        if raw_results:
            logger.info(f"✓ Processing results: {raw_results.get('success', False)}")
            logger.info(f"✓ Quality score: {raw_results.get('quality_report', {}).get('quality_score', 0):.2f}")
            logger.info(f"✓ Records processed: {len(raw_results.get('data', []))}")
            logger.info(f"✓ Anomalies detected: {raw_results.get('anomalies_count', 0)}")
        else:
            logger.info("⚠ No raw data results found in response")
    
    logger.info("✅ RawDataNode processing test passed!")

async def main():
    """Run integration tests."""
    logger.info("🚀 Starting Raw Data Node LangGraph Integration Tests")
    logger.info("=" * 60)
    
    try:
        await test_csv_detection()
        await test_routing_functions()
        await test_raw_data_node()
        
        logger.info("\n" + "=" * 60)
        logger.info("🎉 BASIC INTEGRATION TESTS PASSED!")
        logger.info("✅ Phase 3: Raw Data Node LangGraph Integration - Core functionality working")
        
    except Exception as e:
        logger.error(f"\n❌ Integration test failed: {e}")
        logger.exception("Test failure details:")
        raise

if __name__ == "__main__":
    asyncio.run(main())