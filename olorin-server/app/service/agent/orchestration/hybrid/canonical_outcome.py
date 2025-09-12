"""
Canonical Final Outcome - Unified investigation result structure.

This module defines the canonical final outcome format for all hybrid investigations,
ensuring consistent result structures across all completion paths.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum

from .hybrid_state_schema import HybridInvestigationState, AIConfidenceLevel, InvestigationStrategy
from .evidence_config import EvidenceQualityLevel, get_evidence_validator

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class InvestigationStatus(Enum):
    """Investigation completion status"""
    COMPLETED = "completed"
    COMPLETED_WITH_WARNINGS = "completed_with_warnings"
    FAILED = "failed"
    TERMINATED_BY_SAFETY = "terminated_by_safety"
    TIMEOUT = "timeout"


class FraudLikelihood(Enum):
    """Fraud likelihood assessment categories"""
    VERY_HIGH = "very_high"      # ≥90% - Immediate action required
    HIGH = "high"                # 70-89% - Strong fraud indicators
    MODERATE = "moderate"        # 50-69% - Additional review needed
    LOW = "low"                  # 30-49% - Minimal risk indicators
    VERY_LOW = "very_low"        # <30% - Legitimate transaction likely


@dataclass
class EvidenceAssessment:
    """Comprehensive evidence quality assessment"""
    overall_quality: float
    quality_level: EvidenceQualityLevel
    snowflake_quality: float
    tools_quality: float
    domains_quality: float
    evidence_sources: List[str]
    quality_factors: Dict[str, float]
    validation_passed: bool
    validation_reason: str


@dataclass
class RiskAssessment:
    """Comprehensive risk analysis results"""
    final_risk_score: float
    fraud_likelihood: FraudLikelihood
    risk_factors: List[str]
    risk_indicators: List[Dict[str, Any]]
    confidence_score: float
    mitigation_recommendations: List[str]


@dataclass
class PerformanceMetrics:
    """Investigation performance and efficiency metrics"""
    total_duration_ms: int
    orchestrator_loops: int
    domains_completed: int
    tools_executed: int
    investigation_efficiency: float
    resource_utilization: str
    optimization_applied: bool


@dataclass
class AIIntelligenceMetrics:
    """AI decision and intelligence tracking"""
    final_confidence: float
    confidence_level: AIConfidenceLevel
    ai_decisions_count: int
    strategy_used: InvestigationStrategy
    safety_overrides: int
    confidence_evolution: List[Dict[str, Any]]


@dataclass
class QualityAssurance:
    """Investigation quality and compliance tracking"""
    validation_checks_passed: int
    validation_checks_failed: int
    safety_concerns_raised: int
    data_quality_score: float
    compliance_status: str
    audit_trail: List[Dict[str, Any]]


@dataclass
class CanonicalFinalOutcome:
    """
    Canonical final outcome structure for all hybrid investigations.
    
    This is the unified result format that all completion paths must produce,
    ensuring consistent investigation outcomes regardless of how they complete.
    """
    
    # Investigation Identification
    investigation_id: str
    entity_id: str
    entity_type: str
    completion_timestamp: str
    
    # Overall Status
    status: InvestigationStatus
    success: bool
    completion_reason: str
    
    # Risk and Fraud Assessment
    risk_assessment: RiskAssessment
    
    # Evidence Quality
    evidence_assessment: EvidenceAssessment
    
    # Performance Tracking
    performance_metrics: PerformanceMetrics
    
    # AI Intelligence Analysis
    ai_intelligence: AIIntelligenceMetrics
    
    # Quality Assurance
    quality_assurance: QualityAssurance
    
    # Investigation Summary
    summary_text: str
    key_findings: List[str]
    recommendations: List[str]
    
    # System Metadata
    hybrid_system_version: str
    graph_selection_reason: str
    feature_flags_active: List[str] = field(default_factory=list)
    
    # Raw State (for debugging/audit)
    raw_state_snapshot: Optional[Dict[str, Any]] = None


class CanonicalOutcomeBuilder:
    """
    Builder for creating canonical final outcomes from investigation states.
    
    Provides methods to construct unified outcomes from hybrid investigation
    states, ensuring all required fields are populated correctly.
    """
    
    def __init__(self):
        self.evidence_validator = get_evidence_validator()
        
    def build_outcome(
        self,
        state: HybridInvestigationState,
        completion_reason: str = "Investigation completed successfully",
        include_raw_state: bool = False
    ) -> CanonicalFinalOutcome:
        """
        Build a canonical final outcome from investigation state.
        
        Args:
            state: Complete investigation state
            completion_reason: Reason for investigation completion
            include_raw_state: Whether to include raw state for debugging
            
        Returns:
            Canonical final outcome structure
        """
        logger.debug(f"Building canonical outcome for investigation {state.get('investigation_id')}")
        
        # Determine investigation status
        status = self._determine_investigation_status(state, completion_reason)
        
        # Build all assessment components
        risk_assessment = self._build_risk_assessment(state)
        evidence_assessment = self._build_evidence_assessment(state)
        performance_metrics = self._build_performance_metrics(state)
        ai_intelligence = self._build_ai_intelligence_metrics(state)
        quality_assurance = self._build_quality_assurance(state)
        
        # Generate summary and findings
        summary_text = self._generate_summary_text(state)
        key_findings = self._extract_key_findings(state)
        recommendations = self._generate_recommendations(state, risk_assessment)
        
        outcome = CanonicalFinalOutcome(
            # Investigation Identification
            investigation_id=state.get("investigation_id", "unknown"),
            entity_id=state.get("entity_id", "unknown"),
            entity_type=state.get("entity_type", "unknown"),
            completion_timestamp=datetime.now().isoformat(),
            
            # Overall Status
            status=status,
            success=status in [InvestigationStatus.COMPLETED, InvestigationStatus.COMPLETED_WITH_WARNINGS],
            completion_reason=completion_reason,
            
            # Assessments
            risk_assessment=risk_assessment,
            evidence_assessment=evidence_assessment,
            performance_metrics=performance_metrics,
            ai_intelligence=ai_intelligence,
            quality_assurance=quality_assurance,
            
            # Summary
            summary_text=summary_text,
            key_findings=key_findings,
            recommendations=recommendations,
            
            # System Metadata
            hybrid_system_version=state.get("hybrid_system_version", "1.0.0"),
            graph_selection_reason=state.get("graph_selection_reason", "Hybrid intelligence selected"),
            feature_flags_active=state.get("feature_flags_active", []),
            
            # Raw State (optional)
            raw_state_snapshot=dict(state) if include_raw_state else None
        )
        
        logger.info(f"✅ Canonical outcome built: {status.value} for {state.get('investigation_id')}")
        return outcome
    
    def _determine_investigation_status(self, state: HybridInvestigationState, completion_reason: str) -> InvestigationStatus:
        """Determine the overall investigation status."""
        current_phase = state.get("current_phase", "unknown")
        safety_overrides = len(state.get("safety_overrides", []))
        errors = state.get("errors", [])
        
        if "timeout" in completion_reason.lower():
            return InvestigationStatus.TIMEOUT
        elif "safety" in completion_reason.lower():
            return InvestigationStatus.TERMINATED_BY_SAFETY
        elif errors or current_phase == "error":
            return InvestigationStatus.FAILED
        elif safety_overrides > 0 or current_phase == "summary":
            return InvestigationStatus.COMPLETED_WITH_WARNINGS
        else:
            return InvestigationStatus.COMPLETED
    
    def _build_risk_assessment(self, state: HybridInvestigationState) -> RiskAssessment:
        """Build risk assessment from investigation state."""
        from app.service.agent.orchestration.metrics.safe import coerce_float
        risk_score = coerce_float(state.get("risk_score"), 0.0)
        
        # Determine fraud likelihood
        if risk_score >= 0.9:
            fraud_likelihood = FraudLikelihood.VERY_HIGH
        elif risk_score >= 0.7:
            fraud_likelihood = FraudLikelihood.HIGH
        elif risk_score >= 0.5:
            fraud_likelihood = FraudLikelihood.MODERATE
        elif risk_score >= 0.3:
            fraud_likelihood = FraudLikelihood.LOW
        else:
            fraud_likelihood = FraudLikelihood.VERY_LOW
        
        return RiskAssessment(
            final_risk_score=risk_score,
            fraud_likelihood=fraud_likelihood,
            risk_factors=state.get("risk_factors", []),
            risk_indicators=state.get("risk_indicators", []),
            confidence_score=float(state.get("ai_confidence", 0.0)),
            mitigation_recommendations=self._generate_mitigation_recommendations(risk_score)
        )
    
    def _build_evidence_assessment(self, state: HybridInvestigationState) -> EvidenceAssessment:
        """Build evidence assessment from investigation state."""
        # Get evidence quality from latest AI decision or calculate default
        evidence_quality = 0.0
        if state.get("ai_decisions"):
            # CRITICAL FIX: Safe attribute access to prevent None formatting errors
            ai_decision = state["ai_decisions"][-1]
            evidence_quality = getattr(ai_decision, 'evidence_quality', 0.0) if ai_decision else 0.0
            evidence_quality = evidence_quality if evidence_quality is not None else 0.0
        
        # Validate evidence
        domains_completed = len(state.get("domains_completed", []))
        tools_used = len(state.get("tools_used", []))
        strategy = state.get("investigation_strategy", InvestigationStrategy.ADAPTIVE).value
        
        validation_passed, validation_reason, _ = self.evidence_validator.validate_evidence_for_completion(
            evidence_quality, domains_completed, tools_used, strategy
        )
        
        return EvidenceAssessment(
            overall_quality=evidence_quality,
            quality_level=self.evidence_validator.get_evidence_quality_level(evidence_quality),
            snowflake_quality=float(state.get("snowflake_quality", 0.0)),
            tools_quality=float(state.get("tools_quality", 0.0)),
            domains_quality=float(state.get("domains_quality", 0.0)),
            evidence_sources=self._extract_evidence_sources(state),
            quality_factors=state.get("confidence_factors", {}),
            validation_passed=validation_passed,
            validation_reason=validation_reason
        )
    
    def _build_performance_metrics(self, state: HybridInvestigationState) -> PerformanceMetrics:
        """Build performance metrics from investigation state."""
        return PerformanceMetrics(
            total_duration_ms=int(state.get("total_duration_ms", 0)),
            orchestrator_loops=int(state.get("orchestrator_loops", 0)),
            domains_completed=len(state.get("domains_completed", [])),
            tools_executed=len(state.get("tools_used", [])),
            investigation_efficiency=float(state.get("investigation_efficiency", 0.0)),
            resource_utilization=self._assess_resource_utilization(state),
            optimization_applied=state.get("ai_confidence", 0.0) > 0.8
        )
    
    def _build_ai_intelligence_metrics(self, state: HybridInvestigationState) -> AIIntelligenceMetrics:
        """Build AI intelligence metrics from investigation state."""
        return AIIntelligenceMetrics(
            final_confidence=float(state.get("ai_confidence", 0.0)),
            confidence_level=state.get("ai_confidence_level", AIConfidenceLevel.UNKNOWN),
            ai_decisions_count=len(state.get("ai_decisions", [])),
            strategy_used=state.get("investigation_strategy", InvestigationStrategy.ADAPTIVE),
            safety_overrides=len(state.get("safety_overrides", [])),
            confidence_evolution=state.get("confidence_evolution", [])
        )
    
    def _build_quality_assurance(self, state: HybridInvestigationState) -> QualityAssurance:
        """Build quality assurance metrics from investigation state."""
        quality_gates = state.get("quality_gates_passed", [])
        safety_concerns = len(state.get("safety_concerns", []))
        
        return QualityAssurance(
            validation_checks_passed=len(quality_gates),
            validation_checks_failed=0,  # Could be calculated from errors
            safety_concerns_raised=safety_concerns,
            data_quality_score=float(state.get("evidence_strength", 0.0)),
            compliance_status="compliant" if safety_concerns == 0 else "concerns_noted",
            audit_trail=state.get("decision_audit_trail", [])
        )
    
    def _generate_summary_text(self, state: HybridInvestigationState) -> str:
        """Generate human-readable summary text."""
        investigation_id = state.get("investigation_id", "Unknown")
        entity_id = state.get("entity_id", "unknown")
        risk_score = state.get("risk_score", 0.0)
        confidence = state.get("ai_confidence", 0.0)
        
        risk_score_safe = risk_score if risk_score is not None else 0.0
        confidence_safe = confidence if confidence is not None else 0.0
        return f"Investigation {investigation_id} for entity {entity_id} completed with risk score {risk_score_safe:.2f} and AI confidence {confidence_safe:.2f}."
    
    def _extract_key_findings(self, state: HybridInvestigationState) -> List[str]:
        """Extract key findings from investigation state."""
        findings = []
        
        # Add risk indicators as findings
        risk_indicators = state.get("risk_indicators", [])
        for indicator in risk_indicators[:5]:  # Top 5 findings
            findings.append(f"Risk indicator: {indicator}")
        
        # Add domain completion status
        domains_completed = len(state.get("domains_completed", []))
        findings.append(f"Analyzed {domains_completed}/6 investigation domains")
        
        # Add tools execution status
        tools_used = len(state.get("tools_used", []))
        if tools_used > 0:
            findings.append(f"Successfully executed {tools_used} analysis tools")
        
        return findings
    
    def _generate_recommendations(self, state: HybridInvestigationState, risk_assessment: RiskAssessment) -> List[str]:
        """Generate actionable recommendations based on investigation results."""
        recommendations = []
        
        # Risk-based recommendations
        if risk_assessment.fraud_likelihood in [FraudLikelihood.VERY_HIGH, FraudLikelihood.HIGH]:
            recommendations.append("Immediate manual review recommended")
            recommendations.append("Consider blocking or flagging transaction")
        elif risk_assessment.fraud_likelihood == FraudLikelihood.MODERATE:
            recommendations.append("Additional verification steps recommended")
        
        # Evidence-based recommendations
        evidence_quality = risk_assessment.confidence_score
        if evidence_quality < 0.6:
            recommendations.append("Consider gathering additional evidence before final decision")
        
        return recommendations
    
    def _generate_mitigation_recommendations(self, risk_score: float) -> List[str]:
        """Generate risk mitigation recommendations."""
        if risk_score >= 0.8:
            return ["Immediate action required", "Block transaction", "Manual investigation"]
        elif risk_score >= 0.6:
            return ["Enhanced monitoring", "Additional verification", "Flag for review"]
        elif risk_score >= 0.4:
            return ["Standard monitoring", "Periodic review"]
        else:
            return ["No immediate action required", "Continue standard processing"]
    
    def _extract_evidence_sources(self, state: HybridInvestigationState) -> List[str]:
        """Extract list of evidence sources used."""
        sources = []
        
        if state.get("snowflake_completed"):
            sources.append("Snowflake")
        
        tools_used = state.get("tools_used", [])
        sources.extend(tools_used)
        
        domains_completed = state.get("domains_completed", [])
        sources.extend([f"{domain}_analysis" for domain in domains_completed])
        
        return list(set(sources))  # Remove duplicates
    
    def _assess_resource_utilization(self, state: HybridInvestigationState) -> str:
        """Assess resource utilization efficiency."""
        safety_overrides = len(state.get("safety_overrides", []))
        loops = state.get("orchestrator_loops", 0)
        
        if safety_overrides == 0 and loops <= 10:
            return "Efficient"
        elif safety_overrides <= 2 and loops <= 15:
            return "Good"
        else:
            return "Required Intervention"


def build_canonical_outcome(
    state: HybridInvestigationState,
    completion_reason: str = "Investigation completed successfully",
    include_raw_state: bool = False
) -> CanonicalFinalOutcome:
    """
    Convenience function to build canonical outcome from investigation state.
    
    Args:
        state: Complete investigation state
        completion_reason: Reason for investigation completion
        include_raw_state: Whether to include raw state for debugging
        
    Returns:
        Canonical final outcome structure
    """
    builder = CanonicalOutcomeBuilder()
    return builder.build_outcome(state, completion_reason, include_raw_state)


def outcome_to_dict(outcome: CanonicalFinalOutcome) -> Dict[str, Any]:
    """Convert canonical outcome to dictionary format."""
    return asdict(outcome)