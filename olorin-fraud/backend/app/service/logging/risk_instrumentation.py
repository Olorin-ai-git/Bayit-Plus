"""
Risk Calculation Instrumentation

Captures risk scoring, factors, and decision-making for investigation entities.
"""

from typing import Dict, List, Optional

from app.service.logging.investigation_data_models import RiskFactor


class RiskCalculationInstrumentor:
    """Instruments risk calculations to capture reasoning and methodology."""

    def __init__(self, instrumentation_logger, agent_name: str):
        self.logger = instrumentation_logger
        self.agent_name = agent_name

    def log_risk_calculation(
        self,
        entity_id: str,
        entity_type: str,
        risk_factors: List[RiskFactor],
        calculation_method: str,
        final_score: float,
        overall_reasoning: str,
        confidence: float,
        recommendations: Optional[List[str]] = None,
    ) -> float:
        """Log a complete risk calculation with all factors and reasoning."""
        intermediate_scores = {}
        total_weighted = 0.0
        total_weight = 0.0

        for factor in risk_factors:
            weighted = factor.weighted_score()
            intermediate_scores[factor.name] = {
                "value": factor.value,
                "weight": factor.weight,
                "weighted_contribution": weighted,
                "reasoning": factor.reasoning,
                "evidence_count": len(factor.evidence),
            }
            total_weighted += weighted
            total_weight += factor.weight

        if total_weight > 0:
            intermediate_scores["_aggregation"] = {
                "total_weighted": total_weighted,
                "total_weight": total_weight,
                "average_weighted": total_weighted / total_weight,
                "calculation_method": calculation_method,
                "number_of_factors": len(risk_factors),
            }

        risk_factors_dict = {
            factor.name: {
                "value": factor.value,
                "weight": factor.weight,
                "weighted_score": factor.weighted_score(),
                "reasoning": factor.reasoning,
                "evidence_count": len(factor.evidence),
            }
            for factor in risk_factors
        }

        self.logger.log_risk_calculation(
            agent_name=self.agent_name,
            entity_id=entity_id,
            entity_type=entity_type,
            risk_factors=risk_factors_dict,
            calculation_method=calculation_method,
            intermediate_scores=intermediate_scores,
            final_score=final_score,
            reasoning=overall_reasoning,
            confidence=confidence,
        )

        self.logger.log_event(
            event_type="risk_calculation",
            agent_name=self.agent_name,
            description=f"Risk calculation for {entity_type} {entity_id}",
            details={
                "final_score": final_score,
                "confidence": confidence,
                "number_of_factors": len(risk_factors),
                "calculation_method": calculation_method,
                "recommendations": recommendations or [],
            },
        )

        return final_score

    def log_risk_threshold_decision(
        self,
        entity_id: str,
        risk_score: float,
        threshold: float,
        decision: str,
        reasoning: str,
        action_items: List[str],
    ) -> None:
        """Log risk threshold-based decisions."""
        confidence = min(
            1.0, 1.0 - (abs(risk_score - threshold) / max(risk_score, threshold))
        )

        self.logger.log_agent_decision(
            agent_name=self.agent_name,
            decision_type="risk_threshold",
            options_considered=[
                f"escalate (score >= {threshold})",
                f"investigate (score >= {threshold * 0.8})",
                f"monitor (score >= {threshold * 0.5})",
                f"clear (score < {threshold * 0.5})",
            ],
            selected_option=decision,
            reasoning=reasoning,
            confidence_score=confidence,
            context_summary={
                "entity_id": entity_id,
                "risk_score": risk_score,
                "threshold": threshold,
                "action_items": action_items,
            },
        )

        self.logger.log_event(
            event_type="risk_decision",
            agent_name=self.agent_name,
            description=f"Risk threshold decision for {entity_id}",
            details={
                "risk_score": risk_score,
                "threshold": threshold,
                "decision": decision,
                "action_items": action_items,
            },
        )

    def log_risk_aggregation(
        self,
        entity_id: str,
        agent_scores: Dict[str, float],
        aggregation_method: str,
        final_score: float,
        reasoning: str,
    ) -> float:
        """Log aggregation of scores from multiple agents."""
        avg_score = (
            sum(agent_scores.values()) / len(agent_scores) if agent_scores else 0
        )

        self.logger.log_event(
            event_type="risk_aggregation",
            agent_name="system",
            description=f"Aggregating risk scores for {entity_id}",
            details={
                "agent_scores": agent_scores,
                "aggregation_method": aggregation_method,
                "average_score": avg_score,
                "final_score": final_score,
                "reasoning": reasoning,
            },
        )

        return final_score

    def log_model_based_risk(
        self,
        entity_id: str,
        entity_type: str,
        model_name: str,
        model_score: float,
        confidence_interval: tuple,
        reasoning: str,
        features_used: List[str],
    ) -> float:
        """Log ML model-based risk prediction."""
        self.logger.log_event(
            event_type="model_risk_prediction",
            agent_name=self.agent_name,
            description=f"ML model risk prediction for {entity_type} {entity_id}",
            details={
                "model_name": model_name,
                "model_score": model_score,
                "confidence_lower": confidence_interval[0],
                "confidence_upper": confidence_interval[1],
                "reasoning": reasoning,
                "features_count": len(features_used),
                "features": features_used[:5],
            },
        )

        return model_score
