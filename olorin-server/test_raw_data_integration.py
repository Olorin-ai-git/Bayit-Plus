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
    print("\n=== Testing CSV Data Detection ===")
    
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
    print(f"✓ CSV detection with additional_kwargs: {result1}")
    assert result1 == True, "Should detect CSV in additional_kwargs"
    
    # Test 2: Message with CSV-like content
    msg2 = HumanMessage(
        content=f"Process this data:\n{TEST_CSV_DATA}"
    )
    
    result2 = _detect_csv_data_in_messages([msg2])
    print(f"✓ CSV detection with content pattern: {result2}")
    assert result2 == True, "Should detect CSV pattern in content"
    
    # Test 3: Message without CSV data
    msg3 = HumanMessage(
        content="Start fraud investigation for user_123"
    )
    
    result3 = _detect_csv_data_in_messages([msg3])
    print(f"✓ No CSV detection: {result3}")
    assert result3 == False, "Should not detect CSV in regular message"
    
    print("✅ All CSV detection tests passed!")

async def test_routing_functions():
    """Test routing functions for raw data vs investigation flow."""
    print("\n=== Testing Routing Functions ===")
    
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
    print(f"✓ Routing with CSV data: {route1}")
    assert route1 == "raw_data_node", "Should route to raw_data_node"
    
    route1_alt = csv_data_routing(state_with_csv)
    print(f"✓ CSV routing function: {route1_alt}")
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
    print(f"✓ Routing without CSV data: {route2}")
    assert route2 == "fraud_investigation", "Should route to fraud_investigation"
    
    print("✅ All routing tests passed!")

async def test_raw_data_node():
    """Test the RawDataNode processing."""
    print("\n=== Testing RawDataNode Processing ===")
    
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
    
    print(f"✓ RawDataNode processing completed")
    
    # Verify results
    assert "messages" in result_state, "Should return updated state with messages"
    assert len(result_state["messages"]) > len(test_state["messages"]), "Should add response message"
    
    # Check the response message
    response_message = result_state["messages"][-1]
    print(f"✓ Response message: {response_message.content}")
    
    # Check additional_kwargs for results
    if hasattr(response_message, 'additional_kwargs') and response_message.additional_kwargs:
        raw_results = response_message.additional_kwargs.get('raw_data_results')
        if raw_results:
            print(f"✓ Processing results: {raw_results.get('success', False)}\")\n            print(f\"✓ Quality score: {raw_results.get('quality_report', {}).get('quality_score', 0):.2f}\")\n            print(f\"✓ Records processed: {len(raw_results.get('data', []))}\")\n            print(f\"✓ Anomalies detected: {raw_results.get('anomalies_count', 0)}\")\n        else:\n            print(\"⚠ No raw data results found in response\")\n    \n    print(\"✅ RawDataNode processing test passed!\")\n\nasync def test_investigation_coordinator():\n    \"\"\"Test investigation coordinator with CSV data.\"\"\"\n    print(\"\\n=== Testing Investigation Coordinator ===\\\")\n    \n    from app.service.agent.orchestration.investigation_coordinator import start_investigation\n    from app.service.agent.core import AgentContext, AgentMetadata\n    \n    # Create test agent context with CSV data\n    metadata = AgentMetadata(\n        entity_id=\"test_user_789\",\n        entity_type=\"user_id\",\n        additional_metadata={\n            'csv_data': TEST_CSV_DATA,\n            'filename': 'coordinator_test.csv',\n            'investigation_id': 'test-coord-001'\n        }\n    )\n    \n    agent_context = AgentContext(metadata=metadata)\n    \n    # Test config structure\n    test_config = {\n        'configurable': {\n            'agent_context': agent_context\n        }\n    }\n    \n    # Call start_investigation\n    result = await start_investigation({\"messages\": []}, test_config)\n    \n    print(f\"✓ Investigation started successfully\")\n    assert \"messages\" in result, \"Should return state with messages\"\n    assert len(result[\"messages\"]) > 0, \"Should contain initial message\"\n    \n    # Check the initial message\n    init_message = result[\"messages\"][0]\n    print(f\"✓ Initial message: {init_message.content}\")\n    \n    # Verify CSV data is preserved in message\n    if hasattr(init_message, 'additional_kwargs') and init_message.additional_kwargs:\n        csv_data = init_message.additional_kwargs.get('csv_data')\n        if csv_data:\n            print(f\"✓ CSV data preserved in coordinator: {len(csv_data)} characters\")\n        else:\n            print(\"⚠ CSV data not found in coordinator message\")\n    \n    print(\"✅ Investigation coordinator test passed!\")\n\nasync def test_full_integration_flow():\n    \"\"\"Test the complete integration flow end-to-end.\"\"\"\n    print(\"\\n=== Testing Full Integration Flow ===\\\")\n    \n    # This test simulates the complete flow:\n    # 1. Investigation start with CSV data\n    # 2. Routing decision (should route to raw_data_node)\n    # 3. Raw data processing\n    # 4. Flow continuation to fraud investigation\n    \n    from app.service.agent.orchestration.investigation_coordinator import start_investigation\n    from app.service.agent.orchestration.enhanced_routing import raw_data_or_investigation_routing\n    from app.service.agent.nodes.raw_data_node import raw_data_node\n    from app.service.agent.core import AgentContext, AgentMetadata\n    \n    # Step 1: Start investigation with CSV data\n    metadata = AgentMetadata(\n        entity_id=\"integration_test_user\",\n        entity_type=\"user_id\",\n        additional_metadata={\n            'csv_data': TEST_CSV_DATA,\n            'filename': 'integration_test.csv',\n            'investigation_id': 'test-integration-001'\n        }\n    )\n    \n    agent_context = AgentContext(metadata=metadata)\n    test_config = {'configurable': {'agent_context': agent_context}}\n    \n    # Initialize investigation\n    state = await start_investigation({\"messages\": []}, test_config)\n    print(f\"✓ Step 1: Investigation initialized\")\n    \n    # Step 2: Routing decision\n    next_node = raw_data_or_investigation_routing(state)\n    print(f\"✓ Step 2: Routing decision -> {next_node}\")\n    assert next_node == \"raw_data_node\", \"Should route to raw data processing\"\n    \n    # Step 3: Process raw data\n    if next_node == \"raw_data_node\":\n        state = await raw_data_node(state)\n        print(f\"✓ Step 3: Raw data processed\")\n    \n    # Step 4: Verify final state\n    assert len(state[\"messages\"]) >= 2, \"Should have initial message + raw data response\"\n    \n    # Check final message contains results\n    final_message = state[\"messages\"][-1]\n    if hasattr(final_message, 'additional_kwargs') and final_message.additional_kwargs:\n        results = final_message.additional_kwargs.get('raw_data_results')\n        if results and results.get('success'):\n            print(f\"✓ Step 4: Integration successful - Quality score: {results.get('quality_report', {}).get('quality_score', 0):.2f}\")\n        else:\n            print(\"⚠ Step 4: Raw data processing had issues\")\n    \n    print(\"✅ Full integration flow test completed!\")\n\nasync def main():\n    \"\"\"Run all integration tests.\"\"\"\n    print(\"🚀 Starting Raw Data Node LangGraph Integration Tests\")\n    print(\"=\" * 60)\n    \n    try:\n        await test_csv_detection()\n        await test_routing_functions()\n        await test_raw_data_node()\n        await test_investigation_coordinator()\n        await test_full_integration_flow()\n        \n        print(\"\\n\" + \"=\" * 60)\n        print(\"🎉 ALL INTEGRATION TESTS PASSED!\")\n        print(\"✅ Phase 3: Raw Data Node LangGraph Integration - COMPLETED\")\n        \n    except Exception as e:\n        print(f\"\\n❌ Integration test failed: {e}\")\n        logger.exception(\"Test failure details:\")\n        raise\n\nif __name__ == \"__main__\":\n    asyncio.run(main())