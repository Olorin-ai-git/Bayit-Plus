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


class PatternType(Enum):
    """Enumeration of available agent patterns"""
    
    AUGMENTED_LLM = "augmented_llm"
    PROMPT_CHAINING = "prompt_chaining" 
    ROUTING = "routing"
    PARALLELIZATION = "parallelization"
    ORCHESTRATOR_WORKERS = "orchestrator_workers"
    EVALUATOR_OPTIMIZER = "evaluator_optimizer"


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
        """Cache a successful result"""
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