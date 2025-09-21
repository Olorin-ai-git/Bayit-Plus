"""
Summary Generator

Generates comprehensive investigation summaries.
"""

from datetime import datetime
from typing import Dict, Any

from app.service.logging import get_bridge_logger
from .data_formatters import SummaryDataFormatters

logger = get_bridge_logger(__name__)


class SummaryGenerator:
    """Generates comprehensive investigation summaries."""

    @staticmethod
    def generate_investigation_summary_with_llm(state: Dict[str, Any], llm_assessment: Dict[str, Any]) -> str:
        """Generate comprehensive investigation summary with LLM reasoning."""
        risk_score = llm_assessment.get("risk_score", 0.5)
        confidence = llm_assessment.get("confidence", 0.5)

        # Calculate duration
        duration_ms = SummaryGenerator._calculate_duration(state)

        summary = f"""# Investigation Summary

## Entity Analysis
- **Entity Type**: {state.get('entity_type', 'Unknown')}
- **Entity ID**: {state.get('entity_id', 'Unknown')}
- **Investigation ID**: {state.get('investigation_id', 'Unknown')}

## Risk Assessment
- **Risk Score**: {risk_score:.3f} ({SummaryGenerator._get_risk_level(risk_score)})
- **Confidence**: {confidence:.3f}

## Key Findings
{SummaryDataFormatters.format_domain_findings(state.get('domain_findings', {}))}

## Risk Indicators
{SummaryDataFormatters.format_risk_indicators(state.get('risk_indicators', []))}

## Recommendation
{SummaryGenerator._get_recommendation(risk_score)}

## Investigation Metadata
- **Analysis Period**: {state.get('date_range_days', 7)} days
- **Tools Used**: {len(state.get('tools_used', []))}
- **Domains Analyzed**: {len(state.get('domains_completed', []))}
- **Total Duration**: {duration_ms}ms

## Detailed LLM Analysis
{llm_assessment.get('reasoning', 'No detailed reasoning available')}
"""

        return summary

    @staticmethod
    def _calculate_duration(state: Dict[str, Any]) -> int:
        """Calculate investigation duration in milliseconds."""
        start_time = state.get("start_time")
        if start_time:
            start_dt = datetime.fromisoformat(start_time)
            end_dt = datetime.utcnow()
            return int((end_dt - start_dt).total_seconds() * 1000)
        return 0

    @staticmethod
    def _get_risk_level(risk_score: float) -> str:
        """Get risk level description from score."""
        if risk_score >= 0.8:
            return "CRITICAL"
        elif risk_score >= 0.6:
            return "HIGH"
        elif risk_score >= 0.4:
            return "MEDIUM"
        elif risk_score >= 0.2:
            return "LOW"
        else:
            return "MINIMAL"

    @staticmethod
    def _get_recommendation(risk_score: float) -> str:
        """Get recommendation based on risk score."""
        if risk_score >= 0.8:
            return "**IMMEDIATE ACTION REQUIRED**: High fraud risk detected. Escalate to security team and consider account suspension."
        elif risk_score >= 0.6:
            return "**ENHANCED MONITORING**: Elevated risk detected. Implement additional verification steps and monitoring."
        elif risk_score >= 0.4:
            return "**STANDARD MONITORING**: Moderate risk detected. Continue standard fraud monitoring procedures."
        elif risk_score >= 0.2:
            return "**LOW RISK**: Minimal risk detected. Standard processing with routine monitoring."
        else:
            return "**MINIMAL RISK**: No significant fraud indicators detected. Standard processing recommended."