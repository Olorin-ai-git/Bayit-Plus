"""
Pattern Registry

Central registry for managing and accessing agent patterns.
Provides pattern instantiation, lifecycle management, and usage statistics.
"""

from typing import Any, Dict, List, Optional, Type

from app.service.logging import get_bridge_logger

from .base import (
    BasePattern,
    FrameworkType,
    OpenAIBasePattern,
    OpenAIPatternConfig,
    PatternConfig,
    PatternType,
)

logger = get_bridge_logger(__name__)


class PatternRegistry:
    """Registry for managing and accessing agent patterns"""

    def __init__(self):
        """Initialize the pattern registry"""
        self._patterns: Dict[PatternType, Type[BasePattern]] = {}
        self._usage_stats: Dict[PatternType, Dict[str, Any]] = {}
        self._instances: Dict[str, BasePattern] = {}
        self._framework_mapping: Dict[PatternType, FrameworkType] = {}

    def register_pattern(
        self, pattern_type: PatternType, pattern_class: Type[BasePattern]
    ) -> None:
        """Register a pattern class with the registry"""
        self._patterns[pattern_type] = pattern_class

        # Detect framework type from pattern class
        if issubclass(pattern_class, OpenAIBasePattern):
            self._framework_mapping[pattern_type] = FrameworkType.OPENAI_AGENTS
        else:
            self._framework_mapping[pattern_type] = FrameworkType.LANGGRAPH

        # Initialize enhanced usage statistics
        base_stats = {
            "total_executions": 0,
            "successful_executions": 0,
            "total_duration_ms": 0,
            "average_duration_ms": 0.0,
            "cache_hits": 0,
            "error_count": 0,
        }

        # Add OpenAI-specific stats if it's an OpenAI pattern
        if self._framework_mapping[pattern_type] == FrameworkType.OPENAI_AGENTS:
            base_stats.update(
                {
                    "total_tokens": 0,
                    "total_cost_cents": 0.0,
                    "function_calls": 0,
                    "streaming_sessions": 0,
                    "assistant_runs": 0,
                }
            )

        self._usage_stats[pattern_type] = base_stats
        framework = self._framework_mapping[pattern_type].value
        logger.info(f"Registered {framework} pattern: {pattern_type.value}")

    def create_pattern(
        self,
        pattern_type: PatternType,
        config: PatternConfig,
        tools: Optional[List[Any]] = None,
        ws_streaming: Optional[Any] = None,
        openai_config: Optional[OpenAIPatternConfig] = None,
    ) -> BasePattern:
        """Create a pattern instance"""

        if pattern_type not in self._patterns:
            raise ValueError(f"Pattern type {pattern_type.value} not registered")

        pattern_class = self._patterns[pattern_type]
        framework_type = self._framework_mapping[pattern_type]

        # Create instance based on framework type
        if framework_type == FrameworkType.OPENAI_AGENTS:
            if not openai_config:
                openai_config = OpenAIPatternConfig()
            instance = pattern_class(
                config=config,
                openai_config=openai_config,
                tools=tools,
                ws_streaming=ws_streaming,
            )
        else:
            instance = pattern_class(
                config=config, tools=tools, ws_streaming=ws_streaming
            )

        # Store instance for potential reuse
        instance_id = f"{pattern_type.value}_{id(instance)}"
        self._instances[instance_id] = instance

        logger.debug(
            f"Created {framework_type.value} pattern instance: {pattern_type.value}"
        )
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

        if hasattr(metrics, "success") and metrics.success:
            stats["successful_executions"] += 1

        # CRITICAL FIX: Handle None values to prevent TypeError
        duration_ms = getattr(metrics, "duration_ms", None)
        if duration_ms is not None:
            stats["total_duration_ms"] += duration_ms
            # CRITICAL FIX: Enhanced None-safety for duration calculation
            total_duration = stats.get("total_duration_ms") or 0
            total_executions = max(1, stats.get("total_executions", 1))
            stats["average_duration_ms"] = total_duration / total_executions

        if hasattr(metrics, "cache_hit") and metrics.cache_hit:
            stats["cache_hits"] += 1

        if hasattr(metrics, "success") and not metrics.success:
            stats["error_count"] += 1

        # Update OpenAI-specific metrics if this is an OpenAI pattern
        framework_type = self._framework_mapping.get(pattern_type)
        if framework_type == FrameworkType.OPENAI_AGENTS:
            if hasattr(metrics, "token_usage"):
                # CRITICAL FIX: Handle None values to prevent TypeError
                token_usage = metrics.token_usage
                if token_usage is not None and isinstance(token_usage, dict):
                    input_tokens = token_usage.get("input") or 0
                    output_tokens = token_usage.get("output") or 0
                    total_tokens = (input_tokens if input_tokens is not None else 0) + (
                        output_tokens if output_tokens is not None else 0
                    )
                    stats["total_tokens"] += total_tokens

            # CRITICAL FIX: Handle None values to prevent TypeError
            api_cost_cents = getattr(metrics, "api_cost_cents", None)
            if api_cost_cents is not None:
                stats["total_cost_cents"] += api_cost_cents

            if hasattr(metrics, "function_calls"):
                stats["function_calls"] += metrics.function_calls

            # CRITICAL FIX: Handle None values to prevent TypeError
            streaming_chunks = getattr(metrics, "streaming_chunks", None)
            if streaming_chunks is not None and streaming_chunks > 0:
                stats["streaming_sessions"] += 1

            if hasattr(metrics, "openai_run_id") and metrics.openai_run_id:
                stats["assistant_runs"] += 1

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

    def get_framework_type(self, pattern_type: PatternType) -> Optional[FrameworkType]:
        """Get the framework type for a pattern"""
        return self._framework_mapping.get(pattern_type)

    def get_patterns_by_framework(
        self, framework_type: FrameworkType
    ) -> List[PatternType]:
        """Get all patterns for a specific framework"""
        return [
            pattern_type
            for pattern_type, fw_type in self._framework_mapping.items()
            if fw_type == framework_type
        ]

    def is_openai_pattern(self, pattern_type: PatternType) -> bool:
        """Check if a pattern is OpenAI-based"""
        return self._framework_mapping.get(pattern_type) == FrameworkType.OPENAI_AGENTS

    def is_langgraph_pattern(self, pattern_type: PatternType) -> bool:
        """Check if a pattern is LangGraph-based"""
        return self._framework_mapping.get(pattern_type) == FrameworkType.LANGGRAPH

    def get_registry_info(self) -> Dict[str, Any]:
        """Get information about the registry state"""
        langgraph_patterns = self.get_patterns_by_framework(FrameworkType.LANGGRAPH)
        openai_patterns = self.get_patterns_by_framework(FrameworkType.OPENAI_AGENTS)

        return {
            "registered_patterns": len(self._patterns),
            "pattern_types": [pt.value for pt in self._patterns.keys()],
            "active_instances": len(self._instances),
            "total_executions": sum(
                stats["total_executions"] for stats in self._usage_stats.values()
            ),
            "langgraph_patterns": len(langgraph_patterns),
            "openai_patterns": len(openai_patterns),
            "frameworks_supported": list(set(self._framework_mapping.values())),
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

        registry.register_pattern(
            PatternType.ORCHESTRATOR_WORKERS, OrchestratorWorkersPattern
        )
    except ImportError as e:
        logger.warning(f"Failed to register OrchestratorWorkersPattern: {e}")

    try:
        from .evaluator_optimizer import EvaluatorOptimizerPattern

        registry.register_pattern(
            PatternType.EVALUATOR_OPTIMIZER, EvaluatorOptimizerPattern
        )
    except ImportError as e:
        logger.warning(f"Failed to register EvaluatorOptimizerPattern: {e}")

    # Register OpenAI Agent patterns
    try:
        from .openai import OpenAIAssistantPattern

        registry.register_pattern(PatternType.OPENAI_ASSISTANT, OpenAIAssistantPattern)
    except ImportError as e:
        logger.warning(f"Failed to register OpenAIAssistantPattern: {e}")

    try:
        from .openai.function_calling_pattern import OpenAIFunctionCallingPattern

        registry.register_pattern(
            PatternType.OPENAI_FUNCTION_CALLING, OpenAIFunctionCallingPattern
        )
    except ImportError as e:
        logger.warning(f"Failed to register OpenAIFunctionCallingPattern: {e}")

    try:
        from .openai.conversation_pattern import OpenAIConversationPattern

        registry.register_pattern(
            PatternType.OPENAI_CONVERSATION, OpenAIConversationPattern
        )
    except ImportError as e:
        logger.warning(f"Failed to register OpenAIConversationPattern: {e}")

    try:
        from .openai.multi_agent_pattern import OpenAIMultiAgentPattern

        registry.register_pattern(
            PatternType.OPENAI_MULTI_AGENT, OpenAIMultiAgentPattern
        )
    except ImportError as e:
        logger.warning(f"Failed to register OpenAIMultiAgentPattern: {e}")

    try:
        from .openai.rag_pattern import OpenAIRAGPattern

        registry.register_pattern(PatternType.OPENAI_RAG, OpenAIRAGPattern)
    except ImportError as e:
        logger.warning(f"Failed to register OpenAIRAGPattern: {e}")

    logger.info(
        f"Pattern registry initialized with {len(registry.get_available_patterns())} patterns"
    )
