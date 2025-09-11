"""
AI Confidence Engine for Hybrid Intelligence Graph

This module provides a backward-compatible interface to the modular AI confidence
system while maintaining all original functionality and performance characteristics.

DEPRECATED: Direct use of this module is deprecated. Use intelligence.DecisionEngine instead.
This module is maintained for backward compatibility only.
"""

import asyncio
import time
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import json
import os

from .hybrid_state_schema import (
    HybridInvestigationState,
    AIRoutingDecision,
    AIConfidenceLevel,
    InvestigationStrategy,
    SafetyConcernType
)

from .intelligence import DecisionEngine

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class AIConfidenceEngine:
    """
    BACKWARD COMPATIBILITY WRAPPER for modular AI confidence system.
    
    This class maintains the original interface while delegating all functionality
    to the new modular DecisionEngine for improved maintainability and performance.
    
    DEPRECATED: Use intelligence.DecisionEngine directly for new implementations.
    """
    
    def __init__(self):
        # Initialize the new modular decision engine
        self._decision_engine = DecisionEngine()
        
        # Maintain original interface properties for backward compatibility
        self.confidence_weights = self._decision_engine.confidence_weights
        self.strategy_confidence_thresholds = self._decision_engine.strategy_selector.strategy_confidence_thresholds
        
    async def calculate_investigation_confidence(
        self,
        state: HybridInvestigationState
    ) -> AIRoutingDecision:
        """
        Calculate comprehensive confidence score and generate routing decision.
        
        BACKWARD COMPATIBILITY: Delegates to modular DecisionEngine while maintaining
        identical interface and behavior for existing code.
        
        Args:
            state: Current investigation state with all available evidence
            
        Returns:
            Complete AI routing decision with confidence, strategy, and reasoning
        """
        logger.debug(f"🔄 AIConfidenceEngine: Delegating to modular DecisionEngine")
        
        # Delegate to the new modular decision engine
        return await self._decision_engine.calculate_investigation_confidence(state)