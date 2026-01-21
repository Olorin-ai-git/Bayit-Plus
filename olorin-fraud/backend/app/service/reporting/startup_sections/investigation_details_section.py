"""Investigation Details Section for Startup Reports."""

import logging
from typing import Any, Dict, List

from .investigation_details_helpers import (
    build_domain_analysis_html,
    build_executions_html,
    build_journey_html,
    build_tools_html,
)
from .text_formatters import format_investigation_summary

logger = logging.getLogger(__name__)


def generate_investigation_details_section(data: Dict[str, Any]) -> str:
    """Generate detailed investigation journey and reasoning section."""
    comp_data = data["auto_comparisons"]
    investigation_summaries = comp_data.get("investigation_summaries", [])

    if not investigation_summaries:
        return ""

    unique_summaries = _deduplicate_summaries(investigation_summaries)
    detail_sections = [_build_investigation_card(i, inv) for i, inv in enumerate(unique_summaries, 1)]
    detail_sections = [s for s in detail_sections if s]

    if not detail_sections:
        return ""

    return f"""
    <div class="panel" style="margin-top: 32px; border: 2px solid var(--accent);">
      <h2 style="color: var(--accent); margin-bottom: 16px;">Detailed Investigation Analysis</h2>
      <p style="color: var(--muted); margin-bottom: 24px; font-size: 14px; line-height: 1.6;">
        Comprehensive breakdown of each investigation, including the journey, tools used,
        domain analysis with evidence, and how final risk scores were calculated.
      </p>
      {''.join(detail_sections)}
    </div>
    """


def _deduplicate_summaries(summaries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Remove duplicate investigation summaries by investigation_id."""
    seen_ids = {}
    unique = []
    for inv in summaries:
        inv_id = inv.get("investigation_id")
        if inv_id and inv_id not in seen_ids:
            seen_ids[inv_id] = True
            unique.append(inv)
        elif not inv_id:
            unique.append(inv)
    if len(unique) < len(summaries):
        logger.debug(f"Deduplicated investigation summaries: {len(summaries)} -> {len(unique)}")
    return unique


def _build_investigation_card(index: int, inv_summary: Dict[str, Any]) -> str:
    """Build HTML card for a single investigation."""
    investigation_id = inv_summary.get("investigation_id")
    entity = inv_summary.get("entity", {})
    entity_id = entity.get("value", "unknown")
    investigation_risk_score = inv_summary.get("investigation_risk_score")
    investigation_status = inv_summary.get("investigation_status", "N/A")
    domain_findings = inv_summary.get("domain_findings", {})
    summary = inv_summary.get("summary", "")

    risk_score_display = f"{investigation_risk_score:.3f}" if investigation_risk_score is not None else "N/A"
    risk_color = _get_risk_color(investigation_risk_score)

    journey_html = build_journey_html(inv_summary)
    tools_html = build_tools_html(inv_summary.get("tools_used", []))
    executions_html = build_executions_html(inv_summary.get("tool_executions", []))
    domain_analysis_html = build_domain_analysis_html(domain_findings)
    risk_explanation = _build_risk_explanation(investigation_risk_score, domain_findings, summary)

    return f"""
    <div class="panel" style="margin-bottom: 32px; border: 2px solid var(--border);">
      <h2 style="margin-bottom: 8px; color: var(--accent);">Investigation {index}: {entity_id}</h2>
      <p style="color: var(--muted); margin-bottom: 16px; font-size: 13px;">
        Investigation ID: <code style="background: var(--chip); padding: 2px 6px; border-radius: 4px; font-size: 12px;">{investigation_id}</code> |
        Status: <strong>{investigation_status}</strong> |
        Final Risk Score: <strong style="color: {risk_color}; font-size: 16px;">{risk_score_display}</strong>
      </p>

      <div style="margin-bottom: 24px; padding: 12px; background: var(--panel-glass); border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: var(--muted);">Investigation Journey</h3>
        <div style="font-size: 13px; line-height: 1.8;">{journey_html}</div>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: var(--muted);">Tools & Execution Timeline</h3>
        {tools_html}
        {executions_html if executions_html else ''}
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: var(--muted);">Domain Analysis & Reasoning</h3>
        <p style="color: var(--muted); margin-bottom: 16px; font-size: 13px; line-height: 1.6;">
          Detailed analysis of each domain with evidence, risk indicators, and LLM reasoning.
        </p>
        {domain_analysis_html}
      </div>

      {risk_explanation}
    </div>
    """


def _get_risk_color(score: float) -> str:
    """Get CSS color based on risk score."""
    if score is None:
        return "var(--muted)"
    if score >= 0.5:
        return "var(--danger)"
    if score < 0.3:
        return "var(--ok)"
    return "var(--warn)"


def _build_risk_explanation(score: float, domain_findings: Dict[str, Any], summary: str) -> str:
    """Build final risk assessment explanation section."""
    if score is None:
        return ""

    risk_level = "High" if score >= 0.7 else "Medium" if score >= 0.4 else "Low"
    risk_color = _get_risk_color(score)
    risk_score_display = f"{score:.3f}"

    domain_order = ["merchant", "location", "authentication", "device", "network", "logs", "risk"]
    domain_scores = []
    for domain_name in domain_order:
        if domain_name in domain_findings and isinstance(domain_findings[domain_name], dict):
            domain_score = domain_findings[domain_name].get("risk_score")
            if domain_score is not None:
                domain_scores.append((domain_name, domain_score))

    formatted_summary = format_investigation_summary(summary) if summary else ""

    domain_list = ""
    if domain_scores:
        items = "".join([f'<li style="margin: 4px 0;"><strong>{n.capitalize()}:</strong> {s:.3f}</li>' for n, s in domain_scores[:7]])
        domain_list = f'<div style="margin: 12px 0;"><strong>Domain Contributions:</strong><ul style="margin: 8px 0; padding-left: 20px; font-size: 13px;">{items}</ul></div>'

    summary_html = ""
    if formatted_summary:
        summary_html = f'<div style="margin: 12px 0; padding: 12px; background: rgba(168, 85, 247, 0.1); border-radius: 8px; border-left: 3px solid var(--accent);"><strong>Investigation Summary:</strong><div style="margin: 8px 0; font-size: 13px; line-height: 1.6;">{formatted_summary}</div></div>'

    return f"""
    <div style="margin: 16px 0; padding: 16px; background: var(--panel-glass); border-radius: 12px; border-left: 4px solid {risk_color};">
      <h4 style="margin: 0 0 12px 0; color: {risk_color}; font-size: 16px;">Final Risk Assessment: {risk_level} Risk ({risk_score_display})</h4>
      <p style="margin: 8px 0; font-size: 13px;">The final risk score of <strong>{risk_score_display}</strong> was calculated based on comprehensive analysis across {len(domain_scores)} domain(s).</p>
      {domain_list}
      {summary_html}
    </div>
    """
