# Updated Dual-Framework Technical Specifications
**Date**: 2025-08-30  
**Author**: Gil Klainert  
**Status**: Technical Implementation Specifications Based on Current Architecture

## Overview

This document provides detailed technical specifications for integrating OpenAI Agents into the existing sophisticated Olorin architecture. The specifications focus on extending the current modular infrastructure while maintaining all existing functionality and capabilities.

## Core Architecture Extensions

### 1. Pattern Registry System Extension

#### Enhanced PatternType Enum
**File**: `/app/service/agent/patterns/base.py`

```python
class PatternType(Enum):
    """Extended pattern types including OpenAI Agent patterns"""
    # Existing LangGraph patterns
    AUGMENTED_LLM = "augmented_llm"
    PROMPT_CHAINING = "prompt_chaining"
    ROUTING = "routing"
    PARALLELIZATION = "parallelization"
    ORCHESTRATOR_WORKERS = "orchestrator_workers"
    EVALUATOR_OPTIMIZER = "evaluator_optimizer"
    
    # New OpenAI Agent patterns
    OPENAI_ASSISTANT = "openai_assistant"
    OPENAI_FUNCTION_CALLING = "openai_function_calling"
    OPENAI_MULTI_AGENT = "openai_multi_agent"
    OPENAI_RAG_ASSISTANT = "openai_rag_assistant"
    OPENAI_CODE_INTERPRETER = "openai_code_interpreter"
    OPENAI_FILE_SEARCH = "openai_file_search"

@dataclass
class OpenAIPatternConfig(PatternConfig):
    """Configuration for OpenAI-based patterns"""
    # OpenAI-specific configuration
    openai_assistant_id: Optional[str] = None
    openai_model: str = "gpt-4-turbo-preview"
    openai_temperature: float = 0.1
    openai_instructions: Optional[str] = None
    openai_tools: Optional[List[Dict[str, Any]]] = None
    
    # Thread management
    thread_management: str = "auto"  # auto, manual, persistent
    thread_id: Optional[str] = None
    persistent_threads: bool = False
    
    # Function calling configuration
    function_calling_mode: str = "auto"  # auto, none, required
    parallel_tool_calls: bool = True
    max_tool_calls_per_message: int = 10
    
    # Cost and performance optimization
    max_tokens: Optional[int] = None
    stream_responses: bool = True
    enable_caching: bool = True
    cache_ttl_seconds: int = 3600
    
    # Integration settings
    journey_tracking_enabled: bool = True
    websocket_streaming_enabled: bool = True
    context_preservation: bool = True
```

#### OpenAI Base Pattern Class
**File**: `/app/service/agent/patterns/openai_base.py`

```python
from abc import abstractmethod
from typing import Any, Dict, List, Optional, AsyncGenerator
from openai import AsyncOpenAI
from ..tools.tool_registry import ToolRegistry
from ..tools.openai_tool_adapter import OpenAIToolAdapter
from .base import BasePattern, PatternConfig

class OpenAIBasePattern(BasePattern):
    """Base class for all OpenAI-based agent patterns"""
    
    def __init__(
        self,
        config: OpenAIPatternConfig,
        tools: Optional[List[Any]] = None,
        ws_streaming: Optional[Any] = None
    ):
        super().__init__(config, tools, ws_streaming)
        self.openai_client = AsyncOpenAI(
            api_key=self._get_openai_api_key()
        )
        self.tool_adapter = OpenAIToolAdapter(tools or [])
        self.assistant_id = config.openai_assistant_id
        self.thread_id = config.thread_id
        
    def _get_openai_api_key(self) -> str:
        """Get OpenAI API key from Firebase Secrets or environment"""
        # Integration with existing Firebase Secrets system
        from app.core.firebase_secrets import get_secret
        return get_secret("OPENAI_API_KEY")
    
    @abstractmethod
    async def execute_investigation(
        self,
        context: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute investigation using OpenAI pattern"""
        pass
    
    async def _create_or_get_assistant(self) -> str:
        """Create or retrieve OpenAI assistant"""
        if self.assistant_id:
            return self.assistant_id
            
        assistant = await self.openai_client.beta.assistants.create(
            model=self.config.openai_model,
            instructions=self.config.openai_instructions,
            tools=self.tool_adapter.get_openai_function_definitions(),
            temperature=self.config.openai_temperature
        )
        return assistant.id
    
    async def _create_or_get_thread(self) -> str:
        """Create or retrieve conversation thread"""
        if self.thread_id and self.config.persistent_threads:
            return self.thread_id
            
        thread = await self.openai_client.beta.threads.create()
        return thread.id
```

### 2. OpenAI Pattern Implementations

#### OpenAI Assistant Pattern
**File**: `/app/service/agent/patterns/openai_assistant.py`

```python
from typing import Any, Dict, List, Optional, AsyncGenerator
from ..journey_tracker import UnifiedJourneyTracker, NodeType, NodeStatus
from ..structured_context import InvestigationContext
from .openai_base import OpenAIBasePattern

class OpenAIAssistantPattern(OpenAIBasePattern):
    """OpenAI Assistant API pattern implementation"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.journey_tracker = UnifiedJourneyTracker()
        
    async def execute_investigation(
        self,
        context: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute investigation using OpenAI Assistant"""
        
        # Initialize investigation context
        investigation_context = InvestigationContext.from_dict(context)
        assistant_id = await self._create_or_get_assistant()
        thread_id = await self._create_or_get_thread()
        
        # Start journey tracking
        journey_id = self.journey_tracker.start_journey(
            pattern_type=self.config.pattern_type,
            investigation_id=investigation_context.investigation_id
        )
        
        try:
            # Add message to thread
            await self.openai_client.beta.threads.messages.create(
                thread_id=thread_id,
                role="user",
                content=investigation_context.get_investigation_prompt()
            )
            
            # Create and stream run
            async with self.openai_client.beta.threads.runs.create_and_stream(
                thread_id=thread_id,
                assistant_id=assistant_id,
                stream=True
            ) as stream:
                async for event in stream:
                    processed_event = await self._process_stream_event(
                        event, investigation_context, journey_id
                    )
                    if processed_event:
                        yield processed_event
                        
        except Exception as e:
            self.journey_tracker.log_error(journey_id, str(e))
            yield {
                "type": "error",
                "content": f"Investigation failed: {str(e)}",
                "investigation_id": investigation_context.investigation_id
            }
        finally:
            self.journey_tracker.complete_journey(journey_id)
    
    async def _process_stream_event(
        self,
        event: Any,
        context: InvestigationContext,
        journey_id: str
    ) -> Optional[Dict[str, Any]]:
        """Process streaming events from OpenAI Assistant"""
        
        event_type = event.event
        
        if event_type == "thread.run.step.created":
            step = event.data
            self.journey_tracker.start_node(
                journey_id=journey_id,
                node_id=step.id,
                node_type=NodeType.TOOL_CALL if step.type == "tool_calls" else NodeType.MESSAGE_CREATION,
                input_data={"step_type": step.type}
            )
            
        elif event_type == "thread.run.step.delta":
            delta = event.data.delta
            if hasattr(delta, 'step_details') and delta.step_details:
                if delta.step_details.type == "tool_calls":
                    # Handle tool calls
                    return await self._handle_tool_call_delta(delta, context, journey_id)
                elif delta.step_details.type == "message_creation":
                    # Handle message creation
                    return await self._handle_message_delta(delta, context, journey_id)
                    
        elif event_type == "thread.run.step.completed":
            step = event.data
            self.journey_tracker.complete_node(
                journey_id=journey_id,
                node_id=step.id,
                status=NodeStatus.SUCCESS,
                output_data={"usage": step.usage}
            )
            
        return None
    
    async def _handle_tool_call_delta(
        self,
        delta: Any,
        context: InvestigationContext,
        journey_id: str
    ) -> Dict[str, Any]:
        """Handle tool call streaming delta"""
        tool_calls = delta.step_details.tool_calls
        
        for tool_call in tool_calls:
            if tool_call.type == "function":
                function_name = tool_call.function.name
                return {
                    "type": "tool_call",
                    "tool_name": function_name,
                    "investigation_id": context.investigation_id,
                    "journey_id": journey_id
                }
                
        return None
    
    async def _handle_message_delta(
        self,
        delta: Any,
        context: InvestigationContext,
        journey_id: str
    ) -> Dict[str, Any]:
        """Handle message streaming delta"""
        if hasattr(delta.step_details, 'message_creation'):
            message = delta.step_details.message_creation.message
            if hasattr(message, 'content'):
                for content in message.content:
                    if content.type == "text":
                        return {
                            "type": "analysis_update",
                            "content": content.text.value,
                            "investigation_id": context.investigation_id,
                            "journey_id": journey_id
                        }
        return None
```

### 3. Tool System Integration

#### OpenAI Tool Adapter
**File**: `/app/service/agent/tools/openai_tool_adapter.py`

```python
from typing import Any, Dict, List, Optional, Callable, Awaitable
from ..enhanced_tool_base import EnhancedToolBase
from ..tool_registry import ToolRegistry
import inspect
import json

class OpenAIToolAdapter:
    """Adapter to convert existing tools to OpenAI function definitions"""
    
    def __init__(self, tools: List[EnhancedToolBase]):
        self.tools = {tool.name: tool for tool in tools}
        self.function_registry = {}
        self._generate_function_definitions()
    
    def _generate_function_definitions(self):
        """Generate OpenAI function definitions from existing tools"""
        for tool_name, tool in self.tools.items():
            function_def = {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": self._extract_parameters_schema(tool)
                }
            }
            self.function_registry[tool_name] = function_def
    
    def _extract_parameters_schema(self, tool: EnhancedToolBase) -> Dict[str, Any]:
        """Extract JSON schema from tool's run method signature"""
        if hasattr(tool, '_run'):
            method = tool._run
        elif hasattr(tool, 'run'):
            method = tool.run
        else:
            return {"type": "object", "properties": {}}
            
        sig = inspect.signature(method)
        properties = {}
        required = []
        
        for param_name, param in sig.parameters.items():
            if param_name in ['self', 'args', 'kwargs']:
                continue
                
            param_schema = self._get_param_schema(param)
            properties[param_name] = param_schema
            
            if param.default == inspect.Parameter.empty:
                required.append(param_name)
        
        return {
            "type": "object",
            "properties": properties,
            "required": required
        }
    
    def _get_param_schema(self, param: inspect.Parameter) -> Dict[str, Any]:
        """Get JSON schema for a parameter"""
        if param.annotation == str:
            return {"type": "string"}
        elif param.annotation == int:
            return {"type": "integer"}
        elif param.annotation == float:
            return {"type": "number"}
        elif param.annotation == bool:
            return {"type": "boolean"}
        elif param.annotation == list:
            return {"type": "array"}
        elif param.annotation == dict:
            return {"type": "object"}
        else:
            return {"type": "string", "description": f"Parameter of type {param.annotation}"}
    
    def get_openai_function_definitions(self) -> List[Dict[str, Any]]:
        """Get all function definitions for OpenAI"""
        return list(self.function_registry.values())
    
    async def execute_function(
        self,
        function_name: str,
        arguments: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a tool function with given arguments"""
        if function_name not in self.tools:
            return {
                "error": f"Unknown function: {function_name}",
                "success": False
            }
            
        tool = self.tools[function_name]
        
        try:
            # Execute tool with caching and metrics (leveraging existing EnhancedToolBase)
            if hasattr(tool, '_run'):
                result = await tool._run(**arguments)
            elif hasattr(tool, 'run'):
                if inspect.iscoroutinefunction(tool.run):
                    result = await tool.run(**arguments)
                else:
                    result = tool.run(**arguments)
            else:
                raise AttributeError(f"Tool {function_name} has no run method")
                
            return {
                "result": result,
                "success": True,
                "tool_name": function_name,
                "cached": getattr(tool, '_last_result_was_cached', False)
            }
            
        except Exception as e:
            return {
                "error": str(e),
                "success": False,
                "tool_name": function_name
            }
```

### 4. Journey Tracking Extension

#### Unified Journey Tracker
**File**: `/app/service/agent/journey_tracker.py` (Extension)

```python
from enum import Enum
from typing import Any, Dict, List, Optional
from .patterns.base import PatternType

class OpenAINodeType(Enum):
    """OpenAI-specific node types for journey tracking"""
    ASSISTANT_CREATION = "assistant_creation"
    THREAD_CREATION = "thread_creation"
    MESSAGE_CREATION = "message_creation"
    RUN_CREATION = "run_creation"
    FUNCTION_CALL = "function_call"
    CODE_INTERPRETER = "code_interpreter"
    FILE_SEARCH = "file_search"

class UnifiedJourneyTracker:
    """Unified journey tracker supporting both LangGraph and OpenAI patterns"""
    
    def __init__(self):
        self.langgraph_tracker = LangGraphJourneyTracker()
        self.openai_runs: Dict[str, Dict[str, Any]] = {}
        self.active_journeys: Dict[str, Dict[str, Any]] = {}
    
    def start_journey(
        self,
        pattern_type: PatternType,
        investigation_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Start journey tracking for any pattern type"""
        
        journey_id = f"{investigation_id}_{pattern_type.value}_{int(time.time())}"
        
        if pattern_type.value.startswith('openai_'):
            return self._start_openai_journey(journey_id, pattern_type, investigation_id, context)
        else:
            return self.langgraph_tracker.start_journey(journey_id, context or {})
    
    def _start_openai_journey(
        self,
        journey_id: str,
        pattern_type: PatternType,
        investigation_id: str,
        context: Optional[Dict[str, Any]]
    ) -> str:
        """Start OpenAI-specific journey tracking"""
        
        self.active_journeys[journey_id] = {
            "journey_id": journey_id,
            "pattern_type": pattern_type,
            "investigation_id": investigation_id,
            "start_time": time.time(),
            "context": context or {},
            "nodes": [],
            "total_tokens": 0,
            "total_cost": 0.0,
            "status": "running"
        }
        
        return journey_id
    
    def start_node(
        self,
        journey_id: str,
        node_id: str,
        node_type: Union[NodeType, OpenAINodeType],
        input_data: Optional[Dict[str, Any]] = None
    ):
        """Start tracking a node execution"""
        
        if journey_id in self.active_journeys:
            # OpenAI journey
            node_data = {
                "node_id": node_id,
                "node_type": node_type.value if hasattr(node_type, 'value') else str(node_type),
                "start_time": time.time(),
                "input_data": input_data or {},
                "status": "running"
            }
            self.active_journeys[journey_id]["nodes"].append(node_data)
        else:
            # LangGraph journey
            self.langgraph_tracker.start_node(journey_id, node_id, node_type, input_data)
    
    def complete_node(
        self,
        journey_id: str,
        node_id: str,
        status: NodeStatus,
        output_data: Optional[Dict[str, Any]] = None
    ):
        """Complete node tracking"""
        
        if journey_id in self.active_journeys:
            # OpenAI journey
            journey = self.active_journeys[journey_id]
            for node in journey["nodes"]:
                if node["node_id"] == node_id:
                    node["status"] = status.value
                    node["end_time"] = time.time()
                    node["duration"] = node["end_time"] - node["start_time"]
                    node["output_data"] = output_data or {}
                    
                    # Track token usage if available
                    if output_data and "usage" in output_data:
                        usage = output_data["usage"]
                        if hasattr(usage, 'total_tokens'):
                            journey["total_tokens"] += usage.total_tokens
                            journey["total_cost"] += self._calculate_cost(usage)
                    break
        else:
            # LangGraph journey
            self.langgraph_tracker.complete_node(journey_id, node_id, status, output_data)
    
    def _calculate_cost(self, usage: Any) -> float:
        """Calculate cost based on token usage"""
        # OpenAI GPT-4 Turbo pricing (approximate)
        input_cost_per_1k = 0.01  # $0.01 per 1K tokens
        output_cost_per_1k = 0.03  # $0.03 per 1K tokens
        
        input_cost = (getattr(usage, 'prompt_tokens', 0) / 1000) * input_cost_per_1k
        output_cost = (getattr(usage, 'completion_tokens', 0) / 1000) * output_cost_per_1k
        
        return input_cost + output_cost
    
    def get_journey_summary(self, journey_id: str) -> Dict[str, Any]:
        """Get comprehensive journey summary"""
        
        if journey_id in self.active_journeys:
            journey = self.active_journeys[journey_id]
            return {
                "journey_id": journey_id,
                "pattern_type": journey["pattern_type"].value,
                "investigation_id": journey["investigation_id"],
                "duration": time.time() - journey["start_time"],
                "total_nodes": len(journey["nodes"]),
                "completed_nodes": len([n for n in journey["nodes"] if n["status"] != "running"]),
                "total_tokens": journey["total_tokens"],
                "estimated_cost": journey["total_cost"],
                "nodes": journey["nodes"]
            }
        else:
            # Delegate to LangGraph tracker
            return self.langgraph_tracker.get_journey_summary(journey_id)
```

### 5. WebSocket Integration Enhancement

#### Unified WebSocket Streaming
**File**: `/app/service/agent/websocket_streaming_service.py` (Extension)

```python
from typing import Any, Dict, AsyncGenerator
from fastapi import WebSocket
from .patterns.base import PatternType

class UnifiedWebSocketStreaming:
    """Unified WebSocket streaming for both LangGraph and OpenAI patterns"""
    
    def __init__(self):
        self.active_streams: Dict[str, Dict[str, Any]] = {}
    
    async def stream_investigation_updates(
        self,
        investigation_id: str,
        pattern_type: PatternType,
        websocket: WebSocket,
        investigation_stream: AsyncGenerator[Dict[str, Any], None]
    ):
        """Stream investigation updates to WebSocket client"""
        
        stream_id = f"{investigation_id}_{pattern_type.value}"
        self.active_streams[stream_id] = {
            "investigation_id": investigation_id,
            "pattern_type": pattern_type,
            "websocket": websocket,
            "start_time": time.time()
        }
        
        try:
            async for update in investigation_stream:
                formatted_update = self._format_update_for_client(update, pattern_type)
                await websocket.send_json(formatted_update)
                
        except Exception as e:
            error_update = {
                "type": "error",
                "content": f"Streaming error: {str(e)}",
                "investigation_id": investigation_id,
                "timestamp": time.time()
            }
            await websocket.send_json(error_update)
        finally:
            if stream_id in self.active_streams:
                del self.active_streams[stream_id]
    
    def _format_update_for_client(
        self,
        update: Dict[str, Any],
        pattern_type: PatternType
    ) -> Dict[str, Any]:
        """Format update consistently regardless of pattern type"""
        
        base_format = {
            "timestamp": time.time(),
            "pattern_type": pattern_type.value,
            **update
        }
        
        # Standardize update types across frameworks
        if pattern_type.value.startswith('openai_'):
            return self._format_openai_update(base_format)
        else:
            return self._format_langgraph_update(base_format)
    
    def _format_openai_update(self, update: Dict[str, Any]) -> Dict[str, Any]:
        """Format OpenAI-specific updates for consistency"""
        
        # Map OpenAI events to standardized format
        if update.get("type") == "tool_call":
            return {
                **update,
                "type": "agent_action",
                "action_type": "tool_usage",
                "tool_name": update.get("tool_name")
            }
        elif update.get("type") == "analysis_update":
            return {
                **update,
                "type": "agent_thought",
                "thought_type": "analysis"
            }
        
        return update
    
    def _format_langgraph_update(self, update: Dict[str, Any]) -> Dict[str, Any]:
        """Format LangGraph updates (maintain existing format)"""
        return update
```

## Configuration Integration

### Environment Configuration Extension
**File**: `/app/core/config.py` (Extension)

```python
from pydantic import BaseSettings
from typing import Optional

class OpenAIConfig(BaseSettings):
    """OpenAI-specific configuration"""
    
    # API Configuration
    openai_api_key: Optional[str] = None
    openai_organization: Optional[str] = None
    openai_project: Optional[str] = None
    
    # Default Model Settings
    default_openai_model: str = "gpt-4-turbo-preview"
    default_temperature: float = 0.1
    max_tokens_default: int = 4000
    
    # Performance Settings
    openai_request_timeout: int = 60
    openai_max_retries: int = 3
    openai_rate_limit_buffer: float = 0.1  # 10% buffer under rate limits
    
    # Cost Management
    enable_cost_tracking: bool = True
    cost_alert_threshold: float = 50.0  # Alert when daily cost exceeds $50
    token_usage_logging: bool = True
    
    # Framework Selection
    framework_selection_strategy: str = "auto"  # auto, performance, cost, user_preference
    enable_a_b_testing: bool = False
    a_b_test_ratio: float = 0.5  # 50/50 split for A/B testing
    
    class Config:
        env_prefix = "OPENAI_"
        case_sensitive = False
```

## Error Handling and Resilience

### OpenAI Error Handler
**File**: `/app/service/agent/error_handling/openai_error_handler.py`

```python
from typing import Any, Dict, Optional
import asyncio
from openai import RateLimitError, APITimeoutError, APIConnectionError
import logging

logger = logging.getLogger(__name__)

class OpenAIErrorHandler:
    """Comprehensive error handling for OpenAI API interactions"""
    
    def __init__(self):
        self.retry_delays = [1, 2, 4, 8, 16]  # Exponential backoff
        self.max_retries = 5
    
    async def handle_api_call(
        self,
        api_call_func,
        *args,
        fallback_strategy: str = "graceful_degradation",
        **kwargs
    ) -> Dict[str, Any]:
        """Handle API calls with comprehensive error handling"""
        
        for attempt in range(self.max_retries + 1):
            try:
                result = await api_call_func(*args, **kwargs)
                return {"success": True, "result": result}
                
            except RateLimitError as e:
                if attempt < self.max_retries:
                    delay = self.retry_delays[min(attempt, len(self.retry_delays) - 1)]
                    logger.warning(f"Rate limit hit, retrying in {delay}s: {str(e)}")
                    await asyncio.sleep(delay)
                    continue
                else:
                    return await self._handle_rate_limit_fallback(e, fallback_strategy)
                    
            except APITimeoutError as e:
                if attempt < self.max_retries:
                    delay = self.retry_delays[min(attempt, len(self.retry_delays) - 1)]
                    logger.warning(f"Timeout error, retrying in {delay}s: {str(e)}")
                    await asyncio.sleep(delay)
                    continue
                else:
                    return await self._handle_timeout_fallback(e, fallback_strategy)
                    
            except APIConnectionError as e:
                if attempt < self.max_retries:
                    delay = self.retry_delays[min(attempt, len(self.retry_delays) - 1)]
                    logger.warning(f"Connection error, retrying in {delay}s: {str(e)}")
                    await asyncio.sleep(delay)
                    continue
                else:
                    return await self._handle_connection_fallback(e, fallback_strategy)
                    
            except Exception as e:
                logger.error(f"Unexpected error in OpenAI API call: {str(e)}")
                return {"success": False, "error": str(e), "error_type": "unexpected"}
        
        return {"success": False, "error": "Max retries exceeded"}
    
    async def _handle_rate_limit_fallback(
        self,
        error: RateLimitError,
        strategy: str
    ) -> Dict[str, Any]:
        """Handle rate limit with fallback strategy"""
        
        if strategy == "graceful_degradation":
            # Fall back to LangGraph pattern
            return {
                "success": False,
                "error": "Rate limit exceeded",
                "fallback_suggested": "langgraph",
                "error_type": "rate_limit"
            }
        elif strategy == "queue_request":
            # Implement request queuing
            return {
                "success": False,
                "error": "Request queued due to rate limits",
                "retry_after": getattr(error, 'retry_after', 60),
                "error_type": "rate_limit"
            }
        
        return {"success": False, "error": str(error), "error_type": "rate_limit"}
```

## Testing Specifications

### Integration Test Framework
**File**: `/tests/integration/test_dual_framework_integration.py`

```python
import pytest
from app.service.agent.patterns.registry import PatternRegistry, PatternType
from app.service.agent.structured_context import InvestigationContext

class TestDualFrameworkIntegration:
    """Comprehensive integration tests for dual framework"""
    
    @pytest.fixture
    def pattern_registry(self):
        return PatternRegistry()
    
    @pytest.fixture
    def investigation_context(self):
        return InvestigationContext(
            investigation_id="test_001",
            user_id="test_user",
            entity_data={
                "email": "test@example.com",
                "user_agent": "Mozilla/5.0...",
                "ip": "192.168.1.100"
            }
        )
    
    @pytest.mark.asyncio
    async def test_pattern_registry_supports_all_patterns(self, pattern_registry):
        """Test that pattern registry supports both LangGraph and OpenAI patterns"""
        
        # Test existing LangGraph patterns
        assert pattern_registry.is_pattern_available(PatternType.AUGMENTED_LLM)
        assert pattern_registry.is_pattern_available(PatternType.ROUTING)
        
        # Test new OpenAI patterns
        assert pattern_registry.is_pattern_available(PatternType.OPENAI_ASSISTANT)
        assert pattern_registry.is_pattern_available(PatternType.OPENAI_FUNCTION_CALLING)
    
    @pytest.mark.asyncio
    async def test_framework_switching_capability(
        self,
        pattern_registry,
        investigation_context
    ):
        """Test seamless switching between frameworks"""
        
        # Create LangGraph agent
        langgraph_agent = pattern_registry.create_pattern(
            PatternType.AUGMENTED_LLM,
            config={},
            tools=[]
        )
        
        # Create OpenAI agent
        openai_agent = pattern_registry.create_pattern(
            PatternType.OPENAI_ASSISTANT,
            config={
                "openai_model": "gpt-4-turbo-preview",
                "openai_instructions": "You are a fraud detection specialist."
            },
            tools=[]
        )
        
        # Both should implement the same interface
        assert hasattr(langgraph_agent, 'execute_investigation')
        assert hasattr(openai_agent, 'execute_investigation')
        
        # Both should handle the same context format
        langgraph_result = None
        openai_result = None
        
        async for result in langgraph_agent.execute_investigation(
            investigation_context.to_dict()
        ):
            langgraph_result = result
            break
            
        async for result in openai_agent.execute_investigation(
            investigation_context.to_dict()
        ):
            openai_result = result
            break
        
        # Results should have compatible formats
        assert isinstance(langgraph_result, dict)
        assert isinstance(openai_result, dict)
        assert "investigation_id" in langgraph_result
        assert "investigation_id" in openai_result
    
    @pytest.mark.asyncio
    async def test_tool_compatibility_across_frameworks(self, pattern_registry):
        """Test that tools work with both frameworks"""
        
        from app.service.agent.tools.api_tool import APITool
        from app.service.agent.tools.database_tool import DatabaseTool
        
        test_tools = [
            APITool(),
            DatabaseTool()
        ]
        
        # Create agents with same tools
        langgraph_agent = pattern_registry.create_pattern(
            PatternType.ORCHESTRATOR_WORKERS,
            config={},
            tools=test_tools
        )
        
        openai_agent = pattern_registry.create_pattern(
            PatternType.OPENAI_FUNCTION_CALLING,
            config={
                "openai_model": "gpt-4-turbo-preview"
            },
            tools=test_tools
        )
        
        # Both should have access to the same tools
        assert len(langgraph_agent.tools) == len(openai_agent.tools)
        
        # OpenAI agent should have function definitions for tools
        if hasattr(openai_agent, 'tool_adapter'):
            function_defs = openai_agent.tool_adapter.get_openai_function_definitions()
            assert len(function_defs) == len(test_tools)
```

This technical specification provides a comprehensive foundation for implementing the dual-framework architecture that leverages the existing sophisticated Olorin infrastructure while seamlessly integrating OpenAI Agents as additional patterns in the system.

---

**Related Documents:**
- [Updated Dual-Framework Architecture Plan](/Users/gklainert/Documents/olorin/docs/plans/2025-08-30-updated-dual-framework-architecture-plan.md)
- [Implementation Roadmap](/Users/gklainert/Documents/olorin/docs/plans/2025-08-30-updated-dual-framework-implementation-roadmap.md)
- [Architecture Diagram](/Users/gklainert/Documents/olorin/docs/diagrams/2025-08-30-updated-dual-framework-architecture.mermaid)