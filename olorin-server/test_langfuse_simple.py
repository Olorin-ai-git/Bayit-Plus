"""
Simple test script for Langfuse integration.

This script demonstrates basic Langfuse tracing without full app dependencies.
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, Any

from langfuse import Langfuse
from langfuse.callback import CallbackHandler as LangfuseCallbackHandler
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def initialize_langfuse():
    """Initialize Langfuse with provided credentials."""
    langfuse = Langfuse(
        secret_key="sk-lf-dae99134-c97c-41ef-b98a-b88861d66fdd",
        public_key="pk-lf-0c1b17de-e7c1-43a1-bc05-e15231c5d00a",
        host="https://us.cloud.langfuse.com",
        release="olorin-1.0.0",
        debug=False
    )
    logger.info("✅ Langfuse client initialized")
    return langfuse


async def test_basic_langfuse():
    """Test basic Langfuse tracing."""
    logger.info("Starting basic Langfuse test")
    
    # Initialize Langfuse
    langfuse = initialize_langfuse()
    
    # Create a trace
    trace = langfuse.trace(
        name="test_investigation",
        user_id="test_user",
        metadata={
            "test_type": "basic",
            "timestamp": datetime.now().isoformat()
        },
        tags=["test", "olorin", "fraud_detection"]
    )
    
    logger.info(f"Created trace with ID: {trace.id}")
    
    # Create a span
    span = langfuse.span(
        trace_id=trace.id,
        name="analyze_transaction",
        metadata={"agent": "test_agent"}
    )
    
    # Simulate some work
    await asyncio.sleep(1)
    
    # Update span
    span.update(
        output={"result": "transaction_analyzed"},
        level="INFO"
    )
    span.end()
    
    # Create a generation (LLM call)
    generation = langfuse.generation(
        trace_id=trace.id,
        name="fraud_analysis",
        model="gpt-3.5-turbo",
        input={"transaction_id": "tx_123", "amount": 1000},
        output={"risk_score": 0.85, "fraud_detected": True},
        metadata={"processing_time": 0.5}
    )
    
    # Add a score
    langfuse.score(
        trace_id=trace.id,
        name="accuracy",
        value=0.92,
        comment="High accuracy fraud detection"
    )
    
    # Update trace
    trace.update(
        output={"status": "completed", "fraud_detected": True}
    )
    
    # Flush to ensure data is sent
    langfuse.flush()
    
    logger.info(f"✅ Basic test completed. Trace ID: {trace.id}")
    logger.info(f"View trace at: https://us.cloud.langfuse.com/project/pk-lf-0c1b17de-e7c1-43a1-bc05-e15231c5d00a/traces/{trace.id}")


async def test_langchain_integration():
    """Test LangChain integration with Langfuse."""
    logger.info("Starting LangChain integration test")
    
    # Create Langfuse callback handler
    langfuse_handler = LangfuseCallbackHandler(
        secret_key="sk-lf-dae99134-c97c-41ef-b98a-b88861d66fdd",
        public_key="pk-lf-0c1b17de-e7c1-43a1-bc05-e15231c5d00a",
        host="https://us.cloud.langfuse.com",
        session_id=f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        user_id="test_user",
        tags=["langchain", "test", "olorin"],
        metadata={"test_type": "langchain_integration"}
    )
    
    # Create LangChain model with Langfuse callback
    llm = ChatOpenAI(
        model="gpt-3.5-turbo",
        temperature=0,
        callbacks=[langfuse_handler]
    )
    
    # Test questions about fraud detection
    questions = [
        "What are the top 3 indicators of credit card fraud?",
        "How can machine learning help detect fraudulent transactions?",
        "What is the difference between rule-based and ML-based fraud detection?"
    ]
    
    for i, question in enumerate(questions, 1):
        logger.info(f"\nQuestion {i}: {question}")
        
        messages = [HumanMessage(content=question)]
        
        # Get response with tracing
        response = await llm.ainvoke(messages)
        
        # Log first 200 characters of response
        logger.info(f"Response: {response.content[:200]}...")
        
        # Add some delay between questions
        await asyncio.sleep(1)
    
    # Flush traces
    langfuse_handler.flush()
    
    logger.info("✅ LangChain integration test completed")
    logger.info("Check your Langfuse dashboard for the traces")


async def test_error_handling():
    """Test error handling and tracing."""
    logger.info("Starting error handling test")
    
    langfuse = initialize_langfuse()
    
    trace = langfuse.trace(
        name="error_handling_test",
        metadata={"test_type": "error_handling"}
    )
    
    try:
        # Create a span that will fail
        span = langfuse.span(
            trace_id=trace.id,
            name="failing_operation"
        )
        
        # Simulate an error
        raise ValueError("Simulated fraud detection error")
        
    except Exception as e:
        # Log the error to Langfuse
        span.update(
            output={"error": str(e)},
            level="ERROR"
        )
        span.end()
        
        # Update trace with error
        trace.update(
            output={"status": "error", "error_message": str(e)},
            level="ERROR"
        )
        
        logger.error(f"Handled error: {e}")
    
    finally:
        langfuse.flush()
    
    logger.info(f"✅ Error handling test completed. Trace ID: {trace.id}")


async def main():
    """Main test function."""
    logger.info("=" * 60)
    logger.info("Langfuse Integration Tests for Olorin")
    logger.info("=" * 60)
    
    # Test 1: Basic Langfuse functionality
    logger.info("\n📝 Test 1: Basic Langfuse Tracing")
    await test_basic_langfuse()
    
    # Test 2: LangChain integration
    logger.info("\n📝 Test 2: LangChain Integration")
    await test_langchain_integration()
    
    # Test 3: Error handling
    logger.info("\n📝 Test 3: Error Handling")
    await test_error_handling()
    
    logger.info("\n" + "=" * 60)
    logger.info("All tests completed!")
    logger.info("Visit Langfuse dashboard to view traces:")
    logger.info("https://us.cloud.langfuse.com")
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())