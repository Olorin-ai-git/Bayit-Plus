"""
Risk Scoring Tool

Main orchestrator for the modular risk scoring system.
"""

import json
from typing import Any, Dict, List, Optional

from langchain.tools import BaseTool

from app.service.logging import get_bridge_logger

from ..assessors import (
    BehavioralRiskAssessor,
    ContextualRiskAssessor,
    CreditRiskAssessor,
    FraudRiskAssessor,
    OperationalRiskAssessor,
)
from ..scorers import CompositeScorer, MLBasedScorer, RuleBasedScorer, WeightedScorer
from ..utils import RecommendationGenerator, RiskDataPreprocessor
from .input_schema import ComprehensiveRiskResult, RiskScoringInput
from .processor import RiskScoringProcessor
from .result_generator import RiskScoringResultGenerator

logger = get_bridge_logger(__name__)


class RiskScoringTool(BaseTool):
    """
    Advanced risk scoring using machine learning and statistical methods.

    Provides comprehensive risk assessment combining multiple risk factors,
    predictive modeling, and dynamic risk calculation for real-time risk
    management and decision support.
    """

    name: str = "risk_scoring_ml"
    description: str = """Advanced risk scoring tool for comprehensive risk assessment.
    Analyzes multiple risk factors (fraud, credit, operational, behavioral, contextual)
    using various scoring models (rule-based, weighted, ML-based, composite).

    Input: JSON with risk_data (dict), risk_factors (list), scoring_models (list),
    risk_tolerance (str), time_horizon (str), historical_risk_data (dict, optional)

    Returns: Comprehensive risk assessment with scores, recommendations, and analysis."""

    def __init__(self):
        """Initialize the risk scoring tool with all components."""
        super().__init__()
        self._initialize_components()

    def _initialize_components(self):
        """Initialize internal components."""
        # Initialize assessors
        assessors = {
            "fraud": FraudRiskAssessor(),
            "credit": CreditRiskAssessor(),
            "operational": OperationalRiskAssessor(),
            "behavioral": BehavioralRiskAssessor(),
            "contextual": ContextualRiskAssessor(),
        }

        # Initialize scorers
        scorers = {
            "rule_based": RuleBasedScorer(),
            "weighted": WeightedScorer(),
            "ml_based": MLBasedScorer(),
            "composite": CompositeScorer(),
        }

        # Initialize utilities
        self._preprocessor = RiskDataPreprocessor()
        recommendation_generator = RecommendationGenerator()

        # Initialize processor and result generator
        self._processor = RiskScoringProcessor(assessors, scorers)
        self._result_generator = RiskScoringResultGenerator(recommendation_generator)

    def _run(
        self,
        risk_data: Dict[str, Any],
        risk_factors: List[str] = None,
        scoring_models: List[str] = None,
        risk_tolerance: str = "medium",
        time_horizon: str = "short_term",
        historical_risk_data: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Execute comprehensive risk scoring analysis.

        Args:
            risk_data: Risk data for assessment
            risk_factors: Risk factors to assess
            scoring_models: Scoring models to apply
            risk_tolerance: Risk tolerance level
            time_horizon: Assessment time horizon
            historical_risk_data: Historical data for trend analysis

        Returns:
            JSON string with comprehensive risk assessment
        """
        try:
            # Set defaults
            if risk_factors is None:
                risk_factors = [
                    "fraud",
                    "credit",
                    "operational",
                    "behavioral",
                    "contextual",
                ]
            if scoring_models is None:
                scoring_models = ["composite", "weighted", "ml_based", "rule_based"]

            # Validate input
            validation_result = self._preprocessor.validate_input(risk_data)
            if not validation_result["is_valid"]:
                return json.dumps(
                    {
                        "success": False,
                        "error": "Invalid input data",
                        "validation_errors": validation_result["errors"],
                    }
                )

            # Preprocess data
            processed_data = self._preprocessor.preprocess(risk_data)

            # Perform risk assessments
            risk_assessments = self._processor.perform_risk_assessments(
                processed_data, risk_factors, risk_tolerance
            )

            # Apply scoring models
            model_scores = self._processor.apply_scoring_models(
                processed_data,
                risk_assessments,
                scoring_models,
                risk_tolerance,
                time_horizon,
                historical_risk_data,
            )

            # Generate comprehensive result
            result = self._result_generator.generate_comprehensive_result(
                model_scores, risk_assessments, processed_data
            )

            logger.info(
                f"Risk scoring completed successfully. Overall score: {result.overall_score:.3f}"
            )

            return json.dumps(
                {
                    "success": True,
                    "result": result.dict(),
                    "data_quality": processed_data.get("data_quality", 0.0),
                    "validation_warnings": validation_result.get("warnings", []),
                },
                indent=2,
            )

        except Exception as e:
            logger.error(f"Error in risk scoring: {str(e)}")
            return json.dumps(
                {"success": False, "error": f"Risk scoring failed: {str(e)}"}
            )
