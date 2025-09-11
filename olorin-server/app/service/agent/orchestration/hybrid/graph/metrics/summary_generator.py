"""
Summary Generator - Comprehensive summary generation for hybrid intelligence.

This module generates comprehensive investigation summaries with hybrid intelligence
reporting, including AI decisions, safety overrides, and performance metrics.
"""

from typing import Dict, Any

from ...hybrid_state_schema import HybridInvestigationState, AIConfidenceLevel

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class SummaryGenerator:
    """
    Generates comprehensive hybrid intelligence investigation summaries.
    
    Creates detailed summaries including AI analysis, performance metrics,
    risk assessment, and investigation coverage information.
    """
    
    def __init__(self, components: Dict[str, Any]):
        """Initialize with graph foundation components."""
        self.components = components
        self.intelligence_mode = components.get("intelligence_mode", "adaptive")
        
    def generate_hybrid_summary(self, state: HybridInvestigationState) -> str:
        """
        Generate comprehensive hybrid intelligence summary.
        
        Args:
            state: Current investigation state
            
        Returns:
            Comprehensive investigation summary as formatted string
        """
        # Collect key metrics and information
        summary_data = self._collect_summary_data(state)
        
        # Build comprehensive summary
        summary_parts = [
            self._generate_header(),
            self._generate_investigation_details(summary_data),
            self._generate_ai_intelligence_analysis(summary_data),
            self._generate_investigation_coverage(summary_data),
            self._generate_risk_assessment(summary_data),
            self._generate_safety_compliance(summary_data)
        ]
        
        # Add optional sections based on available data
        if summary_data["risk_indicators"]:
            summary_parts.append(self._generate_risk_indicators(summary_data))
            
        if summary_data["ai_decisions"]:
            summary_parts.append(self._generate_ai_decision_analysis(summary_data))
            
        # Add performance insights
        summary_parts.extend([
            self._generate_performance_insights(summary_data),
            self._generate_footer()
        ])
        
        return "\n".join(summary_parts)
    
    def _collect_summary_data(self, state: HybridInvestigationState) -> Dict[str, Any]:
        """Collect all data needed for summary generation."""
        return {
            "investigation_id": state.get("investigation_id", "Unknown"),
            "entity_type": state.get("entity_type", "unknown"),
            "entity_id": state.get("entity_id", "unknown"),
            "final_confidence": state.get("ai_confidence", 0.0),
            "confidence_level": state.get("ai_confidence_level", AIConfidenceLevel.UNKNOWN).value,
            "strategy": self._get_strategy_value(state.get("investigation_strategy", "unknown")),
            "orchestrator_loops": state.get("orchestrator_loops", 0),
            "domains_completed": len(state.get("domains_completed", [])),
            "tools_used": len(state.get("tools_used", [])),
            "safety_overrides": len(state.get("safety_overrides", [])),
            "risk_score": state.get("risk_score", 0.0),
            "risk_indicators": state.get("risk_indicators", []),
            "duration_ms": state.get("total_duration_ms", 0),
            "efficiency": state.get("investigation_efficiency", 0.0),
            "ai_decisions": state.get("ai_decisions", []),
            "current_phase": state.get("current_phase", "unknown"),
            "hybrid_system_version": state.get("hybrid_system_version", "1.0.0")
        }
    
    def _get_strategy_value(self, strategy):
        """Get strategy value handling both enum and string types."""
        return strategy.value if hasattr(strategy, 'value') else str(strategy)
    
    def _generate_header(self) -> str:
        """Generate summary header."""
        return "# Hybrid Intelligence Investigation Summary\n"
    
    def _generate_investigation_details(self, data: Dict[str, Any]) -> str:
        """Generate investigation details section."""
        return f"""## Investigation Details
- **Investigation ID**: {data['investigation_id']}
- **Entity**: {data['entity_type']} - {data['entity_id']}
- **Duration**: {data['duration_ms']}ms ({data['duration_ms']/1000:.1f} seconds)
- **Investigation Strategy**: {data['strategy']}
"""
    
    def _generate_ai_intelligence_analysis(self, data: Dict[str, Any]) -> str:
        """Generate AI intelligence analysis section."""
        strategy_effectiveness = self._get_strategy_effectiveness(data['efficiency'])
        
        return f"""## AI Intelligence Analysis
- **Final Confidence**: {data['final_confidence']:.3f} ({data['confidence_level']})
- **Orchestrator Loops**: {data['orchestrator_loops']}
- **Strategy Effectiveness**: {strategy_effectiveness}
- **Investigation Efficiency**: {data['efficiency']:.3f}
"""
    
    def _generate_investigation_coverage(self, data: Dict[str, Any]) -> str:
        """Generate investigation coverage section."""
        data_sources = "Snowflake" + (", Additional Tools" if data['tools_used'] > 0 else "")
        
        return f"""## Investigation Coverage
- **Domains Analyzed**: {data['domains_completed']}/6
- **Tools Utilized**: {data['tools_used']}
- **Data Sources**: {data_sources}
"""
    
    def _generate_risk_assessment(self, data: Dict[str, Any]) -> str:
        """Generate risk assessment section."""
        fraud_likelihood = self._get_fraud_likelihood(data['risk_score'])
        
        return f"""## Risk Assessment
- **Risk Score**: {data['risk_score']:.3f}
- **Risk Indicators**: {len(data['risk_indicators'])}
- **Fraud Likelihood**: {fraud_likelihood}
"""
    
    def _generate_safety_compliance(self, data: Dict[str, Any]) -> str:
        """Generate safety and compliance section."""
        completion_status = "Successfully" if data['current_phase'] == 'complete' else "With Issues"
        resource_utilization = "Efficient" if data['safety_overrides'] == 0 else "Required Safety Intervention"
        
        return f"""## Safety and Compliance
- **Safety Overrides**: {data['safety_overrides']}
- **Investigation Completed**: {completion_status}
- **Resource Utilization**: {resource_utilization}
"""
    
    def _generate_risk_indicators(self, data: Dict[str, Any]) -> str:
        """Generate risk indicators section."""
        indicators_section = ["## Identified Risk Indicators", ""]
        
        for indicator in data['risk_indicators'][:5]:  # Show top 5
            indicators_section.append(f"- {indicator}")
        indicators_section.append("")
        
        return "\n".join(indicators_section)
    
    def _generate_ai_decision_analysis(self, data: Dict[str, Any]) -> str:
        """Generate AI decision analysis section."""
        final_decision = data['ai_decisions'][-1]
        
        return f"""## AI Decision Analysis
- **Evidence Quality**: {final_decision.evidence_quality:.3f}
- **Investigation Completeness**: {final_decision.investigation_completeness:.3f}
- **Resource Impact**: {final_decision.resource_impact}
- **Strategy Recommendation**: {final_decision.strategy.value}
"""
    
    def _generate_performance_insights(self, data: Dict[str, Any]) -> str:
        """Generate performance insights section."""
        optimization_type = "AI-Optimized" if data['final_confidence'] > 0.7 else "Safety-First"
        resource_efficiency = "Excellent" if data['safety_overrides'] == 0 else "Good with Safety Controls"
        
        return f"""## Performance Insights
- **System**: Hybrid Intelligence Graph v{data['hybrid_system_version']}
- **Intelligence Mode**: {self.intelligence_mode}
- **Optimization**: {optimization_type}
- **Resource Efficiency**: {resource_efficiency}
"""
    
    def _generate_footer(self) -> str:
        """Generate summary footer."""
        return """
---
*Generated by Hybrid Intelligence Graph System*"""
    
    def _get_strategy_effectiveness(self, efficiency: float) -> str:
        """Get strategy effectiveness description based on efficiency."""
        if efficiency > 0.7:
            return "High"
        elif efficiency > 0.4:
            return "Medium"
        else:
            return "Low"
    
    def _get_fraud_likelihood(self, risk_score: float) -> str:
        """Get fraud likelihood description based on risk score."""
        if risk_score > 0.7:
            return "High"
        elif risk_score > 0.4:
            return "Medium"
        else:
            return "Low"
    
    def get_summary_metadata(self, state: HybridInvestigationState) -> Dict[str, Any]:
        """Get metadata about the generated summary."""
        return {
            "summary_generated_at": state.get("end_time"),
            "investigation_duration_ms": state.get("total_duration_ms", 0),
            "summary_sections": [
                "investigation_details",
                "ai_intelligence_analysis", 
                "investigation_coverage",
                "risk_assessment",
                "safety_compliance",
                "performance_insights"
            ],
            "optional_sections_included": {
                "risk_indicators": bool(state.get("risk_indicators", [])),
                "ai_decision_analysis": bool(state.get("ai_decisions", []))
            }
        }