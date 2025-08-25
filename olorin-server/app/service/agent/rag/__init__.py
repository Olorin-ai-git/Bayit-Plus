"""
RAG System Package

Retrieval-Augmented Generation system for enhanced natural language processing,
knowledge retrieval, and context-aware investigation support.
"""

from .knowledge_base import (
    KnowledgeBase,
    DocumentChunk,
    DocumentMetadata,
    ChunkingStrategy,
    KnowledgeBaseConfig
)

from .retrieval_engine import (
    RetrievalEngine,
    RetrievalQuery,
    RetrievalResult,
    SearchStrategy,
    RetrievalConfig
)

from .context_augmentor import (
    ContextAugmentor,
    AugmentedContext,
    ContextStrategy,
    AugmentationConfig
)

from .rag_orchestrator import (
    RAGOrchestrator,
    RAGRequest,
    RAGResponse,
    RAGConfig,
    RAGMetrics
)

__all__ = [
    # Knowledge Base
    "KnowledgeBase",
    "DocumentChunk",
    "DocumentMetadata", 
    "ChunkingStrategy",
    "KnowledgeBaseConfig",
    
    # Retrieval Engine
    "RetrievalEngine",
    "RetrievalQuery",
    "RetrievalResult",
    "SearchStrategy",
    "RetrievalConfig",
    
    # Context Augmentor
    "ContextAugmentor",
    "AugmentedContext",
    "ContextStrategy", 
    "AugmentationConfig",
    
    # RAG Orchestrator
    "RAGOrchestrator",
    "RAGRequest",
    "RAGResponse",
    "RAGConfig",
    "RAGMetrics"
]