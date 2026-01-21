"""Investigation Details Helper Functions for domain analysis HTML generation."""

from typing import Any, Dict, List

from .text_formatters import format_llm_analysis


def build_journey_html(inv_summary: Dict[str, Any]) -> str:
    """Build investigation journey HTML from summary data."""
    journey_items = []
    if inv_summary.get("started_at"):
        journey_items.append(f"<strong>Started:</strong> {inv_summary['started_at']}")
    if inv_summary.get("lifecycle_stage"):
        journey_items.append(f"<strong>Stage:</strong> {inv_summary['lifecycle_stage']}")
    if inv_summary.get("current_phase"):
        journey_items.append(f"<strong>Phase:</strong> {inv_summary['current_phase']}")
    if inv_summary.get("percent_complete"):
        journey_items.append(f"<strong>Progress:</strong> {inv_summary['percent_complete']}%")
    if inv_summary.get("completed_at"):
        journey_items.append(f"<strong>Completed:</strong> {inv_summary['completed_at']}")
    return "<br>".join(journey_items) if journey_items else "No journey data available"


def build_tools_html(tools_used: List[Any]) -> str:
    """Build HTML for tools used section."""
    if not isinstance(tools_used, list) or not tools_used:
        return "<p style='color: var(--muted); font-size: 13px;'>No tools used data available</p>"

    tool_items = []
    for tool in tools_used[:10]:
        tool_name = tool if isinstance(tool, str) else tool.get("tool_name", tool.get("name", str(tool)))
        tool_items.append(
            f"<span style='margin: 4px 8px 4px 0; padding: 6px 12px; border-radius: 6px; "
            f"display: inline-block; background: var(--chip); font-size: 12px;'>{tool_name}</span>"
        )

    result = f"<div style='margin: 12px 0;'>{''.join(tool_items)}</div>"
    if len(tools_used) > 10:
        result += f"<p style='color: var(--muted); font-size: 12px;'>... and {len(tools_used) - 10} more tools</p>"
    return result


def build_executions_html(tool_executions: List[Any]) -> str:
    """Build HTML for tool execution timeline."""
    if not isinstance(tool_executions, list) or not tool_executions:
        return ""

    exec_items = []
    for exec_item in tool_executions[:10]:
        if isinstance(exec_item, dict):
            tool_name = exec_item.get("tool_name", exec_item.get("name", "Unknown"))
            status = exec_item.get("status", exec_item.get("result", "unknown"))
            timestamp = exec_item.get("timestamp", exec_item.get("time", ""))
            exec_items.append(
                f"<li style='margin: 4px 0; font-size: 13px;'><strong>{tool_name}</strong> "
                f"- {status}{f' ({timestamp})' if timestamp else ''}</li>"
            )
        elif isinstance(exec_item, str):
            exec_items.append(f"<li style='margin: 4px 0; font-size: 13px;'>{exec_item}</li>")

    if not exec_items:
        return ""

    result = (f"<div style='margin: 12px 0;'><strong>Tool Execution Timeline:</strong>"
              f"<ul style='margin: 8px 0; padding-left: 20px; font-size: 13px;'>{''.join(exec_items)}</ul></div>")
    if len(tool_executions) > 10:
        result += f"<p style='color: var(--muted); font-size: 12px;'>... and {len(tool_executions) - 10} more</p>"
    return result


def build_evidence_html(evidence: List[Any]) -> str:
    """Build HTML for evidence list."""
    if not isinstance(evidence, list) or not evidence:
        return ""

    evidence_items = []
    for ev in evidence[:5]:
        if isinstance(ev, str):
            text = ev[:200] + ("..." if len(ev) > 200 else "")
        elif isinstance(ev, dict):
            ev_text = str(ev.get("text", ev.get("description", str(ev))))
            text = ev_text[:200] + ("..." if len(ev_text) > 200 else "")
        else:
            continue
        evidence_items.append(f"<li style='margin: 4px 0; padding-left: 8px;'>{text}</li>")

    if not evidence_items:
        return ""

    result = (f"<div style='margin: 8px 0;'><strong>Evidence:</strong>"
              f"<ul style='margin: 8px 0; padding-left: 20px; font-size: 13px;'>{''.join(evidence_items)}</ul></div>")
    if len(evidence) > 5:
        result += f"<p style='color: var(--muted); font-size: 12px; margin-top: 4px;'>... and {len(evidence) - 5} more</p>"
    return result


def build_indicators_html(risk_indicators: List[Any]) -> str:
    """Build HTML for risk indicators."""
    if not isinstance(risk_indicators, list) or not risk_indicators:
        return ""

    indicator_items = []
    for indicator in risk_indicators[:5]:
        text = indicator if isinstance(indicator, str) else indicator.get("type", indicator.get("name", str(indicator)))
        indicator_items.append(
            f"<span style='margin: 2px 4px; padding: 4px 8px; border-radius: 4px; "
            f"display: inline-block; background: var(--chip); font-size: 12px;'>{text}</span>"
        )
    if not indicator_items:
        return ""
    return f"<div style='margin: 8px 0;'><strong>Risk Indicators:</strong><div style='margin: 8px 0;'>{''.join(indicator_items)}</div></div>"


def build_domain_analysis_html(domain_findings: Dict[str, Any]) -> str:
    """Build domain analysis HTML for all domains."""
    domain_order = ["merchant", "location", "authentication", "device", "network", "logs", "risk"]
    domain_analysis = []

    for domain_name in domain_order:
        if domain_name not in domain_findings:
            continue
        domain_data = domain_findings[domain_name]
        if not isinstance(domain_data, dict):
            continue

        domain_html = _build_single_domain_html(domain_name, domain_data)
        if domain_html:
            domain_analysis.append(domain_html)

    return "".join(domain_analysis) if domain_analysis else "<p style='color: var(--muted);'>No domain analysis available</p>"


def _build_single_domain_html(domain_name: str, domain_data: Dict[str, Any]) -> str:
    """Build HTML for a single domain analysis."""
    domain_risk_score = domain_data.get("risk_score")
    llm_analysis = domain_data.get("llm_analysis", "")
    llm_risk_score = domain_data.get("llm_risk_score")
    confidence = domain_data.get("confidence")
    summary_text = domain_data.get("summary", "")
    evidence_summary = domain_data.get("evidence_summary", "")

    # Extract confidence from LLM analysis if fallback value
    if isinstance(llm_analysis, dict) and confidence == 0.25:
        llm_confidence = llm_analysis.get("confidence")
        if isinstance(llm_confidence, (int, float)):
            confidence = min(llm_confidence / 100.0, 1.0) if llm_confidence > 1.0 else float(llm_confidence)

    domain_score_display = f"{domain_risk_score:.3f}" if domain_risk_score is not None else "N/A"
    llm_score_display = f"{llm_risk_score:.3f}" if llm_risk_score is not None else "N/A"
    confidence_display = f"{confidence:.1%}" if confidence is not None else "N/A"

    score_color = "var(--danger)" if domain_risk_score and domain_risk_score >= 0.5 else \
                  "var(--ok)" if domain_risk_score and domain_risk_score < 0.3 else "var(--warn)"

    evidence_html = build_evidence_html(domain_data.get("evidence", []))
    indicators_html = build_indicators_html(domain_data.get("risk_indicators", []))
    confidence_explanation = _build_confidence_explanation(confidence, domain_data.get("evidence", []))
    llm_analysis_display = _build_llm_analysis_html(llm_analysis)

    summary_html = f'<div style="margin: 8px 0; font-size: 13px;"><strong>Summary:</strong> {summary_text}</div>' if summary_text else ''
    evidence_summary_html = f'<div style="margin: 8px 0; font-size: 13px;"><strong>Evidence Summary:</strong> {evidence_summary}</div>' if evidence_summary else ''

    return f"""
    <div style="margin-bottom: 24px; padding: 16px; background: var(--panel-glass); border-radius: 12px; border: 1px solid var(--border);">
      <h4 style="margin: 0 0 12px 0; color: var(--accent); text-transform: capitalize; font-size: 16px;">{domain_name} Domain Analysis</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 12px;">
        <div><div style="color: var(--muted); font-size: 12px;">Risk Score</div>
          <div style="font-size: 18px; font-weight: bold; color: {score_color};">{domain_score_display}</div></div>
        <div><div style="color: var(--muted); font-size: 12px;">LLM Risk Score</div>
          <div style="font-size: 18px; font-weight: bold;">{llm_score_display}</div></div>
        <div><div style="color: var(--muted); font-size: 12px;">Confidence</div>
          <div style="font-size: 18px; font-weight: bold;">{confidence_display}</div></div>
      </div>
      {summary_html}{evidence_summary_html}{evidence_html}{indicators_html}{confidence_explanation}{llm_analysis_display}
    </div>
    """


def _build_confidence_explanation(confidence: float, evidence: List[Any]) -> str:
    """Build confidence explanation when low despite evidence."""
    if confidence is None or confidence >= 0.5 or not isinstance(evidence, list) or len(evidence) == 0:
        return ""
    return (f"<div style='margin: 8px 0; padding: 8px; background: rgba(245, 158, 11, 0.1); border-radius: 6px; "
            f"border-left: 3px solid var(--warn); font-size: 12px;'><strong>Note:</strong> Confidence is {confidence:.1%} "
            f"despite having {len(evidence)} evidence item(s).</div>")


def _build_llm_analysis_html(llm_analysis: Any) -> str:
    """Build LLM analysis display HTML."""
    if not llm_analysis:
        return ""
    formatted_llm = format_llm_analysis(llm_analysis)
    if not formatted_llm:
        return ""
    return (f"<div style='background: var(--panel-glass); padding: 12px; border-radius: 8px; margin: 8px 0; "
            f"font-size: 13px; line-height: 1.6; border-left: 3px solid var(--accent);'><strong>LLM Reasoning:</strong>"
            f"<div style='margin-top: 8px;'>{formatted_llm}</div></div>")
