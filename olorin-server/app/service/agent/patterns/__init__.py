"""
Agent Patterns Package

Implementation of Anthropic's recommended agent patterns for building effective AI agents.
This package provides the foundation for pattern-based agent architecture in Olorin.
"""

# Import all available patterns
from .augmented_llm import AugmentedLLMPattern
from .base import BasePattern, PatternConfig, PatternMetrics, PatternResult, PatternType
from .evaluator_optimizer import EvaluatorOptimizerPattern
from .orchestrator_workers import OrchestratorWorkersPattern
from .parallelization import ParallelizationPattern
from .prompt_chaining import PromptChainingPattern
from .registry import PatternRegistry, get_pattern_registry
from .routing import RoutingPattern

__all__ = [
    "BasePattern",
    "PatternConfig",
    "PatternMetrics",
    "PatternResult",
    "PatternType",
    "PatternRegistry",
    "get_pattern_registry",
    "AugmentedLLMPattern",
    "EvaluatorOptimizerPattern",
    "OrchestratorWorkersPattern",
    "ParallelizationPattern",
    "PromptChainingPattern",
    "RoutingPattern",
]
