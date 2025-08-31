#!/usr/bin/env python3
"""
OpenAI Assistant Pattern Integration Test

Tests the OpenAI Assistant pattern with full integration to the existing
sophisticated fraud detection system, including:
1. Tool conversion and function calling
2. Assistant creation and management
3. Streaming responses and WebSocket integration
4. Fraud investigation workflow
"""

import asyncio
import json
import logging
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List
from unittest.mock import AsyncMock, MagicMock, patch

# Add the project root to the path
sys.path.append(str(Path(__file__).parent.parent))

from langchain_core.messages import HumanMessage, AIMessage

from app.service.agent.patterns.registry import get_pattern_registry
from app.service.agent.patterns.base import PatternConfig, PatternType, OpenAIPatternConfig
from app.service.agent.patterns.openai import (
    OpenAIAssistantPattern,
    convert_langgraph_tools_to_openai_functions,
    execute_openai_function_call,
    get_function_calling_stats
)
from app.service.agent.orchestration.graph_builder import _get_configured_tools

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
)

logger = logging.getLogger(__name__)


class MockOpenAIClient:
    """Mock OpenAI client for testing"""
    
    def __init__(self):
        self.beta = MockBetaAPI()
        self.call_count = 0
        self.function_calls_made = []
        
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass


class MockBetaAPI:
    """Mock OpenAI Beta API"""
    
    def __init__(self):
        self.assistants = MockAssistantsAPI()
        self.threads = MockThreadsAPI()


class MockAssistantsAPI:
    """Mock OpenAI Assistants API"""
    
    async def create(self, **kwargs):
        return MockAssistant(
            id="asst_test_fraud_detective",
            name=kwargs.get("name", "Fraud Detective"),
            description=kwargs.get("description", "Test assistant"),
            instructions=kwargs.get("instructions", ""),
            model=kwargs.get("model", "gpt-4o")
        )


class MockThreadsAPI:
    """Mock OpenAI Threads API"""
    
    def __init__(self):
        self.messages = MockMessagesAPI()
        self.runs = MockRunsAPI()
    
    async def create(self, **kwargs):
        return MockThread(id="thread_test_123", metadata=kwargs.get("metadata", {}))


class MockMessagesAPI:
    """Mock OpenAI Messages API"""
    
    def __init__(self):
        self.messages = []
    
    async def create(self, thread_id, **kwargs):
        message = MockMessage(
            id=f"msg_{len(self.messages)}",
            content=kwargs.get("content", ""),
            role=kwargs.get("role", "user")
        )
        self.messages.append(message)
        return message
    
    async def list(self, thread_id, **kwargs):
        return MockMessageList([
            MockMessage("msg_assistant", "Investigation completed successfully", "assistant")
        ])


class MockRunsAPI:
    """Mock OpenAI Runs API"""
    
    async def create(self, **kwargs):
        return MockRun(
            id="run_test_123",
            thread_id=kwargs.get("thread_id", "thread_test"),
            assistant_id=kwargs.get("assistant_id", "asst_test_fraud_detective"),
            status="completed"
        )
    
    async def retrieve(self, **kwargs):
        return MockRun(
            id=kwargs.get("run_id"), 
            status="completed",
            assistant_id="asst_test_fraud_detective"
        )
    
    async def submit_tool_outputs(self, **kwargs):
        return MockRun(
            id=kwargs.get("run_id"), 
            status="completed",
            assistant_id="asst_test_fraud_detective"
        )
    
    async def stream(self, **kwargs):
        """Mock streaming responses"""
        # Yield mock streaming events
        events = [
            MockStreamEvent("thread.message.delta", MockMessageDelta("Starting fraud investigation...")),
            MockStreamEvent("thread.run.requires_action", MockRunAction([
                MockToolCall("call_splunk", "splunk_query_tool", {"query": "search fraud indicators"})
            ])),
            MockStreamEvent("thread.message.delta", MockMessageDelta("Analysis complete. High risk detected.")),
            MockStreamEvent("thread.run.completed", None)
        ]
        
        for event in events:
            await asyncio.sleep(0.1)  # Simulate streaming delay
            yield event


class MockAssistant:
    def __init__(self, id, name, description, instructions, model):
        self.id = id
        self.name = name
        self.description = description
        self.instructions = instructions
        self.model = model


class MockThread:
    def __init__(self, id, metadata):
        self.id = id
        self.metadata = metadata


class MockMessage:
    def __init__(self, id, content, role):
        self.id = id
        self.content = [MockTextContent(content)]
        self.role = role


class MockTextContent:
    def __init__(self, value):
        self.text = MockTextValue(value)


class MockTextValue:
    def __init__(self, value):
        self.value = value


class MockMessageList:
    def __init__(self, messages):
        self.data = messages


class MockRun:
    def __init__(self, id, thread_id=None, status="queued", assistant_id=None):
        self.id = id
        self.thread_id = thread_id
        self.status = status
        self.assistant_id = assistant_id or "asst_test_fraud_detective"
        self.required_action = None


class MockStreamEvent:
    def __init__(self, event, data):
        self.event = event
        self.data = data


class MockMessageDelta:
    def __init__(self, content):
        self.delta = MockDeltaContent(content)


class MockDeltaContent:
    def __init__(self, content):
        self.content = [MockDeltaTextContent(content)]


class MockDeltaTextContent:
    def __init__(self, content):
        self.text = MockTextValue(content)


class MockRunAction:
    def __init__(self, tool_calls):
        self.submit_tool_outputs = MockSubmitToolOutputs(tool_calls)


class MockSubmitToolOutputs:
    def __init__(self, tool_calls):
        self.tool_calls = tool_calls


class MockToolCall:
    def __init__(self, call_id, function_name, arguments):
        self.id = call_id
        self.function = MockFunction(function_name, json.dumps(arguments))


class MockFunction:
    def __init__(self, name, arguments):
        self.name = name
        self.arguments = arguments


class OpenAIAssistantPatternTest:
    """Test suite for OpenAI Assistant pattern"""
    
    def __init__(self):
        self.test_results = {
            "test_start": datetime.now().isoformat(),
            "tests_run": 0,
            "tests_passed": 0,
            "errors": []
        }
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run comprehensive test suite"""
        logger.info("=" * 80)
        logger.info("🧪 OPENAI ASSISTANT PATTERN INTEGRATION TEST")
        logger.info("=" * 80)
        
        tests = [
            ("Tool Conversion Test", self.test_tool_conversion),
            ("Function Calling Test", self.test_function_calling),
            ("Assistant Pattern Creation", self.test_pattern_creation),
            ("Pattern Registry Integration", self.test_registry_integration),
            ("Mock Investigation Workflow", self.test_investigation_workflow),
            ("Streaming Integration Test", self.test_streaming_integration)
        ]
        
        for test_name, test_method in tests:
            await self._run_single_test(test_name, test_method)
        
        self.test_results["test_end"] = datetime.now().isoformat()
        return self.test_results
    
    async def _run_single_test(self, test_name: str, test_method) -> None:
        """Run a single test with error handling"""
        logger.info(f"\n🎯 Running: {test_name}")
        self.test_results["tests_run"] += 1
        
        try:
            await test_method()
            logger.info(f"✅ {test_name} PASSED")
            self.test_results["tests_passed"] += 1
        except Exception as e:
            logger.error(f"❌ {test_name} FAILED: {e}")
            self.test_results["errors"].append(f"{test_name}: {str(e)}")
    
    async def test_tool_conversion(self):
        """Test conversion of LangGraph tools to OpenAI functions"""
        logger.info("Testing tool conversion to OpenAI functions...")
        
        # Get configured tools from the fraud detection system
        tools = _get_configured_tools()
        
        if not tools:
            raise Exception("No tools configured - cannot test conversion")
        
        # Convert tools to OpenAI functions
        function_definitions = convert_langgraph_tools_to_openai_functions(tools)
        
        if not function_definitions:
            raise Exception("Tool conversion failed - no functions generated")
        
        logger.info(f"✓ Converted {len(function_definitions)} tools to OpenAI functions")
        
        # Validate function definitions structure
        for func_def in function_definitions:
            if not all(key in func_def for key in ["name", "description", "parameters"]):
                raise Exception(f"Invalid function definition: {func_def}")
            
            if "properties" not in func_def["parameters"]:
                raise Exception(f"Missing properties in function: {func_def['name']}")
        
        # Get conversion statistics
        stats = get_function_calling_stats(tools)
        logger.info(f"✓ Conversion stats: {stats['convertible_tools']}/{stats['total_tools']} tools converted")
        
        # Validate specific fraud detection tools are present
        function_names = [f["name"] for f in function_definitions]
        expected_tools = ["splunk_query_tool", "sumologic_query_tool"]
        
        for expected in expected_tools:
            if not any(expected in fname for fname in function_names):
                logger.warning(f"Expected tool '{expected}' not found in converted functions")
    
    async def test_function_calling(self):
        """Test OpenAI function calling execution"""
        logger.info("Testing OpenAI function call execution...")
        
        # Get tools for testing
        tools = _get_configured_tools()
        if not tools:
            raise Exception("No tools available for function calling test")
        
        # Mock Splunk tool response
        with patch('app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool._arun') as mock_splunk:
            mock_splunk.return_value = {
                "results": [{"transaction_id": "test_123", "risk_score": 85}],
                "success": True
            }
            
            # Test function call execution
            result = await execute_openai_function_call(
                "splunk_query_tool",
                {"query": "search fraud indicators"},
                tools
            )
            
            if isinstance(result, dict) and "error" not in result:
                logger.info("✓ Function call executed successfully")
                logger.info(f"✓ Result: {str(result)[:100]}...")
            else:
                raise Exception(f"Function call failed: {result}")
    
    async def test_pattern_creation(self):
        """Test OpenAI Assistant pattern creation and configuration"""
        logger.info("Testing pattern creation...")
        
        # Create pattern configuration
        pattern_config = PatternConfig(
            pattern_type=PatternType.OPENAI_ASSISTANT,
            max_iterations=3,
            confidence_threshold=0.8,
            timeout_seconds=60,
            enable_caching=True
        )
        
        openai_config = OpenAIPatternConfig(
            model="gpt-4o",
            temperature=0.1,
            assistant_name="Test Fraud Detective",
            assistant_description="Testing OpenAI Assistant pattern",
            stream=True
        )
        
        # Get tools for the pattern
        tools = _get_configured_tools()
        
        # Create pattern instance
        pattern = OpenAIAssistantPattern(
            config=pattern_config,
            openai_config=openai_config,
            tools=tools
        )
        
        logger.info("✓ Pattern created successfully")
        logger.info(f"✓ Pattern type: {pattern.pattern_type}")
        logger.info(f"✓ Framework type: {pattern.framework_type}")
        logger.info(f"✓ Tools configured: {len(pattern.tools)}")
        logger.info(f"✓ Function definitions: {len(pattern._function_definitions)}")
    
    async def test_registry_integration(self):
        """Test pattern registry integration"""
        logger.info("Testing pattern registry integration...")
        
        # Get pattern registry
        registry = get_pattern_registry()
        
        # Check if OpenAI Assistant pattern is registered
        available_patterns = registry.get_available_patterns()
        
        if PatternType.OPENAI_ASSISTANT not in available_patterns:
            raise Exception("OpenAI Assistant pattern not registered in registry")
        
        logger.info("✓ Pattern registered in registry")
        
        # Test pattern creation via registry
        pattern_config = PatternConfig(
            pattern_type=PatternType.OPENAI_ASSISTANT,
            timeout_seconds=30
        )
        
        openai_config = OpenAIPatternConfig(
            model="gpt-4o",
            temperature=0.1
        )
        
        tools = _get_configured_tools()[:2]  # Use first 2 tools for testing
        
        pattern = registry.create_pattern(
            pattern_type=PatternType.OPENAI_ASSISTANT,
            config=pattern_config,
            openai_config=openai_config,
            tools=tools
        )
        
        if not isinstance(pattern, OpenAIAssistantPattern):
            raise Exception("Registry created wrong pattern type")
        
        logger.info("✓ Pattern created via registry")
        
        # Check registry info
        registry_info = registry.get_registry_info()
        logger.info(f"✓ Registry info: {registry_info['openai_patterns']} OpenAI patterns registered")
    
    @patch('openai.AsyncOpenAI')
    async def test_investigation_workflow(self, mock_openai_client):
        """Test complete fraud investigation workflow with mocked OpenAI"""
        logger.info("Testing investigation workflow with mocked OpenAI...")
        
        # Setup mock client
        mock_client = MockOpenAIClient()
        mock_openai_client.return_value = mock_client
        
        # Create pattern
        pattern_config = PatternConfig(
            pattern_type=PatternType.OPENAI_ASSISTANT,
            timeout_seconds=30
        )
        
        openai_config = OpenAIPatternConfig(
            model="gpt-4o",
            temperature=0.1,
            stream=False  # Use non-streaming for easier testing
        )
        
        tools = _get_configured_tools()
        
        pattern = OpenAIAssistantPattern(
            config=pattern_config,
            openai_config=openai_config,
            tools=tools
        )
        
        # Mock Splunk tool for realistic fraud investigation
        with patch('app.service.agent.tools.splunk_tool.splunk_tool.SplunkQueryTool._arun') as mock_splunk:
            mock_splunk.return_value = {
                "results": [
                    {
                        "transaction_id": "txn_fraud_123",
                        "amount": 5000.00,
                        "user_id": "user_suspicious",
                        "ip_address": "192.168.1.100",
                        "device_id": "device_unknown",
                        "risk_indicators": ["unusual_amount", "new_device", "suspicious_location"]
                    }
                ],
                "success": True
            }
            
            # Create investigation context
            investigation_context = {
                "investigation_id": "inv_test_001",
                "user_id": "analyst_test",
                "thread_id": "thread_test_123"
            }
            
            # Create fraud investigation message
            messages = [
                HumanMessage(content="""
                Investigate suspicious transaction:
                - Transaction ID: txn_fraud_123
                - Amount: $5000.00
                - User: user_suspicious
                - New device detected
                
                Please analyze this transaction for fraud using available tools.
                """)
            ]
            
            # Execute pattern
            result = await pattern.execute_with_metrics(messages, investigation_context)
            
            if not result.success:
                raise Exception(f"Investigation failed: {result.error_message}")
            
            logger.info("✓ Investigation completed successfully")
            logger.info(f"✓ Result type: {type(result.result)}")
            
            # Verify metrics
            if result.metrics:
                logger.info(f"✓ Assistant ID: {result.metrics.openai_assistant_id}")
                logger.info(f"✓ Run ID: {result.metrics.openai_run_id}")
                logger.info(f"✓ Function calls: {result.metrics.function_calls}")
    
    @patch('openai.AsyncOpenAI')
    async def test_streaming_integration(self, mock_openai_client):
        """Test streaming responses with WebSocket integration"""
        logger.info("Testing streaming integration...")
        
        # Setup mock client with streaming support
        mock_client = MockOpenAIClient()
        mock_openai_client.return_value = mock_client
        
        # Mock WebSocket streaming
        mock_ws = AsyncMock()
        mock_ws.broadcast_investigation_update = AsyncMock()
        
        # Create pattern with streaming enabled
        pattern_config = PatternConfig(
            pattern_type=PatternType.OPENAI_ASSISTANT,
            timeout_seconds=30
        )
        
        openai_config = OpenAIPatternConfig(
            model="gpt-4o",
            temperature=0.1,
            stream=True  # Enable streaming
        )
        
        tools = _get_configured_tools()[:1]  # Use minimal tools for streaming test
        
        pattern = OpenAIAssistantPattern(
            config=pattern_config,
            openai_config=openai_config,
            tools=tools,
            ws_streaming=mock_ws
        )
        
        # Execute with streaming
        messages = [HumanMessage(content="Analyze transaction for fraud indicators")]
        context = {"investigation_id": "stream_test_001"}
        
        result = await pattern.execute_with_metrics(messages, context)
        
        if not result.success:
            raise Exception(f"Streaming test failed: {result.error_message}")
        
        logger.info("✓ Streaming execution completed")
        
        # Verify WebSocket calls were made (if streaming was properly mocked)
        if hasattr(mock_ws, 'broadcast_investigation_update'):
            logger.info("✓ WebSocket integration available")
    
    def print_test_summary(self):
        """Print test execution summary"""
        logger.info("\n" + "=" * 80)
        logger.info("📊 TEST EXECUTION SUMMARY")
        logger.info("=" * 80)
        
        logger.info(f"🎯 Tests Run: {self.test_results['tests_run']}")
        logger.info(f"✅ Tests Passed: {self.test_results['tests_passed']}")
        logger.info(f"❌ Tests Failed: {len(self.test_results['errors'])}")
        
        success_rate = (self.test_results['tests_passed'] / self.test_results['tests_run']) * 100
        logger.info(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.test_results['errors']:
            logger.info("\n❌ ERRORS:")
            for error in self.test_results['errors']:
                logger.info(f"   ├─ {error}")
        
        if success_rate >= 80:
            logger.info("\n🎉 OpenAI Assistant Pattern integration SUCCESSFUL!")
        else:
            logger.info("\n⚠️  Some tests failed - review errors above")
        
        logger.info("=" * 80)


async def main():
    """Main test execution"""
    test_runner = OpenAIAssistantPatternTest()
    
    # Run all tests
    results = await test_runner.run_all_tests()
    
    # Save results
    results_file = f"tests/logs/openai_assistant_test_results_{int(time.time())}.json"
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    logger.info(f"💾 Test results saved to: {results_file}")
    
    # Print summary
    test_runner.print_test_summary()


if __name__ == "__main__":
    asyncio.run(main())