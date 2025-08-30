"""
Autonomous Investigation Agent Base Class

Core autonomous investigation agent with LLM-driven tool selection and decision making.
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables.config import RunnableConfig
from langchain_anthropic import ChatAnthropic

from app.service.agent.autonomous_context import (
    AutonomousInvestigationContext,
    DomainFindings,
)
from app.service.config import get_settings_for_env

logger = logging.getLogger(__name__)
settings_for_env = get_settings_for_env()

# Create autonomous LLM for decision making using Claude Opus 4.1
autonomous_llm = ChatAnthropic(
    api_key=settings_for_env.anthropic_api_key,
    model="claude-opus-4-1-20250805",  # Claude Opus 4.1 - correct model name
    temperature=0.1,  # Lower temperature for more focused decision making
    max_tokens=8000,  # Larger context for reasoning
    timeout=90,  # Longer timeout for complex reasoning with Anthropic
)


class AutonomousInvestigationAgent:
    """
    Base class for autonomous investigation agents.
    
    Uses LLM-driven decision making to select tools and analysis approaches
    based on investigation context and objectives.
    """
    
    def __init__(self, domain: str, tools: List[Any]):
        self.domain = domain
        self.tools = tools
        self.tool_map = {tool.name: tool for tool in tools}
        
        # Bind tools to autonomous LLM
        try:
            self.llm_with_tools = autonomous_llm.bind_tools(tools, strict=True)
            logger.info(f"Successfully bound {len(tools)} tools to {domain} autonomous agent")
        except Exception as e:
            logger.error(f"Failed to bind tools to {domain} agent: {e}")
            self.llm_with_tools = autonomous_llm
    
    async def autonomous_investigate(
        self,
        context: AutonomousInvestigationContext,
        config: RunnableConfig,
        specific_objectives: List[str] = None
    ) -> DomainFindings:
        """
        Perform autonomous investigation using LLM-driven tool selection.
        
        Args:
            context: Rich investigation context
            config: LangGraph configuration
            specific_objectives: Specific objectives for this domain
            
        Returns:
            DomainFindings with autonomous analysis results
        """
        from .autonomous_prompts import create_investigation_prompt
        from .autonomous_parsing import parse_autonomous_result
        
        # Generate rich investigation context for LLM
        llm_context = context.generate_llm_context(self.domain)
        
        # Create autonomous investigation prompt
        investigation_prompt = create_investigation_prompt(
            self.domain, context, llm_context, specific_objectives
        )
        
        # Create system message for autonomous agent
        system_msg = SystemMessage(content=f"""
You are an intelligent fraud investigation agent specializing in {self.domain.upper()} ANALYSIS.

Your capabilities:
- Autonomous tool selection based on investigation needs
- Advanced reasoning and pattern recognition
- Cross-domain correlation and analysis
- Evidence-based risk assessment

Your mission: Conduct a thorough {self.domain} analysis for fraud investigation {context.investigation_id}.

Key principles:
1. SELECT TOOLS AUTONOMOUSLY based on investigation needs, NOT predetermined patterns
2. Use your reasoning to determine which tools provide the best data for current objectives
3. Call multiple tools if needed to gather comprehensive evidence
4. Focus on detecting fraud indicators, anomalies, and suspicious patterns
5. Provide confidence scores and reasoning for all findings
6. Document your tool selection rationale

Available tools: {', '.join(self.tool_map.keys())}

Remember: You have full autonomy to choose which tools to use and how to analyze the data.
Let the investigation context guide your decisions, not fixed workflows.
""")
        
        try:
            # Execute autonomous investigation
            logger.info(f"Starting autonomous {self.domain} investigation for {context.investigation_id}")
            
            messages = [system_msg, HumanMessage(content=investigation_prompt)]
            
            # Let the LLM decide which tools to use and how to proceed
            result = await self.llm_with_tools.ainvoke(
                messages,
                config=config
            )
            
            # Parse and structure the autonomous analysis result
            findings = parse_autonomous_result(result, context, self.domain)
            
            logger.info(
                f"Completed autonomous {self.domain} investigation: "
                f"risk_score={findings.risk_score:.2f}, "
                f"confidence={findings.confidence:.2f}, "
                f"findings={len(findings.key_findings)}"
            )
            
            return findings
            
        except Exception as e:
            logger.error(f"Autonomous {self.domain} investigation failed: {str(e)}")
            
            # Return error findings
            return DomainFindings(
                domain=self.domain,
                risk_score=0.0,
                confidence=0.0,
                key_findings=[f"Investigation failed: {str(e)}"],
                suspicious_indicators=[],
                data_quality="error",
                timestamp=datetime.now(),
                recommended_actions=["Retry investigation", "Check tool availability"]
            )