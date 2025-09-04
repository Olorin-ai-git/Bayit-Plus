"""
Result Enhancement Engine

Advanced engine for generating sophisticated insights from tool results using RAG knowledge.
"""

# Re-export from the main implementation
from .result_enhancement_main import ResultEnhancementEngine
from .result_augmentation_factory import (
    create_result_enhancement_engine,
    get_result_enhancement_engine
)

# Re-export all components
__all__ = [
    "ResultEnhancementEngine",
    "create_result_enhancement_engine", 
    "get_result_enhancement_engine"
]