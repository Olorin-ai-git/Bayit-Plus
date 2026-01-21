"""
Text Formatting Utilities for Startup Reports.

Handles LLM analysis formatting, text parsing with newlines,
keyword highlighting, and investigation summary formatting.
"""

import html
import re
from typing import Any


def format_llm_analysis(llm_analysis: Any) -> str:
    """Format LLM analysis text, parsing dicts, handling newlines, and highlighting."""
    if not llm_analysis:
        return ""

    if isinstance(llm_analysis, dict):
        return _format_llm_dict(llm_analysis)
    elif isinstance(llm_analysis, str):
        return parse_text_with_newlines(llm_analysis)

    return str(llm_analysis)


def _format_llm_dict(llm_analysis: dict) -> str:
    """Format LLM analysis dictionary into HTML."""
    formatted_parts = []

    risk_score = llm_analysis.get("risk_score")
    confidence = llm_analysis.get("confidence")
    risk_factors = llm_analysis.get("risk_factors", "")
    reasoning = llm_analysis.get("reasoning", "")
    summary = llm_analysis.get("summary", "")

    if risk_score is not None:
        formatted_parts.append(
            f"<div style='margin-bottom: 12px;'><strong style='color: var(--accent);'>"
            f"Risk Score:</strong> <span style='font-size: 16px; font-weight: bold;'>"
            f"{risk_score:.3f}</span></div>"
        )

    if confidence is not None:
        formatted_parts.append(
            f"<div style='margin-bottom: 12px;'><strong style='color: var(--accent);'>"
            f"Confidence:</strong> <span style='font-size: 16px; font-weight: bold;'>"
            f"{confidence:.1%}</span></div>"
        )

    for label, value in [
        ("Risk Factors", risk_factors),
        ("Reasoning", reasoning),
        ("Summary", summary),
    ]:
        if value:
            formatted = parse_text_with_newlines(str(value)) if isinstance(value, str) else str(value)
            formatted_parts.append(
                f"<div style='margin-bottom: 12px;'><strong style='color: var(--accent);'>"
                f"{label}:</strong><div style='margin-top: 4px;'>{formatted}</div></div>"
            )

    # Add remaining fields
    skip_keys = {"risk_score", "confidence", "risk_factors", "reasoning", "summary"}
    for key, value in llm_analysis.items():
        if key not in skip_keys:
            formatted = parse_text_with_newlines(str(value)) if isinstance(value, str) else str(value)
            formatted_parts.append(
                f"<div style='margin-bottom: 8px;'><strong>{key.replace('_', ' ').title()}:"
                f"</strong> {formatted}</div>"
            )

    return "".join(formatted_parts) if formatted_parts else str(llm_analysis)


def parse_text_with_newlines(text: str) -> str:
    """Parse text with newlines, bullet points, and format nicely."""
    if not text:
        return ""

    text = html.escape(text)
    text = text.replace("\\n", "\n").replace("\n", "<br>")
    text = text.replace("\r\n", "<br>").replace("\r", "<br>")

    lines = text.split("<br>")
    formatted_lines = []
    in_list = False

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("- ") or stripped.startswith("* ") or stripped.startswith("• "):
            if not in_list:
                formatted_lines.append('<ul style="margin: 4px 0; padding-left: 20px;">')
                in_list = True
            bullet_text = highlight_keywords(stripped[2:].strip())
            formatted_lines.append(f'<li style="margin: 2px 0;">{bullet_text}</li>')
        else:
            if in_list:
                formatted_lines.append("</ul>")
                in_list = False
            if stripped:
                highlighted = highlight_keywords(stripped)
                formatted_lines.append(f'<div style="margin: 4px 0;">{highlighted}</div>')

    if in_list:
        formatted_lines.append("</ul>")

    return "".join(formatted_lines)


def highlight_keywords(text: str) -> str:
    """Highlight important keywords in text."""
    keywords = [
        (r"\b(high|medium|low)\s+risk\b", r'<strong style="color: var(--accent);">\1</strong>'),
        (r"\b(rejection|fraud|suspicious|anomaly|anomalous)\b", r'<strong style="color: var(--danger);">\1</strong>'),
        (r"\b(confidence|risk\s+score|risk\s+factors?)\b", r'<strong style="color: var(--accent);">\1</strong>'),
        (r"\b(evidence|indicator|pattern|velocity|clustering)\b", r'<strong style="color: var(--info);">\1</strong>'),
        (r"\b(critical|important|significant|notable)\b", r'<strong style="color: var(--warn);">\1</strong>'),
    ]

    for pattern, replacement in keywords:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

    return text


def format_investigation_summary(summary: str) -> str:
    """Format investigation summary with proper parsing and highlighting."""
    if not summary:
        return ""

    formatted = summary

    # Replace markdown headers with HTML
    formatted = re.sub(
        r"^#+\s+(.+)$",
        r'<h4 style="margin: 12px 0 8px 0; color: var(--accent); font-size: 14px;">\1</h4>',
        formatted,
        flags=re.MULTILINE,
    )

    # Replace bold markdown
    formatted = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", formatted)

    # Parse newlines and bullet points
    formatted = parse_text_with_newlines(formatted)

    # Highlight important sections
    formatted = highlight_keywords(formatted)

    return formatted
