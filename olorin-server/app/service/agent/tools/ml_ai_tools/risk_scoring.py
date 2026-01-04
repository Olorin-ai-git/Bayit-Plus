"""
Risk Scoring ML Tool

Advanced machine learning tool for comprehensive risk scoring and assessment
combining multiple risk factors, predictive modeling, and dynamic risk
calculation for real-time risk management and decision support.

This module now serves as a facade for the modular risk scoring system.
The implementation has been refactored into specialized modules for better
maintainability and compliance with file size requirements.
"""

# Import from the new modular structure
from .risk_scoring import ComprehensiveRiskResult, RiskScoringInput, RiskScoringTool

# For backward compatibility, expose the classes at module level
__all__ = ["RiskScoringTool", "RiskScoringInput", "ComprehensiveRiskResult"]


# Legacy function for backward compatibility
def get_risk_scoring_tool():
    """Get a configured risk scoring tool instance."""
    return RiskScoringTool()
