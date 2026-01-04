"""
Risk Scoring Package

Comprehensive risk scoring system with multiple assessment types and scoring models.

This package provides:
- Individual risk assessors (fraud, credit, operational, behavioral, contextual)
- Multiple scoring models (rule-based, weighted, ML-based, composite)
- Data preprocessing and recommendation generation utilities
- Comprehensive risk assessment and reporting

Main entry point: RiskScoringTool
"""

from .core import ComprehensiveRiskResult, RiskScoringInput, RiskScoringTool


# For backward compatibility with existing code
def get_risk_scoring_tool():
    """Get a configured risk scoring tool instance."""
    return RiskScoringTool()


__all__ = [
    "RiskScoringTool",
    "RiskScoringInput",
    "ComprehensiveRiskResult",
    "get_risk_scoring_tool",
]
