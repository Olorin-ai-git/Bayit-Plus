"""
Agent Executor - Multi-step workflow execution using Claude's tool use.

Enhanced with:
- Session support for conversation continuity
- Dynamic ecosystem context injection
- Smart action modes (confirm destructive operations)
- Cumulative cost tracking across sessions
"""

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from anthropic import Anthropic
from anthropic.types import Message, TextBlock, ToolUseBlock
from pydantic import BaseModel, Field

from app.core.config import settings
from app.models.nlp_session import PendingAction
from app.services.nlp.tool_dispatcher import execute_tool
from app.services.nlp.tool_registry import get_all_tools, DESTRUCTIVE_TOOLS

logger = logging.getLogger(__name__)


class ToolCall(BaseModel):
    """Record of a single tool execution."""

    tool: str
    input: Dict[str, Any]
    output: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AgentExecutionResult(BaseModel):
    """Result of agent execution."""

    success: bool
    summary: str = Field(default="", description="Summary of execution")
    tool_calls: List[ToolCall] = Field(default_factory=list)
    total_cost: float = Field(default=0.0)
    iterations: int = Field(default=0)
    error: Optional[str] = None
    session_id: Optional[str] = None
    session_cost: Optional[float] = None
    pending_confirmations: List[Dict[str, Any]] = Field(default_factory=list)


class AgentExecutor:
    """
    Multi-step agent execution using Claude's tool use.

    Enhanced for interactive sessions with:
    - Conversation history from sessions
    - Dynamic ecosystem context
    - Smart action modes for safety
    """

    def __init__(self):
        """Initialize executor with Anthropic client."""
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is required for agent execution")

        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self._ecosystem_context_provider = None

    async def execute(
        self,
        query: str,
        platform: str = "bayit",
        dry_run: bool = False,
        max_iterations: int = 20,
        budget_limit_usd: float = 0.50,
        session_id: Optional[str] = None,
        action_mode: Literal["smart", "confirm_all"] = "smart",
        conversation_history: Optional[List[Dict[str, Any]]] = None,
    ) -> AgentExecutionResult:
        """
        Execute multi-step agent workflow.

        Args:
            query: User's natural language request
            platform: Target platform ("bayit", "fraud", "cvplus")
            dry_run: If True, preview without making changes
            max_iterations: Maximum tool uses before stopping
            budget_limit_usd: Maximum API cost before stopping
            session_id: Optional session ID for conversation continuity
            action_mode: "smart" (confirm destructive) or "confirm_all"
            conversation_history: Previous messages from session

        Returns:
            AgentExecutionResult with tool calls, cost, and pending confirmations
        """
        start_time = datetime.now(timezone.utc)

        logger.info(
            "nlp_agent_execution_started",
            extra={
                "query": query[:100],
                "platform": platform,
                "dry_run": dry_run,
                "session_id": session_id,
                "action_mode": action_mode,
            },
        )

        tools = get_all_tools(platform)
        ecosystem_context = await self._get_ecosystem_context(platform)
        system_prompt = self._build_system_prompt(platform, dry_run, ecosystem_context, action_mode)

        messages = self._build_initial_messages(
            query, platform, dry_run, max_iterations, budget_limit_usd, conversation_history
        )

        iteration = 0
        total_cost = 0.0
        tool_calls: List[ToolCall] = []
        pending_confirmations: List[Dict[str, Any]] = []
        completion_detected = False
        completion_summary = ""

        while iteration < max_iterations:
            iteration += 1
            logger.debug(f"Agent iteration {iteration}")

            try:
                response: Message = self.client.messages.create(
                    model=settings.CLAUDE_MODEL,
                    max_tokens=4096,
                    tools=tools,
                    messages=messages,
                    system=system_prompt,
                )

                cost = self._calculate_cost(response.usage)
                total_cost += cost

                logger.debug(
                    f"Tokens: {response.usage.input_tokens} in, "
                    f"{response.usage.output_tokens} out (cost: ${cost:.4f})"
                )

                if total_cost > budget_limit_usd:
                    logger.warning(f"Budget limit reached: ${total_cost:.4f}")
                    break

                messages.append({"role": "assistant", "content": response.content})

                tool_outputs = []
                for block in response.content:
                    if isinstance(block, ToolUseBlock):
                        tool_result = await self._handle_tool_call(
                            block=block,
                            platform=platform,
                            dry_run=dry_run,
                            action_mode=action_mode,
                            session_id=session_id,
                            tool_calls=tool_calls,
                            pending_confirmations=pending_confirmations,
                        )
                        tool_outputs.append(tool_result)

                    elif isinstance(block, TextBlock):
                        if "TASK_COMPLETE" in block.text or "WORKFLOW_FINISHED" in block.text:
                            completion_detected = True
                            completion_summary = self._extract_summary(block.text)
                            logger.info(f"Completion detected: {completion_summary[:100]}")

                if tool_outputs and not completion_detected:
                    messages.append({"role": "user", "content": tool_outputs})

                if completion_detected:
                    break

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
                    iterations=iteration,
                    session_id=session_id,
                    pending_confirmations=[self._serialize_pending(p) for p in pending_confirmations],
                )

        execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()

        logger.info(
            "nlp_agent_execution_complete",
            extra={
                "session_id": session_id,
                "iterations": iteration,
                "tool_calls": len(tool_calls),
                "total_cost": total_cost,
                "execution_time_seconds": execution_time,
                "success": completion_detected,
                "pending_confirmations": len(pending_confirmations),
            },
        )

        return AgentExecutionResult(
            success=completion_detected,
            summary=completion_summary or "Agent execution incomplete",
            tool_calls=tool_calls,
            total_cost=total_cost,
            iterations=iteration,
            session_id=session_id,
            pending_confirmations=[self._serialize_pending(p) for p in pending_confirmations],
        )

    async def _handle_tool_call(
        self,
        block: ToolUseBlock,
        platform: str,
        dry_run: bool,
        action_mode: str,
        session_id: Optional[str],
        tool_calls: List[ToolCall],
        pending_confirmations: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Handle a tool call, checking for destructive operations."""
        tool_name = block.name
        tool_input = block.input

        is_destructive = tool_name in DESTRUCTIVE_TOOLS
        needs_confirmation = is_destructive or (action_mode == "confirm_all" and not self._is_read_only(tool_name))

        if needs_confirmation and not dry_run:
            context_hash = self._compute_context_hash(platform, tool_name, tool_input)
            pending = {
                "action_id": f"{tool_name}_{block.id}",
                "action_type": tool_name,
                "description": self._describe_action(tool_name, tool_input),
                "parameters": tool_input,
                "context_snapshot": context_hash,
                "tool_use_id": block.id,
            }
            pending_confirmations.append(pending)

            result = (
                f"[CONFIRMATION REQUIRED] This action requires confirmation: {tool_name}\n"
                f"Description: {pending['description']}\n"
                f"Action ID: {pending['action_id']}\n"
                f"Use 'confirm {pending['action_id']}' to execute this action."
            )

            tool_calls.append(
                ToolCall(tool=tool_name, input=tool_input, output="[PENDING CONFIRMATION]")
            )

            return {"type": "tool_result", "tool_use_id": block.id, "content": result}

        logger.info(f"Executing tool: {tool_name}")
        start = datetime.now(timezone.utc)
        result = await execute_tool(
            tool_name=tool_name,
            tool_input=tool_input,
            platform=platform,
            dry_run=dry_run,
        )
        duration_ms = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)

        tool_calls.append(ToolCall(tool=tool_name, input=tool_input, output=result))

        logger.debug(f"Tool {tool_name} completed in {duration_ms}ms")

        return {"type": "tool_result", "tool_use_id": block.id, "content": result}

    async def execute_confirmed_action(
        self,
        action: PendingAction,
        platform: str,
    ) -> str:
        """Execute a confirmed pending action."""
        current_hash = self._compute_context_hash(
            platform, action.action_type, action.parameters
        )

        if current_hash != action.context_snapshot:
            raise ValueError(
                "Context has changed since action was proposed. Please retry the request."
            )

        logger.info(
            "nlp_action_executed",
            extra={
                "action_type": action.action_type,
                "action_id": action.action_id,
                "parameters": self._sanitize_params(action.parameters),
            },
        )

        result = await execute_tool(
            tool_name=action.action_type,
            tool_input=action.parameters,
            platform=platform,
            dry_run=False,
        )

        return result

    async def _get_ecosystem_context(self, platform: str) -> str:
        """Get dynamic ecosystem context for the prompt."""
        try:
            from app.services.nlp.ecosystem_context import get_ecosystem_context_provider

            provider = get_ecosystem_context_provider()
            context = await provider.get_full_context(platform)
            return context.to_prompt_section()
        except Exception as e:
            logger.warning(f"Failed to get ecosystem context: {e}")
            return ""

    def _build_initial_messages(
        self,
        query: str,
        platform: str,
        dry_run: bool,
        max_iterations: int,
        budget_limit_usd: float,
        conversation_history: Optional[List[Dict[str, Any]]],
    ) -> List[Dict[str, Any]]:
        """Build initial message list including any conversation history."""
        messages: List[Dict[str, Any]] = []

        if conversation_history:
            messages.extend(conversation_history)

        user_message = f"""Execute this request: "{query}"

Platform: {platform}
Mode: {'DRY RUN (preview only)' if dry_run else 'LIVE (will make real changes)'}
Max iterations: {max_iterations}
Budget limit: ${budget_limit_usd}

Think step-by-step and use available tools to complete this request.
When done, respond with "TASK_COMPLETE: [summary]"
"""
        messages.append({"role": "user", "content": user_message})

        return messages

    def _build_system_prompt(
        self,
        platform: str,
        dry_run: bool,
        ecosystem_context: str,
        action_mode: str,
    ) -> str:
        """Build system prompt for agent execution."""
        mode_instruction = ""
        if dry_run:
            mode_instruction = """
CRITICAL: You are in DRY RUN mode. DO NOT make any actual changes.
- Only preview what would be done
- Set dry_run=true in tool calls
- Mark all results as [DRY RUN]
"""

        action_mode_instruction = ""
        if action_mode == "smart":
            action_mode_instruction = """
ACTION MODE: Smart
- Read operations execute immediately
- Write operations execute immediately
- DESTRUCTIVE operations (deploy, git push, delete) require user confirmation
"""
        elif action_mode == "confirm_all":
            action_mode_instruction = """
ACTION MODE: Confirm All
- Read operations execute immediately
- ALL write and destructive operations require user confirmation
"""

        static_context = f"""
## OLORIN ECOSYSTEM CONTEXT

You are part of the Olorin platform ecosystem:

**Platforms:**
- **Bayit+** (bayit): Jewish streaming platform - TV series, movies, podcasts, radio
- **Fraud Detection** (fraud): AI-powered fraud detection and investigation
- **CV Plus** (cvplus): Professional CV/resume builder

**Current Platform:** {platform}

**Infrastructure:**
- MongoDB Atlas: Content database
- Google Cloud Storage: Media files
- Firebase: Authentication, hosting
- Anthropic Claude: AI/ML capabilities
- ElevenLabs: Text-to-speech
"""

        return f"""You are an autonomous AI agent for the Olorin platform ecosystem.

Current Platform: {platform}
Mode: {'DRY RUN' if dry_run else 'LIVE EXECUTION'}

{mode_instruction}
{action_mode_instruction}

{static_context}

{ecosystem_context}

## WORKFLOW

1. **Understand**: Parse the user's request
2. **Plan**: Determine which tools to use
3. **Execute**: Call tools with appropriate parameters
4. **Respond**: Provide natural language summary
5. **Complete**: End with "TASK_COMPLETE: [summary]"

## GUIDELINES

- Use available tools to accomplish tasks
- Handle errors gracefully
- Be efficient with tool calls
- Explain what you're doing
- Complete the task fully before marking done

Remember: For destructive operations, the system will require confirmation.
Execute the user's request and respond naturally.
"""

    def _calculate_cost(self, usage) -> float:
        """Calculate cost for API call (Claude Sonnet pricing)."""
        input_cost = (usage.input_tokens / 1_000_000) * 3.00
        output_cost = (usage.output_tokens / 1_000_000) * 15.00
        return input_cost + output_cost

    def _extract_summary(self, text: str) -> str:
        """Extract summary from completion text."""
        if "TASK_COMPLETE:" in text:
            return text.split("TASK_COMPLETE:", 1)[1].strip()
        elif "WORKFLOW_FINISHED:" in text:
            return text.split("WORKFLOW_FINISHED:", 1)[1].strip()
        return text.strip()

    def _is_read_only(self, tool_name: str) -> bool:
        """Check if a tool is read-only."""
        read_only_tools = {
            "search_bayit_content",
            "get_content_stats",
            "web_search",
            "read_file",
            "list_directory",
            "git_status",
            "git_diff",
            "git_log",
        }
        return tool_name in read_only_tools

    def _describe_action(self, tool_name: str, tool_input: Dict[str, Any]) -> str:
        """Generate human-readable description of an action."""
        descriptions = {
            "deploy_platform": lambda p: f"Deploy to {p.get('environment', 'unknown')} environment",
            "git_push": lambda p: f"Push changes to remote (force={p.get('force', False)})",
            "git_commit": lambda p: f"Commit with message: {p.get('message', '')[:50]}",
            "update_content_metadata": lambda p: f"Update metadata for content {p.get('content_id', '')}",
            "delete_content": lambda p: f"Delete content {p.get('content_id', '')}",
        }

        if tool_name in descriptions:
            return descriptions[tool_name](tool_input)
        return f"Execute {tool_name} with parameters"

    def _compute_context_hash(
        self, platform: str, tool_name: str, tool_input: Dict[str, Any]
    ) -> str:
        """Compute hash of context for action validation."""
        context_str = f"{platform}:{tool_name}:{sorted(tool_input.items())}"
        return hashlib.sha256(context_str.encode()).hexdigest()[:16]

    def _serialize_pending(self, pending: Dict[str, Any]) -> Dict[str, Any]:
        """Serialize pending action for API response."""
        return {
            "action_id": pending["action_id"],
            "action_type": pending["action_type"],
            "description": pending["description"],
            "parameters": pending.get("parameters", {}),
        }

    def _sanitize_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive data from parameters for logging."""
        sensitive_keys = {"password", "secret", "token", "key", "credential"}
        return {
            k: "[REDACTED]" if any(s in k.lower() for s in sensitive_keys) else v
            for k, v in params.items()
        }
