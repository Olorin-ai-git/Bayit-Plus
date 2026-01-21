"""
Hybrid Scorer
Feature: 026-llm-training-pipeline

Orchestrates classical model scoring with LLM-based explanations.
"""

import os
from typing import Any, Dict, Optional

from app.service.logging import get_bridge_logger
from app.service.training.llm_reasoning_engine import get_reasoning_engine
from app.service.training.scoring.classical_scorer import get_classical_scorer
from app.service.training.scoring.explanation_generator import ExplanationGenerator
from app.service.training.scoring.hybrid_models import (
    ExplanationRequest,
    HybridAssessment,
    ScoringMode,
)
from app.service.training.scoring.score_calibrator import ScoreCalibrator
from app.service.training.training_config_loader import get_training_config

logger = get_bridge_logger(__name__)


class HybridScorer:
    """Combines classical model scoring with LLM explanations."""

    def __init__(self):
        """Initialize hybrid scorer from config."""
        self._config = get_training_config()
        self._init_from_config()
        self._classical_scorer = get_classical_scorer()
        self._calibrator = ScoreCalibrator()
        self._explanation_generator = ExplanationGenerator()
        self._reasoning_engine = get_reasoning_engine()

    def _init_from_config(self) -> None:
        """Initialize settings from configuration."""
        mode_str = os.getenv("LLM_SCORING_MODE", "hybrid")
        self._mode = ScoringMode(mode_str)
        self._classical_weight = float(os.getenv("LLM_CLASSICAL_WEIGHT", "0.7"))
        self._llm_weight = float(os.getenv("LLM_LLM_WEIGHT", "0.3"))
        self._fallback_to_llm = os.getenv("LLM_FALLBACK_TO_LLM", "true").lower() == "true"
        self._fraud_threshold = self._config.scoring.fraud_threshold

    async def score(
        self,
        entity_type: str,
        entity_value: str,
        features: Dict[str, Any],
        merchant_name: Optional[str] = None,
    ) -> HybridAssessment:
        """
        Score an entity using configured mode.

        Args:
            entity_type: Type of entity (email, ip, device_id)
            entity_value: Entity identifier
            features: Feature dictionary
            merchant_name: Optional merchant name

        Returns:
            HybridAssessment with score, explanation, and indicators
        """
        try:
            if self._mode == ScoringMode.LLM_ONLY:
                return await self._score_llm_only(
                    entity_type, entity_value, features, merchant_name
                )
            elif self._mode == ScoringMode.CLASSICAL_ONLY:
                return await self._score_classical_only(
                    entity_type, entity_value, features, merchant_name
                )
            else:
                return await self._score_hybrid(
                    entity_type, entity_value, features, merchant_name
                )
        except Exception as e:
            logger.error(f"Hybrid scoring error: {e}")
            return HybridAssessment.from_error(str(e))

    async def _score_hybrid(
        self,
        entity_type: str,
        entity_value: str,
        features: Dict[str, Any],
        merchant_name: Optional[str],
    ) -> HybridAssessment:
        """Score using hybrid approach: classical for score, LLM for explanation."""
        classical_result = self._classical_scorer.score(features)
        calibration_result = self._calibrator.calibrate(classical_result.risk_score)

        risk_score = calibration_result.calibrated_score
        is_calibrated = calibration_result.is_valid

        explanation_request = ExplanationRequest(
            entity_type=entity_type,
            entity_value=entity_value,
            features=features,
            classical_score=risk_score,
            feature_contributions=classical_result.feature_contributions,
            merchant_name=merchant_name,
        )

        reasoning = await self._explanation_generator.generate(explanation_request)
        key_indicators = self._explanation_generator.get_key_indicators(
            explanation_request
        )

        prediction = "FRAUD" if risk_score >= self._fraud_threshold else "LEGITIMATE"
        confidence = self._calculate_confidence(risk_score)

        return HybridAssessment(
            risk_score=risk_score,
            confidence=confidence,
            prediction=prediction,
            reasoning=reasoning,
            key_indicators=key_indicators,
            classical_score=classical_result.risk_score,
            llm_score=None,
            feature_contributions=classical_result.feature_contributions,
            scoring_mode=ScoringMode.HYBRID,
            is_calibrated=is_calibrated,
            model_version=classical_result.model_version,
        )

    async def _score_classical_only(
        self,
        entity_type: str,
        entity_value: str,
        features: Dict[str, Any],
        merchant_name: Optional[str],
    ) -> HybridAssessment:
        """Score using classical model only with rule-based explanation."""
        classical_result = self._classical_scorer.score(features)
        calibration_result = self._calibrator.calibrate(classical_result.risk_score)

        risk_score = calibration_result.calibrated_score
        prediction = "FRAUD" if risk_score >= self._fraud_threshold else "LEGITIMATE"

        explanation_request = ExplanationRequest(
            entity_type=entity_type,
            entity_value=entity_value,
            features=features,
            classical_score=risk_score,
            feature_contributions=classical_result.feature_contributions,
            merchant_name=merchant_name,
        )

        reasoning = self._explanation_generator._generate_fallback_explanation(
            explanation_request
        )
        key_indicators = self._explanation_generator.get_key_indicators(
            explanation_request
        )

        return HybridAssessment(
            risk_score=risk_score,
            confidence=self._calculate_confidence(risk_score),
            prediction=prediction,
            reasoning=reasoning,
            key_indicators=key_indicators,
            classical_score=classical_result.risk_score,
            feature_contributions=classical_result.feature_contributions,
            scoring_mode=ScoringMode.CLASSICAL_ONLY,
            is_calibrated=calibration_result.is_valid,
            model_version=classical_result.model_version,
        )

    async def _score_llm_only(
        self,
        entity_type: str,
        entity_value: str,
        features: Dict[str, Any],
        merchant_name: Optional[str],
    ) -> HybridAssessment:
        """Score using LLM only (legacy mode)."""
        assessment = await self._reasoning_engine.analyze_entity(
            entity_type=entity_type,
            entity_value=entity_value,
            features=features,
            merchant_name=merchant_name,
        )

        return HybridAssessment(
            risk_score=assessment.risk_score,
            confidence=assessment.confidence,
            prediction=assessment.prediction,
            reasoning=assessment.reasoning,
            key_indicators=assessment.key_indicators,
            llm_score=assessment.risk_score,
            scoring_mode=ScoringMode.LLM_ONLY,
            error=assessment.error,
        )

    def _calculate_confidence(self, risk_score: float) -> float:
        """Calculate confidence based on score distance from threshold."""
        distance = abs(risk_score - 0.5)
        return min(1.0, 0.5 + distance)

    def get_mode(self) -> ScoringMode:
        """Get current scoring mode."""
        return self._mode


_hybrid_scorer: Optional[HybridScorer] = None


def get_hybrid_scorer() -> HybridScorer:
    """Get cached hybrid scorer instance."""
    global _hybrid_scorer
    if _hybrid_scorer is None:
        _hybrid_scorer = HybridScorer()
    return _hybrid_scorer
