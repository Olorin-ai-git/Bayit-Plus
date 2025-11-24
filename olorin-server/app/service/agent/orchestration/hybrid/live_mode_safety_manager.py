"""
<<<<<<< HEAD
Live Mode Safety Manager for Autonomous Investigation System
=======
Live Mode Safety Manager for Structured Investigation System
>>>>>>> 001-modify-analyzer-method

This module provides enhanced safety mechanisms specifically designed for live mode debugging
with real financial costs. It includes cost circuit breakers, time limits, error monitoring,
and emergency procedures.

CRITICAL: This manager enforces ZERO-TOLERANCE safety protocols for live mode operations.
"""

import os
import time
import asyncio
from typing import Dict, List, Any, Optional, Tuple, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import logging
import json
from pathlib import Path

from .hybrid_state_schema import (
    HybridInvestigationState,
    AIConfidenceLevel,
    SafetyConcernType,
    InvestigationStrategy
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

class EmergencyStopReason(Enum):
    """Reasons for emergency investigation termination"""
    COST_LIMIT_EXCEEDED = "cost_limit_exceeded"
    TIME_LIMIT_EXCEEDED = "time_limit_exceeded"
    ERROR_RATE_TOO_HIGH = "error_rate_too_high"
    API_QUOTA_EXHAUSTED = "api_quota_exhausted"
    MANUAL_KILL_SWITCH = "manual_kill_switch"
    SYSTEM_OVERLOAD = "system_overload"
    SECURITY_VIOLATION = "security_violation"

class LiveModeSafetyLevel(Enum):
    """Safety enforcement levels for live mode"""
    COMPONENT_TEST = "component_test"      # Individual component testing
    SINGLE_INVESTIGATION = "single_investigation"  # One investigation only
    LIMITED_BATCH = "limited_batch"        # Small batch testing
    OPERATIONAL = "operational"            # Production-like testing

@dataclass
class LiveModeCostLimits:
    """Cost limits for live mode operations"""
    per_investigation: float = 10.00       # USD per investigation
    per_session: float = 100.00           # USD per debugging session
    daily_budget: float = 200.00          # USD per day
    emergency_stop: float = 500.00        # USD absolute maximum
    
    # API-specific limits
    snowflake_credits: int = 100          # Snowflake credits
    claude_tokens: int = 1000000          # Claude API tokens
    external_api_calls: int = 1000        # Total external API calls

@dataclass
class LiveModeTimeLimits:
    """Time limits for live mode operations"""
    per_investigation: int = 30           # minutes
    per_phase: int = 10                   # minutes
    api_timeout: int = 30                 # seconds
    emergency_timeout: int = 60           # minutes
    
    # Component-specific timeouts
    snowflake_query_timeout: int = 30     # seconds
    external_api_timeout: int = 15        # seconds

@dataclass
class LiveModeErrorLimits:
    """Error rate limits for live mode operations"""
    consecutive_failures: int = 3
    error_rate_threshold: float = 0.5     # 50%
    recovery_time: int = 300              # seconds
    
    # API-specific error limits
    api_failure_threshold: int = 5
    timeout_threshold: int = 3

@dataclass
class CostTracking:
    """Real-time cost tracking"""
    snowflake_costs: float = 0.0
    claude_costs: float = 0.0
    external_api_costs: float = 0.0
    total_costs: float = 0.0
    
    # Usage tracking
    snowflake_credits_used: int = 0
    claude_tokens_used: int = 0
    external_api_calls_made: int = 0
    
    # Time tracking
    session_start_time: Optional[datetime] = None
    investigation_start_time: Optional[datetime] = None

@dataclass
class SafetyStatus:
    """Current safety status for live mode"""
    allows_operation: bool
    requires_immediate_termination: bool
    safety_level: LiveModeSafetyLevel
    cost_tracking: CostTracking
    safety_concerns: List[str]
    emergency_procedures_active: bool
    last_update: datetime
    
    # Circuit breaker states
    cost_breaker_active: bool = False
    time_breaker_active: bool = False
    error_breaker_active: bool = False

class LiveModeSafetyManager:
    """
<<<<<<< HEAD
    Enhanced safety manager for live mode autonomous investigation debugging.
=======
    Enhanced safety manager for live mode structured investigation debugging.
>>>>>>> 001-modify-analyzer-method
    
    Provides comprehensive safety mechanisms including:
    - Real-time cost monitoring and circuit breakers
    - Time-based investigation limits
    - Error rate monitoring and recovery
    - Emergency stop procedures
    - Manual kill switch functionality
    """
    
    def __init__(self, safety_level: LiveModeSafetyLevel = LiveModeSafetyLevel.COMPONENT_TEST):
        self.safety_level = safety_level
        self.cost_limits = self._get_cost_limits_for_level()
        self.time_limits = self._get_time_limits_for_level()
        self.error_limits = self._get_error_limits_for_level()
        
        self.cost_tracking = CostTracking()
        self.error_history: List[Dict[str, Any]] = []
        self.safety_violations: List[Dict[str, Any]] = []
        self.emergency_stop_callbacks: List[Callable] = []
        
        # Circuit breaker states
        self.circuit_breakers = {
            "cost": False,
            "time": False,
            "error": False,
            "manual": False
        }
        
        # Initialize monitoring
        self._initialize_monitoring()
        
    def _get_cost_limits_for_level(self) -> LiveModeCostLimits:
        """Get cost limits based on safety level"""
        base_limits = LiveModeCostLimits()
        
        multipliers = {
            LiveModeSafetyLevel.COMPONENT_TEST: 0.1,      # Very conservative
            LiveModeSafetyLevel.SINGLE_INVESTIGATION: 0.5, # Conservative
            LiveModeSafetyLevel.LIMITED_BATCH: 0.75,      # Moderate
            LiveModeSafetyLevel.OPERATIONAL: 1.0          # Full limits
        }
        
        multiplier = multipliers[self.safety_level]
        
        return LiveModeCostLimits(
            per_investigation=base_limits.per_investigation * multiplier,
            per_session=base_limits.per_session * multiplier,
            daily_budget=base_limits.daily_budget * multiplier,
            emergency_stop=base_limits.emergency_stop,  # Always full limit
            snowflake_credits=int(base_limits.snowflake_credits * multiplier),
            claude_tokens=int(base_limits.claude_tokens * multiplier),
            external_api_calls=int(base_limits.external_api_calls * multiplier)
        )
    
    def _get_time_limits_for_level(self) -> LiveModeTimeLimits:
        """Get time limits based on safety level"""
        base_limits = LiveModeTimeLimits()
        
        multipliers = {
            LiveModeSafetyLevel.COMPONENT_TEST: 0.25,     # Very short
            LiveModeSafetyLevel.SINGLE_INVESTIGATION: 0.5, # Short
            LiveModeSafetyLevel.LIMITED_BATCH: 0.75,      # Moderate
            LiveModeSafetyLevel.OPERATIONAL: 1.0          # Full time
        }
        
        multiplier = multipliers[self.safety_level]
        
        return LiveModeTimeLimits(
            per_investigation=int(base_limits.per_investigation * multiplier),
            per_phase=int(base_limits.per_phase * multiplier),
            api_timeout=base_limits.api_timeout,  # Always same
            emergency_timeout=base_limits.emergency_timeout,  # Always same
            snowflake_query_timeout=base_limits.snowflake_query_timeout,
            external_api_timeout=base_limits.external_api_timeout
        )
    
    def _get_error_limits_for_level(self) -> LiveModeErrorLimits:
        """Get error limits based on safety level"""
        base_limits = LiveModeErrorLimits()
        
        if self.safety_level == LiveModeSafetyLevel.COMPONENT_TEST:
            # Very strict for component testing
            return LiveModeErrorLimits(
                consecutive_failures=1,
                error_rate_threshold=0.25,  # 25%
                recovery_time=base_limits.recovery_time,
                api_failure_threshold=2,
                timeout_threshold=1
            )
        elif self.safety_level == LiveModeSafetyLevel.SINGLE_INVESTIGATION:
            # Strict for single investigation
            return LiveModeErrorLimits(
                consecutive_failures=2,
                error_rate_threshold=0.33,  # 33%
                recovery_time=base_limits.recovery_time,
                api_failure_threshold=3,
                timeout_threshold=2
            )
        else:
            # Standard limits for batch and operational
            return base_limits
    
    def _initialize_monitoring(self):
        """Initialize real-time monitoring systems"""
        self.cost_tracking.session_start_time = datetime.now()
        logger.info(f"Live Mode Safety Manager initialized with level: {self.safety_level.value}")
        logger.info(f"Cost limits: ${self.cost_limits.per_investigation}/investigation, ${self.cost_limits.per_session}/session")
        logger.info(f"Time limits: {self.time_limits.per_investigation}min/investigation, {self.time_limits.per_phase}min/phase")
    
    async def start_investigation_monitoring(self, investigation_id: str) -> bool:
        """Start monitoring for a new investigation"""
        try:
            # Check if we can start a new investigation
            if not self.can_start_investigation():
                logger.error("Cannot start investigation - safety limits exceeded")
                return False
            
            # Reset investigation-specific tracking
            self.cost_tracking.investigation_start_time = datetime.now()
            
            # Log investigation start
            logger.info(f"Starting live mode investigation monitoring: {investigation_id}")
            logger.info(f"Session costs so far: ${self.cost_tracking.total_costs:.2f}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to start investigation monitoring: {e}")
            return False
    
    def can_start_investigation(self) -> bool:
        """Check if a new investigation can be started safely"""
        # Check cost limits
        if self.cost_tracking.total_costs >= self.cost_limits.per_session:
            self.record_safety_violation("Session cost limit exceeded", {
                "current_cost": self.cost_tracking.total_costs,
                "limit": self.cost_limits.per_session
            })
            return False
        
        # Check active circuit breakers
        if any(self.circuit_breakers.values()):
            active_breakers = [k for k, v in self.circuit_breakers.items() if v]
            self.record_safety_violation("Circuit breakers active", {
                "active_breakers": active_breakers
            })
            return False
        
        # Check error rate
        if self._calculate_recent_error_rate() > self.error_limits.error_rate_threshold:
            self.record_safety_violation("Error rate too high", {
                "error_rate": self._calculate_recent_error_rate(),
                "threshold": self.error_limits.error_rate_threshold
            })
            return False
        
        return True
    
    async def track_cost(self, cost_type: str, amount: float, details: Dict[str, Any] = None):
        """Track costs in real-time with circuit breaker checks"""
        try:
            # Update cost tracking
            if cost_type == "snowflake":
                self.cost_tracking.snowflake_costs += amount
            elif cost_type == "claude":
                self.cost_tracking.claude_costs += amount
            elif cost_type == "external_api":
                self.cost_tracking.external_api_costs += amount
            
            self.cost_tracking.total_costs = (
                self.cost_tracking.snowflake_costs +
                self.cost_tracking.claude_costs +
                self.cost_tracking.external_api_costs
            )
            
            # Check cost circuit breakers
            await self._check_cost_circuit_breakers()
            
            # Log cost update
            logger.debug(f"Cost tracked: {cost_type}=${amount:.2f}, total=${self.cost_tracking.total_costs:.2f}")
            
        except Exception as e:
            logger.error(f"Failed to track cost: {e}")
    
    async def _check_cost_circuit_breakers(self):
        """Check and activate cost-based circuit breakers"""
        # Check per-investigation limit
        if (self.cost_tracking.investigation_start_time and 
            self.cost_tracking.total_costs >= self.cost_limits.per_investigation):
            await self.activate_emergency_stop(
                EmergencyStopReason.COST_LIMIT_EXCEEDED,
                f"Investigation cost ${self.cost_tracking.total_costs:.2f} exceeds limit ${self.cost_limits.per_investigation:.2f}"
            )
        
        # Check session limit
        if self.cost_tracking.total_costs >= self.cost_limits.per_session:
            await self.activate_emergency_stop(
                EmergencyStopReason.COST_LIMIT_EXCEEDED,
                f"Session cost ${self.cost_tracking.total_costs:.2f} exceeds limit ${self.cost_limits.per_session:.2f}"
            )
        
        # Check emergency stop limit
        if self.cost_tracking.total_costs >= self.cost_limits.emergency_stop:
            await self.activate_emergency_stop(
                EmergencyStopReason.COST_LIMIT_EXCEEDED,
                f"EMERGENCY: Total cost ${self.cost_tracking.total_costs:.2f} exceeds emergency limit ${self.cost_limits.emergency_stop:.2f}"
            )
            self.circuit_breakers["cost"] = True
    
    async def track_api_usage(self, api_type: str, usage_details: Dict[str, Any]):
        """Track API usage with quota monitoring"""
        try:
            # Update usage tracking
            if api_type == "snowflake":
                credits_used = usage_details.get("credits", 0)
                self.cost_tracking.snowflake_credits_used += credits_used
                
                # Check credit limits
                if self.cost_tracking.snowflake_credits_used >= self.cost_limits.snowflake_credits:
                    await self.activate_emergency_stop(
                        EmergencyStopReason.API_QUOTA_EXHAUSTED,
                        f"Snowflake credits exhausted: {self.cost_tracking.snowflake_credits_used}/{self.cost_limits.snowflake_credits}"
                    )
                    
            elif api_type == "claude":
                tokens_used = usage_details.get("tokens", 0)
                self.cost_tracking.claude_tokens_used += tokens_used
                
                # Check token limits
                if self.cost_tracking.claude_tokens_used >= self.cost_limits.claude_tokens:
                    await self.activate_emergency_stop(
                        EmergencyStopReason.API_QUOTA_EXHAUSTED,
                        f"Claude tokens exhausted: {self.cost_tracking.claude_tokens_used}/{self.cost_limits.claude_tokens}"
                    )
                    
            elif api_type == "external":
                self.cost_tracking.external_api_calls_made += 1
                
                # Check call limits
                if self.cost_tracking.external_api_calls_made >= self.cost_limits.external_api_calls:
                    await self.activate_emergency_stop(
                        EmergencyStopReason.API_QUOTA_EXHAUSTED,
                        f"External API calls exhausted: {self.cost_tracking.external_api_calls_made}/{self.cost_limits.external_api_calls}"
                    )
            
            logger.debug(f"API usage tracked: {api_type}, details: {usage_details}")
            
        except Exception as e:
            logger.error(f"Failed to track API usage: {e}")
    
    def record_error(self, error_type: str, error_details: Dict[str, Any]):
        """Record an error for monitoring and circuit breaker evaluation"""
        try:
            error_record = {
                "timestamp": datetime.now().isoformat(),
                "error_type": error_type,
                "details": error_details
            }
            
            self.error_history.append(error_record)
            
            # Limit error history size
            if len(self.error_history) > 100:
                self.error_history = self.error_history[-50:]
            
            # Check error circuit breakers
            asyncio.create_task(self._check_error_circuit_breakers())
            
            logger.warning(f"Error recorded: {error_type}, details: {error_details}")
            
        except Exception as e:
            logger.error(f"Failed to record error: {e}")
    
    async def _check_error_circuit_breakers(self):
        """Check and activate error-based circuit breakers"""
        try:
            # Check consecutive failures
            recent_errors = self.error_history[-self.error_limits.consecutive_failures:]
            if len(recent_errors) >= self.error_limits.consecutive_failures:
                consecutive = True
                for i in range(len(recent_errors) - 1):
                    time1 = datetime.fromisoformat(recent_errors[i]["timestamp"])
                    time2 = datetime.fromisoformat(recent_errors[i + 1]["timestamp"])
                    if (time2 - time1).total_seconds() > 60:  # Not consecutive if >1 minute apart
                        consecutive = False
                        break
                
                if consecutive:
                    await self.activate_emergency_stop(
                        EmergencyStopReason.ERROR_RATE_TOO_HIGH,
                        f"Too many consecutive failures: {len(recent_errors)}"
                    )
                    self.circuit_breakers["error"] = True
            
            # Check overall error rate
            error_rate = self._calculate_recent_error_rate()
            if error_rate > self.error_limits.error_rate_threshold:
                await self.activate_emergency_stop(
                    EmergencyStopReason.ERROR_RATE_TOO_HIGH,
                    f"Error rate too high: {error_rate:.2%}"
                )
                self.circuit_breakers["error"] = True
                
        except Exception as e:
            logger.error(f"Failed to check error circuit breakers: {e}")
    
    def _calculate_recent_error_rate(self) -> float:
        """Calculate error rate for the last 10 minutes"""
        try:
            cutoff_time = datetime.now() - timedelta(minutes=10)
            recent_errors = [
                e for e in self.error_history
                if datetime.fromisoformat(e["timestamp"]) > cutoff_time
            ]
            
            # For simplicity, assume 1 operation per minute as baseline
            # In real implementation, this should be based on actual operation count
            estimated_operations = 10  # 10 minutes * 1 operation/minute
            
            if estimated_operations == 0:
                return 0.0
                
            return len(recent_errors) / estimated_operations
            
        except Exception as e:
            logger.error(f"Failed to calculate error rate: {e}")
            return 0.0
    
    async def activate_emergency_stop(self, reason: EmergencyStopReason, message: str):
        """Activate emergency stop procedures"""
        try:
            logger.critical(f"🚨 EMERGENCY STOP ACTIVATED: {reason.value} - {message}")
            
            # Record the emergency stop
            emergency_record = {
                "timestamp": datetime.now().isoformat(),
                "reason": reason.value,
                "message": message,
                "cost_at_stop": self.cost_tracking.total_costs,
                "session_duration": self._get_session_duration()
            }
            
            self.safety_violations.append(emergency_record)
            
            # Activate manual circuit breaker
            self.circuit_breakers["manual"] = True
            
            # Execute emergency callbacks
            for callback in self.emergency_stop_callbacks:
                try:
                    await callback(reason, message, emergency_record)
                except Exception as e:
                    logger.error(f"Emergency callback failed: {e}")
            
            # Save emergency state
            await self._save_emergency_state(emergency_record)
            
            logger.critical("Emergency stop procedures completed")
            
        except Exception as e:
            logger.critical(f"CRITICAL: Failed to execute emergency stop: {e}")
    
    async def activate_manual_kill_switch(self, reason: str = "Manual termination"):
        """Manually activate the kill switch"""
        logger.critical(f"🛑 MANUAL KILL SWITCH ACTIVATED: {reason}")
        await self.activate_emergency_stop(EmergencyStopReason.MANUAL_KILL_SWITCH, reason)
    
    def register_emergency_callback(self, callback: Callable):
        """Register a callback to be executed during emergency stops"""
        self.emergency_stop_callbacks.append(callback)
    
    def get_safety_status(self) -> SafetyStatus:
        """Get current safety status"""
        return SafetyStatus(
            allows_operation=self.can_start_investigation(),
            requires_immediate_termination=any(self.circuit_breakers.values()),
            safety_level=self.safety_level,
            cost_tracking=self.cost_tracking,
            safety_concerns=[v["message"] for v in self.safety_violations[-5:]],
            emergency_procedures_active=any(self.circuit_breakers.values()),
            last_update=datetime.now(),
            cost_breaker_active=self.circuit_breakers.get("cost", False),
            time_breaker_active=self.circuit_breakers.get("time", False),
            error_breaker_active=self.circuit_breakers.get("error", False)
        )
    
    def record_safety_violation(self, violation_type: str, details: Dict[str, Any]):
        """Record a safety violation"""
        violation = {
            "timestamp": datetime.now().isoformat(),
            "type": violation_type,
            "details": details,
            "safety_level": self.safety_level.value
        }
        
        self.safety_violations.append(violation)
        logger.warning(f"Safety violation recorded: {violation_type}, details: {details}")
    
    def _get_session_duration(self) -> float:
        """Get current session duration in minutes"""
        if self.cost_tracking.session_start_time:
            return (datetime.now() - self.cost_tracking.session_start_time).total_seconds() / 60
        return 0.0
    
    async def _save_emergency_state(self, emergency_record: Dict[str, Any]):
        """Save emergency state for analysis"""
        try:
            state_file = Path("emergency_states") / f"emergency_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            state_file.parent.mkdir(exist_ok=True)
            
            state_data = {
                "emergency_record": emergency_record,
                "cost_tracking": {
                    "snowflake_costs": self.cost_tracking.snowflake_costs,
                    "claude_costs": self.cost_tracking.claude_costs,
                    "external_api_costs": self.cost_tracking.external_api_costs,
                    "total_costs": self.cost_tracking.total_costs
                },
                "error_history": self.error_history[-10:],  # Last 10 errors
                "circuit_breaker_states": self.circuit_breakers,
                "safety_level": self.safety_level.value
            }
            
            with open(state_file, "w") as f:
                json.dump(state_data, f, indent=2)
                
            logger.info(f"Emergency state saved to: {state_file}")
            
        except Exception as e:
            logger.error(f"Failed to save emergency state: {e}")
    
    def generate_cost_report(self) -> Dict[str, Any]:
        """Generate a comprehensive cost report"""
        session_duration = self._get_session_duration()
        
        return {
            "session_summary": {
                "duration_minutes": session_duration,
                "total_cost": self.cost_tracking.total_costs,
                "cost_per_minute": self.cost_tracking.total_costs / max(session_duration, 1)
            },
            "cost_breakdown": {
                "snowflake": self.cost_tracking.snowflake_costs,
                "claude": self.cost_tracking.claude_costs,
                "external_apis": self.cost_tracking.external_api_costs
            },
            "usage_summary": {
                "snowflake_credits": self.cost_tracking.snowflake_credits_used,
                "claude_tokens": self.cost_tracking.claude_tokens_used,
                "external_api_calls": self.cost_tracking.external_api_calls_made
            },
            "limits_status": {
                "investigation_limit": f"${self.cost_limits.per_investigation:.2f}",
                "session_limit": f"${self.cost_limits.per_session:.2f}",
                "remaining_budget": f"${max(0, self.cost_limits.per_session - self.cost_tracking.total_costs):.2f}"
            },
            "safety_events": {
                "total_violations": len(self.safety_violations),
                "error_count": len(self.error_history),
                "circuit_breaker_activations": sum(1 for v in self.circuit_breakers.values() if v)
            }
        }