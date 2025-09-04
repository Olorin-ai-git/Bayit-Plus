"""
Base Autonomous Investigation Agents

Core classes and functionality for autonomous fraud investigation agents that use 
LLM-driven decision making and autonomous tool selection.
"""

# Import from the split modules for backward compatibility
from .autonomous_base import (
    AutonomousInvestigationAgent,
    autonomous_llm,
    get_autonomous_llm,
)

# Import RAG-enhanced agent if available
try:
    from .rag_enhanced_agent import (
        RAGEnhancedInvestigationAgent,
        create_rag_enhanced_agent
    )
    RAG_ENHANCED_AVAILABLE = True
except ImportError:
    RAG_ENHANCED_AVAILABLE = False
    RAGEnhancedInvestigationAgent = None
    create_rag_enhanced_agent = None

# Re-export for backward compatibility
__all__ = [
    'AutonomousInvestigationAgent',
    'autonomous_llm', 
    'get_autonomous_llm',
]

# Add RAG-enhanced agent if available
if RAG_ENHANCED_AVAILABLE:
    __all__.extend([
        'RAGEnhancedInvestigationAgent',
        'create_rag_enhanced_agent',
        'RAG_ENHANCED_AVAILABLE'
    ])
else:
    __all__.append('RAG_ENHANCED_AVAILABLE')