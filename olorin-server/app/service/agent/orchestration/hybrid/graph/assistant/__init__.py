"""
Assistant package for hybrid intelligence LLM enhancement.

This package contains components for enhancing LLM interaction with AI guidance
and context preparation for improved investigation decision-making.
"""

from .context_enhancer import ContextEnhancer
from .hybrid_assistant import HybridAssistant

__all__ = ["HybridAssistant", "ContextEnhancer"]
