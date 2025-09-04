"""
Base Pattern Framework

Provides the abstract base class and core types for all agent patterns.
All patterns inherit from BasePattern and implement the execute method.
"""

import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from langchain_core.messages import BaseMessage
from app.service.logging import get_bridge_logger


class PatternType(Enum):
    """Enumeration of available agent patterns"""
    
    # LangGraph-based patterns
    AUGMENTED_LLM = "augmented_llm"
    PROMPT_CHAINING = "prompt_chaining" 
    ROUTING = "routing"
    PARALLELIZATION = "parallelization"
    ORCHESTRATOR_WORKERS = "orchestrator_workers"
    EVALUATOR_OPTIMIZER = "evaluator_optimizer"
    
    # OpenAI Agent-based patterns
    OPENAI_ASSISTANT = "openai_assistant"
    OPENAI_FUNCTION_CALLING = "openai_function_calling"
    OPENAI_CONVERSATION = "openai_conversation"
    OPENAI_STREAMING = "openai_streaming"
    OPENAI_MULTI_AGENT = "openai_multi_agent"
    OPENAI_RAG = "openai_rag"


@dataclass
class PatternConfig:
    """Configuration for pattern execution"""
    
    pattern_type: PatternType
    max_iterations: int = 5
    confidence_threshold: float = 0.7
    timeout_seconds: int = 300
    enable_caching: bool = True
    cache_ttl_seconds: int = 3600
    enable_metrics: bool = True
    debug_mode: bool = False
    custom_params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PatternMetrics:
    """Metrics tracking for pattern execution"""
    
    pattern_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    pattern_type: PatternType = PatternType.AUGMENTED_LLM
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    duration_ms: Optional[int] = None
    iterations: int = 0
    tool_calls: int = 0
    token_usage: Dict[str, int] = field(default_factory=lambda: {"input": 0, "output": 0})
    success: bool = False
    error_message: Optional[str] = None
    confidence_score: float = 0.0
    cache_hit: bool = False
    
    # OpenAI-specific metrics
    openai_run_id: Optional[str] = None
    openai_assistant_id: Optional[str] = None
    function_calls: int = 0
    streaming_chunks: int = 0
    api_cost_cents: float = 0.0
    
    def finish(self, success: bool = True, error_message: Optional[str] = None):
        """Mark the pattern execution as finished"""
        self.end_time = datetime.now()
        self.duration_ms = int((self.end_time - self.start_time).total_seconds() * 1000)
        self.success = success
        self.error_message = error_message


@dataclass  
class PatternResult:
    """Standardized result format for pattern execution"""
    
    success: bool
    result: Any
    confidence_score: float = 0.0
    reasoning: Optional[str] = None
    intermediate_steps: List[Dict[str, Any]] = field(default_factory=list)
    metrics: Optional[PatternMetrics] = None
    error_message: Optional[str] = None
    
    @classmethod
    def success_result(cls, result: Any, confidence: float = 1.0, reasoning: str = None) -> "PatternResult":
        """Create a successful pattern result"""
        return cls(
            success=True,
            result=result,
            confidence_score=confidence,
            reasoning=reasoning
        )
    
    @classmethod
    def error_result(cls, error_message: str, confidence: float = 0.0) -> "PatternResult":
        """Create an error pattern result"""
        return cls(
            success=False,
            result=None,
            confidence_score=confidence,
            error_message=error_message
        )


class BasePattern(ABC):
    """
    Abstract base class for all agent patterns.
    
    Provides common functionality including caching, metrics tracking,
    and standardized execution interface.
    """
    
    MAX_CACHE_SIZE = 1000  # Prevent memory leaks in high-volume production
    
    def __init__(
        self,
        config: PatternConfig,
        tools: Optional[List[Any]] = None,
        ws_streaming: Optional[Any] = None
    ):
        """Initialize the pattern with configuration"""
        self.config = config
        self.tools = tools or []
        self.ws_streaming = ws_streaming
        self._cache: Dict[str, Any] = {}
        self._metrics_history: List[PatternMetrics] = []
    
    @property
    def pattern_type(self) -> PatternType:
        """Get the pattern type"""
        return self.config.pattern_type
    
    @abstractmethod
    async def execute(
        self, 
        messages: List[BaseMessage], 
        context: Dict[str, Any]
    ) -> PatternResult:
        """
        Execute the pattern with given messages and context.
        
        Args:
            messages: List of messages to process
            context: Execution context including user info, investigation details
            
        Returns:
            PatternResult with execution results and metrics
        """
        pass
    
    async def execute_with_metrics(
        self,
        messages: List[BaseMessage],
        context: Dict[str, Any]
    ) -> PatternResult:
        """Execute the pattern with full metrics tracking"""
        
        # Create metrics tracker
        metrics = PatternMetrics(pattern_type=self.pattern_type)
        
        try:
            # Check cache if enabled
            if self.config.enable_caching:
                cache_key = self._generate_cache_key(messages, context)
                cached_result = self._get_cached_result(cache_key)
                if cached_result:
                    metrics.cache_hit = True
                    metrics.finish(success=True)
                    cached_result.metrics = metrics
                    return cached_result
            
            # Execute the pattern
            result = await self.execute(messages, context)
            
            # Update metrics
            metrics.confidence_score = result.confidence_score
            metrics.finish(success=result.success, error_message=result.error_message)
            
            # Cache result if successful and caching enabled
            if result.success and self.config.enable_caching:
                self._cache_result(cache_key, result)
            
            # Attach metrics to result
            result.metrics = metrics
            
            # Store metrics if enabled
            if self.config.enable_metrics:
                self._metrics_history.append(metrics)
            
            return result
            
        except Exception as e:
            metrics.finish(success=False, error_message=str(e))
            if self.config.enable_metrics:
                self._metrics_history.append(metrics)
                
            return PatternResult.error_result(
                error_message=f"Pattern execution failed: {str(e)}"
            )
    
    def _generate_cache_key(self, messages: List[BaseMessage], context: Dict[str, Any]) -> str:
        """Generate a cache key for the given inputs"""
        import hashlib
        import json
        
        # Create a simple hash from messages and relevant context
        message_content = [msg.content for msg in messages]
        cache_data = {
            "messages": message_content,
            "context_keys": sorted(context.keys()),
            "pattern_type": self.pattern_type.value
        }
        
        cache_str = json.dumps(cache_data, sort_keys=True)
        return hashlib.md5(cache_str.encode()).hexdigest()
    
    def _get_cached_result(self, cache_key: str) -> Optional[PatternResult]:
        """Get cached result if available and not expired"""
        if cache_key not in self._cache:
            return None
            
        cached_item = self._cache[cache_key]
        cached_time = cached_item.get("timestamp", 0)
        
        # Check if cache is still valid
        if time.time() - cached_time > self.config.cache_ttl_seconds:
            del self._cache[cache_key]
            return None
            
        return cached_item.get("result")
    
    def _cache_result(self, cache_key: str, result: PatternResult) -> None:
        """Cache a successful result with size management"""
        # Enforce cache size limits to prevent memory leaks
        if len(self._cache) >= self.MAX_CACHE_SIZE:
            # Remove oldest 10% of cache entries (FIFO eviction)
            entries_to_remove = max(1, self.MAX_CACHE_SIZE // 10)
            oldest_keys = list(self._cache.keys())[:entries_to_remove]
            
            for key in oldest_keys:
                del self._cache[key]
            
            import logging
            logger = get_bridge_logger(__name__)
            logger.debug(f"Evicted {len(oldest_keys)} cache entries to prevent memory leak")
        
        self._cache[cache_key] = {
            "result": result,
            "timestamp": time.time()
        }
    
    def get_metrics(self) -> List[PatternMetrics]:
        """Get execution metrics history"""
        return self._metrics_history.copy()
    
    def clear_cache(self) -> None:
        """Clear the pattern cache"""
        self._cache.clear()
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            "cache_size": len(self._cache),
            "cache_enabled": self.config.enable_caching,
            "cache_ttl_seconds": self.config.cache_ttl_seconds
        }


@dataclass
class OpenAIPatternConfig:
    """Configuration specific to OpenAI Agent patterns"""
    
    # Core OpenAI API settings
    model: str = "gpt-4o"
    temperature: float = 0.1
    max_tokens: Optional[int] = None
    top_p: float = 1.0
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    
    # OpenAI Assistant settings
    assistant_instructions: Optional[str] = None
    assistant_name: Optional[str] = None
    assistant_description: Optional[str] = None
    file_ids: List[str] = field(default_factory=list)
    metadata: Dict[str, str] = field(default_factory=dict)
    
    # Function calling settings
    function_calling: str = "auto"  # "auto", "none", or specific function name
    parallel_tool_calls: bool = True
    
    # Streaming settings
    stream: bool = False
    stream_options: Dict[str, Any] = field(default_factory=dict)
    
    # Multi-agent settings
    handoff_instructions: Optional[str] = None
    agent_descriptions: Dict[str, str] = field(default_factory=dict)
    
    # Integration settings
    enable_rag: bool = False
    rag_retrieval_count: int = 5
    enable_memory: bool = True
    conversation_memory_limit: int = 50
    
    # Timeout and retry settings
    request_timeout: int = 60
    max_retries: int = 3
    retry_delay: float = 1.0
    
    # Cost tracking
    enable_cost_tracking: bool = True
    cost_budget_cents: Optional[float] = None


class FrameworkType(Enum):
    """Framework type for pattern execution"""
    
    LANGGRAPH = "langgraph"
    OPENAI_AGENTS = "openai_agents"


class OpenAIBasePattern(BasePattern):
    """
    Abstract base class for OpenAI Agent-based patterns.
    
    Extends BasePattern with OpenAI-specific functionality including
    Assistant API integration, function calling, and streaming.
    """
    
    def __init__(
        self,
        config: PatternConfig,
        openai_config: OpenAIPatternConfig,
        tools: Optional[List[Any]] = None,
        ws_streaming: Optional[Any] = None
    ):
        """Initialize OpenAI pattern with dual configuration"""
        super().__init__(config, tools, ws_streaming)
        self.openai_config = openai_config
        self._openai_client = None
        self._assistant_id = None
        self._thread_id = None
    
    @property
    def framework_type(self) -> FrameworkType:
        """Get the framework type"""
        return FrameworkType.OPENAI_AGENTS
    
    @abstractmethod
    async def execute_openai_pattern(
        self,
        messages: List[BaseMessage],
        context: Dict[str, Any]
    ) -> PatternResult:
        """
        Execute the OpenAI-specific pattern logic.
        
        Args:
            messages: List of messages to process
            context: Execution context
            
        Returns:
            PatternResult with execution results and metrics
        """
        pass
    
    async def execute(
        self,
        messages: List[BaseMessage],
        context: Dict[str, Any]
    ) -> PatternResult:
        """Execute pattern with OpenAI-specific handling"""
        try:
            # Initialize OpenAI client if needed
            await self._ensure_openai_client()
            
            # Execute the OpenAI-specific pattern
            return await self.execute_openai_pattern(messages, context)
            
        except Exception as e:
            return PatternResult.error_result(
                error_message=f"OpenAI pattern execution failed: {str(e)}"
            )
    
    async def _ensure_openai_client(self) -> None:
        """Ensure OpenAI client is initialized with proper security"""
        if self._openai_client is None:
            try:
                from openai import AsyncOpenAI
                from app.service.config import get_settings_for_env
                from app.utils.firebase_secrets import get_app_secret
                
                settings = get_settings_for_env()
                
                # Get OpenAI API key from Firebase Secrets or environment
                api_key = settings.openai_api_key
                if not api_key:
                    try:
                        api_key = get_app_secret(settings.openai_api_key_secret)
                    except Exception as e:
                        raise ValueError(
                            f"OpenAI API key not configured. Set OPENAI_API_KEY environment variable "
                            f"or configure Firebase secret at {settings.openai_api_key_secret}. Error: {e}"
                        )
                
                if not api_key:
                    raise ValueError(
                        "OpenAI API key is empty. Please configure a valid API key."
                    )
                
                # Validate timeout settings for production
                if self.openai_config.request_timeout > 300:
                    import logging
                    logger = get_bridge_logger(__name__)
                    logger.warning(
                        f"OpenAI timeout {self.openai_config.request_timeout}s exceeds "
                        f"recommended 300s for fraud detection workloads"
                    )
                
                self._openai_client = AsyncOpenAI(
                    api_key=api_key,
                    timeout=self.openai_config.request_timeout
                )
                
            except ImportError:
                raise ImportError(
                    "OpenAI library not installed. Run 'poetry add openai' to use OpenAI patterns."
                )
    
    def _update_openai_metrics(self, metrics: PatternMetrics, **openai_data) -> None:
        """Update metrics with OpenAI-specific data"""
        if 'run_id' in openai_data:
            metrics.openai_run_id = openai_data['run_id']
        if 'assistant_id' in openai_data:
            metrics.openai_assistant_id = openai_data['assistant_id']
        if 'function_calls' in openai_data:
            metrics.function_calls = openai_data['function_calls']
        if 'streaming_chunks' in openai_data:
            metrics.streaming_chunks = openai_data['streaming_chunks']
        if 'cost_cents' in openai_data:
            metrics.api_cost_cents = openai_data['cost_cents']