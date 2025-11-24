"""
Unified Logging Services for Olorin Server

This package provides comprehensive logging capabilities including:
- Unified logging system with command-line configuration
- Structured investigation logging for agent workflows
- Multi-format support (human, JSON, structured)
- Performance monitoring and optimization
- Backward compatibility with existing logging patterns

Author: Gil Klainert
Date: 2025-01-04
Plan: /docs/plans/2025-01-04-unified-logging-system-plan.md
"""

# Structured investigation logging (existing functionality)
from .autonomous_investigation_logger import (
    StructuredInvestigationLogger,
    LLMInteractionLog,
    AgentDecisionLog,
    ToolExecutionLog,
    LangGraphNodeLog,
    InvestigationProgressLog,
    InteractionType,
    LogLevel,
    get_logger
)

# Unified logging system (new functionality)
from .unified_logging_core import (
    UnifiedLoggingCore,
    LogFormat,
    LogOutput,
    StructuredFormatter,
    get_unified_logging_core,
    get_unified_logger,
    configure_unified_logging,
    get_logging_performance_stats,
)

# Configuration management
from .logging_config_manager import (
    LoggingConfig,
    LoggingConfigManager,
)

# Integration bridge for backward compatibility
from .integration_bridge import (
    UnifiedLoggingBridge,
    get_unified_bridge,
    configure_unified_bridge_from_args,
    configure_unified_bridge_from_config,
    get_bridge_logger,
    bridge_configure_logger,
)

# Command-line interface
from .cli import (
    add_unified_logging_arguments,
    create_unified_logging_parser,
    parse_logging_args,
    normalize_logging_args,
    show_logging_configuration_summary,
)

# Investigation-specific logging (new functionality)
from .investigation_log_context import (
    set_investigation_context,
    get_investigation_id,
    get_investigation_metadata,
    clear_investigation_context,
)
from .investigation_log_handler import InvestigationLogHandler
from .investigation_log_formatter import InvestigationLogFormatter
from .investigation_log_manager import InvestigationLogManager

__all__ = [
    # Structured investigation logging (existing)
    "StructuredInvestigationLogger",
    "LLMInteractionLog",
    "AgentDecisionLog",
    "ToolExecutionLog",
    "LangGraphNodeLog",
    "InvestigationProgressLog",
    "InteractionType",
    "LogLevel",
    "get_logger",
    
    # Unified logging system (new)
    "UnifiedLoggingCore",
    "LogFormat", 
    "LogOutput",
    "StructuredFormatter",
    "get_unified_logging_core",
    "get_unified_logger",
    "configure_unified_logging",
    "get_logging_performance_stats",
    
    # Configuration management
    "LoggingConfig",
    "LoggingConfigManager",
    
    # Integration bridge
    "UnifiedLoggingBridge",
    "get_unified_bridge",
    "configure_unified_bridge_from_args",
    "configure_unified_bridge_from_config", 
    "get_bridge_logger",
    "bridge_configure_logger",
    
    # Command-line interface
    "add_unified_logging_arguments",
    "create_unified_logging_parser",
    "parse_logging_args",
    "normalize_logging_args",
    "show_logging_configuration_summary",
    
    # Investigation-specific logging (new)
    "set_investigation_context",
    "get_investigation_id",
    "get_investigation_metadata",
    "clear_investigation_context",
    "InvestigationLogHandler",
    "InvestigationLogFormatter",
    "InvestigationLogManager",
]