from app.service.logging import get_bridge_logger
logger = get_bridge_logger(__name__)

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
    """Get or create the autonomous LLM with Firebase secrets integration ONLY."""
    global _autonomous_llm
    
    if _autonomous_llm is None:
        # Get Firebase secrets integration - REQUIRED, no fallback
        try:
            from app.utils.firebase_secrets import get_firebase_secret
        except ImportError:
            logger.error("Firebase secrets module not available - cannot initialize LLM")
            raise RuntimeError("Firebase secrets integration is required for Anthropic API key")
        
        settings = get_settings_for_env()
        
        # ONLY use Firebase secrets - NO environment variable fallback
        api_key = get_firebase_secret(settings.anthropic_api_key_secret)
        
        if not api_key:
            logger.error(f"Anthropic API key not found in Firebase secrets (secret name: {settings.anthropic_api_key_secret})")
            raise RuntimeError(f"Anthropic API key must be configured in Firebase Secrets Manager as '{settings.anthropic_api_key_secret}'")
        
        _autonomous_llm = ChatAnthropic(
            api_key=api_key,
            model="claude-opus-4-1-20250805",  # Claude Opus 4.1 - correct model name
            temperature=0.1,  # Lower temperature for more focused decision making
            max_tokens=8090,  # Larger context for reasoning
            timeout=90,  # Longer timeout for complex reasoning with Anthropic
        )
        
        logger.info(f"Initialized autonomous LLM with API key from Firebase secrets (secret: {settings.anthropic_api_key_secret})")
    
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
        
        # Tool refresh capability for dynamic tool selection
        self.supports_tool_refresh = False
        self.tool_refresh_callback = None
        
        # Bind tools to autonomous LLM using lazy initialization
        try:
            autonomous_llm_instance = get_autonomous_llm()
            self.llm_with_tools = autonomous_llm_instance.bind_tools(tools)
            logger.info(f"Successfully bound {len(tools)} tools to {domain} autonomous agent")
        except Exception as e:
            logger.error(f"Failed to bind tools to {domain} agent: {e}")
            self.llm_with_tools = get_autonomous_llm()
    
    def enable_tool_refresh(self, refresh_callback):
        """Enable dynamic tool refresh with callback function.
        
        Args:
            refresh_callback: Async function that returns updated tools
                Signature: async def(context, domain) -> List[Tool]
        """
        self.supports_tool_refresh = True
        self.tool_refresh_callback = refresh_callback
        logger.info(f"Tool refresh enabled for {self.domain} agent")
    
    async def refresh_tools(self, context: AutonomousInvestigationContext) -> bool:
        """Refresh tools dynamically using the configured callback.
        
        Args:
            context: Investigation context for tool selection
            
        Returns:
            True if tools were refreshed, False otherwise
        """
        if not self.supports_tool_refresh or not self.tool_refresh_callback:
            return False
        
        try:
            import time
            start_time = time.time()
            
            # Get new tools from callback
            new_tools = await self.tool_refresh_callback(context, self.domain)
            
            refresh_time_ms = (time.time() - start_time) * 1000
            
            if new_tools and new_tools != self.tools:
                # Update tools and re-bind to LLM
                old_tool_count = len(self.tools)
                self.tools = new_tools
                self.tool_map = {tool.name: tool for tool in new_tools}
                
                # Re-bind tools to LLM
                autonomous_llm_instance = get_autonomous_llm()
                self.llm_with_tools = autonomous_llm_instance.bind_tools(new_tools)
                
                logger.info(
                    f"Tools refreshed for {self.domain}: {old_tool_count} -> {len(new_tools)} tools "
                    f"(refresh time: {refresh_time_ms:.1f}ms)"
                )
                return True
            else:
                logger.debug(f"No tool changes needed for {self.domain} (refresh time: {refresh_time_ms:.1f}ms)")
                return False
                
        except Exception as e:
            logger.error(f"Tool refresh failed for {self.domain}: {str(e)}")
            return False
    
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
        
        # Optional: Refresh tools dynamically if enabled
        if self.supports_tool_refresh:
            try:
                tools_refreshed = await self.refresh_tools(context)
                if tools_refreshed:
                    logger.info(f"🔄 Tools refreshed for {self.domain} investigation {context.investigation_id}")
            except Exception as e:
                logger.warning(f"Tool refresh failed for {self.domain}, continuing with existing tools: {str(e)}")
        
        # Generate rich investigation context for LLM
        llm_context = context.generate_llm_context(self.domain)
        
        # Create autonomous investigation prompt
        investigation_prompt = create_investigation_prompt(
            self.domain, context, llm_context, specific_objectives
        )
        
        # Log Olorin/Gaia prompt usage information
        from app.service.agent.prompts.olorin_prompts import get_supported_olorin_domains
        from app.service.agent.prompts.gaia_prompts import get_supported_domains
        
        if self.domain in get_supported_olorin_domains():
            logger.info(f"🔥 OLORIN PROMPTS ENABLED: Using exact Olorin prompts for {self.domain} domain")
            logger.info(f"        🔥 Using Olorin prompts for {self.domain.title()} analysis")
        elif self.domain in get_supported_domains():
            logger.info(f"🔥 GAIA PROMPTS ENABLED: Using exact Gaia prompts for {self.domain} domain")
            logger.info(f"        🔥 Using Gaia prompts for {self.domain.title()} analysis")
        
        # Create system message for autonomous agent
        system_msg = SystemMessage(content=f"""
You are an intelligent fraud investigation agent specializing in {self.domain.upper()} ANALYSIS.

SYSTEM INTEGRATION: You are now enhanced with Gaia prompts for structured fraud detection analysis.
The investigation prompt will specify the exact format required for your response.

Your capabilities:
- Autonomous tool selection based on investigation needs
- Advanced reasoning and pattern recognition  
- Cross-domain correlation and analysis
- Evidence-based risk assessment
- Structured Gaia-format output for consistent analysis

Your mission: Conduct a thorough {self.domain} analysis for fraud investigation {context.investigation_id}.

Key principles:
1. SELECT TOOLS AUTONOMOUSLY based on investigation needs, NOT predetermined patterns
2. Use your reasoning to determine which tools provide the best data for current objectives
3. Call multiple tools if needed to gather comprehensive evidence
4. Focus on detecting fraud indicators, anomalies, and suspicious patterns
5. MANDATORY: Follow the exact output format specified in the investigation prompt
6. MANDATORY: Calculate and provide a numerical risk_score from 0.0 to 1.0 based on evidence
7. Provide confidence scores and reasoning for all findings
8. Document your tool selection rationale

Available tools: {', '.join(self.tool_map.keys())}

IMPORTANT: The investigation prompt will contain exact format requirements from the Gaia system.
Follow these requirements precisely while maintaining your autonomous tool selection capability.

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
            
            # Final reminder about risk score before LLM call
            enhanced_prompt = investigation_prompt + "\n\n⚠️ FINAL REMINDER: Include 'risk_score: X.XX' in your response (numerical value 0.0-1.0)"
            
            # Log the PARSED prompt (critical requirement) - Enhanced formatting
            from app.service.agent.llm_formatter import LLMInteractionFormatter
            
            console_prompt, _ = LLMInteractionFormatter.format_console_interaction(
                self.domain, context.investigation_id, context.entity_id, enhanced_prompt, ""
            )
            logger.info(console_prompt)
            
            # Execute autonomous investigation
            logger.info(f"        🤖 Starting {self.domain.title()} Agent analysis...")
            logger.info(f"Starting autonomous {self.domain} investigation for {context.investigation_id}")
            
            messages = [system_msg, HumanMessage(content=enhanced_prompt)]
            
            # Log LLM interaction for visibility (detailed logging) - Enhanced formatting
            logger.info(f"🤖 LLM INTERACTION START: {self.domain.title()} Agent")
            
            # Enhanced log file formatting for prompt
            log_prompt, _ = LLMInteractionFormatter.format_log_interaction(
                self.domain, context.investigation_id, context.entity_id, enhanced_prompt, ""
            )
            logger.info(f"📝 {log_prompt}")
            
            console_logger.log_llm_interaction(
                investigation_id=context.investigation_id,
                agent_name=f"Autonomous{self.domain.title()}Agent",
                model_name="claude-opus-4-1-20250805",
                prompt_template="autonomous_investigation_prompt",
                full_prompt=enhanced_prompt,
                response="[Pending]",
                tokens_used={"total_tokens": 0},
                tools_available=[tool.name for tool in self.tools],
                tools_used=[],
                reasoning_chain=f"Investigating {self.domain} for {context.entity_id}"
            )
            
            # Let the LLM decide which tools to use and how to proceed
            logger.info(f"        🔄 Invoking LLM for {self.domain.title()} analysis...")
            result = await self.llm_with_tools.ainvoke(
                messages,
                config=config
            )
            
            # CRITICAL FIX: Check if result contains tool calls and handle them properly
            if hasattr(result, 'tool_calls') and result.tool_calls:
                logger.info(f"🔧 Tool calls detected in {self.domain} analysis - executing tools and getting final analysis")
                logger.info(f"        🔧 Executing {len(result.tool_calls)} tools for {self.domain.title()} analysis...")
                
                # Execute the tool calls
                from langchain_core.messages import ToolMessage
                
                tool_messages = []
                for tool_call in result.tool_calls:
                    tool_name = tool_call.get('name')
                    tool_args = tool_call.get('args', {})
                    tool_id = tool_call.get('id')
                    
                    logger.info(f"🔧 Executing tool: {tool_name} with args: {tool_args}")
                    
                    try:
                        # Find and execute the tool
                        if tool_name in self.tool_map:
                            tool = self.tool_map[tool_name]
                            tool_result = await tool.ainvoke(tool_args)
                            
                            # Create tool message with the result
                            tool_message = ToolMessage(
                                content=str(tool_result),
                                tool_call_id=tool_id,
                                name=tool_name
                            )
                            tool_messages.append(tool_message)
                            
                            logger.info(f"✅ Tool {tool_name} executed successfully")
                            
                        else:
                            logger.warning(f"⚠️ Tool {tool_name} not found in tool map")
                            tool_message = ToolMessage(
                                content=f"Error: Tool {tool_name} not available",
                                tool_call_id=tool_id,
                                name=tool_name
                            )
                            tool_messages.append(tool_message)
                            
                    except Exception as e:
                        logger.error(f"❌ Tool {tool_name} execution failed: {str(e)}")
                        tool_message = ToolMessage(
                            content=f"Tool execution failed: {str(e)}",
                            tool_call_id=tool_id,
                            name=tool_name
                        )
                        tool_messages.append(tool_message)
                
                # Now get the final analysis from the LLM with tool results
                analysis_messages = messages + [result] + tool_messages
                
                # Create a follow-up prompt to ensure we get the required analysis format
                # Check if any tools actually succeeded
                successful_tools = [msg for msg in tool_messages if "Error:" not in msg.content and "failed:" not in msg.content]
                
                if successful_tools:
                    follow_up_prompt = f"""
Based on the tool execution results above, provide your fraud analysis in the EXACT format below.

YOU MUST USE THIS EXACT FORMAT - NO EXCEPTIONS:

1. Risk Level: [Choose: Low/Medium/High/Critical]
2. risk_score: [NUMBER between 0.0 and 1.0]
3. Specific fraud indicators found: [Your findings based on tool results]
4. Confidence score: [NUMBER between 0-100]
5. Detailed reasoning: [Your analysis of the tool results]
6. Recommended actions: [Your recommendations]

CRITICAL REQUIREMENTS:
- You MUST include "risk_score: X.XX" where X.XX is a number between 0.0 and 1.0
- Use the actual data from tool results, not generic responses
- DO NOT provide any text outside this numbered format
- Start with "1. Risk Level:" immediately

MANDATORY: Begin your response with "1. Risk Level:" right now.
"""
                else:
                    # All tools failed - still need analysis
                    follow_up_prompt = f"""
The tools encountered errors, but you MUST still provide a {self.domain} fraud analysis based on:
- The investigation context provided
- General fraud patterns for {self.domain} analysis
- Risk assessment best practices

YOU MUST USE THIS EXACT FORMAT - NO EXCEPTIONS:

1. Risk Level: [Choose: Low/Medium/High/Critical]
2. risk_score: [NUMBER between 0.0 and 1.0 - use 0.5 as baseline if uncertain]
3. Specific fraud indicators found: [Note: Limited data available due to tool failures]
4. Confidence score: [NUMBER between 0-100 - should be lower due to tool failures]
5. Detailed reasoning: [Explain limitations due to tool failures but provide analysis]
6. Recommended actions: [Include: Fix tool connectivity, retry analysis, manual review]

CRITICAL REQUIREMENTS:
- You MUST include "risk_score: X.XX" even with limited data (use 0.5 if uncertain)
- Acknowledge tool failures but still provide professional analysis
- DO NOT skip the analysis due to tool failures
- Start with "1. Risk Level:" immediately

MANDATORY: Begin your response with "1. Risk Level:" right now.
"""
                
                analysis_messages.append(HumanMessage(content=follow_up_prompt))
                
                logger.info(f"🔍 Requesting final analysis from LLM for {self.domain} domain")
                logger.info(f"        🔍 Getting final analysis with tool results for {self.domain.title()}...")
                
                # Get the final analysis with tool results
                final_result = await get_autonomous_llm().ainvoke(
                    analysis_messages,
                    config=config
                )
                
                # Use the final result that includes tool-based analysis
                result = final_result
                logger.info(f"✅ Final analysis received for {self.domain} domain with tool integration")
            else:
                logger.info(f"ℹ️ No tool calls detected in {self.domain} analysis - requesting formatted response")
                
                # Even without tools, we need to ensure the response follows the required format
                format_reminder_prompt = f"""
IMPORTANT: Your previous response may not have followed the required format. Please provide your {self.domain} analysis in the EXACT format below.

YOU MUST USE THIS EXACT FORMAT - NO EXCEPTIONS:

1. Risk Level: [Choose: Low/Medium/High/Critical]
2. risk_score: [NUMBER between 0.0 and 1.0]
3. Specific fraud indicators found: [Your findings]
4. Confidence score: [NUMBER between 0-100]
5. Detailed reasoning: [Your analysis]
6. Recommended actions: [Your recommendations]

CRITICAL REQUIREMENTS:
- You MUST include "risk_score: X.XX" where X.XX is a number between 0.0 and 1.0
- DO NOT provide any text outside this numbered format
- Start with "1. Risk Level:" immediately

MANDATORY: Begin your response with "1. Risk Level:" right now.
"""
                
                # Get formatted response even when no tools were used
                format_messages = messages + [result, HumanMessage(content=format_reminder_prompt)]
                
                logger.info(f"🔍 Requesting formatted response from LLM for {self.domain} domain")
                logger.info(f"        🔍 Getting formatted response for {self.domain.title()}...")
                
                # Get the formatted response
                formatted_result = await get_autonomous_llm().ainvoke(
                    format_messages,
                    config=config
                )
                
                # Use the formatted result
                result = formatted_result
                logger.info(f"✅ Formatted response received for {self.domain} domain")
            
            # Log the COMPLETE LLM response (critical requirement) - Enhanced formatting
            _, console_response = LLMInteractionFormatter.format_console_interaction(
                self.domain, context.investigation_id, context.entity_id, "", result.content
            )
            logger.info(console_response)
            
            # Validate response format and show compliance
            from app.service.agent.llm_formatter import LLMInteractionFormatter
            validation_result = LLMInteractionFormatter.validate_response_format(result.content)
            
            if validation_result["has_risk_score"]:
                logger.info(f"        ✅ Risk Score Found: {validation_result['risk_score_value']}")
            else:
                logger.info("        ❌ Risk Score Missing!")
            
            if validation_result["has_numbered_format"]:
                logger.info("        ✅ Numbered Format Detected")
            else:
                logger.info("        ⚠️ Numbered Format Issues")
            
            logger.info(f"        📊 Format Compliance: {validation_result['format_compliance']*100:.1f}%")
            
            # Enhanced log file formatting
            log_prompt, log_response = LLMInteractionFormatter.format_log_interaction(
                self.domain, context.investigation_id, context.entity_id, enhanced_prompt, result.content
            )
            logger.info(f"{log_response}")
            
            # Validate Olorin/Gaia format response
            from app.service.agent.autonomous_prompts import validate_investigation_response
            from app.service.agent.autonomous_parsing import extract_content_from_response
            
            # Extract content as string for validation (handles lists and objects)
            response_content = extract_content_from_response(result.content)
            
            if self.domain in get_supported_olorin_domains():
                is_olorin_format = validate_investigation_response(response_content, self.domain)
                if is_olorin_format:
                    logger.info(f"✅ OLORIN FORMAT VALIDATED: Response follows Olorin format for {self.domain}")
                    logger.info(f"        ✅ Olorin format validated for {self.domain.title()} response")
                else:
                    logger.warning(f"⚠️ OLORIN FORMAT WARNING: Response may not follow Olorin format for {self.domain}")
                    logger.warning(f"        ⚠️ Olorin format warning for {self.domain.title()} response")
            elif self.domain in get_supported_domains():
                is_gaia_format = validate_investigation_response(response_content, self.domain)
                if is_gaia_format:
                    logger.info(f"✅ GAIA FORMAT VALIDATED: Response follows Gaia format for {self.domain}")
                    logger.info(f"        ✅ Gaia format validated for {self.domain.title()} response")
                else:
                    logger.warning(f"⚠️ GAIA FORMAT WARNING: Response may not follow Gaia format for {self.domain}")
                    logger.warning(f"        ⚠️ Gaia format warning for {self.domain.title()} response")
            
            # Parse and structure the autonomous analysis result
            findings = parse_autonomous_result(result, context, self.domain)
            
            # Log completion with detailed results
            risk_display = "MISSING!" if findings.risk_score is None else f"{findings.risk_score:.3f}"
            logger.info(f"        ✅ {self.domain.title()} Agent completed")
            logger.info(f"           Risk Score: {risk_display} | Confidence: {findings.confidence:.2f}")
            logger.info(f"           Findings: {len(findings.key_findings)} | Quality: {findings.data_quality}")
            
            # Additional prompt system logging
            if self.domain in get_supported_olorin_domains():
                logger.info(f"🔥 OLORIN ANALYSIS COMPLETE: {self.domain} domain analysis using Olorin prompts completed successfully")
            elif self.domain in get_supported_domains():
                logger.info(f"🔥 GAIA ANALYSIS COMPLETE: {self.domain} domain analysis using Gaia prompts completed successfully")
            
            # Log comprehensive interaction summary
            logger.info(f"🔥 COMPREHENSIVE LLM INTERACTION SUMMARY for {self.domain.title()} Agent:")
            logger.info(f"   Investigation ID: {context.investigation_id}")
            logger.info(f"   Entity ID: {context.entity_id}")
            logger.info(f"   Model: claude-opus-4-1-20250805")
            logger.info(f"   Prompt Length: {len(enhanced_prompt)} characters")
            logger.info(f"   Response Length: {len(result.content)} characters")
            logger.info(f"   Tools Available: {len(self.tools)}")
            
            # Update LLM interaction log with actual response and tools used
            if hasattr(result, 'tool_calls') and result.tool_calls:
                tools_used = [call['name'] for call in result.tool_calls]
                logger.info(f"   Tools Used: {', '.join(tools_used)} ({len(result.tool_calls)} total calls)")
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
            else:
                logger.info(f"   Tools Used: None (direct analysis)")
            
            # Final comprehensive logging
            logger.info(
                f"✅ AUTONOMOUS {self.domain.upper()} INVESTIGATION COMPLETE: "
                f"risk_score={findings.risk_score:.2f}, "
                f"confidence={findings.confidence:.2f}, "
                f"findings={len(findings.key_findings)}"
            )
            logger.info(f"🔥 END LLM INTERACTION: {self.domain.title()} Agent - SUCCESS")
            
            return findings
            
        except Exception as e:
            logger.error(
                f"CRITICAL: Autonomous {self.domain} investigation failed completely! "
                f"No risk assessment available for investigation {context.investigation_id}: {str(e)}"
            )
            logger.error(f"        ❌ ERROR: {self.domain.title()} Agent failed completely - no risk_score available!")
            
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