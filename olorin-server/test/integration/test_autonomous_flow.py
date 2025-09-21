#!/usr/bin/env python3
"""
Test script for autonomous investigation flow with realistic fraud scenario.
This verifies that the Redis connection fix is working properly.
"""

import asyncio
import json
import time
from langchain_core.messages import HumanMessage
from langgraph.graph.message import add_messages
from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.investigation_coordinator import start_investigation
from app.service.agent.orchestration.orchestrator_graph import get_orchestrator_graph

logger = get_bridge_logger(__name__)

async def test_autonomous_flow():
    logger.info('🚀 Starting autonomous investigation flow test...')
    
    # Realistic fraud detection scenario
    investigation_data = {
        'user_id': 'usr_847291',
        'email': 'john.doe@suspicious-domain.com',
        'transaction_details': {
            'amount': 2500.00,
            'currency': 'USD',
            'merchant': 'Electronics Store XYZ',
            'transaction_id': 'txn_991847362',
            'timestamp': '2025-09-06T02:45:00Z'
        },
        'device_info': {
            'device_fingerprint': 'fp_d8e7f9a2b4c1',
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'screen_resolution': '1920x1080',
            'timezone': 'America/New_York'
        },
        'network_info': {
            'ip': '203.0.113.42',
            'country': 'Romania',
            'city': 'Bucharest',
            'isp': 'Anonymous VPN Service'
        },
        'behavioral_flags': {
            'new_device': True,
            'unusual_location': True,
            'high_velocity': True,
            'off_hours': True
        },
        'investigation_type': 'fraud_detection',
        'priority': 'high'
    }
    
    try:
        logger.info('📊 Investigation data prepared:')
        logger.info(f'  User: {investigation_data["user_id"]}')
        logger.info(f'  Amount: ${investigation_data["transaction_details"]["amount"]}')
        logger.info(f'  Location: {investigation_data["network_info"]["city"]}, {investigation_data["network_info"]["country"]}')
        logger.info(f'  Flags: {list(investigation_data["behavioral_flags"].keys())}')
        
        # Create investigation message
        investigation_message = HumanMessage(
            content=f"Run fraud investigation for suspicious transaction: {json.dumps(investigation_data, indent=2)}"
        )
        
        # Create initial state
        initial_state = {
            "messages": [investigation_message],
            "investigation_data": investigation_data
        }
        
        # Get the orchestrator graph with Redis connection
        logger.info('🔍 Creating orchestrator graph with Redis connection...')
        graph = await get_orchestrator_graph()
        
        # Configure thread for Redis checkpointing
        thread_config = {
            "configurable": {
                "thread_id": f"investigation_thread_{investigation_data['user_id']}_{int(time.time())}",
                "agent_context": investigation_data,
                "investigation_id": f"inv_{investigation_data['user_id']}_{int(time.time())}",
                "entity_id": investigation_data['user_id']
            }
        }
        
        # Run the autonomous investigation
        logger.info('🚀 Starting autonomous investigation flow...')
        result = await graph.ainvoke(initial_state, config=thread_config)
        
        logger.info('✅ Investigation completed successfully!')
        logger.info('📋 Results summary:')
        if isinstance(result, dict):
            for key, value in result.items():
                if key != 'raw_data':  # Skip raw data for cleaner output
                    logger.info(f'  {key}: {value}')
        else:
            logger.info(f'  Result: {result}')
            
        return True, result
        
    except Exception as e:
        logger.error(f'❌ Investigation failed: {e}')
        import traceback
        logger.error(f'Traceback: {traceback.format_exc()}')
        return False, str(e)

async def main():
    success, result = await test_autonomous_flow()
    print(f'\n🎯 AUTONOMOUS FLOW TEST RESULT: {"SUCCESS" if success else "FAILED"}')
    if not success:
        print(f'Error: {result}')
    return success

if __name__ == "__main__":
    asyncio.run(main())