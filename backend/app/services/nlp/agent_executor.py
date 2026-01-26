"""
Agent Executor - Multi-step workflow execution using Claude's tool use.

Supports complex workflows like:
- "analyze fraud platform December 2024 and email report"
- "generate PDF with CV Plus statistics"
- "find and update poster for Radio Galatz"
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from anthropic import Anthropic
from anthropic.types import Message, TextBlock, ToolUseBlock
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.nlp.tool_dispatcher import execute_tool
from app.services.nlp.tool_registry import get_all_tools

logger = logging.getLogger(__name__)


class ToolCall(BaseModel):
    """Record of a single tool execution."""

    tool: str
    input: Dict[str, Any]
    output: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AgentExecutionResult(BaseModel):
    """Result of agent execution."""

    success: bool
    summary: str = Field(default="", description="Summary of execution")
    tool_calls: List[ToolCall] = Field(default_factory=list)
    total_cost: float = Field(default=0.0)
    iterations: int = Field(default=0)
    error: Optional[str] = None


class AgentExecutor:
    """
    Multi-step agent execution using Claude's tool use.

    Follows the pattern from app.services.ai_agent.agent.py but adapted
    for general NLP workflows across all platforms.
    """

    def __init__(self):
        """Initialize executor with Anthropic client."""
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is required for agent execution")

        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def execute(
        self,
        query: str,
        platform: str = "bayit",
        dry_run: bool = False,
        max_iterations: int = 20,
        budget_limit_usd: float = 0.50
    ) -> AgentExecutionResult:
        """
        Execute multi-step agent workflow.

        The agent will:
        1. Understand the query and plan steps
        2. Use tools to gather data (web search, database queries, etc.)
        3. Perform transformations (generate PDFs, analyze data)
        4. Take actions (send emails, update content)
        5. Provide completion summary

        Args:
            query: User's natural language request
            platform: Target platform ("bayit", "fraud", "cvplus")
            dry_run: If True, preview without making changes
            max_iterations: Maximum tool uses before stopping
            budget_limit_usd: Maximum API cost before stopping

        Returns:
            AgentExecutionResult with tool calls, cost, and summary

        Example:
            >>> executor = AgentExecutor()
            >>> result = await executor.execute(
            ...     query="find series about Jewish holidays and update posters",
            ...     platform="bayit",
            ...     dry_run=False
            ... )
            >>> print(result.summary)
        """
        start_time = datetime.utcnow()

        logger.info("=" * 80)
        logger.info(f"Starting Agent Execution")
        logger.info(f"   Query: {query}")
        logger.info(f"   Platform: {platform}")
        logger.info(f"   Mode: {'DRY RUN' if dry_run else 'LIVE'}")
        logger.info(f"   Max iterations: {max_iterations}")
        logger.info(f"   Budget limit: ${budget_limit_usd}")
        logger.info("=" * 80)

        # Get available tools for platform
        tools = get_all_tools(platform)

        # Build system prompt
        system_prompt = self._build_system_prompt(platform, dry_run)

        # Initialize conversation
        conversation_history: List[Dict[str, Any]] = [{
            "role": "user",
            "content": f"""Execute this request: "{query}"

Platform: {platform}
Mode: {'DRY RUN (preview only, do not make changes)' if dry_run else 'LIVE (will make real changes)'}
Max iterations: {max_iterations}
Budget limit: ${budget_limit_usd}

Think step-by-step and use the available tools to complete this request.
When done, respond with "TASK_COMPLETE: [summary of what was accomplished]"
"""
        }]

        # Initialize tracking
        iteration = 0
        total_cost = 0.0
        tool_calls: List[ToolCall] = []
        completion_detected = False
        completion_summary = ""

        # Agent loop
        while iteration < max_iterations:
            iteration += 1

            logger.info(f"\n--- Iteration {iteration} ---")

            try:
                # Call Claude with tools
                response: Message = self.client.messages.create(
                    model=settings.CLAUDE_MODEL,
                    max_tokens=4096,
                    tools=tools,
                    messages=conversation_history,
                    system=system_prompt
                )

                # Track cost
                cost = self._calculate_cost(response.usage)
                total_cost += cost

                logger.info(
                    f"Tokens: {response.usage.input_tokens} in, "
                    f"{response.usage.output_tokens} out "
                    f"(cost: ${cost:.4f}, total: ${total_cost:.4f})"
                )

                # Check budget
                if total_cost > budget_limit_usd:
                    logger.warning(f"Budget limit reached: ${total_cost:.4f} > ${budget_limit_usd}")
                    break

                # Add assistant message to history
                assistant_message = {"role": "assistant", "content": response.content}
                conversation_history.append(assistant_message)

                # Process tool calls and text responses
                tool_outputs = []
                for block in response.content:
                    if isinstance(block, ToolUseBlock):
                        # Execute tool
                        logger.info(f"Executing tool: {block.name}")
                        result = await execute_tool(
                            tool_name=block.name,
                            tool_input=block.input,
                            platform=platform,
                            dry_run=dry_run
                        )

                        # Record tool call
                        tool_calls.append(ToolCall(
                            tool=block.name,
                            input=block.input,
                            output=result
                        ))

                        # Add to tool outputs
                        tool_outputs.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result
                        })

                        logger.info(f"Tool result: {result[:200]}...")

                    elif isinstance(block, TextBlock):
                        # Check for completion signal
                        if "TASK_COMPLETE" in block.text or "WORKFLOW_FINISHED" in block.text:
                            completion_detected = True
                            # Extract summary (text after completion marker)
                            if "TASK_COMPLETE:" in block.text:
                                completion_summary = block.text.split("TASK_COMPLETE:", 1)[1].strip()
                            elif "WORKFLOW_FINISHED:" in block.text:
                                completion_summary = block.text.split("WORKFLOW_FINISHED:", 1)[1].strip()
                            else:
                                completion_summary = block.text.strip()

                            logger.info(f"Completion detected: {completion_summary}")

                # If we have tool outputs, continue conversation
                if tool_outputs and not completion_detected:
                    conversation_history.append({"role": "user", "content": tool_outputs})

                # If completion detected, exit loop
                if completion_detected:
                    logger.info("Agent completed task successfully")
                    break

                # If no tools and no completion, something's wrong
                if not tool_outputs and not completion_detected:
                    logger.warning("Agent didn't use tools or complete")
                    break

            except Exception as e:
                logger.error(f"Error in iteration {iteration}: {e}")
                return AgentExecutionResult(
                    success=False,
                    error=str(e),
                    tool_calls=tool_calls,
                    total_cost=total_cost,
                    iterations=iteration
                )

        # Build final result
        end_time = datetime.utcnow()
        execution_time = (end_time - start_time).total_seconds()

        logger.info("=" * 80)
        logger.info("Agent Execution Complete")
        logger.info(f"   Iterations: {iteration}")
        logger.info(f"   Tool calls: {len(tool_calls)}")
        logger.info(f"   Total cost: ${total_cost:.4f}")
        logger.info(f"   Execution time: {execution_time:.2f}s")
        logger.info(f"   Status: {'Success' if completion_detected else 'Incomplete'}")
        logger.info("=" * 80)

        return AgentExecutionResult(
            success=completion_detected,
            summary=completion_summary or "Agent execution incomplete",
            tool_calls=tool_calls,
            total_cost=total_cost,
            iterations=iteration
        )

    def _build_system_prompt(self, platform: str, dry_run: bool) -> str:
        """Build system prompt for agent execution."""

        mode_instruction = ""
        if dry_run:
            mode_instruction = """
CRITICAL: You are in DRY RUN mode. DO NOT make any actual changes.
- Only preview what would be done
- Return descriptions of actions without executing them
- Mark all tool results as [DRY RUN]
"""

        return f"""You are an autonomous AI agent for the Olorin platform.

Platform: {platform}
Mode: {'DRY RUN' if dry_run else 'LIVE'}

{mode_instruction}

Your goal is to understand user requests and execute them using the available tools.

Workflow:
1. Understand the user's request
2. Plan the steps needed to accomplish it
3. Execute tools one by one
4. Gather results and adapt your strategy
5. When complete, respond with "TASK_COMPLETE: [summary]"

Guidelines:
- Think step-by-step before acting
- Use tools to gather information, not assumptions
- If a tool fails, try alternative approaches
- Be efficient - minimize unnecessary tool calls
- Provide clear summaries of what was done
- Always complete with "TASK_COMPLETE: ..." when done

Available tools will handle:
- Web search and data gathering
- Content library search and updates
- File operations and downloads
- Email sending and PDF generation
- Platform-specific operations

Execute the user's request thoroughly and report completion.
"""

    def _calculate_cost(self, usage) -> float:
        """
        Calculate cost for API call.

        Claude Sonnet 4.5 pricing:
        - Input: $3.00 / million tokens
        - Output: $15.00 / million tokens
        """
        input_cost = (usage.input_tokens / 1_000_000) * 3.00
        output_cost = (usage.output_tokens / 1_000_000) * 15.00
        return input_cost + output_cost
