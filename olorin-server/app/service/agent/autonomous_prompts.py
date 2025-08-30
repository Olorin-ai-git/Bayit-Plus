"""
Autonomous Agent Prompt Generation

Prompt generation utilities for autonomous investigation agents.
"""

import logging
from typing import List, Optional

from app.service.agent.autonomous_context import AutonomousInvestigationContext

logger = logging.getLogger(__name__)


def create_investigation_prompt(
    domain: str,
    context: AutonomousInvestigationContext,
    llm_context: str,
    specific_objectives: List[str] = None
) -> str:
    """Create detailed investigation prompt for autonomous analysis"""
    
    from .agent_factory import get_default_domain_objectives
    
    prompt_parts = [
        f"INVESTIGATION CONTEXT:\n{llm_context}",
        
        f"\nYOUR MISSION: Conduct autonomous {domain.upper()} analysis for entity {context.entity_id}",
        
        f"\nSPECIFIC OBJECTIVES for {domain}:",
    ]
    
    if specific_objectives:
        for obj in specific_objectives:
            prompt_parts.append(f"• {obj}")
    else:
        # Default objectives based on domain
        domain_objectives = get_default_domain_objectives(domain)
        for obj in domain_objectives:
            prompt_parts.append(f"• {obj}")
    
    prompt_parts.extend([
        "\nAUTONOMOUS ANALYSIS REQUIREMENTS:",
        "1. SELECT TOOLS based on what data you need, not predetermined patterns",
        "2. Use multiple tools if necessary to gather comprehensive evidence",
        "3. EXPLAIN your tool selection reasoning", 
        "4. Analyze all collected data for fraud indicators",
        "5. Correlate findings across data sources",
        "6. Assign risk scores based on evidence strength",
        "7. Provide confidence levels for all assessments",
        
        "\nEXPECTED OUTPUT FORMAT:",
        "Provide a comprehensive analysis that includes:",
        "- Tool selection rationale",
        "- Data collection summary", 
        "- Fraud indicators identified",
        "- Risk assessment with evidence",
        "- Confidence scoring",
        "- Recommendations for further investigation",
        
        f"\nBEGIN AUTONOMOUS {domain.upper()} INVESTIGATION:",
    ])
    
    return "\n".join(prompt_parts)