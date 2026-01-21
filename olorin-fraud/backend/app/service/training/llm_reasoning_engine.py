"""
LLM Reasoning Engine
Feature: 026-llm-training-pipeline

Core LLM-based fraud detection scoring engine.
Replaces rule-based scoring with LLM reasoning.
"""

import json
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from langchain_core.messages import HumanMessage, SystemMessage

from app.service.llm_manager import get_llm_manager
from app.service.logging import get_bridge_logger
from app.service.training.prompt_registry import get_prompt_registry
from app.service.training.training_config_loader import get_training_config

logger = get_bridge_logger(__name__)


@dataclass
class RiskFactors:
    """Risk factor breakdown from LLM analysis."""

    velocity_risk: float = 0.0
    geographic_risk: float = 0.0
    device_risk: float = 0.0
    behavioral_risk: float = 0.0


@dataclass
class FraudAssessment:
    """Complete fraud assessment from LLM reasoning."""

    risk_score: float
    confidence: float
    prediction: str
    reasoning: str
    key_indicators: List[str] = field(default_factory=list)
    risk_factors: Optional[RiskFactors] = None
    raw_response: Optional[str] = None
    model_used: Optional[str] = None
    error: Optional[str] = None


class LLMReasoningEngine:
    """Engine for LLM-based fraud detection reasoning."""

    def __init__(self):
        """Initialize the reasoning engine."""
        self._config = get_training_config()
        self._prompt_registry = get_prompt_registry()
        self._llm_manager = get_llm_manager()

    def is_enabled(self) -> bool:
        """Check if LLM reasoning is enabled."""
        return self._config.reasoning_enabled

    async def analyze_entity(
        self,
        entity_type: str,
        entity_value: str,
        features: Dict[str, Any],
        merchant_name: Optional[str] = None,
    ) -> FraudAssessment:
        """
        Analyze an entity for fraud risk using LLM reasoning.

        Args:
            entity_type: Type of entity (email, ip, device_id)
            entity_value: Entity identifier
            features: Dictionary of fraud detection features
            merchant_name: Optional merchant name

        Returns:
            FraudAssessment with risk score and reasoning
        """
        if not self.is_enabled():
            return self._create_disabled_response()

        try:
            template = self._prompt_registry.get_prompt_template()
            prompt = self._build_prompt(
                template, entity_type, entity_value, features, merchant_name
            )

            messages = [
                SystemMessage(content=template.system_prompt),
                HumanMessage(content=prompt),
            ]

            result = await self._llm_manager.invoke_with_verification(
                messages, verify=False
            )

            if "error" in result:
                logger.error(f"LLM invocation error: {result['error']}")
                return self._create_error_response(result["error"])

            assessment = self._parse_response(result["response"])
            assessment.model_used = result.get("model_used")
            assessment.raw_response = result.get("response")

            return assessment

        except Exception as e:
            logger.error(f"LLM reasoning error: {e}")
            return self._create_error_response(str(e))

    def _build_prompt(
        self,
        template: Any,
        entity_type: str,
        entity_value: str,
        features: Dict[str, Any],
        merchant_name: Optional[str],
    ) -> str:
        """Build the fraud analysis prompt from template and features."""
        first_tx = features.get("first_tx_date", "N/A")
        last_tx = features.get("last_tx_date", "N/A")
        date_range = f"{first_tx} to {last_tx}"

        # Format all sections for v1-v3 template compatibility
        fraud_indicators = self._format_fraud_indicators(template, features)
        velocity_analysis = self._format_velocity_analysis(template, features)
        geographic_analysis = self._format_geographic_analysis(template, features)
        device_analysis = self._format_device_analysis(template, features)
        historical_patterns = self._format_historical_patterns(template, features)

        return template.fraud_analysis_prompt.format(
            entity_type=entity_type,
            entity_value=entity_value,
            merchant_name=merchant_name or "Unknown",
            total_transactions=features.get("total_transactions", 0),
            total_gmv=features.get("total_gmv", 0),
            avg_tx_value=features.get("avg_tx_value", 0),
            std_tx_value=features.get("std_tx_value", 0),
            date_range=date_range,
            unique_merchants=features.get("merchant_count", 0),
            unique_devices=features.get("device_count", 0),
            unique_ips=features.get("ip_count", 0),
            fraud_indicators=fraud_indicators,
            velocity_analysis=velocity_analysis,
            geographic_analysis=geographic_analysis,
            device_analysis=device_analysis,
            historical_patterns=historical_patterns,
        )

    def _format_fraud_indicators(
        self, template: Any, features: Dict[str, Any]
    ) -> str:
        """Format fraud indicators section - handles all template versions."""
        # Provide all possible fields for v1-v15 template compatibility
        format_args = {
            # v4+ fields (behavioral)
            "total_transactions": features.get("total_transactions", 0),
            "total_gmv": features.get("total_gmv", 0),
            "avg_tx_value": features.get("avg_tx_value", 0),
            "std_tx_value": features.get("std_tx_value", 0),
            "device_count": features.get("device_count", 0),
            "ip_count": features.get("ip_count", 0),
            "merchant_count": features.get("merchant_count", 0),
            # v1-v3 fields (default to 0/N/A if not available)
            "fraud_tx_count": features.get("fraud_tx_count", 0),
            "fraud_ratio": features.get("fraud_ratio", 0),
            "chargeback_count": features.get("chargeback_count", 0),
            "declined_ratio": features.get("declined_ratio", 0),
            "high_risk_country_count": features.get("high_risk_country_count", 0),
        }
        try:
            return template.fraud_indicators_template.format(**format_args)
        except KeyError as e:
            # Handle any missing keys by using a fallback format
            logger.debug(f"Missing field in fraud_indicators_template: {e}")
            return f"Transactions: {format_args['total_transactions']}, GMV: ${format_args['total_gmv']}"

    def _format_velocity_analysis(
        self, template: Any, features: Dict[str, Any]
    ) -> str:
        """Format velocity analysis section - handles all template versions."""
        format_args = {
            "total_transactions": features.get("total_transactions", 0),
            "avg_tx_value": features.get("avg_tx_value", 0),
            "std_tx_value": features.get("std_tx_value", 0),
            "first_tx_date": features.get("first_tx_date", "N/A"),
            "last_tx_date": features.get("last_tx_date", "N/A"),
            # v1-v3 additional fields
            "tx_per_day_avg": features.get("tx_per_day_avg", 0),
            "tx_per_day_max": features.get("tx_per_day_max", 0),
            "min_time_between_tx": features.get("min_time_between_tx", "N/A"),
            "frequency_anomaly_score": features.get("frequency_anomaly_score", 0),
        }
        try:
            return template.velocity_analysis_template.format(**format_args)
        except KeyError as e:
            logger.debug(f"Missing field in velocity_analysis_template: {e}")
            return f"Transactions: {format_args['total_transactions']}, Avg: ${format_args['avg_tx_value']}"

    def _format_geographic_analysis(
        self, template: Any, features: Dict[str, Any]
    ) -> str:
        """Format geographic analysis section - handles all template versions."""
        ip_count = features.get("ip_count", 0)
        total_tx = features.get("total_transactions", 1)
        ip_ratio = round(ip_count / total_tx, 2) if total_tx > 0 else 0
        format_args = {
            "ip_count": ip_count,
            "ip_ratio": ip_ratio,
            # v1-v3 additional fields
            "country_count": features.get("country_count", 0),
            "countries": features.get("countries", "N/A"),
            "geo_dispersion_score": features.get("geo_dispersion_score", 0),
            "impossible_travel": features.get("impossible_travel", "No"),
        }
        try:
            return template.geographic_analysis_template.format(**format_args)
        except KeyError as e:
            logger.debug(f"Missing field in geographic_analysis_template: {e}")
            return f"IPs: {ip_count}, IP Ratio: {ip_ratio}"

    def _format_device_analysis(self, template: Any, features: Dict[str, Any]) -> str:
        """Format device analysis section - handles all template versions."""
        device_count = features.get("device_count", 0)
        ip_count = features.get("ip_count", 0)
        multi_device = "Yes" if device_count > 1 or ip_count > 1 else "No"
        format_args = {
            "device_count": device_count,
            "ip_count": ip_count,
            "multi_device": multi_device,
            # v1-v3 additional fields
            "device_sharing": features.get("device_sharing", "No"),
            "emulator_detected": features.get("emulator_detected", "No"),
            "browser_types": features.get("browser_types", "N/A"),
            "os_types": features.get("os_types", "N/A"),
        }
        try:
            return template.device_analysis_template.format(**format_args)
        except KeyError as e:
            logger.debug(f"Missing field in device_analysis_template: {e}")
            return f"Devices: {device_count}, IPs: {ip_count}"

    def _format_historical_patterns(
        self, template: Any, features: Dict[str, Any]
    ) -> str:
        """Format historical patterns section - handles all template versions."""
        format_args = {
            "first_tx_date": features.get("first_tx_date", "N/A"),
            "last_tx_date": features.get("last_tx_date", "N/A"),
            "total_transactions": features.get("total_transactions", 0),
            "merchant_count": features.get("merchant_count", 0),
            # v1-v3 additional fields
            "account_age_days": features.get("account_age_days", 0),
            "historical_fraud_rate": features.get("historical_fraud_rate", 0),
            "previous_investigations": features.get("previous_investigations", 0),
        }
        try:
            return template.historical_patterns_template.format(**format_args)
        except KeyError as e:
            logger.debug(f"Missing field in historical_patterns_template: {e}")
            return f"First TX: {format_args['first_tx_date']}, Last TX: {format_args['last_tx_date']}"

    def _parse_response(self, response: str) -> FraudAssessment:
        """Parse LLM response into FraudAssessment."""
        try:
            json_match = re.search(r"```json\s*([\s\S]*?)\s*```", response)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_match = re.search(r"\{[\s\S]*\}", response)
                if json_match:
                    json_str = json_match.group(0)
                else:
                    raise ValueError("No JSON found in response")

            data = json.loads(json_str)

            risk_factors = None
            if "risk_factors" in data:
                rf = data["risk_factors"]
                risk_factors = RiskFactors(
                    velocity_risk=rf.get("velocity_risk", 0),
                    geographic_risk=rf.get("geographic_risk", 0),
                    device_risk=rf.get("device_risk", 0),
                    behavioral_risk=rf.get("behavioral_risk", 0),
                )

            return FraudAssessment(
                risk_score=float(data.get("risk_score", 0)),
                confidence=float(data.get("confidence", 0)),
                prediction=data.get("prediction", "UNKNOWN"),
                reasoning=data.get("reasoning", ""),
                key_indicators=data.get("key_indicators", []),
                risk_factors=risk_factors,
            )

        except Exception as e:
            logger.warning(f"Failed to parse LLM response: {e}")
            return self._extract_fallback_assessment(response)

    def _extract_fallback_assessment(self, response: str) -> FraudAssessment:
        """Extract assessment from unstructured response."""
        risk_score = 0.5
        prediction = "UNKNOWN"

        response_lower = response.lower()
        if "fraud" in response_lower and "legitimate" not in response_lower:
            risk_score = 0.75
            prediction = "FRAUD"
        elif "legitimate" in response_lower:
            risk_score = 0.25
            prediction = "LEGITIMATE"

        return FraudAssessment(
            risk_score=risk_score,
            confidence=0.3,
            prediction=prediction,
            reasoning=response[:500] if len(response) > 500 else response,
        )

    def _create_disabled_response(self) -> FraudAssessment:
        """Create response when LLM reasoning is disabled with neutral score."""
        return FraudAssessment(
            risk_score=0.5,
            confidence=0.0,
            prediction="UNKNOWN",
            reasoning="LLM reasoning is disabled",
            error="LLM_REASONING_DISABLED",
        )

    def _create_error_response(self, error: str) -> FraudAssessment:
        """Create error response with neutral score to avoid biasing results."""
        return FraudAssessment(
            risk_score=0.5,
            confidence=0.0,
            prediction="UNKNOWN",
            reasoning=f"Error during analysis: {error}",
            error=error,
        )


_reasoning_engine: Optional[LLMReasoningEngine] = None


def get_reasoning_engine() -> LLMReasoningEngine:
    """Get cached reasoning engine instance."""
    global _reasoning_engine
    if _reasoning_engine is None:
        _reasoning_engine = LLMReasoningEngine()
    return _reasoning_engine


def clear_reasoning_engine_cache() -> None:
    """Clear cached reasoning engine to force reload with new config."""
    global _reasoning_engine
    _reasoning_engine = None
    logger.debug("Reasoning engine cache cleared")
