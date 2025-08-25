"""
Pattern Registry

Central registry for managing and accessing agent patterns.
Provides pattern instantiation, lifecycle management, and usage statistics.
"""

import logging
from typing import Any, Dict, List, Optional, Type

from .base import BasePattern, PatternConfig, PatternType

logger = logging.getLogger(__name__)


class PatternRegistry:
    """Registry for managing and accessing agent patterns"""
    
    def __init__(self):
        """Initialize the pattern registry"""
        self._patterns: Dict[PatternType, Type[BasePattern]] = {}
        self._usage_stats: Dict[PatternType, Dict[str, Any]] = {}
        self._instances: Dict[str, BasePattern] = {}
    
    def register_pattern(self, pattern_type: PatternType, pattern_class: Type[BasePattern]) -> None:
        """Register a pattern class with the registry"""
        self._patterns[pattern_type] = pattern_class
        self._usage_stats[pattern_type] = {
            "total_executions": 0,
            "successful_executions": 0,
            "total_duration_ms": 0,
            "average_duration_ms": 0.0,
            "cache_hits": 0,
            "error_count": 0
        }
        logger.info(f"Registered pattern: {pattern_type.value}")
    
    def create_pattern(
        self,
        pattern_type: PatternType,
        config: PatternConfig,
        tools: Optional[List[Any]] = None,
        ws_streaming: Optional[Any] = None
    ) -> BasePattern:
        """Create a pattern instance"""
        
        if pattern_type not in self._patterns:
            raise ValueError(f"Pattern type {pattern_type.value} not registered")
        
        pattern_class = self._patterns[pattern_type]
        instance = pattern_class(config=config, tools=tools, ws_streaming=ws_streaming)
        
        # Store instance for potential reuse
        instance_id = f"{pattern_type.value}_{id(instance)}"
        self._instances[instance_id] = instance
        
        logger.debug(f"Created pattern instance: {pattern_type.value}")
        return instance
    
    def get_available_patterns(self) -> List[PatternType]:
        """Get list of available pattern types"""
        return list(self._patterns.keys())
    
    def is_pattern_available(self, pattern_type: PatternType) -> bool:
        """Check if a pattern type is available"""
        return pattern_type in self._patterns
    
    def update_usage_stats(self, pattern_type: PatternType, metrics: Any) -> None:
        """Update usage statistics for a pattern"""
        if pattern_type not in self._usage_stats:
            return
        
        stats = self._usage_stats[pattern_type]
        stats["total_executions"] += 1
        
        if hasattr(metrics, 'success') and metrics.success:
            stats["successful_executions"] += 1
        
        if hasattr(metrics, 'duration_ms') and metrics.duration_ms:
            stats["total_duration_ms"] += metrics.duration_ms
            stats["average_duration_ms"] = stats["total_duration_ms"] / stats["total_executions"]
        
        if hasattr(metrics, 'cache_hit') and metrics.cache_hit:
            stats["cache_hits"] += 1
        
        if hasattr(metrics, 'success') and not metrics.success:
            stats["error_count"] += 1
    
    def get_usage_stats(self) -> Dict[PatternType, Dict[str, Any]]:
        """Get usage statistics for all patterns"""
        return self._usage_stats.copy()
    
    def get_pattern_stats(self, pattern_type: PatternType) -> Optional[Dict[str, Any]]:
        """Get usage statistics for a specific pattern"""
        return self._usage_stats.get(pattern_type)
    
    def clear_instances(self) -> None:
        """Clear all cached pattern instances"""
        self._instances.clear()
        logger.info("Cleared all pattern instances")
    
    def get_registry_info(self) -> Dict[str, Any]:
        """Get information about the registry state"""
        return {
            "registered_patterns": len(self._patterns),
            "pattern_types": [pt.value for pt in self._patterns.keys()],
            "active_instances": len(self._instances),
            "total_executions": sum(stats["total_executions"] for stats in self._usage_stats.values())
        }


# Global registry instance
_pattern_registry: Optional[PatternRegistry] = None


def get_pattern_registry() -> PatternRegistry:
    """Get the global pattern registry instance"""
    global _pattern_registry
    
    if _pattern_registry is None:
        _pattern_registry = PatternRegistry()
        _register_default_patterns()
    
    return _pattern_registry


def _register_default_patterns() -> None:
    """Register all default patterns with the global registry"""
    registry = _pattern_registry
    
    try:
        from .augmented_llm import AugmentedLLMPattern
        registry.register_pattern(PatternType.AUGMENTED_LLM, AugmentedLLMPattern)
    except ImportError as e:
        logger.warning(f"Failed to register AugmentedLLMPattern: {e}")
    
    try:
        from .prompt_chaining import PromptChainingPattern
        registry.register_pattern(PatternType.PROMPT_CHAINING, PromptChainingPattern)
    except ImportError as e:
        logger.warning(f"Failed to register PromptChainingPattern: {e}")
    
    try:
        from .routing import RoutingPattern
        registry.register_pattern(PatternType.ROUTING, RoutingPattern)
    except ImportError as e:
        logger.warning(f"Failed to register RoutingPattern: {e}")
    
    try:
        from .parallelization import ParallelizationPattern
        registry.register_pattern(PatternType.PARALLELIZATION, ParallelizationPattern)
    except ImportError as e:
        logger.warning(f"Failed to register ParallelizationPattern: {e}")
    
    try:
        from .orchestrator_workers import OrchestratorWorkersPattern
        registry.register_pattern(PatternType.ORCHESTRATOR_WORKERS, OrchestratorWorkersPattern)
    except ImportError as e:
        logger.warning(f"Failed to register OrchestratorWorkersPattern: {e}")
    
    try:
        from .evaluator_optimizer import EvaluatorOptimizerPattern
        registry.register_pattern(PatternType.EVALUATOR_OPTIMIZER, EvaluatorOptimizerPattern)
    except ImportError as e:
        logger.warning(f"Failed to register EvaluatorOptimizerPattern: {e}")
    
    logger.info(f"Pattern registry initialized with {len(registry.get_available_patterns())} patterns")