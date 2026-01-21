#!/usr/bin/env python3
"""
Test Redis connection with a minimal LangGraph to verify structured orchestration works.
"""

import asyncio
from typing import Annotated, List, TypedDict

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, add_messages
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import ToolNode

from app.service.agent.orchestration.orchestrator_graph import create_resilient_memory
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


# Define state
class TestState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    investigation_data: dict
    redis_status: str


def create_test_node(name: str, status: str):
    """Create a simple test node"""

    async def test_node(state: TestState) -> TestState:
        logger.info(f"🔧 Running {name} node...")

        # Add a message to demonstrate the flow
        new_message = AIMessage(
            content=f"Completed {name} analysis with status: {status}"
        )

        return {"messages": [new_message], "redis_status": f"{name} completed"}

    return test_node


async def test_redis_with_simple_graph():
    """Test Redis connection with a minimal graph"""
    logger.info("🚀 Starting Redis connection test with LangGraph...")

    try:
        # Create resilient memory with Redis
        logger.info("🛡️ Creating resilient memory...")
        memory = await create_resilient_memory()
        memory_type = type(memory).__name__

        if "Redis" in memory_type:
            logger.info("✅ Redis memory created successfully!")
        else:
            logger.warning(f"⚠️ Using fallback memory: {memory_type}")

        # Create a simple test graph
        logger.info("🔨 Building test graph...")
        builder = StateGraph(TestState)

        # Add test nodes
        builder.add_node(
            "device_analysis", create_test_node("Device Analysis", "suspicious")
        )
        builder.add_node(
            "location_check", create_test_node("Location Check", "high_risk")
        )
        builder.add_node(
            "final_assessment", create_test_node("Final Assessment", "fraud_detected")
        )

        # Add edges
        builder.add_edge(START, "device_analysis")
        builder.add_edge("device_analysis", "location_check")
        builder.add_edge("location_check", "final_assessment")
        builder.add_edge("final_assessment", END)

        # Compile with Redis memory
        logger.info(f"📊 Compiling graph with {memory_type}...")
        graph = builder.compile(checkpointer=memory)

        # Create test investigation data
        test_data = {
            "user_id": "test_user_123",
            "transaction_amount": 2500.00,
            "device_fingerprint": "suspicious_device_fp",
            "ip": "203.0.113.42",
        }

        # Create initial state
        initial_state = TestState(
            messages=[
                HumanMessage(
                    content=f"Investigate suspicious transaction: ${test_data['transaction_amount']}"
                )
            ],
            investigation_data=test_data,
            redis_status="initialized",
        )

        # Run the investigation with checkpointing
        thread_config = {"configurable": {"thread_id": "redis_test_001"}}

        logger.info("🔍 Running investigation with Redis checkpointing...")
        result = await graph.ainvoke(initial_state, config=thread_config)

        logger.info("✅ Investigation completed successfully!")
        logger.info(f'📋 Final status: {result["redis_status"]}')
        logger.info(f'💬 Messages: {len(result["messages"])} total')

        # Verify checkpointing works by getting state
        try:
            checkpointed_state = await graph.aget_state(thread_config)
            logger.info(f"🔄 Checkpoint retrieved: {checkpointed_state is not None}")
            if "Redis" in memory_type:
                logger.info("🎉 SUCCESS: Redis checkpointing is working!")
            else:
                logger.info("⚠️ Using fallback memory checkpointing")
        except Exception as e:
            logger.warning(f"⚠️ Checkpoint retrieval issue: {e}")

        return True, memory_type

    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        import traceback

        logger.error(f"Traceback: {traceback.format_exc()}")
        return False, str(e)


async def main():
    success, result = await test_redis_with_simple_graph()
    print(f'\n🎯 REDIS GRAPH TEST RESULT: {"SUCCESS" if success else "FAILED"}')
    if success:
        print(f"Memory Type: {result}")
    else:
        print(f"Error: {result}")
    return success


if __name__ == "__main__":
    asyncio.run(main())
