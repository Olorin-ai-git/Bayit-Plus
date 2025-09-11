"""
Advanced Safety Manager for Hybrid Intelligence Graph

This module provides adaptive safety mechanisms that adjust limits based on
investigation context, AI confidence, and resource consumption patterns.
"""

import os
import time
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from .hybrid_state_schema import (
    HybridInvestigationState,
    AIConfidenceLevel,
    SafetyConcernType,
    InvestigationStrategy
)
from .evidence_config import get_evidence_validator

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class SafetyLevel(Enum):
    """Safety enforcement levels"""
    PERMISSIVE = "permissive"       # High confidence - relaxed limits
    STANDARD = "standard"           # Normal operation limits
    STRICT = "strict"               # Low confidence - tight limits
    EMERGENCY = "emergency"         # Critical safety override


@dataclass
class SafetyLimits:
    """Dynamic safety limits based on context"""
    max_orchestrator_loops: int
    max_tool_executions: int
    max_domain_attempts: int
    max_investigation_time_minutes: int
    confidence_threshold_for_override: float
    resource_pressure_threshold: float


@dataclass
class SafetyStatus:
    """Current safety status and recommendations"""
    allows_ai_control: bool
    requires_immediate_termination: bool
    safety_level: SafetyLevel
    current_limits: SafetyLimits
    safety_concerns: List[str]
    override_reasoning: List[str]
    resource_pressure: float
    estimated_remaining_resources: Dict[str, int]
    recommended_actions: List[str]


class SafetyConcern:
    """Represents a specific safety concern"""
    
    def __init__(
        self,
        concern_type: SafetyConcernType,
        severity: str,  # "low", "medium", "high", "critical"
        message: str,
        metrics: Dict[str, Any],
        recommended_action: str
    ):
        self.concern_type = concern_type
        self.severity = severity
        self.message = message
        self.metrics = metrics
        self.recommended_action = recommended_action
        self.timestamp = datetime.now().isoformat()


class AdvancedSafetyManager:
    """
    Advanced safety manager with context-aware dynamic limits.
    
    Adapts safety mechanisms based on:
    - AI confidence levels
    - Investigation complexity
    - Resource consumption patterns
    - Historical performance
    - Current investigation strategy
    """
    
    def __init__(self):
        # Base safety limits for different modes
        self.base_limits = {
            "test": {
                "max_orchestrator_loops": 12,
                "max_tool_executions": 8,
                "max_domain_attempts": 6,
                "max_investigation_time_minutes": 10,
                "confidence_threshold_for_override": 0.3,
                "resource_pressure_threshold": 0.8
            },
            "live": {
                "max_orchestrator_loops": 25,
                "max_tool_executions": 15,
                "max_domain_attempts": 10,
                "max_investigation_time_minutes": 30,
                "confidence_threshold_for_override": 0.4,
                "resource_pressure_threshold": 0.7
            }
        }
        
        # Safety level multipliers
        self.safety_multipliers = {
            SafetyLevel.PERMISSIVE: {"loops": 1.5, "tools": 1.3, "domains": 1.2, "time": 1.4},
            SafetyLevel.STANDARD: {"loops": 1.0, "tools": 1.0, "domains": 1.0, "time": 1.0},
            SafetyLevel.STRICT: {"loops": 0.7, "tools": 0.8, "domains": 0.8, "time": 0.8},
            SafetyLevel.EMERGENCY: {"loops": 0.5, "tools": 0.5, "domains": 0.5, "time": 0.5}
        }
        
        # Strategy-based adjustments
        self.strategy_adjustments = {
            InvestigationStrategy.CRITICAL_PATH: {"loops": 0.8, "tools": 0.6, "domains": 0.5, "time": 0.7},
            InvestigationStrategy.MINIMAL: {"loops": 0.6, "tools": 0.5, "domains": 0.3, "time": 0.5},
            InvestigationStrategy.FOCUSED: {"loops": 0.9, "tools": 0.8, "domains": 0.7, "time": 0.8},
            InvestigationStrategy.ADAPTIVE: {"loops": 1.0, "tools": 1.0, "domains": 1.0, "time": 1.0},
            InvestigationStrategy.COMPREHENSIVE: {"loops": 1.2, "tools": 1.3, "domains": 1.5, "time": 1.4}
        }
    
    def validate_current_state(self, state: HybridInvestigationState) -> SafetyStatus:
        """
        Perform comprehensive safety validation of current investigation state.
        
        Args:
            state: Current investigation state
            
        Returns:
            Complete safety status with recommendations
        """
        logger.debug(f"🛡️ Starting Hybrid Intelligence comprehensive safety validation")
        logger.debug(f"   Advanced Safety Manager: Dynamic limits & resource pressure monitoring")
        logger.debug(f"   Safety assessment: AI control authorization + emergency termination checks")
        
        # Determine current safety level
        safety_level = self._determine_safety_level(state)
        
        # Calculate dynamic limits
        current_limits = self._calculate_dynamic_limits(state, safety_level)
        
        # Assess resource pressure
        resource_pressure = self._calculate_resource_pressure(state, current_limits)
        
        # Check for safety concerns
        safety_concerns = self._identify_safety_concerns(state, current_limits, resource_pressure)
        
        # Determine if AI control is allowed
        allows_ai_control = self._should_allow_ai_control(state, safety_concerns, resource_pressure)
        
        # Check for immediate termination
        requires_termination = self._requires_immediate_termination(state, safety_concerns, current_limits)
        
        # Build override reasoning
        override_reasoning = self._build_override_reasoning(state, safety_concerns, allows_ai_control)
        
        # Calculate remaining resources
        remaining_resources = self._calculate_remaining_resources(state, current_limits)
        
        # Generate recommended actions
        recommended_actions = self._generate_recommended_actions(state, safety_concerns, resource_pressure)
        
        safety_status = SafetyStatus(
            allows_ai_control=allows_ai_control,
            requires_immediate_termination=requires_termination,
            safety_level=safety_level,
            current_limits=current_limits,
            safety_concerns=[concern.message for concern in safety_concerns],
            override_reasoning=override_reasoning,
            resource_pressure=resource_pressure,
            estimated_remaining_resources=remaining_resources,
            recommended_actions=recommended_actions
        )
        
        logger.info(f"🛡️ Safety validation complete")
        logger.info(f"   Safety level: {safety_level.value}")
        logger.info(f"   AI control allowed: {allows_ai_control}")
        logger.info(f"   Termination required: {requires_termination}")
        logger.info(f"   Resource pressure: {resource_pressure:.2f}")
        logger.info(f"   Safety concerns: {len(safety_concerns)}")
        
        if safety_concerns:
            for concern in safety_concerns:
                logger.warning(f"   ⚠️ {concern.severity.upper()}: {concern.message}")
        
        return safety_status
    
    def _determine_safety_level(self, state: HybridInvestigationState) -> SafetyLevel:
        """Determine appropriate safety level based on investigation state"""
        
        ai_confidence = state.get("ai_confidence", 0.5)
        confidence_level = state.get("ai_confidence_level", AIConfidenceLevel.UNKNOWN)
        orchestrator_loops = state.get("orchestrator_loops", 0)
        safety_overrides = len(state.get("safety_overrides", []))
        
        # Emergency level triggers
        if orchestrator_loops > 20 or safety_overrides > 3:
            logger.debug(f"   🚨 Emergency safety level: loops={orchestrator_loops}, overrides={safety_overrides}")
            return SafetyLevel.EMERGENCY
        
        # Strict level for low confidence or multiple overrides
        if confidence_level == AIConfidenceLevel.LOW or safety_overrides > 1:
            logger.debug(f"   🔒 Strict safety level: confidence={confidence_level.value}, overrides={safety_overrides}")
            return SafetyLevel.STRICT
        
        # Permissive level for high confidence
        if confidence_level == AIConfidenceLevel.HIGH and safety_overrides == 0:
            logger.debug(f"   🟢 Permissive safety level: high confidence, no overrides")
            return SafetyLevel.PERMISSIVE
        
        # Standard level for normal operation
        logger.debug(f"   ⚖️ Standard safety level: normal operation")
        return SafetyLevel.STANDARD
    
    def _calculate_dynamic_limits(
        self,
        state: HybridInvestigationState,
        safety_level: SafetyLevel
    ) -> SafetyLimits:
        """Calculate context-aware dynamic limits"""
        
        # Get base limits for test vs live mode
        is_test_mode = os.environ.get('TEST_MODE', '').lower() == 'mock'
        base_key = "test" if is_test_mode else "live"
        base = self.base_limits[base_key].copy()
        
        # Apply safety level multipliers
        multipliers = self.safety_multipliers[safety_level]
        
        # Apply strategy adjustments
        strategy = state.get("investigation_strategy", InvestigationStrategy.ADAPTIVE)
        strategy_adj = self.strategy_adjustments.get(strategy, {"loops": 1.0, "tools": 1.0, "domains": 1.0, "time": 1.0})
        
        # Calculate final limits
        limits = SafetyLimits(
            max_orchestrator_loops=int(base["max_orchestrator_loops"] * multipliers["loops"] * strategy_adj["loops"]),
            max_tool_executions=int(base["max_tool_executions"] * multipliers["tools"] * strategy_adj["tools"]),
            max_domain_attempts=int(base["max_domain_attempts"] * multipliers["domains"] * strategy_adj["domains"]),
            max_investigation_time_minutes=int(base["max_investigation_time_minutes"] * multipliers["time"] * strategy_adj["time"]),
            confidence_threshold_for_override=base["confidence_threshold_for_override"],
            resource_pressure_threshold=base["resource_pressure_threshold"]
        )
        
        logger.debug(f"   📊 Hybrid Intelligence dynamic limits calculated:")
        logger.debug(f"      Orchestrator loops: {limits.max_orchestrator_loops}")
        logger.debug(f"      Tool executions: {limits.max_tool_executions}")
        logger.debug(f"      Domain attempts: {limits.max_domain_attempts}")
        logger.debug(f"      Time limit: {limits.max_investigation_time_minutes} minutes")
        logger.debug(f"      Safety level: {safety_level.value}")
        logger.debug(f"      Strategy: {strategy.value}")
        logger.debug(f"   AI-adaptive limits: Confidence-based resource allocation")
        
        return limits
    
    def _calculate_resource_pressure(
        self,
        state: HybridInvestigationState,
        limits: SafetyLimits
    ) -> float:
        """Calculate current resource pressure (0.0 - 1.0) with improved normalization and realistic thresholds"""
        
        orchestrator_loops = state.get("orchestrator_loops", 0)
        tools_used = len(state.get("tools_used", []))
        domains_completed = len(state.get("domains_completed", []))
        
        # Warmup: Don't throttle immediately in the first 3 loops (increased from 2)
        if orchestrator_loops < 3:
            logger.debug(f"   🔄 Warmup period: {orchestrator_loops}/3 loops - pressure limited to 0.0")
            return 0.0
        
        # CRITICAL FIX: Get actual count of tool executions, not just unique tools
        tool_execution_attempts = state.get("tool_execution_attempts", 0)
        total_tool_executions = max(tools_used, tool_execution_attempts)  # Use higher of the two
        
        # CRITICAL FIX: Apply realistic pressure scaling with proper normalization
        # Pressure should be low until we approach 70% of limits
        def calculate_progressive_pressure(current: int, limit: int, early_threshold: float = 0.7) -> float:
            """Calculate pressure that stays low until approaching limits"""
            if current <= 0 or limit <= 0:
                return 0.0
            
            ratio = current / limit
            if ratio <= early_threshold:
                # Very gentle increase in the first 70% of capacity
                return ratio * 0.5  # Scale down early pressure significantly
            else:
                # Sharper increase as we approach limits
                excess_ratio = (ratio - early_threshold) / (1.0 - early_threshold)
                return 0.35 + (excess_ratio * 0.65)  # 0.35 at 70%, up to 1.0 at 100%
        
        loop_pressure = calculate_progressive_pressure(orchestrator_loops, limits.max_orchestrator_loops)
        tool_pressure = calculate_progressive_pressure(total_tool_executions, limits.max_tool_executions)
        domain_pressure = calculate_progressive_pressure(domains_completed, limits.max_domain_attempts)
        
        # CRITICAL FIX: Time pressure calculation with proper error handling
        time_pressure = 0.0
        start_time = state.get("start_time")
        if start_time:
            try:
                if isinstance(start_time, str):
                    from dateutil.parser import parse
                    start_dt = parse(start_time)
                    elapsed_minutes = (datetime.now() - start_dt).total_seconds() / 60.0
                else:
                    # If start_time is already datetime
                    elapsed_minutes = (datetime.now() - start_time).total_seconds() / 60.0
                    
                time_budget_minutes = getattr(limits, 'max_investigation_time_minutes', 30)  # More realistic 30 min default
                time_pressure = calculate_progressive_pressure(int(elapsed_minutes), time_budget_minutes)
                
            except Exception as e:
                logger.debug(f"Time pressure calculation error: {str(e)}")
                time_pressure = 0.0
        
        # CRITICAL FIX: Rebalanced weighted approach with lower baseline pressure
        overall_pressure = (
            0.4 * tool_pressure +    # Tool usage most important but reduced weight
            0.3 * loop_pressure +    # Loop count important  
            0.2 * time_pressure +    # Time pressure 
            0.1 * domain_pressure    # Domain completion least critical
        )
        
        # CRITICAL FIX: Remove the domain penalty that was artificially inflating pressure
        # The old logic added 0.1 pressure even with normal progress
        
        overall_pressure = min(1.0, max(0.0, overall_pressure))  # Clamp to [0.0, 1.0]
        
        logger.debug(f"   📈 FIXED Hybrid Intelligence resource pressure: {overall_pressure:.3f}")
        logger.debug(f"      Loops: {loop_pressure:.3f} ({orchestrator_loops}/{limits.max_orchestrator_loops}) [70% threshold: {limits.max_orchestrator_loops * 0.7:.0f}]")
        logger.debug(f"      Tools: {tool_pressure:.3f} ({total_tool_executions}/{limits.max_tool_executions}) [unique: {tools_used}, attempts: {tool_execution_attempts}]")
        logger.debug(f"      Domains: {domain_pressure:.3f} ({domains_completed}/{limits.max_domain_attempts})")
        logger.debug(f"      Time: {time_pressure:.3f}")
        logger.debug(f"   Progressive pressure scaling: gentle increase until 70% capacity, then sharper curve")
        
        return overall_pressure
    
    def _identify_safety_concerns(
        self,
        state: HybridInvestigationState,
        limits: SafetyLimits,
        resource_pressure: float
    ) -> List[SafetyConcern]:
        """Identify active safety concerns"""
        
        concerns = []
        
        # Check orchestrator loop risk
        orchestrator_loops = state.get("orchestrator_loops", 0)
        if orchestrator_loops >= limits.max_orchestrator_loops * 0.8:
            severity = "critical" if orchestrator_loops >= limits.max_orchestrator_loops else "high"
            concerns.append(SafetyConcern(
                concern_type=SafetyConcernType.LOOP_RISK,
                severity=severity,
                message=f"Orchestrator loop limit approaching: {orchestrator_loops}/{limits.max_orchestrator_loops}",
                metrics={"current_loops": orchestrator_loops, "limit": limits.max_orchestrator_loops},
                recommended_action="Consider forcing progression to summary phase"
            ))
        
        # Check resource pressure
        if resource_pressure >= limits.resource_pressure_threshold:
            severity = "critical" if resource_pressure >= 0.9 else "high"
            concerns.append(SafetyConcern(
                concern_type=SafetyConcernType.RESOURCE_PRESSURE,
                severity=severity,
                message=f"High resource pressure: {resource_pressure:.2f}",
                metrics={"pressure": resource_pressure, "threshold": limits.resource_pressure_threshold},
                recommended_action="Reduce resource consumption or force completion"
            ))
        
        # Check confidence drop
        confidence_history = state.get("confidence_evolution", [])
        if len(confidence_history) >= 2:
            recent_confidence = confidence_history[-1]["confidence"]
            previous_confidence = confidence_history[-2]["confidence"]
            if recent_confidence < previous_confidence - 0.3:
                concerns.append(SafetyConcern(
                    concern_type=SafetyConcernType.CONFIDENCE_DROP,
                    severity="medium",
                    message=f"Significant confidence drop: {previous_confidence:.3f} → {recent_confidence:.3f}",
                    metrics={"previous": previous_confidence, "current": recent_confidence},
                    recommended_action="Consider switching to safety-first mode"
                ))
        
        # Check evidence sufficiency
        evidence_quality = 0.0
        if state.get("ai_decisions"):
            evidence_quality = state["ai_decisions"][-1].evidence_quality
        
        evidence_validator = get_evidence_validator()
        if evidence_validator.should_trigger_safety_concerns(evidence_quality, orchestrator_loops):
            concerns.append(SafetyConcern(
                concern_type=SafetyConcernType.EVIDENCE_INSUFFICIENT,
                severity="medium",
                message=f"Low evidence quality after {orchestrator_loops} loops: {evidence_quality:.3f}",
                metrics={"evidence_quality": evidence_quality, "loops": orchestrator_loops},
                recommended_action="Consider comprehensive sequential analysis"
            ))
        
        # Check timeout risk
        start_time = state.get("start_time")
        if start_time:
            try:
                from dateutil.parser import parse
                start_dt = parse(start_time)
                elapsed_minutes = (datetime.now() - start_dt).total_seconds() / 60.0
                if elapsed_minutes >= limits.max_investigation_time_minutes * 0.8:
                    severity = "critical" if elapsed_minutes >= limits.max_investigation_time_minutes else "high"
                    concerns.append(SafetyConcern(
                        concern_type=SafetyConcernType.TIMEOUT_RISK,
                        severity=severity,
                        message=f"Investigation time limit approaching: {elapsed_minutes:.1f}/{limits.max_investigation_time_minutes} minutes",
                        metrics={"elapsed_minutes": elapsed_minutes, "limit": limits.max_investigation_time_minutes},
                        recommended_action="Force completion within time limit"
                    ))
            except Exception:
                pass  # Skip time check if parsing fails
        
        return concerns
    
    def _should_allow_ai_control(
        self,
        state: HybridInvestigationState,
        concerns: List[SafetyConcern],
        resource_pressure: float
    ) -> bool:
        """Determine if AI should be allowed to control routing"""
        
        ai_confidence = state.get("ai_confidence", 0.5)
        confidence_level = state.get("ai_confidence_level", AIConfidenceLevel.UNKNOWN)
        orchestrator_loops = state.get("orchestrator_loops", 0)
        
        # Never allow AI control in emergency situations
        critical_concerns = [c for c in concerns if c.severity == "critical"]
        if critical_concerns:
            logger.debug(f"   🚫 AI control denied: {len(critical_concerns)} critical concerns")
            return False
        
        # CRITICAL FIX: Respect minimum pressure threshold from state_updater.py
        MIN_PRESSURE_THRESHOLD = 0.35
        
        # If resource pressure is very low, allow AI control regardless of other factors
        if resource_pressure < MIN_PRESSURE_THRESHOLD:
            logger.debug(f"   ✅ AI control allowed: resource pressure {resource_pressure:.3f} below threshold {MIN_PRESSURE_THRESHOLD}")
            return True
        
        # High confidence with low resource pressure -> Allow AI control
        if confidence_level == AIConfidenceLevel.HIGH and resource_pressure < 0.6:
            logger.debug(f"   ✅ AI control allowed: high confidence, low pressure")
            return True
        
        # Medium confidence with reasonable resource pressure -> Allow with validation
        if confidence_level == AIConfidenceLevel.MEDIUM and resource_pressure < 0.8:
            logger.debug(f"   ✅ AI control allowed: medium confidence, moderate pressure")
            return True
        
        # UNKNOWN confidence -> Allow AI control if pressure is reasonable (removed loop restriction)
        if confidence_level == AIConfidenceLevel.UNKNOWN and resource_pressure < 0.5:
            logger.debug(f"   ✅ AI control allowed: unknown confidence, acceptable pressure (loop {orchestrator_loops})")
            return True
        
        # Low confidence, high pressure -> Deny AI control
        logger.debug(f"   🚫 AI control denied: confidence={confidence_level.value}, pressure={resource_pressure:.3f}, loop={orchestrator_loops}")
        return False
    
    def _requires_immediate_termination(
        self,
        state: HybridInvestigationState,
        concerns: List[SafetyConcern],
        limits: SafetyLimits
    ) -> bool:
        """Check if investigation should be terminated immediately"""
        
        # Critical concerns require immediate termination
        critical_concerns = [c for c in concerns if c.severity == "critical"]
        if critical_concerns:
            logger.warning(f"   🚨 Immediate termination required: {len(critical_concerns)} critical concerns")
            return True
        
        # Hard limits exceeded
        orchestrator_loops = state.get("orchestrator_loops", 0)
        if orchestrator_loops >= limits.max_orchestrator_loops:
            logger.warning(f"   🚨 Immediate termination: orchestrator loops exceeded {limits.max_orchestrator_loops}")
            return True
        
        tools_used = len(state.get("tools_used", []))
        if tools_used >= limits.max_tool_executions:
            logger.warning(f"   🚨 Immediate termination: tool executions exceeded {limits.max_tool_executions}")
            return True
        
        # Time limit exceeded
        start_time = state.get("start_time")
        if start_time:
            try:
                from dateutil.parser import parse
                start_dt = parse(start_time)
                elapsed_minutes = (datetime.now() - start_dt).total_seconds() / 60.0
                if elapsed_minutes >= limits.max_investigation_time_minutes:
                    logger.warning(f"   🚨 Immediate termination: time limit exceeded {limits.max_investigation_time_minutes} minutes")
                    return True
            except Exception:
                pass
        
        return False
    
    def _build_override_reasoning(
        self,
        state: HybridInvestigationState,
        concerns: List[SafetyConcern],
        allows_ai_control: bool
    ) -> List[str]:
        """Build reasoning for safety override decisions"""
        
        reasoning = []
        
        if not allows_ai_control:
            reasoning.append("AI control denied due to safety concerns")
            
            for concern in concerns:
                if concern.severity in ["critical", "high"]:
                    reasoning.append(f"{concern.severity.capitalize()} concern: {concern.message}")
        
        if concerns:
            reasoning.append(f"Active safety concerns: {len(concerns)}")
            critical_count = sum(1 for c in concerns if c.severity == "critical")
            if critical_count > 0:
                reasoning.append(f"Critical concerns requiring immediate action: {critical_count}")
        
        resource_pressure = self._calculate_resource_pressure(state, self._calculate_dynamic_limits(state, SafetyLevel.STANDARD))
        if resource_pressure > 0.7:
            reasoning.append(f"High resource pressure: {resource_pressure:.2f}")
        
        orchestrator_loops = state.get("orchestrator_loops", 0)
        if orchestrator_loops > 10:
            reasoning.append(f"High orchestrator loop count: {orchestrator_loops}")
        
        return reasoning
    
    def _calculate_remaining_resources(
        self,
        state: HybridInvestigationState,
        limits: SafetyLimits
    ) -> Dict[str, int]:
        """Calculate estimated remaining resources"""
        
        orchestrator_loops = state.get("orchestrator_loops", 0)
        tools_used = len(state.get("tools_used", []))
        domains_completed = len(state.get("domains_completed", []))
        
        remaining = {
            "orchestrator_loops": max(0, limits.max_orchestrator_loops - orchestrator_loops),
            "tool_executions": max(0, limits.max_tool_executions - tools_used),
            "domain_attempts": max(0, limits.max_domain_attempts - domains_completed),
            "time_minutes": limits.max_investigation_time_minutes
        }
        
        # Calculate remaining time
        start_time = state.get("start_time")
        if start_time:
            try:
                from dateutil.parser import parse
                start_dt = parse(start_time)
                elapsed_minutes = (datetime.now() - start_dt).total_seconds() / 60.0
                remaining["time_minutes"] = max(0, int(limits.max_investigation_time_minutes - elapsed_minutes))
            except Exception:
                pass
        
        return remaining
    
    def _generate_recommended_actions(
        self,
        state: HybridInvestigationState,
        concerns: List[SafetyConcern],
        resource_pressure: float
    ) -> List[str]:
        """Generate recommended actions based on safety analysis"""
        
        actions = []
        
        # Actions for critical concerns
        critical_concerns = [c for c in concerns if c.severity == "critical"]
        if critical_concerns:
            actions.append("Force immediate investigation completion")
            actions.append("Switch to emergency safety mode")
        
        # Actions for high resource pressure
        if resource_pressure > 0.8:
            actions.append("Reduce resource consumption")
            actions.append("Skip non-essential analysis steps")
            actions.append("Consider switching to minimal investigation strategy")
        
        # Actions for loop risks
        loop_concerns = [c for c in concerns if c.concern_type == SafetyConcernType.LOOP_RISK]
        if loop_concerns:
            actions.append("Force progression to next investigation phase")
            actions.append("Implement aggressive loop prevention")
        
        # Actions for confidence issues
        conf_concerns = [c for c in concerns if c.concern_type == SafetyConcernType.CONFIDENCE_DROP]
        if conf_concerns:
            actions.append("Switch to safety-first sequential execution")
            actions.append("Validate AI decisions with additional safety checks")
        
        # Actions for evidence issues
        evidence_concerns = [c for c in concerns if c.concern_type == SafetyConcernType.EVIDENCE_INSUFFICIENT]
        if evidence_concerns:
            actions.append("Switch to comprehensive analysis mode")
            actions.append("Collect additional evidence before proceeding")
        
        # Default actions
        if not actions:
            actions.append("Continue with current investigation approach")
            actions.append("Monitor safety metrics")
        
        return actions