"""
AI Insights Generator - AI-powered insights and recommendations from audit results.
"""
import json
import logging
from typing import Any, Dict, List

import anthropic

from app.services.content_auditor.constants import (
    AIInsightsConfig,
    SUPPORTED_INSIGHT_LANGUAGES,
    get_ai_insights_config,
    get_anthropic_api_key,
    get_claude_model,
)

logger = logging.getLogger(__name__)


def build_english_prompt(summary_data: Dict[str, Any], sample_issues: Dict[str, Any]) -> str:
    """Build English prompt for AI insights."""
    return f"""You are an AI librarian for the Bayit+ system. Analyze the following audit results and identify patterns and recommendations.

**Audit Summary:**
{json.dumps(summary_data, ensure_ascii=False, indent=2)}

**Sample Issues:**
{json.dumps(sample_issues, ensure_ascii=False, indent=2)}

**Instructions:**
1. Identify systemic patterns (e.g., all content from source X is broken)
2. Suggest recommendations to prevent future issues
3. Rank issues by severity
4. Identify opportunities to improve metadata quality

Return a list of insights and recommendations (3-5 items), each item one clear sentence.
Return JSON:
{{
    "insights": [
        "Insight 1...",
        "Insight 2...",
        "Recommendation 1..."
    ]
}}"""


def build_spanish_prompt(summary_data: Dict[str, Any], sample_issues: Dict[str, Any]) -> str:
    """Build Spanish prompt for AI insights."""
    return f"""Eres un bibliotecario AI para el sistema Bayit+. Analiza los siguientes resultados de auditoria e identifica patrones y recomendaciones.

**Resumen de Auditoria:**
{json.dumps(summary_data, ensure_ascii=False, indent=2)}

**Ejemplos de Problemas:**
{json.dumps(sample_issues, ensure_ascii=False, indent=2)}

**Instrucciones:**
1. Identifica patrones sistemicos (p. ej., todo el contenido de la fuente X esta roto)
2. Sugiere recomendaciones para prevenir problemas futuros
3. Clasifica los problemas por gravedad
4. Identifica oportunidades para mejorar la calidad de los metadatos

Devuelve una lista de ideas y recomendaciones (3-5 elementos), cada elemento una oracion clara.
Devuelve JSON:
{{
    "insights": [
        "Idea 1...",
        "Idea 2...",
        "Recomendacion 1..."
    ]
}}"""


def build_hebrew_prompt(summary_data: Dict[str, Any], sample_issues: Dict[str, Any]) -> str:
    """Build Hebrew prompt for AI insights."""
    return f"""You are an AI librarian for the Bayit+ system. Analyze the following audit results and identify patterns and recommendations. Respond in Hebrew.

**Audit Summary:**
{json.dumps(summary_data, ensure_ascii=False, indent=2)}

**Sample Issues:**
{json.dumps(sample_issues, ensure_ascii=False, indent=2)}

**Instructions:**
1. Identify systemic patterns (e.g., all content from source X is broken)
2. Suggest recommendations to prevent future issues
3. Rank issues by severity
4. Identify opportunities to improve metadata quality

Return a list of insights and recommendations (3-5 items), each item one clear sentence in Hebrew.
Return JSON:
{{
    "insights": [
        "Insight 1...",
        "Insight 2...",
        "Recommendation 1..."
    ]
}}"""


def get_prompt_for_language(
    language: str, summary_data: Dict[str, Any], sample_issues: Dict[str, Any]
) -> str:
    """Get the appropriate prompt for the requested language."""
    prompt_builders = {
        "en": build_english_prompt,
        "es": build_spanish_prompt,
        "he": build_hebrew_prompt,
    }
    builder = prompt_builders.get(language, build_english_prompt)
    return builder(summary_data, sample_issues)


def parse_insights_response(response_text: str) -> List[str]:
    """Parse Claude's JSON response for insights."""
    text = response_text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    data = json.loads(text.strip())
    return data.get("insights", [])


async def generate_ai_insights(audit_report: Any, language: str = "en") -> List[str]:
    """
    Generate AI-powered insights and recommendations from audit results.
    Uses Claude to analyze patterns and provide actionable recommendations.
    """
    insights: List[str] = []
    config = get_ai_insights_config()

    try:
        summary_data = {
            "total_items": audit_report.summary.get("total_items", 0),
            "issues_found": audit_report.summary.get("issues_found", 0),
            "issues_fixed": audit_report.summary.get("issues_fixed", 0),
            "broken_streams_count": len(audit_report.broken_streams),
            "missing_metadata_count": len(audit_report.missing_metadata),
            "misclassifications_count": len(audit_report.misclassifications),
            "orphaned_items_count": len(audit_report.orphaned_items),
        }
        sample_issues = {
            "broken_streams": audit_report.broken_streams[:config.sample_broken_streams],
            "missing_metadata": audit_report.missing_metadata[:config.sample_missing_metadata],
            "misclassifications": audit_report.misclassifications[:config.sample_misclassifications],
        }
        if language not in SUPPORTED_INSIGHT_LANGUAGES:
            language = "en"

        prompt = get_prompt_for_language(language, summary_data, sample_issues)
        client = anthropic.Anthropic(api_key=get_anthropic_api_key())
        response = client.messages.create(
            model=get_claude_model(),
            max_tokens=config.max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        response_text = response.content[0].text.strip()
        insights = parse_insights_response(response_text)
    except Exception as e:
        logger.warning(f"Failed to generate AI insights: {e}")
        insights = []

    return insights
