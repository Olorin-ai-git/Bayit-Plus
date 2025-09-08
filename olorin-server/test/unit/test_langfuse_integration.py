"""
Test script for Langfuse integration with Olorin investigation system.

This script demonstrates how to use Langfuse tracing with LangChain agents.
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, Any

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.runnables import RunnableConfig

# Import Langfuse integration
from app.service.agent.langfuse_integration import (
    initialize_langfuse,
    add_langfuse_to_config,
    trace_agent_execution
)
from app.service.agent.orchestration.langfuse_tracing import get_langfuse_tracer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@trace_agent_execution("test_agent")
async def test_agent_with_tracing(input_data: Dict[str, Any], config: RunnableConfig = None):
    """
    Test agent that demonstrates Langfuse tracing.
    """
    logger.info(f"Test agent processing: {input_data}")
    
    # Simulate some processing
    await asyncio.sleep(1)
    
    # Return result
    return {
        "status": "success",
        "processed_at": datetime.now().isoformat(),
        "input": input_data
    }


async def test_langchain_with_langfuse():
    """
    Test LangChain integration with Langfuse tracing.
    """
    logger.info("Starting LangChain + Langfuse test")
    
    # Initialize Langfuse
    tracer = initialize_langfuse()
    if not tracer:
        logger.error("Failed to initialize Langfuse")
        return
    
    # Create a test investigation ID
    investigation_id = f"test_inv_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Use context manager for tracing
    with tracer.trace_investigation(
        investigation_id=investigation_id,
        user_id="test_user",
        metadata={"test_type": "langchain_integration"}
    ) as trace_context:
        
        # Get the Langfuse handler
        handler = trace_context["handler"]
        
        # Create LangChain model with Langfuse callback
        llm = ChatOpenAI(
            model="gpt-3.5-turbo",
            temperature=0,
            callbacks=[handler]
        )
        
        # Test simple completion
        messages = [
            HumanMessage(content="What are the main indicators of fraud in online transactions?")
        ]
        
        logger.info("Sending request to LLM with Langfuse tracing...")
        response = await llm.ainvoke(messages)
        logger.info(f"LLM Response: {response.content[:200]}...")
        
        # Test agent with tracing
        test_input = {
            "metadata": {
                "investigation_id": investigation_id,
                "entity_id": "test_entity_123",
                "entity_type": "transaction"
            }
        }
        
        # Create config with Langfuse
        config = add_langfuse_to_config(
            investigation_id=investigation_id,
            user_id="test_user",
            agent_name="test_agent"
        )
        
        # Run test agent
        logger.info("Running test agent with tracing...")
        result = await test_agent_with_tracing(test_input, config)
        logger.info(f"Agent result: {result}")
        
        # Add scores
        tracer.score_investigation(
            trace_id=trace_context["trace"].id,
            score_name="test_success",
            value=1.0,
            comment="Test completed successfully"
        )
        
        # Log tool usage
        tracer.log_tool_usage(
            tool_name="test_tool",
            input_data={"test": "input"},
            output_data={"test": "output"},
            duration=0.5,
            trace_id=trace_context["trace"].id
        )
    
    # Flush traces
    tracer.flush()
    logger.info(f"✅ Test completed. Check Langfuse dashboard for trace: {investigation_id}")


async def test_multiple_agents():
    """
    Test multiple agents with Langfuse tracing.
    """
    logger.info("Starting multiple agents test")
    
    tracer = get_langfuse_tracer()
    investigation_id = f"multi_agent_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    with tracer.trace_investigation(
        investigation_id=investigation_id,
        user_id="test_user",
        metadata={"test_type": "multi_agent"}
    ) as trace_context:
        
        # Simulate multiple agent executions
        agents = ["network_agent", "device_agent", "location_agent", "risk_agent"]
        
        for agent_name in agents:
            # Create traced function for each agent
            @tracer.trace_agent(
                agent_name=agent_name,
                trace_id=trace_context["trace"].id
            )
            async def run_agent():
                logger.info(f"Running {agent_name}...")
                await asyncio.sleep(0.5)  # Simulate processing
                return {"agent": agent_name, "status": "completed"}
            
            result = await run_agent()
            logger.info(f"{agent_name} result: {result}")
            
            # Score each agent
            tracer.score_investigation(
                trace_id=trace_context["trace"].id,
                score_name=f"{agent_name}_performance",
                value=0.85 + (0.1 * agents.index(agent_name) / len(agents)),
                comment=f"{agent_name} performance score"
            )
    
    tracer.flush()
    logger.info(f"✅ Multi-agent test completed. Investigation ID: {investigation_id}")


async def main():
    """
    Main test function.
    """
    logger.info("=" * 60)
    logger.info("Starting Langfuse Integration Tests")
    logger.info("=" * 60)
    
    # Test 1: Basic LangChain integration
    logger.info("\n📝 Test 1: LangChain + Langfuse Integration")
    await test_langchain_with_langfuse()
    
    # Test 2: Multiple agents
    logger.info("\n📝 Test 2: Multiple Agents with Tracing")
    await test_multiple_agents()
    
    logger.info("\n" + "=" * 60)
    logger.info("All tests completed!")
    logger.info("Check your Langfuse dashboard at: https://us.cloud.langfuse.com")
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())