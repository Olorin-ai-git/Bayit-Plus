"""
AI Agent - Main Agent Loop

The autonomous agent loop that orchestrates Claude's tool use for library audits.
"""

import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List

from beanie import PydanticObjectId
from anthropic import Anthropic
from anthropic.types import Message, ToolUseBlock, TextBlock

from app.core.config import settings
from app.models.librarian import AuditReport
from app.services.audit_task_manager import audit_task_manager
from app.services.ai_agent.logger import log_to_database, clear_title_cache
from app.services.ai_agent.tools import TOOLS
from app.services.ai_agent.dispatcher import execute_tool
from app.services.ai_agent.summary_logger import log_comprehensive_summary
from app.services.ai_agent.prompts import (
    LANGUAGE_INSTRUCTIONS,
    AUDIT_INSTRUCTIONS,
    get_enabled_capabilities,
    build_task_specific_initial_prompt,
    build_comprehensive_initial_prompt,
)

logger = logging.getLogger(__name__)

# Initialize Anthropic client
client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)


async def run_ai_agent_audit(
    audit_type: str = "ai_agent",
    dry_run: bool = True,
    max_iterations: int = 50,
    budget_limit_usd: float = 1.0,
    language: str = "en",
    last_24_hours_only: bool = False,
    cyb_titles_only: bool = False,
    tmdb_posters_only: bool = False,
    opensubtitles_enabled: bool = False,
    classify_only: bool = False,
    remove_duplicates: bool = False,
    audit_id: Optional[str] = None
) -> AuditReport:
    """
    Run a fully autonomous AI agent audit using Claude's tool use.

    This agent will:
    1. Decide what content to inspect
    2. Discover issues using its reasoning
    3. Choose which fixes to apply
    4. Adapt its strategy based on findings
    5. Provide a comprehensive summary

    Safety limits:
    - max_iterations: Maximum tool uses (default 50)
    - budget_limit_usd: Maximum Claude API cost (default $1)
    - dry_run: If True, agent can't modify data
    - language: Language code for insights (en, es, he)
    """

    start_time = datetime.utcnow()

    # Clear the content title cache for fresh lookups
    clear_title_cache()

    # Get or create audit report
    audit_report = await _get_or_create_audit_report(audit_id, start_time, audit_type)
    audit_id = str(audit_report.id)

    # Log startup
    await _log_startup(audit_report, audit_type, dry_run, max_iterations, budget_limit_usd)

    logger.info("=" * 80)
    logger.info("Starting AI Agent Audit")
    logger.info(f"   Audit ID: {audit_id}")
    logger.info(f"   Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    logger.info(f"   Max iterations: {max_iterations}")
    logger.info(f"   Budget limit: ${budget_limit_usd}")
    logger.info("=" * 80)

    # Initialize tracking
    tool_uses: List[Dict[str, Any]] = []
    total_cost = 0.0
    conversation_history: List[Dict[str, Any]] = []

    # Build initial prompt
    initial_prompt = _build_initial_prompt(
        language=language,
        audit_type=audit_type,
        dry_run=dry_run,
        max_iterations=max_iterations,
        budget_limit_usd=budget_limit_usd,
        last_24_hours_only=last_24_hours_only,
        cyb_titles_only=cyb_titles_only,
        tmdb_posters_only=tmdb_posters_only,
        opensubtitles_enabled=opensubtitles_enabled,
        classify_only=classify_only,
        remove_duplicates=remove_duplicates,
    )

    # Add initial message to conversation
    conversation_history.append({
        "role": "user",
        "content": initial_prompt
    })

    # Agent loop
    iteration = 0
    audit_complete = False
    completion_summary = None

    while iteration < max_iterations and not audit_complete:
        iteration += 1

        # Check for cancellation/pause at each iteration
        if audit_id:
            await audit_task_manager.check_should_continue(audit_id)

        logger.info(f"\nIteration {iteration}/{max_iterations}")

        try:
            # Call Claude with tools
            response: Message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                tools=TOOLS,
                messages=conversation_history
            )

            # Estimate cost (rough approximation)
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            cost = (input_tokens * 0.000003) + (output_tokens * 0.000015)
            total_cost += cost

            logger.info(f"   Tokens: {input_tokens} in, {output_tokens} out (cost: ${cost:.4f}, total: ${total_cost:.4f})")

            # Check budget
            if total_cost > budget_limit_usd:
                logger.warning(f"Budget limit reached: ${total_cost:.4f} > ${budget_limit_usd}")
                break

            # Process response
            assistant_message = {"role": "assistant", "content": response.content}
            conversation_history.append(assistant_message)

            # Process tool calls
            tool_results = []
            audit_complete, completion_summary, tool_results = await _process_response_blocks(
                response=response,
                audit_report=audit_report,
                audit_id=audit_id,
                dry_run=dry_run,
                iteration=iteration,
                tool_uses=tool_uses,
            )

            # If we have tool results, continue conversation
            if tool_results and not audit_complete:
                conversation_history.append({
                    "role": "user",
                    "content": tool_results
                })

            # If Claude didn't use any tools and didn't complete, something's wrong
            elif not tool_results and not audit_complete:
                logger.warning("Claude didn't use any tools or complete the audit")
                break

        except Exception as e:
            logger.error(f"Error in agent loop iteration {iteration}: {str(e)}")
            break

    # Finalize audit report
    end_time = datetime.utcnow()
    execution_time = (end_time - start_time).total_seconds()

    await _finalize_audit_report(
        audit_report=audit_report,
        audit_complete=audit_complete,
        completion_summary=completion_summary,
        execution_time=execution_time,
        iteration=iteration,
        tool_uses=tool_uses,
        total_cost=total_cost,
        end_time=end_time,
    )

    logger.info("=" * 80)
    logger.info("AI Agent Audit Complete")
    logger.info(f"   Iterations: {iteration}")
    logger.info(f"   Tool uses: {len(tool_uses)}")
    logger.info(f"   Total cost: ${total_cost:.4f}")
    logger.info(f"   Execution time: {execution_time:.2f}s")
    logger.info(f"   Status: {audit_report.status}")
    logger.info("=" * 80)

    return audit_report


async def _get_or_create_audit_report(
    audit_id: Optional[str],
    start_time: datetime,
    audit_type: str
) -> AuditReport:
    """Get existing audit report or create a new one."""
    if audit_id:
        try:
            # Try to find by _id first (MongoDB ObjectId)
            try:
                object_id = PydanticObjectId(audit_id)
                audit_report = await AuditReport.get(object_id)
            except Exception:
                # If not a valid ObjectId, search by audit_id field
                audit_report = await AuditReport.find_one({"audit_id": audit_id})
        except Exception as e:
            raise ValueError(f"Invalid audit_id format or not found: {e}")

        if not audit_report:
            raise ValueError(f"Audit report with id {audit_id} not found")

        logger.info(f"Using existing audit report: {audit_id}")
        # Ensure it has execution_logs field
        if not hasattr(audit_report, 'execution_logs') or audit_report.execution_logs is None:
            audit_report.execution_logs = []
    else:
        # Create new audit with legacy string ID format
        legacy_audit_id = f"ai-agent-{int(start_time.timestamp())}"
        audit_report = AuditReport(
            audit_id=legacy_audit_id,
            audit_date=start_time,
            audit_type=audit_type,
            status="in_progress",
            execution_logs=[]
        )
        await audit_report.insert()

    return audit_report


async def _log_startup(
    audit_report: AuditReport,
    audit_type: str,
    dry_run: bool,
    max_iterations: int,
    budget_limit_usd: float
):
    """Log audit startup information."""
    await log_to_database(audit_report, "info", f"Audit started: {audit_type}", "Librarian")
    await log_to_database(audit_report, "info", f"Mode: {'DRY RUN' if dry_run else 'LIVE'}", "Librarian")
    await log_to_database(audit_report, "info", f"Max iterations: {max_iterations}, Budget: ${budget_limit_usd}", "Librarian")

    # Check TMDB configuration
    if not settings.TMDB_API_KEY:
        await log_to_database(
            audit_report,
            "warn",
            "TMDB API key not configured - metadata fixes will fail. Set TMDB_API_KEY environment variable.",
            "System"
        )
        logger.warning("TMDB API key not configured - metadata fixes will not work")
    else:
        await log_to_database(audit_report, "info", "TMDB API configured", "System")


def _build_initial_prompt(
    language: str,
    audit_type: str,
    dry_run: bool,
    max_iterations: int,
    budget_limit_usd: float,
    last_24_hours_only: bool,
    cyb_titles_only: bool,
    tmdb_posters_only: bool,
    opensubtitles_enabled: bool,
    classify_only: bool,
    remove_duplicates: bool,
) -> str:
    """
    Build the initial prompt based on audit configuration.

    Uses ADDITIVE capability model where multiple capabilities can be combined.
    If no capabilities are enabled, runs a comprehensive audit.
    """
    language_instruction = LANGUAGE_INSTRUCTIONS.get(language, "Communicate in English.")

    # Get list of enabled capabilities using the additive model
    enabled_capabilities = get_enabled_capabilities(
        cyb_titles_only=cyb_titles_only,
        tmdb_posters_only=tmdb_posters_only,
        opensubtitles_enabled=opensubtitles_enabled,
        classify_only=classify_only,
        remove_duplicates=remove_duplicates,
    )

    # If any capabilities are enabled, use task-specific (focused) mode
    # If no capabilities enabled, use comprehensive mode
    is_task_specific = len(enabled_capabilities) > 0 or audit_type == "daily_maintenance"

    # Build filter instructions for comprehensive mode
    filter_instructions = ""
    if last_24_hours_only:
        filter_instructions = "\n**TIME FILTER:** Focus ONLY on content added/modified in the last 24 hours\n"

    if is_task_specific and enabled_capabilities:
        # ADDITIVE mode: combine selected capabilities
        return build_task_specific_initial_prompt(
            language_instruction=language_instruction,
            enabled_capabilities=enabled_capabilities,
            dry_run=dry_run,
            max_iterations=max_iterations,
            budget_limit_usd=budget_limit_usd
        )
    else:
        # Comprehensive mode: check everything
        audit_specific_instruction = AUDIT_INSTRUCTIONS.get(audit_type, AUDIT_INSTRUCTIONS["ai_agent"])
        return build_comprehensive_initial_prompt(
            language_instruction=language_instruction,
            audit_specific_instruction=audit_specific_instruction,
            filter_instructions=filter_instructions,
            dry_run=dry_run,
            max_iterations=max_iterations,
            budget_limit_usd=budget_limit_usd
        )


async def _process_response_blocks(
    response: Message,
    audit_report: AuditReport,
    audit_id: str,
    dry_run: bool,
    iteration: int,
    tool_uses: List[Dict[str, Any]],
) -> tuple[bool, Optional[Dict[str, Any]], List[Dict[str, Any]]]:
    """Process response content blocks and execute tools."""
    tool_results = []
    audit_complete = False
    completion_summary = None

    for block in response.content:
        if isinstance(block, TextBlock):
            # Log Claude's thinking to database
            await log_to_database(audit_report, "info", block.text[:300], "AI Agent")
            logger.info(f"Claude: {block.text[:200]}...")

        elif isinstance(block, ToolUseBlock):
            tool_name = block.name
            tool_input = block.input

            # Extract item name from tool input if available
            item_name = None
            content_id = None

            if isinstance(tool_input, dict):
                item_name = (
                    tool_input.get("title") or
                    tool_input.get("content_title") or
                    tool_input.get("name") or
                    tool_input.get("item_title")
                )
                content_id = (
                    tool_input.get("content_id") or
                    tool_input.get("id") or
                    tool_input.get("item_id")
                )

            # Log tool use START
            await log_to_database(
                audit_report,
                "info",
                f"TOOL START: {tool_name}",
                "AI Agent",
                item_name=item_name,
                content_id=content_id,
                metadata={"tool_input": tool_input}
            )

            logger.info(f"Claude wants to use: {tool_name}")
            logger.info(f"   Input: {json.dumps(tool_input, ensure_ascii=False)[:200]}")

            # Check for completion
            if tool_name == "complete_audit":
                audit_complete = True
                completion_summary = tool_input
                await log_to_database(
                    audit_report,
                    "success",
                    "TOOL COMPLETE: complete_audit - Audit finished successfully",
                    "AI Agent"
                )
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps({"success": True, "message": "Audit completed successfully!"})
                })
                break

            # Execute tool
            result = await execute_tool(tool_name, tool_input, audit_id, dry_run)

            # Extract item info from result if not already set
            if not item_name and isinstance(result, dict):
                item_name = (
                    result.get("title") or
                    result.get("content_title") or
                    result.get("name") or
                    result.get("item_title")
                )
            if not content_id and isinstance(result, dict):
                content_id = (
                    result.get("content_id") or
                    result.get("id") or
                    result.get("item_id")
                )

            # Log tool result
            await _log_tool_result(audit_report, tool_name, result, item_name, content_id)

            # Track tool use
            tool_uses.append({
                "iteration": iteration,
                "tool": tool_name,
                "input": tool_input,
                "result": result,
                "timestamp": datetime.utcnow()
            })

            # Add result to conversation
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": json.dumps(result, ensure_ascii=False)
            })

            logger.info(f"   Result: {json.dumps(result, ensure_ascii=False)[:200]}")

    return audit_complete, completion_summary, tool_results


async def _log_tool_result(
    audit_report: AuditReport,
    tool_name: str,
    result: Dict[str, Any],
    item_name: Optional[str],
    content_id: Optional[str]
):
    """Log tool execution result."""
    if result.get("success") is False:
        error_msg = result.get("error", "Unknown error")
        await log_to_database(
            audit_report,
            "error",
            f"TOOL FAILED: {tool_name} - {error_msg}",
            "AI Agent",
            item_name=item_name,
            content_id=content_id,
            metadata={"tool_result": result}
        )
        logger.error(f"   Tool failed: {error_msg}")
    elif result.get("success") is True:
        success_msg = result.get("message", "Success")
        await log_to_database(
            audit_report,
            "success",
            f"TOOL SUCCESS: {tool_name} - {success_msg}",
            "AI Agent",
            item_name=item_name,
            content_id=content_id,
            metadata={"tool_result": result}
        )
        logger.info(f"   Tool succeeded: {success_msg}")
    else:
        await log_to_database(
            audit_report,
            "info",
            f"TOOL RESULT: {tool_name}",
            "AI Agent",
            item_name=item_name,
            content_id=content_id,
            metadata={"tool_result": result}
        )
        logger.info("   Tool returned data")


async def _finalize_audit_report(
    audit_report: AuditReport,
    audit_complete: bool,
    completion_summary: Optional[Dict[str, Any]],
    execution_time: float,
    iteration: int,
    tool_uses: List[Dict[str, Any]],
    total_cost: float,
    end_time: datetime,
):
    """Finalize and save the audit report."""
    # Extract summary from completion if available
    if completion_summary:
        total_items = completion_summary.get("items_checked", 0)
        issues_found = completion_summary.get("issues_found", 0)
        summary = {
            "total_items": total_items,
            "healthy_items": max(0, total_items - issues_found),
            "issues_found": issues_found,
            "issues_fixed": completion_summary.get("issues_fixed", 0),
            "manual_review_needed": completion_summary.get("flagged_for_review", 0),
            "agent_summary": completion_summary.get("summary", ""),
            "recommendations": completion_summary.get("recommendations", []),
            # Enhanced comprehensive statistics
            "subtitle_stats": completion_summary.get("subtitle_stats", {}),
            "metadata_stats": completion_summary.get("metadata_stats", {}),
            "categorization_stats": completion_summary.get("categorization_stats", {}),
            "stream_validation_stats": completion_summary.get("stream_validation_stats", {}),
            "storage_stats": completion_summary.get("storage_stats", {}),
            "podcast_stats": completion_summary.get("podcast_stats", {}),
            "issue_breakdown": completion_summary.get("issue_breakdown", {}),
            "action_breakdown": completion_summary.get("action_breakdown", {}),
            "health_score": completion_summary.get("health_score", 0)
        }
    else:
        summary = {
            "total_items": 0,
            "healthy_items": 0,
            "issues_found": 0,
            "issues_fixed": 0,
            "manual_review_needed": 0,
            "agent_summary": "Audit incomplete - reached iteration or budget limit"
        }

    # Update the existing audit report
    audit_report.execution_time_seconds = execution_time
    audit_report.status = "completed" if audit_complete else "partial"
    audit_report.summary = summary
    audit_report.content_results = {
        "agent_mode": True,
        "iterations": iteration,
        "tool_uses": len(tool_uses),
        "total_cost_usd": round(total_cost, 4)
    }
    audit_report.ai_insights = completion_summary.get("recommendations", []) if completion_summary else []
    audit_report.completed_at = end_time

    await audit_report.save()

    # Log comprehensive summary to execution logs for UI
    if completion_summary:
        await log_comprehensive_summary(audit_report, completion_summary, execution_time, iteration, total_cost)
    else:
        await log_to_database(audit_report, "success", f"Audit completed in {execution_time:.1f}s", "Librarian")
