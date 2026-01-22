"""
AI Agent Service - Backward Compatibility Module
Re-exports from app.services.ai_agent for backward compatibility

DEPRECATED: Import directly from app.services.ai_agent instead
"""

from app.services.ai_agent import (
    AIAgentService,
    CVAnalysisOutput,
    build_analysis_prompt,
    build_generation_prompt,
    parse_analysis_response,
)

__all__ = [
    "AIAgentService",
    "CVAnalysisOutput",
    "build_analysis_prompt",
    "build_generation_prompt",
    "parse_analysis_response",
]
