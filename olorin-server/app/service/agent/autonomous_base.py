"""
Autonomous Investigation Agent Base Class

Core autonomous investigation agent with LLM-driven tool selection and decision making.
"""

import json
import logging
import os
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

# Global variable for lazy initialization
_autonomous_llm = None

def get_autonomous_llm():
    """Get or create the autonomous LLM with proper Firebase secrets integration."""
    global _autonomous_llm
    
    if _autonomous_llm is None:
        # Get Firebase secrets integration
        try:
            from app.utils.firebase_secrets import get_firebase_secret
        except ImportError:
            logger.warning("Firebase secrets not available, using environment variables only")
            get_firebase_secret = lambda x: None
        
        settings = get_settings_for_env()
        
        # Priority: Firebase secrets first (as requested by user), then environment variables as fallback
        api_key = (
            get_firebase_secret(settings.anthropic_api_key_secret) or
            settings.anthropic_api_key or
            os.getenv("ANTHROPIC_API_KEY")
        )
        
        if not api_key:
            logger.error("Anthropic API key not found in Firebase secrets, environment variables, or settings")
            # Create a fallback LLM that will fail gracefully
            api_key = "dummy-key"
        
        _autonomous_llm = ChatAnthropic(
            api_key=api_key,
            model="claude-opus-4-1-20250805",  # Claude Opus 4.1 - correct model name
            temperature=0.1,  # Lower temperature for more focused decision making
            max_tokens=8000,  # Larger context for reasoning
            timeout=90,  # Longer timeout for complex reasoning with Anthropic
        )
        
        logger.info(f"Initialized autonomous LLM with API key from {'Firebase secrets' if get_firebase_secret(settings.anthropic_api_key_secret) else 'environment/settings'}")
    
    return _autonomous_llm

# For backward compatibility - lazy initialization
# This will be initialized when first accessed
autonomous_llm = None

def _get_backward_compatible_llm():
    """Backward compatibility accessor for autonomous_llm."""
    global autonomous_llm
    if autonomous_llm is None:
        autonomous_llm = get_autonomous_llm()
    return autonomous_llm

# Create a property-like access
class _LLMWrapper:
    def __getattr__(self, name):
        llm = _get_backward_compatible_llm()
        return getattr(llm, name)
    
    def bind_tools(self, tools, **kwargs):
        llm = _get_backward_compatible_llm()
        return llm.bind_tools(tools, **kwargs)

autonomous_llm = _LLMWrapper()


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
        
        # Bind tools to autonomous LLM using lazy initialization
        try:
            autonomous_llm_instance = get_autonomous_llm()
            self.llm_with_tools = autonomous_llm_instance.bind_tools(tools)
            logger.info(f"Successfully bound {len(tools)} tools to {domain} autonomous agent")
        except Exception as e:
            logger.error(f"Failed to bind tools to {domain} agent: {e}")
            self.llm_with_tools = get_autonomous_llm()
    
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
5. MANDATORY: Calculate and provide a numerical risk_score from 0.0 to 1.0 based on evidence
6. Provide confidence scores and reasoning for all findings
7. Document your tool selection rationale

Available tools: {', '.join(self.tool_map.keys())}

Remember: You have full autonomy to choose which tools to use and how to analyze the data.
Let the investigation context guide your decisions, not fixed workflows.
""")
        
        try:
            # Import autonomous investigation logger for console output
            from app.service.logging.autonomous_investigation_logger import get_console_logger
            console_logger = get_console_logger()
            
            # Start investigation logging
            console_logger.start_investigation_logging(
                context.investigation_id, 
                {
                    "domain": self.domain,
                    "entity_type": context.entity_type.value,
                    "entity_id": context.entity_id,
                    "objectives": specific_objectives or []
                }
            )
            
            # Execute autonomous investigation
            print(f"        🤖 Starting {self.domain.title()} Agent analysis...")
            logger.info(f"Starting autonomous {self.domain} investigation for {context.investigation_id}")
            
            messages = [system_msg, HumanMessage(content=investigation_prompt)]
            
            # Log LLM interaction for visibility
            console_logger.log_llm_interaction(
                investigation_id=context.investigation_id,
                agent_name=f"Autonomous{self.domain.title()}Agent",
                model_name="claude-opus-4-1-20250805",
                prompt_template="autonomous_investigation_prompt",
                full_prompt=investigation_prompt,
                response="[Pending]",
                tokens_used={"total_tokens": 0},
                tools_available=[tool.name for tool in self.tools],
                tools_used=[],
                reasoning_chain=f"Investigating {self.domain} for {context.entity_id}"
            )
            
            # Let the LLM decide which tools to use and how to proceed
            result = await self.llm_with_tools.ainvoke(
                messages,
                config=config
            )
            
            # Parse and structure the autonomous analysis result
            findings = parse_autonomous_result(result, context, self.domain)
            
            # Log completion with detailed results
            risk_display = "MISSING!" if findings.risk_score is None else f"{findings.risk_score:.3f}"
            print(f"        ✅ {self.domain.title()} Agent completed")
            print(f"           Risk Score: {risk_display} | Confidence: {findings.confidence:.2f}")
            print(f"           Findings: {len(findings.key_findings)} | Quality: {findings.data_quality}")
            
            # Update LLM interaction log with actual response and tools used
            if hasattr(result, 'tool_calls') and result.tool_calls:
                tools_used = [call['name'] for call in result.tool_calls]
                console_logger.log_tool_execution(
                    investigation_id=context.investigation_id,
                    agent_name=f"Autonomous{self.domain.title()}Agent",
                    tool_name=f"Multiple Tools: {', '.join(tools_used)}",
                    tool_parameters={"tool_calls": len(result.tool_calls)},
                    selection_reasoning=f"LLM selected {len(result.tool_calls)} tools autonomously",
                    execution_result={"findings_count": len(findings.key_findings), "risk_score": findings.risk_score},
                    success=True,
                    execution_time_ms=0  # Would need timing from earlier
                )
            
            logger.info(
                f"Completed autonomous {self.domain} investigation: "
                f"risk_score={findings.risk_score:.2f}, "
                f"confidence={findings.confidence:.2f}, "
                f"findings={len(findings.key_findings)}"
            )
            
            return findings
            
        except Exception as e:
            logger.error(
                f"CRITICAL: Autonomous {self.domain} investigation failed completely! "
                f"No risk assessment available for investigation {context.investigation_id}: {str(e)}"
            )
            print(f"        ❌ ERROR: {self.domain.title()} Agent failed completely - no risk_score available!")
            
            # Return error findings with explicit None risk_score
            return DomainFindings(
                domain=self.domain,
                risk_score=None,  # Explicit None to indicate missing risk assessment
                confidence=0.0,
                key_findings=[f"Investigation failed: {str(e)}"],
                suspicious_indicators=[],
                data_quality="error",
                timestamp=datetime.now(),
                recommended_actions=["Retry investigation", "Check tool availability"]
            )