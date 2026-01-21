"""
Explanation Generator
Feature: 026-llm-training-pipeline

Generates LLM-based explanations for fraud risk assessments.
"""

import os
from typing import Any, Dict, List, Optional

from langchain_core.messages import HumanMessage, SystemMessage

from app.service.llm_manager import get_llm_manager
from app.service.logging import get_bridge_logger
from app.service.training.scoring.hybrid_models import ExplanationRequest
from app.service.training.training_config_loader import get_training_config

logger = get_bridge_logger(__name__)

EXPLANATION_SYSTEM_PROMPT = """You are a fraud risk analyst. Given a classical model's risk score and feature contributions, provide a clear, concise explanation of the risk assessment.

Your explanation should:
1. Summarize the overall risk level based on the score
2. Highlight the top contributing factors
3. Explain what these factors indicate about potential fraud
4. Be objective and evidence-based

Keep explanations under {max_length} characters."""

EXPLANATION_USER_PROMPT = """Entity: {entity_type} = {entity_value}
Merchant: {merchant_name}

Classical Model Risk Score: {classical_score:.3f}

Top Contributing Features:
{feature_summary}

Provide a brief explanation of why this entity has this risk score."""


class ExplanationGenerator:
    """Generates natural language explanations for risk assessments."""

    def __init__(self):
        """Initialize explanation generator from config."""
        self._config = get_training_config()
        self._llm_manager = get_llm_manager()
        self._init_from_config()

    def _init_from_config(self) -> None:
        """Initialize settings from configuration."""
        self._enabled = os.getenv("LLM_EXPLANATION_ENABLED", "true").lower() == "true"
        self._max_length = int(os.getenv("LLM_EXPLANATION_MAX_LENGTH", "500"))
        self._include_contributions = (
            os.getenv("LLM_INCLUDE_CONTRIBUTIONS", "true").lower() == "true"
        )

    def is_enabled(self) -> bool:
        """Check if explanation generation is enabled."""
        return self._enabled

    async def generate(
        self,
        request: ExplanationRequest,
    ) -> str:
        """
        Generate explanation for a risk assessment.

        Args:
            request: ExplanationRequest with score and contributions

        Returns:
            Natural language explanation string
        """
        if not self._enabled:
            return self._generate_fallback_explanation(request)

        try:
            feature_summary = self._format_feature_summary(request)

            system_prompt = EXPLANATION_SYSTEM_PROMPT.format(
                max_length=self._max_length
            )

            user_prompt = EXPLANATION_USER_PROMPT.format(
                entity_type=request.entity_type,
                entity_value=request.entity_value,
                merchant_name=request.merchant_name or "Unknown",
                classical_score=request.classical_score,
                feature_summary=feature_summary,
            )

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt),
            ]

            result = await self._llm_manager.invoke_with_verification(
                messages, verify=False
            )

            if "error" in result:
                logger.warning(f"LLM explanation error: {result['error']}")
                return self._generate_fallback_explanation(request)

            explanation = result.get("response", "")
            if len(explanation) > self._max_length:
                explanation = explanation[: self._max_length - 3] + "..."

            return explanation

        except Exception as e:
            logger.error(f"Explanation generation failed: {e}")
            return self._generate_fallback_explanation(request)

    def _format_feature_summary(self, request: ExplanationRequest) -> str:
        """Format feature contributions for prompt."""
        if not self._include_contributions:
            return "Feature details not available."

        lines = []
        sorted_contribs = sorted(
            request.feature_contributions.items(),
            key=lambda x: abs(x[1]),
            reverse=True,
        )

        for name, contrib in sorted_contribs[:5]:
            direction = "increases" if contrib > 0 else "decreases"
            lines.append(f"- {name}: {direction} risk by {abs(contrib):.3f}")

        return "\n".join(lines) if lines else "No significant feature contributions."

    def _generate_fallback_explanation(
        self, request: ExplanationRequest
    ) -> str:
        """Generate rule-based fallback explanation."""
        score = request.classical_score

        if score >= 0.75:
            risk_level = "High"
            assessment = "This entity shows significant fraud indicators."
        elif score >= 0.55:
            risk_level = "Medium-High"
            assessment = "This entity shows elevated fraud risk patterns."
        elif score >= 0.30:
            risk_level = "Medium"
            assessment = "This entity shows moderate risk indicators."
        else:
            risk_level = "Low"
            assessment = "This entity shows typical legitimate behavior patterns."

        top_factors = []
        for name, contrib in sorted(
            request.feature_contributions.items(),
            key=lambda x: abs(x[1]),
            reverse=True,
        )[:3]:
            if contrib > 0:
                top_factors.append(f"elevated {name}")
            else:
                top_factors.append(f"normal {name}")

        factors_str = ", ".join(top_factors) if top_factors else "standard patterns"

        return (
            f"{risk_level} risk (score: {score:.2f}). {assessment} "
            f"Key factors: {factors_str}."
        )

    def get_key_indicators(
        self, request: ExplanationRequest, n: int = 5
    ) -> List[str]:
        """Extract key indicators from contributions."""
        indicators = []
        sorted_contribs = sorted(
            request.feature_contributions.items(),
            key=lambda x: abs(x[1]),
            reverse=True,
        )

        for name, contrib in sorted_contribs[:n]:
            if contrib > 0.1:
                indicators.append(f"High {name}")
            elif contrib < -0.1:
                indicators.append(f"Low {name}")
            elif abs(contrib) > 0.05:
                indicators.append(f"Notable {name}")

        return indicators
