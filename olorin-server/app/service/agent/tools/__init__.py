"""
Enhanced Tools Package

Advanced tool framework with validation, retry orchestration, caching, and monitoring.
Provides enhanced versions of existing tools with improved reliability and observability.
"""

from .enhanced_cache import CacheEntry, CacheStats, EnhancedCache
from .enhanced_tool_base import (
    CacheStrategy,
    EnhancedToolBase,
    RetryStrategy,
    ToolConfig,
    ToolExecutionError,
    ToolMetrics,
    ToolResult,
    ToolTimeoutError,
    ToolValidationError,
    ValidationLevel,
)
from .extended_tool_registry import (
    ExtendedToolCategory,
    ExtendedToolRegistry,
    ToolDependency,
    ToolMetadata,
    extended_tool_registry,
    get_blockchain_tools,
    get_communication_tools,
    get_compliance_tools,
    get_intelligence_tools,
    get_ml_ai_tools,
    initialize_extended_tools,
    register_blockchain_tool_lazy,
)

# RAG-Enhanced Tool Components
from .rag_enhanced_tool_base import RAGEnhancedToolBase
from .rag_tool_context import (
    ContextInjectionStrategy,
    ToolContextEnhancementResult,
    ToolExecutionContext,
    ToolExecutionContextEnhancer,
    get_tool_context_enhancer,
)
from .tool_interceptor import (
    HookType,
    InterceptorConfig,
    InterceptorHook,
    ToolExecutionInterceptor,
)

__all__ = [
    # Enhanced Tool Base
    "EnhancedToolBase",
    "ToolConfig",
    "ToolResult",
    "ToolMetrics",
    "ValidationLevel",
    "RetryStrategy",
    "CacheStrategy",
    "ToolValidationError",
    "ToolExecutionError",
    "ToolTimeoutError",
    # Tool Interceptor
    "ToolExecutionInterceptor",
    "InterceptorConfig",
    "InterceptorHook",
    "HookType",
    # Enhanced Cache
    "EnhancedCache",
    "CacheEntry",
    "CacheStats",
    # RAG-Enhanced Tool Components
    "RAGEnhancedToolBase",
    "ToolExecutionContextEnhancer",
    "ToolExecutionContext",
    "ToolContextEnhancementResult",
    "ContextInjectionStrategy",
    "get_tool_context_enhancer",
]
