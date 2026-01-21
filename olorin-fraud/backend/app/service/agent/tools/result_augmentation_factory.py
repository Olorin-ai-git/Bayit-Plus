"""
Tool Result Augmentation Factory

Factory functions for creating and managing result augmentation services.
"""

from typing import Optional

from app.service.logging import get_bridge_logger

from .result_augmentation_core import ResultAugmentationConfig

logger = get_bridge_logger(__name__)

# Try to import RAG components with graceful fallback
try:
    from ..rag import RAGOrchestrator

    RAG_AVAILABLE = True
except ImportError:
    logger.warning("RAG components not available for result augmentation factory")
    RAG_AVAILABLE = False
    RAGOrchestrator = None


# Global service instance for reuse
_result_augmentation_service = None
_result_enhancement_engine = None


def create_result_augmentation_service(
    rag_orchestrator: Optional["RAGOrchestrator"] = None,
    config: Optional[ResultAugmentationConfig] = None,
) -> "ToolResultAugmentationService":
    """Create a new result augmentation service instance"""

    from .result_augmentation_main import ToolResultAugmentationService

    # Try to get RAG orchestrator if not provided
    if not rag_orchestrator and RAG_AVAILABLE:
        try:
            from ..rag.rag_orchestrator import get_rag_orchestrator

            rag_orchestrator = get_rag_orchestrator()
        except ImportError:
            pass

    return ToolResultAugmentationService(
        rag_orchestrator=rag_orchestrator, config=config
    )


def create_result_enhancement_engine(
    rag_orchestrator: Optional["RAGOrchestrator"] = None,
) -> "ResultEnhancementEngine":
    """Create a new result enhancement engine instance"""

    from .result_enhancement_main import ResultEnhancementEngine

    # Try to get RAG orchestrator if not provided
    if not rag_orchestrator and RAG_AVAILABLE:
        try:
            from ..rag.rag_orchestrator import get_rag_orchestrator

            rag_orchestrator = get_rag_orchestrator()
        except ImportError:
            pass

    return ResultEnhancementEngine(rag_orchestrator=rag_orchestrator)


def get_result_augmentation_service(
    rag_orchestrator: Optional["RAGOrchestrator"] = None,
) -> "ToolResultAugmentationService":
    """Get or create the global result augmentation service instance"""

    global _result_augmentation_service

    if _result_augmentation_service is None:
        _result_augmentation_service = create_result_augmentation_service(
            rag_orchestrator
        )
        logger.info("Global result augmentation service created")

    return _result_augmentation_service


def get_result_enhancement_engine(
    rag_orchestrator: Optional["RAGOrchestrator"] = None,
) -> "ResultEnhancementEngine":
    """Get or create the global result enhancement engine instance"""

    global _result_enhancement_engine

    if _result_enhancement_engine is None:
        _result_enhancement_engine = create_result_enhancement_engine(rag_orchestrator)
        logger.info("Global result enhancement engine created")

    return _result_enhancement_engine


def clear_global_instances():
    """Clear global service instances (useful for testing)"""

    global _result_augmentation_service, _result_enhancement_engine

    _result_augmentation_service = None
    _result_enhancement_engine = None

    logger.info("Global result augmentation service instances cleared")
