"""
Hybrid Intelligence Components

Modular AI confidence engine with specialized components for evidence assessment,
strategic decision-making, and reasoning generation. Maintains full backward
compatibility with the original AIConfidenceEngine interface.

Components:
- Confidence Factors: Specialized assessors for different evidence sources
- Strategy: Strategic decision-making for investigation routing
- Reasoning: Analysis and explanation generation
- Decision Engine: Main orchestrator coordinating all components
"""

from .decision_engine import DecisionEngine

# Re-export the main decision engine for backward compatibility
__all__ = ["DecisionEngine"]
