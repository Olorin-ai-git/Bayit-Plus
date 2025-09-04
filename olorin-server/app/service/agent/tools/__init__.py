"""
Enhanced Tools Package

Advanced tool framework with validation, retry orchestration, caching, and monitoring.
Provides enhanced versions of existing tools with improved reliability and observability.
"""

from .enhanced_tool_base import (
    EnhancedToolBase,
    ToolConfig,
    ToolResult,
    ToolMetrics,
    ValidationLevel,
    RetryStrategy,
    CacheStrategy,
    ToolValidationError,
    ToolExecutionError,
    ToolTimeoutError
)

from .extended_tool_registry import (
    ExtendedToolRegistry,
    ExtendedToolCategory,
    ToolMetadata,
    ToolDependency,
    extended_tool_registry,
    initialize_extended_tools,
    register_blockchain_tool_lazy,
    get_blockchain_tools,
    get_intelligence_tools,
    get_ml_ai_tools,
    get_communication_tools,
    get_compliance_tools
)

from .tool_interceptor import (
    ToolExecutionInterceptor,
    InterceptorConfig,
    InterceptorHook,
    HookType
)

from .enhanced_cache import (
    EnhancedCache,
    CacheEntry,
    CacheStats
)

# RAG-Enhanced Tool Components
from .rag_enhanced_tool_base import RAGEnhancedToolBase
from .rag_tool_context import (
    ToolExecutionContextEnhancer,
    ToolExecutionContext,
    ToolContextEnhancementResult,
    ContextInjectionStrategy,
    get_tool_context_enhancer
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
    "get_tool_context_enhancer"
]