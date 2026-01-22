"""
AI Agent Response Parser
Parses Claude API responses into structured data
"""

import json
import logging
from typing import Dict

logger = logging.getLogger(__name__)


def parse_analysis_response(analysis_text: str) -> Dict:
    """Parse Claude's response into structured data"""
    try:
        # Try to extract JSON from response
        # Claude sometimes wraps JSON in markdown code blocks
        if "```json" in analysis_text:
            json_start = analysis_text.find("```json") + 7
            json_end = analysis_text.find("```", json_start)
            json_text = analysis_text[json_start:json_end].strip()
        elif "```" in analysis_text:
            json_start = analysis_text.find("```") + 3
            json_end = analysis_text.find("```", json_start)
            json_text = analysis_text[json_start:json_end].strip()
        else:
            json_text = analysis_text.strip()

        # Parse JSON
        analysis = json.loads(json_text)

        return analysis

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse analysis JSON: {e}")
        logger.debug(f"Analysis text: {analysis_text}")

        # Return minimal fallback structure
        return {
            "skills": [],
            "experience_years": None,
            "education_level": "Unknown",
            "work_history": [],
            "education": [],
            "certifications": [],
            "completeness_score": 0,
            "ats_score": 0,
            "recommendations": ["Unable to parse analysis"],
            "missing_sections": [],
        }
