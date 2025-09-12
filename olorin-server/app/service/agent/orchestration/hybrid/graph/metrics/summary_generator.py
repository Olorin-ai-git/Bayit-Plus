"""
Summary Generator - Comprehensive summary generation for hybrid intelligence.

This module generates comprehensive investigation summaries with hybrid intelligence
reporting, including AI decisions, safety overrides, and performance metrics.
"""

from typing import Dict, Any

from ...hybrid_state_schema import HybridInvestigationState, AIConfidenceLevel
from ....metrics.safe import safe_div, safe_gt, coerce_float, fmt_num

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
        # Ensure duration is calculated to prevent NoneType division
        self._ensure_duration(state)
        duration_ms = int(state.get("total_duration_ms", 0))
        
        return {
            "investigation_id": state.get("investigation_id", "Unknown"),
            "entity_type": state.get("entity_type", "unknown"),
            "entity_id": state.get("entity_id", "unknown"),
            "final_confidence": state.get("ai_confidence", 0.0),
            "confidence_level": state.get("ai_confidence_level", AIConfidenceLevel.UNKNOWN).value,
            "strategy": self._get_strategy_value(state.get("investigation_strategy", "unknown")),
            "orchestrator_loops": state.get("orchestrator_loops", 0),
            "domains_completed": len(state.get("domains_completed", [])),
            "tools_used": len(state.get("tool_results", {})),  # Only count tools with actual results
            "safety_overrides": len(state.get("safety_overrides", [])),
            "risk_score": state.get("risk_score", 0.0),
            "risk_indicators": state.get("risk_indicators", []),
            "duration_ms": duration_ms,
            "efficiency": state.get("investigation_efficiency", 0.0),
            "ai_decisions": state.get("ai_decisions", []),
            "current_phase": state.get("current_phase", "unknown"),
            "hybrid_system_version": state.get("hybrid_system_version", "1.0.0")
        }
    
    def _get_strategy_value(self, strategy):
        """Get strategy value handling both enum and string types."""
        return strategy.value if hasattr(strategy, 'value') else str(strategy)
    
    def _ensure_duration(self, state: HybridInvestigationState) -> None:
        """
        Harden summary preflight - ensure duration without breaking on missing data.
        
        Authoritative: prefer timer; else compute best-effort; else 0.
        No asserts that can kill reporting.
        """
        if state.get("total_duration_ms") is not None:
            return  # Already set, trust it
            
        # Try internal timer first (most authoritative)
        timer_elapsed = state.get("_timer_elapsed_ms")
        if timer_elapsed is not None:
            state["total_duration_ms"] = int(timer_elapsed)
            return
            
        # Fallback: compute from timestamps if available
        start_time = state.get("start_time")
        end_time = state.get("end_time")
        if start_time and end_time:
            try:
                from datetime import datetime, timezone
                
                # Handle various ISO format variations
                start_str = start_time.replace('Z', '+00:00') if 'Z' in str(start_time) else str(start_time)
                end_str = end_time.replace('Z', '+00:00') if 'Z' in str(end_time) else str(end_time)
                
                dt_start = datetime.fromisoformat(start_str)
                dt_end = datetime.fromisoformat(end_str)
                
                # Ensure timezone awareness
                if dt_start.tzinfo is None:
                    dt_start = dt_start.replace(tzinfo=timezone.utc)
                if dt_end.tzinfo is None:
                    dt_end = dt_end.replace(tzinfo=timezone.utc)
                
                duration_ms = max(int((dt_end - dt_start).total_seconds() * 1000), 0)
                state["total_duration_ms"] = duration_ms
                return
                
            except Exception as e:
                logger.debug(f"Timestamp duration calculation failed: {e}")
        
        # Ultimate fallback: set to 0 (no crash)
        state["total_duration_ms"] = 0
    
    def _generate_header(self) -> str:
        """Generate summary header."""
        return "# Hybrid Intelligence Investigation Summary\n"
    
    def _generate_investigation_details(self, data: Dict[str, Any]) -> str:
        """Generate investigation details section."""
        duration_ms = data['duration_ms']
        duration_seconds = safe_div(duration_ms, 1000, 0.0)
        
        return f"""## Investigation Details
- **Investigation ID**: {data['investigation_id']}
- **Entity**: {data['entity_type']} - {data['entity_id']}
- **Duration**: {duration_ms}ms ({fmt_num(duration_seconds, 1)} seconds)
- **Investigation Strategy**: {data['strategy']}
"""
    
    def _generate_ai_intelligence_analysis(self, data: Dict[str, Any]) -> str:
        """Generate AI intelligence analysis section."""
        strategy_effectiveness = self._get_strategy_effectiveness(data['efficiency'])
        
        return f"""## AI Intelligence Analysis
- **Final Confidence**: {fmt_num(data['final_confidence'], 3)} ({data['confidence_level']})
- **Orchestrator Loops**: {data['orchestrator_loops']}
- **Strategy Effectiveness**: {strategy_effectiveness}
- **Investigation Efficiency**: {fmt_num(data['efficiency'], 3)}
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
- **Risk Score**: {fmt_num(data['risk_score'], 3)}
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
        
        # CRITICAL FIX: Safe attribute access to prevent None formatting errors
        evidence_quality = getattr(final_decision, 'evidence_quality', 0.0) if final_decision else 0.0
        investigation_completeness = getattr(final_decision, 'investigation_completeness', 0.0) if final_decision else 0.0
        resource_impact = getattr(final_decision, 'resource_impact', 'Unknown') if final_decision else 'Unknown'
        strategy_value = getattr(final_decision, 'strategy', None)
        strategy_str = getattr(strategy_value, 'value', 'Unknown') if strategy_value else 'Unknown'
        
        return f"""## AI Decision Analysis
- **Evidence Quality**: {fmt_num(evidence_quality, 3)}
- **Investigation Completeness**: {fmt_num(investigation_completeness, 3)}
- **Resource Impact**: {resource_impact}
- **Strategy Recommendation**: {strategy_str}
"""
    
    def _generate_performance_insights(self, data: Dict[str, Any]) -> str:
        """Generate performance insights section."""
        # CRITICAL FIX: Use safe_gt to prevent None comparison crashes
        optimization_type = "AI-Optimized" if safe_gt(data['final_confidence'], 0.7) else "Safety-First"
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
        # CRITICAL FIX: Preserve None values - efficiency metrics should not be coerced
        if efficiency is None:
            return "N/A"
        
        try:
            efficiency = float(efficiency) if efficiency is not None else None
        except (TypeError, ValueError):
            return "N/A"
            
        if efficiency is None:
            return "N/A"
            
        if safe_gt(efficiency, 0.7):
            return "High"
        elif safe_gt(efficiency, 0.4):
            return "Medium"
        else:
            return "Low"
    
    def _get_fraud_likelihood(self, risk_score: float) -> str:
        """Get fraud likelihood description based on risk score."""
        # CRITICAL FIX: Preserve None values - don't coerce blocked risk scores to 0.0
        if risk_score is None:
            return "N/A"  # Respect evidence gating decisions
        
        # Convert to float safely for valid values only
        try:
            risk_score = float(risk_score) if risk_score is not None else None
        except (TypeError, ValueError):
            return "N/A"  # Invalid values should not become 0.0
            
        if risk_score is None:
            return "N/A"
            
        if safe_gt(risk_score, 0.7):
            return "High"
        elif safe_gt(risk_score, 0.4):
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