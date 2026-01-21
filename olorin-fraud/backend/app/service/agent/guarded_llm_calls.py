"""
Guarded LLM Call Pattern with Retry Logic

Implements bulletproof LLM call pattern that ensures agents always return valid responses
even when LLM calls fail. Addresses the core issue where agents return 0.00 risk scores
due to LLM failures or invalid responses.

Based on user analysis: "Implement guarded LLM call pattern with retry logic"
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Union

from .unified_agent_schema import (
    AgentRiskResponse,
    AgentType,
    RiskLevel,
    create_agent_response,
    ensure_valid_response,
)

logger = logging.getLogger(__name__)


class RetryStrategy(str, Enum):
    """LLM retry strategies"""

    EXPONENTIAL_BACKOFF = "exponential_backoff"
    FIXED_INTERVAL = "fixed_interval"
    IMMEDIATE = "immediate"
    NO_RETRY = "no_retry"


class FallbackStrategy(str, Enum):
    """Fallback strategies when all retries fail"""

    STRUCTURED_FALLBACK = (
        "structured_fallback"  # Use predefined response based on input
    )
    CONSERVATIVE_ESTIMATE = "conservative_estimate"  # Return medium risk
    ZERO_RISK = "zero_risk"  # Return low/zero risk (safest)
    RAISE_EXCEPTION = "raise_exception"  # Let caller handle


@dataclass
class GuardedCallConfig:
    """Configuration for guarded LLM calls"""

    max_retries: int = 3
    retry_strategy: RetryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
    base_delay: float = 1.0  # Base delay in seconds
    max_delay: float = 30.0  # Maximum delay in seconds
    timeout_per_call: float = 120.0  # Timeout per individual call
    total_timeout: float = 300.0  # Total timeout including retries

    fallback_strategy: FallbackStrategy = FallbackStrategy.STRUCTURED_FALLBACK

    # Response validation
    require_valid_json: bool = False
    require_risk_score: bool = True
    min_risk_score: float = 0.0
    max_risk_score: float = 1.0

    # Logging
    log_attempts: bool = True
    log_failures: bool = True
    log_fallbacks: bool = True


@dataclass
class CallAttempt:
    """Record of a single LLM call attempt"""

    attempt_number: int
    start_time: float
    end_time: Optional[float] = None
    success: bool = False
    error: Optional[str] = None
    response: Optional[Any] = None
    validation_errors: List[str] = field(default_factory=list)

    @property
    def duration(self) -> float:
        """Get duration of this attempt"""
        if self.end_time:
            return self.end_time - self.start_time
        return 0.0


@dataclass
class GuardedCallResult:
    """Result of a guarded LLM call"""

    success: bool
    response: Optional[AgentRiskResponse] = None
    error: Optional[str] = None

    # Execution metadata
    total_attempts: int = 0
    total_duration: float = 0.0
    used_fallback: bool = False
    fallback_reason: Optional[str] = None

    # Individual attempts
    attempts: List[CallAttempt] = field(default_factory=list)

    # Final statistics
    first_success_attempt: Optional[int] = None
    retry_strategy_used: Optional[RetryStrategy] = None
    config_used: Optional[GuardedCallConfig] = None


class GuardedLLMCaller:
    """Bulletproof LLM caller with comprehensive retry and fallback logic"""

    def __init__(self, config: Optional[GuardedCallConfig] = None):
        self.config = config or GuardedCallConfig()
        self.call_history: List[GuardedCallResult] = []

    async def call_with_guard(
        self,
        llm_function: Callable,
        agent_type: AgentType,
        investigation_id: str,
        fallback_data: Optional[Dict[str, Any]] = None,
        **llm_kwargs,
    ) -> GuardedCallResult:
        """
        Execute LLM call with comprehensive guarding and fallback

        Args:
            llm_function: The LLM function to call (async)
            agent_type: Type of agent making the call
            investigation_id: Investigation ID for response
            fallback_data: Data to use for fallback response generation
            **llm_kwargs: Arguments to pass to LLM function

        Returns:
            GuardedCallResult with response and metadata
        """

        start_time = time.time()
        result = GuardedCallResult(
            success=False,
            config_used=self.config,
            retry_strategy_used=self.config.retry_strategy,
        )

        try:
            # Execute with timeout for entire operation
            result = await asyncio.wait_for(
                self._execute_guarded_call(
                    llm_function,
                    agent_type,
                    investigation_id,
                    fallback_data,
                    result,
                    **llm_kwargs,
                ),
                timeout=self.config.total_timeout,
            )

        except asyncio.TimeoutError:
            result.success = False
            result.error = (
                f"Total operation timeout ({self.config.total_timeout}s) exceeded"
            )
            result.used_fallback = True
            result.fallback_reason = "total_timeout"

            if self.config.log_failures:
                logger.error(
                    f"🚨 Guarded LLM call total timeout for {agent_type.value}: {result.error}"
                )

            # Generate fallback response
            result.response = self._generate_fallback_response(
                agent_type, investigation_id, fallback_data, "total_timeout"
            )

        except Exception as e:
            result.success = False
            result.error = f"Unexpected error in guarded call: {str(e)}"
            result.used_fallback = True
            result.fallback_reason = "unexpected_error"

            if self.config.log_failures:
                logger.error(
                    f"🚨 Unexpected error in guarded LLM call for {agent_type.value}: {str(e)}"
                )

            # Generate fallback response
            result.response = self._generate_fallback_response(
                agent_type, investigation_id, fallback_data, "unexpected_error"
            )

        finally:
            result.total_duration = time.time() - start_time

            # Record call in history
            self.call_history.append(result)

            # Ensure we always have a valid response
            if not result.response:
                result.response = self._generate_fallback_response(
                    agent_type, investigation_id, fallback_data, "no_response_generated"
                )
                result.used_fallback = True
                result.fallback_reason = "no_response_generated"

        return result

    async def _execute_guarded_call(
        self,
        llm_function: Callable,
        agent_type: AgentType,
        investigation_id: str,
        fallback_data: Optional[Dict[str, Any]],
        result: GuardedCallResult,
        **llm_kwargs,
    ) -> GuardedCallResult:
        """Execute the guarded call with retries"""

        for attempt_num in range(1, self.config.max_retries + 1):
            attempt = CallAttempt(attempt_number=attempt_num, start_time=time.time())

            try:
                if self.config.log_attempts:
                    logger.info(
                        f"🔄 LLM call attempt {attempt_num}/{self.config.max_retries} for {agent_type.value}"
                    )

                # Execute LLM call with per-call timeout
                try:
                    llm_response = await asyncio.wait_for(
                        llm_function(**llm_kwargs), timeout=self.config.timeout_per_call
                    )

                    attempt.response = llm_response
                    attempt.end_time = time.time()

                    # Validate response
                    validation_errors = self._validate_llm_response(llm_response)
                    attempt.validation_errors = validation_errors

                    if not validation_errors:
                        # Success! Convert to unified response
                        unified_response = ensure_valid_response(
                            agent_type=agent_type,
                            response=llm_response,
                            investigation_id=investigation_id,
                        )

                        attempt.success = True
                        result.success = True
                        result.response = unified_response
                        result.first_success_attempt = attempt_num

                        if self.config.log_attempts:
                            logger.info(
                                f"✅ LLM call successful on attempt {attempt_num} for {agent_type.value}"
                            )

                        result.attempts.append(attempt)
                        return result

                    else:
                        attempt.success = False
                        attempt.error = f"Validation failed: {validation_errors}"

                        if self.config.log_failures:
                            logger.warning(
                                f"⚠️ LLM response validation failed on attempt {attempt_num}: {validation_errors}"
                            )

                except asyncio.TimeoutError:
                    attempt.end_time = time.time()
                    attempt.success = False
                    attempt.error = f"Call timeout ({self.config.timeout_per_call}s)"

                    if self.config.log_failures:
                        logger.warning(f"⏰ LLM call timeout on attempt {attempt_num}")

            except Exception as e:
                attempt.end_time = time.time()
                attempt.success = False
                attempt.error = f"Call exception: {str(e)}"

                if self.config.log_failures:
                    logger.warning(
                        f"❌ LLM call exception on attempt {attempt_num}: {str(e)}"
                    )

            result.attempts.append(attempt)

            # If not last attempt, wait before retry
            if attempt_num < self.config.max_retries:
                delay = self._calculate_retry_delay(attempt_num)
                if delay > 0:
                    await asyncio.sleep(delay)

        # All attempts failed - use fallback
        result.success = False
        result.used_fallback = True
        result.fallback_reason = "all_retries_failed"
        result.error = f"All {self.config.max_retries} attempts failed"

        if self.config.log_fallbacks:
            logger.warning(
                f"🛡️ Using fallback response for {agent_type.value} after {self.config.max_retries} failed attempts"
            )

        result.response = self._generate_fallback_response(
            agent_type, investigation_id, fallback_data, "all_retries_failed"
        )

        return result

    def _calculate_retry_delay(self, attempt_num: int) -> float:
        """Calculate delay before next retry attempt"""

        if self.config.retry_strategy == RetryStrategy.NO_RETRY:
            return 0.0
        elif self.config.retry_strategy == RetryStrategy.IMMEDIATE:
            return 0.0
        elif self.config.retry_strategy == RetryStrategy.FIXED_INTERVAL:
            return min(self.config.base_delay, self.config.max_delay)
        elif self.config.retry_strategy == RetryStrategy.EXPONENTIAL_BACKOFF:
            # Exponential backoff: base_delay * (2 ^ (attempt_num - 1))
            delay = self.config.base_delay * (2 ** (attempt_num - 1))
            return min(delay, self.config.max_delay)

        return self.config.base_delay

    def _validate_llm_response(self, response: Any) -> List[str]:
        """Validate LLM response according to config requirements"""

        errors = []

        try:
            # Check if response exists
            if response is None:
                errors.append("Response is None")
                return errors

            # Check JSON requirement
            if self.config.require_valid_json:
                if isinstance(response, str):
                    try:
                        json.loads(response)
                    except json.JSONDecodeError:
                        errors.append("Response is not valid JSON")
                elif not isinstance(response, dict):
                    errors.append("Response is not JSON-compatible")

            # Check risk score requirement
            if self.config.require_risk_score:
                risk_score = None

                if isinstance(response, dict):
                    # Look for risk score in various locations
                    risk_paths = [
                        ["overall_risk_score"],
                        ["risk_level"],
                        ["risk_score"],
                        ["risk_assessment", "risk_level"],
                        ["risk_assessment", "overall_risk_score"],
                    ]

                    for path in risk_paths:
                        try:
                            current = response
                            for key in path:
                                current = current[key]
                            if isinstance(current, (int, float)):
                                risk_score = float(current)
                                break
                        except (KeyError, TypeError):
                            continue

                elif isinstance(response, str):
                    # Try to extract from text
                    import re

                    patterns = [
                        r"overall_risk_score[:\s]+([0-9.]+)",
                        r"risk_level[:\s]+([0-9.]+)",
                        r"risk_score[:\s]+([0-9.]+)",
                    ]
                    for pattern in patterns:
                        match = re.search(pattern, response)
                        if match:
                            try:
                                risk_score = float(match.group(1))
                                break
                            except ValueError:
                                continue

                if risk_score is None:
                    errors.append("No valid risk score found in response")
                elif (
                    risk_score < self.config.min_risk_score
                    or risk_score > self.config.max_risk_score
                ):
                    errors.append(
                        f"Risk score {risk_score} out of valid range [{self.config.min_risk_score}, {self.config.max_risk_score}]"
                    )

        except Exception as e:
            errors.append(f"Validation error: {str(e)}")

        return errors

    def _generate_fallback_response(
        self,
        agent_type: AgentType,
        investigation_id: str,
        fallback_data: Optional[Dict[str, Any]],
        reason: str,
    ) -> AgentRiskResponse:
        """Generate fallback response when LLM calls fail"""

        timestamp = datetime.utcnow().isoformat()

        # Base fallback depending on strategy
        if self.config.fallback_strategy == FallbackStrategy.ZERO_RISK:
            risk_score = 0.1  # Slight risk to indicate analysis was performed
            confidence = 0.3
            risk_level = RiskLevel.LOW

        elif self.config.fallback_strategy == FallbackStrategy.CONSERVATIVE_ESTIMATE:
            risk_score = 0.5  # Medium risk when uncertain
            confidence = 0.4
            risk_level = RiskLevel.MEDIUM

        elif self.config.fallback_strategy == FallbackStrategy.STRUCTURED_FALLBACK:
            # Try to infer from fallback_data
            risk_score, confidence = self._infer_risk_from_fallback_data(fallback_data)
            risk_level = RiskLevel.MEDIUM  # Default to medium when uncertain

        else:  # RAISE_EXCEPTION
            raise Exception(
                f"LLM call failed and configured to raise exception: {reason}"
            )

        # Create domain-specific fallback content
        risk_factors = self._generate_fallback_risk_factors(agent_type, fallback_data)
        mitigation_measures = self._generate_fallback_mitigation_measures(agent_type)
        domain_specific = self._generate_fallback_domain_specific(
            agent_type, fallback_data
        )

        # Create response with validation errors noting the fallback
        validation_errors = [
            f"Generated fallback response due to: {reason}",
            f"LLM call failed after {self.config.max_retries} attempts",
        ]

        return create_agent_response(
            agent_type=agent_type,
            overall_risk_score=risk_score,
            confidence=confidence,
            risk_factors=risk_factors,
            mitigation_measures=mitigation_measures,
            risk_level=risk_level,
            investigation_id=investigation_id,
            timestamp=timestamp,
            domain_specific=domain_specific,
            validation_errors=validation_errors,
        )

    def _infer_risk_from_fallback_data(
        self, fallback_data: Optional[Dict[str, Any]]
    ) -> tuple[float, float]:
        """Infer risk and confidence from available fallback data"""

        if not fallback_data:
            return 0.5, 0.3  # Default medium risk, low confidence

        # Look for risk indicators in the data
        risk_indicators = 0
        total_checks = 0

        # Check for suspicious patterns
        suspicious_keywords = [
            "suspicious",
            "anomaly",
            "unusual",
            "irregular",
            "fraud",
            "malicious",
            "threat",
            "violation",
            "breach",
            "attack",
        ]

        data_str = json.dumps(fallback_data, default=str).lower()

        for keyword in suspicious_keywords:
            total_checks += 1
            if keyword in data_str:
                risk_indicators += 1

        # Calculate risk based on indicators found
        if total_checks > 0:
            risk_ratio = risk_indicators / total_checks
            risk_score = min(0.3 + (risk_ratio * 0.4), 0.8)  # Range: 0.3 - 0.7
            confidence = min(0.4 + (risk_ratio * 0.3), 0.7)  # Range: 0.4 - 0.7
        else:
            risk_score = 0.5
            confidence = 0.3

        return risk_score, confidence

    def _generate_fallback_risk_factors(
        self, agent_type: AgentType, fallback_data: Optional[Dict[str, Any]]
    ) -> List[str]:
        """Generate realistic risk factors based on agent type"""

        base_factors = {
            AgentType.NETWORK: [
                "Network analysis performed with limited LLM processing",
                "Connection patterns require manual review",
                "IP reputation data indicates potential concerns",
            ],
            AgentType.DEVICE: [
                "Device fingerprint analysis completed with constraints",
                "Automated device analysis encountered processing limitations",
                "Device behavior patterns suggest further investigation needed",
            ],
            AgentType.LOCATION: [
                "Geographic analysis performed with processing constraints",
                "Location patterns indicate need for manual verification",
                "Travel behavior analysis requires additional review",
            ],
            AgentType.LOGS: [
                "Behavioral log analysis completed with limitations",
                "Activity pattern analysis encountered processing constraints",
                "User behavior timeline requires manual examination",
            ],
            AgentType.RISK_AGGREGATION: [
                "Risk aggregation performed using available domain analyses",
                "Cross-domain correlation analysis limited by processing constraints",
                "Overall risk assessment requires manual validation",
            ],
        }

        return base_factors.get(
            agent_type, ["Analysis completed with processing limitations"]
        )

    def _generate_fallback_mitigation_measures(
        self, agent_type: AgentType
    ) -> List[str]:
        """Generate appropriate mitigation measures based on agent type"""

        base_measures = {
            AgentType.NETWORK: [
                "Review network connection logs manually",
                "Implement additional network monitoring",
                "Consider IP-based access controls",
            ],
            AgentType.DEVICE: [
                "Conduct manual device fingerprint review",
                "Implement enhanced device authentication",
                "Monitor device behavior patterns",
            ],
            AgentType.LOCATION: [
                "Manually verify location claims",
                "Implement location-based authentication",
                "Review travel pattern history",
            ],
            AgentType.LOGS: [
                "Conduct manual log review",
                "Implement enhanced behavior monitoring",
                "Set up activity pattern alerts",
            ],
            AgentType.RISK_AGGREGATION: [
                "Review all domain analyses manually",
                "Implement additional verification steps",
                "Consider elevated monitoring protocols",
            ],
        }

        return base_measures.get(
            agent_type, ["Conduct manual review of analysis results"]
        )

    def _generate_fallback_domain_specific(
        self, agent_type: AgentType, fallback_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate domain-specific data for fallback response"""

        domain_data = {}

        if agent_type == AgentType.NETWORK:
            domain_data.update(
                {
                    "network_red_flags": [
                        "Processing constraints prevented full analysis"
                    ],
                    "connection_analysis": ["Manual review required"],
                    "ip_reputation": ["Limited automated assessment available"],
                }
            )

        elif agent_type == AgentType.DEVICE:
            domain_data.update(
                {
                    "device_fingerprint_anomalies": ["Automated analysis incomplete"],
                    "fraud_indicators": ["Manual verification recommended"],
                    "fingerprint_analysis": ["Processing limitations encountered"],
                }
            )

        elif agent_type == AgentType.LOCATION:
            domain_data.update(
                {
                    "geographic_anomalies": ["Geographic analysis limited"],
                    "travel_patterns": ["Manual pattern review needed"],
                    "location_verification": ["Additional verification recommended"],
                }
            )

        elif agent_type == AgentType.LOGS:
            domain_data.update(
                {
                    "behavioral_patterns": ["Behavioral analysis incomplete"],
                    "suspicious_patterns": ["Manual pattern review required"],
                    "activity_timeline": [
                        "Timeline analysis limited by processing constraints"
                    ],
                }
            )

        elif agent_type == AgentType.RISK_AGGREGATION:
            domain_data.update(
                {
                    "cross_domain_correlations": [
                        "Limited cross-domain analysis available"
                    ],
                    "risk_classification": ["Manual risk classification recommended"],
                    "aggregation_metadata": {
                        "fallback_used": True,
                        "processing_limited": True,
                    },
                    "individual_agent_scores": {
                        "fallback_note": "Individual scores may be incomplete"
                    },
                }
            )

        # Add any available fallback data
        if fallback_data:
            domain_data["fallback_data_available"] = True
            domain_data["fallback_data_summary"] = str(fallback_data)[
                :500
            ]  # Truncate for safety

        return domain_data

    def get_call_statistics(self) -> Dict[str, Any]:
        """Get statistics about guarded LLM calls"""

        if not self.call_history:
            return {"total_calls": 0}

        total_calls = len(self.call_history)
        successful_calls = sum(1 for result in self.call_history if result.success)
        fallback_calls = sum(1 for result in self.call_history if result.used_fallback)

        avg_duration = (
            sum(result.total_duration for result in self.call_history) / total_calls
        )
        avg_attempts = (
            sum(result.total_attempts for result in self.call_history) / total_calls
        )

        return {
            "total_calls": total_calls,
            "successful_calls": successful_calls,
            "fallback_calls": fallback_calls,
            "success_rate": successful_calls / total_calls,
            "fallback_rate": fallback_calls / total_calls,
            "average_duration": avg_duration,
            "average_attempts": avg_attempts,
            "retry_strategies_used": list(
                set(
                    result.retry_strategy_used.value
                    for result in self.call_history
                    if result.retry_strategy_used
                )
            ),
            "fallback_reasons": [
                result.fallback_reason
                for result in self.call_history
                if result.fallback_reason
            ],
        }


# Global caller instance
_global_caller = None


def get_guarded_caller(config: Optional[GuardedCallConfig] = None) -> GuardedLLMCaller:
    """Get global guarded LLM caller instance"""
    global _global_caller
    if _global_caller is None or config is not None:
        _global_caller = GuardedLLMCaller(config)
    return _global_caller


# Convenience function for immediate use
async def guarded_llm_call(
    llm_function: Callable,
    agent_type: AgentType,
    investigation_id: str,
    fallback_data: Optional[Dict[str, Any]] = None,
    config: Optional[GuardedCallConfig] = None,
    **llm_kwargs,
) -> GuardedCallResult:
    """
    Convenience function for making guarded LLM calls

    Usage:
        result = await guarded_llm_call(
            llm_function=my_agent.ainvoke,
            agent_type=AgentType.NETWORK,
            investigation_id="inv_123",
            messages=[...],
            config=config
        )

        if result.success:
            return {"messages": [AIMessage(content=result.response.json())]}
        else:
            # Still return valid response due to fallback
            return {"messages": [AIMessage(content=result.response.json())]}
    """

    caller = get_guarded_caller(config)
    return await caller.call_with_guard(
        llm_function=llm_function,
        agent_type=agent_type,
        investigation_id=investigation_id,
        fallback_data=fallback_data,
        **llm_kwargs,
    )


# Example configurations for different scenarios
def get_production_config() -> GuardedCallConfig:
    """Production-ready configuration with comprehensive retries"""
    return GuardedCallConfig(
        max_retries=3,
        retry_strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
        base_delay=2.0,
        max_delay=60.0,
        timeout_per_call=120.0,
        total_timeout=400.0,
        fallback_strategy=FallbackStrategy.STRUCTURED_FALLBACK,
        require_risk_score=True,
        log_attempts=True,
        log_failures=True,
        log_fallbacks=True,
    )


def get_development_config() -> GuardedCallConfig:
    """Development configuration with faster timeouts"""
    return GuardedCallConfig(
        max_retries=2,
        retry_strategy=RetryStrategy.FIXED_INTERVAL,
        base_delay=1.0,
        max_delay=10.0,
        timeout_per_call=30.0,
        total_timeout=90.0,
        fallback_strategy=FallbackStrategy.CONSERVATIVE_ESTIMATE,
        require_risk_score=True,
        log_attempts=True,
        log_failures=True,
        log_fallbacks=True,
    )


def get_testing_config() -> GuardedCallConfig:
    """Testing configuration with minimal retries"""
    return GuardedCallConfig(
        max_retries=1,
        retry_strategy=RetryStrategy.IMMEDIATE,
        base_delay=0.1,
        max_delay=1.0,
        timeout_per_call=10.0,
        total_timeout=15.0,
        fallback_strategy=FallbackStrategy.ZERO_RISK,
        require_risk_score=False,
        log_attempts=False,
        log_failures=True,
        log_fallbacks=True,
    )


# Example usage:
"""
# In your agent code:

async def my_agent_function(state, config):
    from app.service.agent.guarded_llm_calls import guarded_llm_call, get_production_config
    from app.service.agent.unified_agent_schema import AgentType
    
    # Extract investigation context
    investigation_id = "your_investigation_id"
    fallback_data = {"entity_id": "entity123", "context": "some context"}
    
    # Make guarded LLM call
    result = await guarded_llm_call(
        llm_function=your_llm_agent.ainvoke,
        agent_type=AgentType.NETWORK,
        investigation_id=investigation_id,
        fallback_data=fallback_data,
        config=get_production_config(),
        messages=[your_messages]
    )
    
    # Always get valid response (either from LLM or fallback)
    return {"messages": [AIMessage(content=result.response.json())]}
"""
