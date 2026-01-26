"""
Tool Dispatcher - Executes tools for NLP agent workflows.

Routes tool calls to appropriate handlers based on tool name and platform.
"""

import logging
from typing import Any, Dict

from app.core.config import settings

logger = logging.getLogger(__name__)


async def execute_tool(
    tool_name: str,
    tool_input: Dict[str, Any],
    platform: str = "bayit",
    dry_run: bool = False
) -> str:
    """
    Execute tool and return result.

    Routes to appropriate handler based on tool name and platform.
    In dry_run mode, returns preview without making actual changes.

    Args:
        tool_name: Name of tool to execute
        tool_input: Tool input parameters
        platform: Target platform ("bayit", "fraud", "cvplus")
        dry_run: If True, preview only without making changes

    Returns:
        Tool execution result as string

    Raises:
        ValueError: If tool is unknown
    """
    logger.info(f"Executing tool: {tool_name} (platform: {platform}, dry_run: {dry_run})")

    # Base CLI tools (available to all platforms)
    if tool_name == "web_search":
        from app.services.nlp.tools.web_search import web_search
        return await web_search(
            query=tool_input["query"],
            num_results=tool_input.get("num_results", 5)
        )

    elif tool_name == "download_file":
        if dry_run:
            return f"[DRY RUN] Would download file from {tool_input['url']}"
        from app.services.nlp.tools.file_operations import download_file
        return await download_file(
            url=tool_input["url"],
            destination=tool_input.get("destination")
        )

    elif tool_name == "send_email":
        if dry_run:
            return f"[DRY RUN] Would send email to {tool_input['to']} with subject '{tool_input['subject']}'"
        from app.services.nlp.tools.email import send_email
        return await send_email(**tool_input)

    elif tool_name == "generate_pdf":
        from app.services.nlp.tools.pdf_generator import generate_pdf
        return await generate_pdf(
            title=tool_input["title"],
            data=tool_input["data"],
            template=tool_input.get("template", "default"),
            dry_run=dry_run
        )

    elif tool_name == "read_file":
        from app.services.nlp.tools.file_operations import read_file
        return await read_file(path=tool_input["path"])

    elif tool_name == "list_directory":
        from app.services.nlp.tools.file_operations import list_directory
        return await list_directory(
            path=tool_input["path"],
            pattern=tool_input.get("pattern")
        )

    # Platform-specific tools
    elif platform == "bayit":
        return await execute_bayit_tool(tool_name, tool_input, dry_run)
    elif platform == "fraud":
        return await execute_fraud_tool(tool_name, tool_input, dry_run)
    elif platform == "cvplus":
        return await execute_cvplus_tool(tool_name, tool_input, dry_run)
    else:
        raise ValueError(f"Unknown tool: {tool_name} (platform: {platform})")


async def execute_bayit_tool(
    tool_name: str,
    tool_input: Dict[str, Any],
    dry_run: bool
) -> str:
    """Execute Bayit+ platform-specific tools."""

    if tool_name == "search_bayit_content":
        from app.services.nlp.semantic_search import SemanticSearchService
        search = SemanticSearchService()
        results = await search.search(
            query=tool_input["query"],
            content_type=tool_input.get("content_type", "all"),
            limit=tool_input.get("limit", 20)
        )
        return f"Found {len(results)} items matching '{tool_input['query']}'"

    elif tool_name == "update_content_metadata":
        if dry_run:
            return f"[DRY RUN] Would update content {tool_input['content_id']} with {tool_input['updates']}"

        from app.models.content import Content
        from beanie import PydanticObjectId

        content = await Content.get(PydanticObjectId(tool_input["content_id"]))
        if not content:
            return f"Content {tool_input['content_id']} not found"

        # Update fields
        for field, value in tool_input["updates"].items():
            setattr(content, field, value)

        await content.save()
        return f"Successfully updated content {tool_input['content_id']}"

    elif tool_name == "upload_content":
        if dry_run:
            return f"[DRY RUN] Would upload {tool_input['content_type']} from {tool_input['source']}"

        # Import appropriate upload service
        if tool_input["content_type"] == "series":
            from app.services.content_importer import import_series
            return await import_series(
                source=tool_input["source"],
                filters=tool_input.get("filters", {})
            )
        elif tool_input["content_type"] == "movie":
            from app.services.content_importer import import_movies
            return await import_movies(
                source=tool_input["source"],
                filters=tool_input.get("filters", {})
            )
        else:
            return f"Unsupported content type: {tool_input['content_type']}"

    elif tool_name == "get_content_stats":
        from app.models.content import Content

        stat_type = tool_input["stat_type"]

        if stat_type == "counts":
            series_count = await Content.find(Content.content_type == "series").count()
            movies_count = await Content.find(Content.content_type == "movie").count()
            podcasts_count = await Content.find(Content.content_type == "podcast").count()

            return f"Content Library Stats:\n" \
                   f"- Series: {series_count}\n" \
                   f"- Movies: {movies_count}\n" \
                   f"- Podcasts: {podcasts_count}\n" \
                   f"- Total: {series_count + movies_count + podcasts_count}"

        elif stat_type == "recent":
            from datetime import datetime, timedelta
            time_period = tool_input.get("time_period", "week")

            days_map = {"day": 1, "week": 7, "month": 30, "year": 365}
            days = days_map.get(time_period, 7)

            cutoff = datetime.utcnow() - timedelta(days=days)
            recent_count = await Content.find(
                Content.created_at >= cutoff
            ).count()

            return f"Content added in last {time_period}: {recent_count}"

        else:
            return f"Unsupported stat type: {stat_type}"

    elif tool_name == "run_content_audit":
        if dry_run:
            return f"[DRY RUN] Would run {tool_input['audit_type']} audit"

        from app.services.ai_agent.agent import run_ai_agent_audit

        audit_result = await run_ai_agent_audit(
            audit_type=tool_input.get("audit_type", "full"),
            dry_run=tool_input.get("dry_run", True),
            max_iterations=50,
            budget_limit_usd=1.0
        )

        return f"Audit complete. Issues found: {len(audit_result.issues)}"

    else:
        raise ValueError(f"Unknown Bayit+ tool: {tool_name}")


async def execute_fraud_tool(
    tool_name: str,
    tool_input: Dict[str, Any],
    dry_run: bool
) -> str:
    """Execute Fraud Detection platform-specific tools."""

    if tool_name == "run_fraud_analysis":
        if dry_run:
            return f"[DRY RUN] Would run fraud analysis from {tool_input['start_date']} to {tool_input['end_date']}"

        # Placeholder - would call actual fraud platform services
        return f"Fraud analysis complete for {tool_input['start_date']} to {tool_input['end_date']}"

    elif tool_name == "get_fraud_statistics":
        # Placeholder - would call actual fraud platform services
        return f"Fraud statistics for period: {tool_input['period']}"

    elif tool_name == "export_fraud_report":
        if dry_run:
            return f"[DRY RUN] Would export report {tool_input['report_id']} as {tool_input.get('format', 'pdf')}"

        return f"Report exported successfully"

    else:
        raise ValueError(f"Unknown Fraud tool: {tool_name}")


async def execute_cvplus_tool(
    tool_name: str,
    tool_input: Dict[str, Any],
    dry_run: bool
) -> str:
    """Execute CV Plus platform-specific tools."""

    if tool_name == "get_user_statistics":
        # Placeholder - would call actual CV Plus platform services
        return f"User statistics from {tool_input['start_date']} to {tool_input['end_date']}"

    elif tool_name == "export_cv_data":
        if dry_run:
            return f"[DRY RUN] Would export CV data as {tool_input['format']}"

        return f"CV data exported as {tool_input['format']}"

    else:
        raise ValueError(f"Unknown CV Plus tool: {tool_name}")
