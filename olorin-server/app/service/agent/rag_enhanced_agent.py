"""
RAG-Enhanced Structured Investigation Agent

Extension of StructuredInvestigationAgent with RAG (Retrieval-Augmented Generation)
capabilities for knowledge-augmented fraud investigation analysis.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from langchain_core.runnables.config import RunnableConfig

from app.service.logging import get_bridge_logger

from .autonomous_base import StructuredInvestigationAgent
from .autonomous_context import DomainFindings, StructuredInvestigationContext
from .rag import (
    ContextAugmentationConfig,
    ContextAugmentor,
    KnowledgeContext,
    RAGOrchestrator,
    create_context_augmentor,
    get_rag_orchestrator,
)

logger = get_bridge_logger(__name__)


class RAGEnhancedInvestigationAgent(StructuredInvestigationAgent):
    """
    RAG-Enhanced Structured Investigation Agent

    Extends the base StructuredInvestigationAgent with RAG capabilities:
    - Knowledge-augmented decision making
    - Context-aware prompt generation
    - Domain-specific knowledge retrieval
    - Enhanced analysis quality through background knowledge
    - Graceful degradation when RAG unavailable

    Maintains full backward compatibility with existing agent functionality.
    """

    def __init__(
        self,
        domain: str,
        tools: List[Any],
        rag_orchestrator: Optional[RAGOrchestrator] = None,
        enable_rag: bool = True,
        rag_config: Optional[ContextAugmentationConfig] = None,
    ):
        """
        Initialize RAG-enhanced investigation agent

        Args:
            domain: Investigation domain (network, device, location, logs, risk)
            tools: List of available tools for the agent
            rag_orchestrator: Optional RAG orchestrator instance
            enable_rag: Whether to enable RAG capabilities
            rag_config: Optional RAG configuration
        """
        # Initialize base agent
        super().__init__(domain, tools)

        # RAG system integration
        self.enable_rag = enable_rag
        self.rag_available = False
        self.rag_orchestrator = None
        self.context_augmentor = None

        # Initialize RAG components if enabled
        if enable_rag:
            try:
                # Get or use provided RAG orchestrator
                self.rag_orchestrator = rag_orchestrator or get_rag_orchestrator()

                # Create context augmentor with optional config
                self.context_augmentor = create_context_augmentor(
                    self.rag_orchestrator, rag_config
                )

                self.rag_available = True
                logger.info(f"RAG capabilities enabled for {domain} agent")

            except Exception as e:
                logger.warning(
                    f"RAG initialization failed for {domain} agent - continuing without RAG: {str(e)}"
                )
                self.enable_rag = False
                self.rag_available = False

        # Performance tracking
        self.rag_stats = {
            "investigations_with_rag": 0,
            "investigations_without_rag": 0,
            "rag_failures": 0,
            "avg_context_retrieval_time_ms": 0.0,
            "knowledge_chunks_used": 0,
        }

    async def structured_investigate(
        self,
        context: StructuredInvestigationContext,
        config: RunnableConfig,
        specific_objectives: List[str] = None,
    ) -> DomainFindings:
        """
        Perform RAG-enhanced structured investigation

        Args:
            context: Rich investigation context
            config: LangGraph configuration
            specific_objectives: Specific objectives for this domain

        Returns:
            DomainFindings with enhanced analysis results
        """

        # Attempt RAG-enhanced investigation if available
        if self.rag_available and self.enable_rag:
            try:
                return await self._rag_enhanced_investigation(
                    context, config, specific_objectives
                )
            except Exception as e:
                logger.error(
                    f"RAG-enhanced investigation failed for {self.domain}: {str(e)}"
                )
                self.rag_stats["rag_failures"] += 1
                logger.info(f"Falling back to standard investigation for {self.domain}")

        # Fallback to standard investigation
        self.rag_stats["investigations_without_rag"] += 1
        return await super().structured_investigate(
            context, config, specific_objectives
        )

    async def _rag_enhanced_investigation(
        self,
        context: StructuredInvestigationContext,
        config: RunnableConfig,
        specific_objectives: List[str] = None,
    ) -> DomainFindings:
        """
        Perform investigation with RAG enhancement
        """
        import time

        logger.info(
            f"Starting RAG-enhanced {self.domain} investigation for {context.investigation_id}"
        )

        # Step 1: Augment context with relevant knowledge
        context_start_time = time.time()

        knowledge_context = await self.context_augmentor.augment_investigation_context(
            investigation_context=context,
            domain=self.domain,
            specific_objectives=specific_objectives,
        )

        context_retrieval_time_ms = (time.time() - context_start_time) * 1000
        self._update_rag_stats(
            context_retrieval_time_ms, knowledge_context.total_chunks
        )

        logger.info(
            f"Knowledge context retrieved for {self.domain}: "
            f"{knowledge_context.total_chunks} chunks in {context_retrieval_time_ms:.1f}ms"
        )

        # Step 2: Generate enhanced investigation prompt
        enhanced_prompt = await self._create_rag_enhanced_prompt(
            context, knowledge_context, specific_objectives
        )

        # Step 3: Execute investigation with enhanced prompt
        findings = await self._execute_enhanced_investigation(
            enhanced_prompt, context, config, knowledge_context, specific_objectives
        )

        # Step 4: Augment findings with knowledge metadata
        findings = self._augment_findings_with_rag_metadata(findings, knowledge_context)

        logger.info(
            f"RAG-enhanced {self.domain} investigation completed: "
            f"risk_score={findings.risk_score}, knowledge_chunks={knowledge_context.total_chunks}"
        )

        self.rag_stats["investigations_with_rag"] += 1

        return findings

    async def _create_rag_enhanced_prompt(
        self,
        context: StructuredInvestigationContext,
        knowledge_context: KnowledgeContext,
        specific_objectives: List[str] = None,
    ) -> str:
        """
        Create investigation prompt enhanced with knowledge context
        """

        # Generate base investigation prompt
        from .structured_prompts import create_investigation_prompt

        llm_context = context.generate_llm_context(self.domain)
        base_prompt = create_investigation_prompt(
            self.domain, context, llm_context, specific_objectives
        )

        # Inject knowledge context into prompt
        enhanced_prompt = await self.context_augmentor.inject_context_into_prompt(
            base_prompt=base_prompt,
            knowledge_context=knowledge_context,
            include_all_levels=True,
        )

        # Add RAG-specific instructions
        rag_instructions = f"""

=== RAG ENHANCEMENT INSTRUCTIONS ===
You now have access to relevant domain knowledge retrieved from the investigation knowledge base.

CRITICAL INSTRUCTIONS:
1. USE THE PROVIDED KNOWLEDGE CONTEXT to enhance your analysis
2. Cross-reference your findings with the knowledge base information
3. Validate your conclusions against established fraud patterns from the knowledge
4. Reference specific knowledge sources when making determinations
5. If knowledge contradicts your initial analysis, explain the discrepancy
6. Leverage both your reasoning and the retrieved knowledge for comprehensive analysis

Knowledge Context Summary:
- Critical knowledge pieces: {len(knowledge_context.critical_knowledge)}
- Supporting knowledge pieces: {len(knowledge_context.supporting_knowledge)} 
- Background knowledge pieces: {len(knowledge_context.background_knowledge)}
- Knowledge sources: {', '.join(sorted(knowledge_context.knowledge_sources))}

Remember: The knowledge context provides expert domain knowledge to enhance your structured decision-making process.
=== END RAG ENHANCEMENT INSTRUCTIONS ===

"""

        enhanced_prompt += rag_instructions

        return enhanced_prompt

    async def _execute_enhanced_investigation(
        self,
        enhanced_prompt: str,
        context: StructuredInvestigationContext,
        config: RunnableConfig,
        knowledge_context: KnowledgeContext,
        specific_objectives: List[str] = None,
    ) -> DomainFindings:
        """
        Execute investigation with enhanced prompt using the base class method
        """

        # Import modules needed for investigation execution
        from langchain_core.messages import HumanMessage, SystemMessage

        from .structured_parsing import parse_structured_result

        # Create enhanced system message
        system_msg = SystemMessage(
            content=f"""
You are an intelligent fraud investigation agent specializing in {self.domain.upper()} ANALYSIS with RAG enhancement.

ENHANCED CAPABILITIES:
- Access to comprehensive domain knowledge from investigation knowledge base
- Structured tool selection based on investigation needs and knowledge insights
- Advanced reasoning with retrieved knowledge validation
- Cross-domain correlation and analysis with background knowledge
- Evidence-based risk assessment using established patterns
- Knowledge-augmented decision making

Your mission: Conduct a thorough {self.domain} analysis for fraud investigation {context.investigation_id} using both your structured reasoning and the provided knowledge context.

Key principles:
1. SELECT TOOLS AUTONOMOUSLY based on investigation needs AND knowledge insights
2. Use retrieved knowledge to validate and enhance your tool selection decisions
3. Cross-reference findings with provided domain knowledge
4. Focus on detecting fraud indicators using both reasoning and established patterns
5. MANDATORY: Follow the exact output format specified in the investigation prompt
6. MANDATORY: Calculate numerical risk_score from 0.0 to 1.0 based on evidence AND knowledge
7. Provide confidence scores considering both analysis and knowledge alignment
8. Document your tool selection rationale and knowledge utilization

Available tools: {', '.join(self.tool_map.keys())}
Knowledge context: {knowledge_context.total_chunks} relevant knowledge pieces available

IMPORTANT: The investigation prompt contains exact format requirements. Follow these precisely while leveraging both your structured capabilities and the retrieved knowledge context.

Remember: You have full autonomy to choose tools and analyze data, now enhanced with domain expertise from the knowledge base.
"""
        )

        try:
            # Import logging components
            from app.service.logging.autonomous_investigation_logger import (
                get_console_logger,
            )

            console_logger = get_console_logger()

            # Start enhanced investigation logging
            console_logger.start_investigation_logging(
                context.investigation_id,
                {
                    "domain": self.domain,
                    "entity_type": context.entity_type.value,
                    "entity_id": context.entity_id,
                    "objectives": specific_objectives or [],
                    "rag_enhanced": True,
                    "knowledge_chunks": knowledge_context.total_chunks,
                },
            )

            # Add final reminder about risk score
            final_enhanced_prompt = (
                enhanced_prompt
                + "\n\n⚠️ FINAL REMINDER: Include 'risk_score: X.XX' in your response (numerical value 0.0-1.0) - Enhanced with knowledge context"
            )

            # Log the RAG-enhanced prompt
            from app.service.agent.llm_formatter import LLMInteractionFormatter

            console_prompt, _ = LLMInteractionFormatter.format_console_interaction(
                self.domain,
                context.investigation_id,
                context.entity_id,
                final_enhanced_prompt,
                "",
            )
            logger.info(console_prompt)

            logger.info(
                f"        🤖🧠 Starting RAG-Enhanced {self.domain.title()} Agent analysis..."
            )
            logger.info(
                f"Starting RAG-enhanced structured {self.domain} investigation for {context.investigation_id}"
            )

            messages = [system_msg, HumanMessage(content=final_enhanced_prompt)]

            # Log enhanced LLM interaction
            logger.info(
                f"🤖🧠 RAG-ENHANCED LLM INTERACTION START: {self.domain.title()} Agent"
            )

            # Use the same investigation execution pattern as the base class
            # but with enhanced prompts and logging
            result = await self.llm_with_tools.ainvoke(messages, config=config)

            # Handle tool calls if present (same as base class)
            if hasattr(result, "tool_calls") and result.tool_calls:
                logger.info(
                    f"🔧🧠 RAG-Enhanced tool calls detected - executing with knowledge context"
                )

                from langchain_core.messages import ToolMessage

                tool_messages = []

                for tool_call in result.tool_calls:
                    tool_name = tool_call.get("name")
                    tool_args = tool_call.get("args", {})
                    tool_id = tool_call.get("id")

                    logger.info(f"🔧🧠 Executing RAG-enhanced tool: {tool_name}")

                    # Fix tool parameters to ensure correct naming
                    from app.service.agent.tools.tool_parameter_mapper import (
                        ToolParameterMapper,
                    )

                    fixed_args = ToolParameterMapper.fix_tool_parameters(
                        tool_name, tool_args
                    )

                    try:
                        if tool_name in self.tool_map:
                            tool = self.tool_map[tool_name]
                            tool_result = await tool.ainvoke(fixed_args)

                            tool_message = ToolMessage(
                                content=str(tool_result),
                                tool_call_id=tool_id,
                                name=tool_name,
                            )
                            tool_messages.append(tool_message)

                        else:
                            tool_message = ToolMessage(
                                content=f"Error: Tool {tool_name} not available",
                                tool_call_id=tool_id,
                                name=tool_name,
                            )
                            tool_messages.append(tool_message)

                    except Exception as e:
                        logger.error(
                            f"❌🧠 RAG-enhanced tool {tool_name} execution failed: {str(e)}"
                        )
                        tool_message = ToolMessage(
                            content=f"Tool execution failed: {str(e)}",
                            tool_call_id=tool_id,
                            name=tool_name,
                        )
                        tool_messages.append(tool_message)

                # Get final analysis with knowledge context
                analysis_messages = messages + [result] + tool_messages

                successful_tools = [
                    msg
                    for msg in tool_messages
                    if "Error:" not in msg.content and "failed:" not in msg.content
                ]

                if successful_tools:
                    follow_up_prompt = f"""
Based on the tool execution results and the provided knowledge context, provide your fraud analysis in the EXACT format below.

IMPORTANT: Your analysis should integrate:
1. Tool execution results
2. Retrieved knowledge context ({knowledge_context.total_chunks} knowledge pieces)
3. Your structured reasoning capabilities

YOU MUST USE THIS EXACT FORMAT - NO EXCEPTIONS:

1. Risk Level: [Choose: Low/Medium/High/Critical]
2. risk_score: [NUMBER between 0.0 and 1.0]
3. Specific fraud indicators found: [Your findings based on tools AND knowledge]
4. Confidence score: [NUMBER between 0-100]
5. Detailed reasoning: [Your analysis integrating tool results and knowledge context]
6. Recommended actions: [Your recommendations enhanced with domain knowledge]

CRITICAL REQUIREMENTS:
- You MUST include "risk_score: X.XX" where X.XX is a number between 0.0 and 1.0
- Use the actual data from tool results AND validate against knowledge context
- Reference knowledge sources that influenced your decision
- DO NOT provide any text outside this numbered format
- Start with "1. Risk Level:" immediately

MANDATORY: Begin your response with "1. Risk Level:" right now.
"""
                else:
                    follow_up_prompt = f"""
The tools encountered errors, but you have valuable knowledge context ({knowledge_context.total_chunks} pieces) to provide analysis.

Provide a {self.domain} fraud analysis based on:
- The investigation context provided
- Retrieved knowledge from the domain knowledge base
- General fraud patterns for {self.domain} analysis
- Risk assessment best practices enhanced with domain knowledge

YOU MUST USE THIS EXACT FORMAT - NO EXCEPTIONS:

1. Risk Level: [Choose: Low/Medium/High/Critical]
2. risk_score: [NUMBER between 0.0 and 1.0 - informed by knowledge context]
3. Specific fraud indicators found: [Based on knowledge context despite tool failures]
4. Confidence score: [NUMBER between 0-100 - factor in knowledge availability]
5. Detailed reasoning: [Explain how knowledge context informed your analysis despite tool failures]
6. Recommended actions: [Include: Fix tool connectivity, retry analysis, leverage knowledge insights]

CRITICAL REQUIREMENTS:
- You MUST include "risk_score: X.XX" informed by knowledge context
- Leverage the retrieved knowledge to compensate for tool failures
- Reference specific knowledge that influenced your assessment
- Start with "1. Risk Level:" immediately

MANDATORY: Begin your response with "1. Risk Level:" right now.
"""

                analysis_messages.append(HumanMessage(content=follow_up_prompt))

                logger.info(
                    f"🔍🧠 Requesting RAG-enhanced final analysis for {self.domain} domain"
                )

                from .autonomous_base import get_structured_llm

                final_result = await get_structured_llm().ainvoke(
                    analysis_messages, config=config
                )
                result = final_result

            else:
                # No tools used - ensure formatted response with knowledge context
                format_reminder_prompt = f"""
Your previous response may not have followed the required format. Using the provided knowledge context ({knowledge_context.total_chunks} pieces), provide your {self.domain} analysis in the EXACT format below.

YOU MUST USE THIS EXACT FORMAT - NO EXCEPTIONS:

1. Risk Level: [Choose: Low/Medium/High/Critical]
2. risk_score: [NUMBER between 0.0 and 1.0 - informed by knowledge]
3. Specific fraud indicators found: [Your findings enhanced with knowledge context]
4. Confidence score: [NUMBER between 0-100]
5. Detailed reasoning: [Your analysis leveraging domain knowledge]
6. Recommended actions: [Your recommendations enhanced with domain expertise]

CRITICAL REQUIREMENTS:
- You MUST include "risk_score: X.XX" where X.XX is informed by knowledge context
- Reference knowledge sources that influenced your decision
- DO NOT provide any text outside this numbered format
- Start with "1. Risk Level:" immediately

MANDATORY: Begin your response with "1. Risk Level:" right now.
"""

                format_messages = messages + [
                    result,
                    HumanMessage(content=format_reminder_prompt),
                ]

                logger.info(
                    f"🔍🧠 Requesting RAG-enhanced formatted response for {self.domain} domain"
                )

                from .autonomous_base import get_structured_llm

                formatted_result = await get_structured_llm().ainvoke(
                    format_messages, config=config
                )
                result = formatted_result

            # Parse results with enhanced logging
            findings = parse_structured_result(result, context, self.domain)

            # Enhanced completion logging
            risk_display = (
                "MISSING!"
                if findings.risk_score is None
                else f"{findings.risk_score:.3f}"
            )
            logger.info(
                f"        ✅🧠 RAG-Enhanced {self.domain.title()} Agent completed"
            )
            logger.info(
                f"           Risk Score: {risk_display} | Confidence: {findings.confidence:.2f} | Knowledge: {knowledge_context.total_chunks} chunks"
            )

            logger.info(
                f"✅🧠 RAG-ENHANCED {self.domain.upper()} INVESTIGATION COMPLETE: "
                f"risk_score={findings.risk_score:.2f}, "
                f"confidence={findings.confidence:.2f}, "
                f"findings={len(findings.key_findings)}, "
                f"knowledge_chunks={knowledge_context.total_chunks}"
            )

            return findings

        except Exception as e:
            logger.error(
                f"RAG-enhanced investigation execution failed for {self.domain}: {str(e)}"
            )
            raise  # Re-raise to trigger fallback in calling method

    def _augment_findings_with_rag_metadata(
        self, findings: DomainFindings, knowledge_context: KnowledgeContext
    ) -> DomainFindings:
        """
        Augment findings with RAG-related metadata
        """

        # Add RAG metadata to recommended actions
        rag_info = f"Analysis enhanced with {knowledge_context.total_chunks} domain knowledge pieces"
        findings.recommended_actions.append(rag_info)

        # Add knowledge source information if available
        if knowledge_context.knowledge_sources:
            sources_info = f"Knowledge sources consulted: {', '.join(sorted(knowledge_context.knowledge_sources))}"
            findings.key_findings.append(sources_info)

        # Mark data quality as enhanced if knowledge was used
        if knowledge_context.total_chunks > 0:
            if findings.data_quality == "good":
                findings.data_quality = "excellent"  # Upgrade quality with knowledge
            elif findings.data_quality == "fair":
                findings.data_quality = "good"

        return findings

    def _update_rag_stats(self, retrieval_time_ms: float, chunks_count: int) -> None:
        """Update RAG performance statistics"""

        # Update average retrieval time (simplified running average)
        investigations_count = self.rag_stats["investigations_with_rag"] + 1
        current_avg = self.rag_stats["avg_context_retrieval_time_ms"]
        new_avg = (
            (current_avg * (investigations_count - 1)) + retrieval_time_ms
        ) / investigations_count
        self.rag_stats["avg_context_retrieval_time_ms"] = new_avg

        # Update knowledge chunks count
        self.rag_stats["knowledge_chunks_used"] += chunks_count

    def get_rag_performance_stats(self) -> Dict[str, Any]:
        """Get RAG-specific performance statistics"""

        total_investigations = (
            self.rag_stats["investigations_with_rag"]
            + self.rag_stats["investigations_without_rag"]
        )

        rag_usage_rate = 0.0
        if total_investigations > 0:
            rag_usage_rate = (
                self.rag_stats["investigations_with_rag"] / total_investigations
            )

        avg_chunks_per_investigation = 0.0
        if self.rag_stats["investigations_with_rag"] > 0:
            avg_chunks_per_investigation = (
                self.rag_stats["knowledge_chunks_used"]
                / self.rag_stats["investigations_with_rag"]
            )

        return {
            "rag_status": {
                "enabled": self.enable_rag,
                "available": self.rag_available,
                "domain": self.domain,
            },
            "usage_statistics": self.rag_stats.copy(),
            "performance_metrics": {
                "rag_usage_rate": rag_usage_rate,
                "avg_chunks_per_investigation": avg_chunks_per_investigation,
                "total_investigations": total_investigations,
            },
        }

    async def clear_rag_cache(self) -> None:
        """Clear RAG-related caches"""
        if self.context_augmentor:
            await self.context_augmentor.clear_cache()
            logger.info(f"RAG cache cleared for {self.domain} agent")

    def is_rag_enhanced(self) -> bool:
        """Check if agent is RAG-enhanced and available"""
        return self.rag_available and self.enable_rag


# Factory function for creating RAG-enhanced agents
def create_rag_enhanced_agent(
    domain: str,
    tools: List[Any],
    rag_orchestrator: Optional[RAGOrchestrator] = None,
    enable_rag: bool = True,
    rag_config: Optional[ContextAugmentationConfig] = None,
) -> RAGEnhancedInvestigationAgent:
    """
    Create RAG-enhanced investigation agent

    Args:
        domain: Investigation domain
        tools: List of available tools
        rag_orchestrator: Optional RAG orchestrator
        enable_rag: Whether to enable RAG capabilities
        rag_config: Optional RAG configuration

    Returns:
        RAG-enhanced investigation agent
    """
    return RAGEnhancedInvestigationAgent(
        domain=domain,
        tools=tools,
        rag_orchestrator=rag_orchestrator,
        enable_rag=enable_rag,
        rag_config=rag_config,
    )
