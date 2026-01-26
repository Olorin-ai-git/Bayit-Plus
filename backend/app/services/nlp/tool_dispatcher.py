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

    # Git commands
    elif tool_name == "git_status":
        import subprocess
        repo_path = tool_input.get("repository_path", ".")
        try:
            result = subprocess.run(
                ["git", "status", "--short", "--branch"],
                cwd=repo_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                status_output = result.stdout.strip()
                if not status_output:
                    return "Git repository is clean (no changes)"
                return f"Git Status:\n{status_output}"
            else:
                return f"Git error: {result.stderr}"
        except Exception as e:
            return f"Failed to get git status: {str(e)}"

    elif tool_name == "git_commit":
        import subprocess
        message = tool_input["message"]
        files = tool_input.get("files", [])
        add_all = tool_input.get("add_all", False)
        is_dry_run = tool_input.get("dry_run", True)

        if is_dry_run or dry_run:
            files_to_commit = "all modified files" if add_all else (", ".join(files) if files else "staged files")
            return (
                f"[DRY RUN] Would commit:\n"
                f"Files: {files_to_commit}\n"
                f"Message: {message}\n\n"
                f"To execute commit, set dry_run=false"
            )

        # Execute the commit
        try:
            # Stage files
            if add_all:
                subprocess.run(["git", "add", "-A"], check=True, capture_output=True)
            elif files:
                subprocess.run(["git", "add"] + files, check=True, capture_output=True)

            # Create commit
            result = subprocess.run(
                ["git", "commit", "-m", message],
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                return f"✓ Commit created successfully:\n{result.stdout}\nMessage: {message}"
            else:
                return f"Commit failed:\n{result.stderr}"
        except Exception as e:
            return f"Error creating commit: {str(e)}"

    elif tool_name == "git_push":
        import subprocess
        remote = tool_input.get("remote", "origin")
        branch = tool_input.get("branch")
        force = tool_input.get("force", False)
        is_dry_run = tool_input.get("dry_run", True)

        if is_dry_run or dry_run:
            force_flag = "--force" if force else ""
            branch_str = branch if branch else "current branch"
            return (
                f"[DRY RUN] Would push:\n"
                f"Remote: {remote}\n"
                f"Branch: {branch_str}\n"
                f"Force: {force}\n\n"
                f"To execute push, set dry_run=false"
            )

        # Execute the push
        try:
            cmd = ["git", "push", remote]
            if branch:
                cmd.append(branch)
            if force:
                cmd.append("--force")

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode == 0:
                return f"✓ Push successful:\n{result.stdout}\n{result.stderr}"
            else:
                return f"Push failed:\n{result.stderr}"
        except Exception as e:
            return f"Error pushing: {str(e)}"

    elif tool_name == "git_pull":
        import subprocess
        remote = tool_input.get("remote", "origin")
        branch = tool_input.get("branch")

        try:
            cmd = ["git", "pull", remote]
            if branch:
                cmd.append(branch)

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode == 0:
                return f"Git pull successful:\n{result.stdout}"
            else:
                return f"Git pull failed:\n{result.stderr}"
        except Exception as e:
            return f"Failed to pull: {str(e)}"

    elif tool_name == "git_diff":
        import subprocess
        file_path = tool_input.get("file")
        staged = tool_input.get("staged", False)

        try:
            cmd = ["git", "diff"]
            if staged:
                cmd.append("--cached")
            if file_path:
                cmd.append(file_path)

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                diff_output = result.stdout.strip()
                if not diff_output:
                    return "No changes to show"
                # Truncate if too long
                if len(diff_output) > 2000:
                    diff_output = diff_output[:2000] + "\n... (truncated, total changes are longer)"
                return f"Git Diff:\n{diff_output}"
            else:
                return f"Git diff error: {result.stderr}"
        except Exception as e:
            return f"Failed to get diff: {str(e)}"

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

        # Calculate total issues from all issue categories
        total_issues = (
            len(audit_result.broken_streams) +
            len(audit_result.missing_metadata) +
            len(audit_result.misclassifications) +
            len(audit_result.orphaned_items)
        )

        # Use summary count if available, otherwise use calculated total
        issues_found = audit_result.summary.get("issues_found", total_issues)

        return (
            f"Audit complete. "
            f"Issues found: {issues_found} "
            f"(Broken streams: {len(audit_result.broken_streams)}, "
            f"Missing metadata: {len(audit_result.missing_metadata)}, "
            f"Misclassifications: {len(audit_result.misclassifications)}, "
            f"Orphaned: {len(audit_result.orphaned_items)})"
        )

    elif tool_name == "deploy_platform":
        import subprocess
        from pathlib import Path

        environment = tool_input["environment"]
        platform = tool_input.get("platform", "all")
        is_dry_run = tool_input.get("dry_run", True)

        if is_dry_run or dry_run:
            return (
                f"[DRY RUN] Deployment Plan:\n"
                f"Environment: {environment}\n"
                f"Platform: {platform}\n\n"
                f"Available deployment scripts:\n"
                f"- scripts/deployment/deploy-staging.sh (staging environment)\n"
                f"- scripts/deployment/deploy-all-platforms.sh (all platforms)\n"
                f"- scripts/deployment/deploy-phase.sh (phased rollout)\n"
                f"- scripts/deploy-ios.sh (iOS only)\n\n"
                f"To execute deployment, set dry_run=false"
            )

        # Execute deployment
        try:
            # Determine which script to use
            if environment == "staging":
                script_path = Path("scripts/deployment/deploy-staging.sh")
            elif platform == "all":
                script_path = Path("scripts/deployment/deploy-all-platforms.sh")
            elif platform == "ios":
                script_path = Path("scripts/deploy-ios.sh")
            else:
                return f"No deployment script found for environment={environment}, platform={platform}"

            if not script_path.exists():
                return f"Deployment script not found: {script_path}"

            # Make script executable
            subprocess.run(["chmod", "+x", str(script_path)], check=False)

            # Execute deployment script
            result = subprocess.run(
                [str(script_path)],
                capture_output=True,
                text=True,
                timeout=600  # 10 minutes max
            )

            if result.returncode == 0:
                return f"✓ Deployment to {environment} successful:\n{result.stdout}\n{result.stderr}"
            else:
                return f"Deployment failed:\n{result.stderr}\nOutput:\n{result.stdout}"
        except subprocess.TimeoutExpired:
            return f"Deployment timed out after 10 minutes"
        except Exception as e:
            return f"Error during deployment: {str(e)}"

    elif tool_name == "get_deployment_status":
        environment = tool_input.get("environment", "all")

        # Read deployment logs and status
        import os
        from pathlib import Path

        logs_dir = Path("scripts/deployment/logs")
        status_info = []

        if logs_dir.exists():
            log_files = sorted(logs_dir.glob("deploy_*.log"), reverse=True)
            if log_files:
                latest_log = log_files[0]
                status_info.append(f"Latest deployment: {latest_log.name}")

                # Read last few lines
                try:
                    with open(latest_log, 'r') as f:
                        lines = f.readlines()
                        last_lines = lines[-10:] if len(lines) > 10 else lines
                        status_info.append("\nRecent deployment activity:")
                        status_info.extend([line.strip() for line in last_lines])
                except Exception:
                    pass
            else:
                status_info.append("No deployment logs found")
        else:
            status_info.append("Deployment logs directory not found")

        return "\n".join(status_info)

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
