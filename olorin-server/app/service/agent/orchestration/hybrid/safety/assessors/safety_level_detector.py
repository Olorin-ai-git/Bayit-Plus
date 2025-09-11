"""
Safety Level Detector for Hybrid Intelligence Graph

This module determines the appropriate safety level based on investigation state,
AI confidence, and risk factors.
"""

from typing import TYPE_CHECKING

from ..models import SafetyLevel
from ...state.enums_and_constants import AIConfidenceLevel
from app.service.logging import get_bridge_logger

if TYPE_CHECKING:
    from ...state.base_state_schema import HybridInvestigationState

logger = get_bridge_logger(__name__)


class SafetyLevelDetector:
    """
    Determines appropriate safety level based on investigation context.
    
    Safety levels are determined by analyzing:
    - AI confidence levels and trends
    - Orchestrator loop count and patterns
    - Safety override history
    - Risk indicators and anomalies
    """
    
    def __init__(self):
        """Initialize safety level detector"""
        # Safety level escalation thresholds
        self.emergency_triggers = {
            "max_loops_emergency": 20,
            "max_overrides_emergency": 3
        }
        
        self.strict_triggers = {
            "min_overrides_strict": 2,
            "confidence_strict": AIConfidenceLevel.LOW
        }
        
        self.permissive_requirements = {
            "confidence_permissive": AIConfidenceLevel.HIGH,
            "max_overrides_permissive": 0
        }
    
    def determine_safety_level(self, state: 'HybridInvestigationState') -> SafetyLevel:
        """
        Determine appropriate safety level based on investigation state.
        
        Args:
            state: Current investigation state
            
        Returns:
            Appropriate safety level for current conditions
        """
        ai_confidence = state.get("ai_confidence", 0.5)
        confidence_level = state.get("ai_confidence_level", AIConfidenceLevel.UNKNOWN)
        orchestrator_loops = state.get("orchestrator_loops", 0)
        safety_overrides = len(state.get("safety_overrides", []))
        
        # Emergency level triggers - highest priority
        if self._check_emergency_conditions(orchestrator_loops, safety_overrides):
            logger.debug(f"   🚨 Emergency safety level: loops={orchestrator_loops}, overrides={safety_overrides}")
            return SafetyLevel.EMERGENCY
        
        # Strict level for risky conditions
        if self._check_strict_conditions(confidence_level, safety_overrides):
            logger.debug(f"   🔒 Strict safety level: confidence={confidence_level.value}, overrides={safety_overrides}")
            return SafetyLevel.STRICT
        
        # Permissive level for high confidence, low risk
        if self._check_permissive_conditions(confidence_level, safety_overrides):
            logger.debug(f"   🟢 Permissive safety level: high confidence, no overrides")
            return SafetyLevel.PERMISSIVE
        
        # Standard level for normal operation
        logger.debug(f"   ⚖️ Standard safety level: normal operation")
        return SafetyLevel.STANDARD
    
    def _check_emergency_conditions(self, orchestrator_loops: int, safety_overrides: int) -> bool:
        """Check if emergency safety level is required"""
        return (
            orchestrator_loops > self.emergency_triggers["max_loops_emergency"] or
            safety_overrides > self.emergency_triggers["max_overrides_emergency"]
        )
    
    def _check_strict_conditions(self, confidence_level: AIConfidenceLevel, safety_overrides: int) -> bool:
        """Check if strict safety level is required"""
        return (
            confidence_level == self.strict_triggers["confidence_strict"] or
            safety_overrides > self.strict_triggers["min_overrides_strict"]
        )
    
    def _check_permissive_conditions(self, confidence_level: AIConfidenceLevel, safety_overrides: int) -> bool:
        """Check if permissive safety level can be applied"""
        return (
            confidence_level == self.permissive_requirements["confidence_permissive"] and
            safety_overrides <= self.permissive_requirements["max_overrides_permissive"]
        )
    
    def get_safety_level_reasoning(self, state: 'HybridInvestigationState') -> str:
        """
        Get human-readable reasoning for safety level determination.
        
        Args:
            state: Current investigation state
            
        Returns:
            Human-readable explanation of safety level decision
        """
        confidence_level = state.get("ai_confidence_level", AIConfidenceLevel.UNKNOWN)
        orchestrator_loops = state.get("orchestrator_loops", 0)
        safety_overrides = len(state.get("safety_overrides", []))
        
        if self._check_emergency_conditions(orchestrator_loops, safety_overrides):
            return (f"Emergency level triggered: {orchestrator_loops} loops "
                   f"(max {self.emergency_triggers['max_loops_emergency']}) or "
                   f"{safety_overrides} overrides (max {self.emergency_triggers['max_overrides_emergency']})")
        
        if self._check_strict_conditions(confidence_level, safety_overrides):
            return (f"Strict level: Low AI confidence ({confidence_level.value}) "
                   f"or multiple overrides ({safety_overrides})")
        
        if self._check_permissive_conditions(confidence_level, safety_overrides):
            return f"Permissive level: High confidence ({confidence_level.value}) with no overrides"
        
        return f"Standard level: Normal operation (confidence={confidence_level.value}, overrides={safety_overrides})"
    
    def update_triggers(self, 
                       emergency_loops: int = None,
                       emergency_overrides: int = None,
                       strict_overrides: int = None) -> None:
        """
        Update safety level triggers (useful for testing or configuration).
        
        Args:
            emergency_loops: New emergency loop threshold
            emergency_overrides: New emergency override threshold
            strict_overrides: New strict override threshold
        """
        if emergency_loops is not None:
            self.emergency_triggers["max_loops_emergency"] = emergency_loops
            logger.info(f"Updated emergency loop threshold to {emergency_loops}")
        
        if emergency_overrides is not None:
            self.emergency_triggers["max_overrides_emergency"] = emergency_overrides
            logger.info(f"Updated emergency override threshold to {emergency_overrides}")
        
        if strict_overrides is not None:
            self.strict_triggers["min_overrides_strict"] = strict_overrides
            logger.info(f"Updated strict override threshold to {strict_overrides}")


# Global detector instance
_safety_level_detector = None


def get_safety_level_detector() -> SafetyLevelDetector:
    """Get the global safety level detector instance"""
    global _safety_level_detector
    if _safety_level_detector is None:
        _safety_level_detector = SafetyLevelDetector()
    return _safety_level_detector


def reset_safety_level_detector():
    """Reset the global detector (useful for testing)"""
    global _safety_level_detector
    _safety_level_detector = None