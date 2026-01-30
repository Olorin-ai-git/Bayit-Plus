"""
Librarian voice command endpoint.
"""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.api.routes.admin import require_admin
from app.api.routes.librarian.models import (VoiceCommandRequest,
                                             VoiceCommandResponse)
from app.core.config import settings
from app.models.librarian import AuditReport
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/voice-command", response_model=VoiceCommandResponse)
async def execute_voice_command(
    request: VoiceCommandRequest,
    background_tasks: BackgroundTasks,
    current_admin: User = Depends(require_admin),
):
    """
    Execute a voice command for the Librarian AI Agent.
    """
    try:
        import anthropic

        from app.services.ai_agent_service import TOOLS, execute_tool

        command = request.command.strip()
        language = request.language.lower()

        audit_report = AuditReport(
            audit_type="voice_command",
            dry_run=False,
            status="in_progress",
            summary={},
            issues_count=0,
            fixes_count=0,
            execution_logs=[],
            execution_time_seconds=0.0,
        )
        await audit_report.insert()

        audit_report.execution_logs.append(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "level": "info",
                "message": f"Voice command received: {command}",
                "source": "Voice Interface",
            }
        )

        claude_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        system_prompt = f"""You are an AI Librarian assistant for Bayit+, an Israeli streaming platform.
You are receiving voice commands from an admin who wants to manage the content library.

Your task:
1. Understand the admin's voice command
2. Execute the appropriate tool(s) to fulfill the request
3. Provide a clear, concise response in {language.upper()} language
4. If the command is ambiguous, ask for clarification

Available tools: {', '.join([tool['name'] for tool in TOOLS])}

Important:
- You can execute multiple tools if needed to complete the task
- Always provide a spoken response that the admin will hear
- Be concise and clear in your responses
- If you can't do something, explain why

Mode: LIVE - You can make real changes to the content library."""

        messages = [{"role": "user", "content": command}]

        response = claude_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4096,
            system=system_prompt,
            messages=messages,
            tools=TOOLS,
        )

        action_taken = None
        tool_results = []

        while response.stop_reason == "tool_use":
            tool_use_blocks = [
                block for block in response.content if block.type == "tool_use"
            ]

            for tool_use in tool_use_blocks:
                tool_name = tool_use.name
                tool_input = tool_use.input

                audit_report.execution_logs.append(
                    {
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "level": "info",
                        "message": f"Executing tool: {tool_name}",
                        "source": "AI Agent",
                        "metadata": {"input": tool_input},
                    }
                )

                result = await execute_tool(
                    tool_name=tool_name,
                    tool_input=tool_input,
                    audit_id=str(audit_report.id),
                    dry_run=False,
                )

                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_use.id,
                        "content": json.dumps(result),
                    }
                )

                action_taken = f"{tool_name}: {json.dumps(tool_input)}"

                audit_report.execution_logs.append(
                    {
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "level": "success" if result.get("success") else "error",
                        "message": f"Tool {tool_name} completed",
                        "source": "AI Agent",
                        "metadata": {"result": result},
                    }
                )

            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})

            response = claude_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4096,
                system=system_prompt,
                messages=messages,
                tools=TOOLS,
            )
            tool_results = []

        text_blocks = [block for block in response.content if hasattr(block, "text")]
        final_message = (
            text_blocks[0].text if text_blocks else "Command executed successfully."
        )

        spoken_response = final_message[:500]

        audit_report.status = "completed"
        audit_report.execution_time_seconds = (
            datetime.now(timezone.utc) - audit_report.audit_date
        ).total_seconds()
        await audit_report.save()

        return VoiceCommandResponse(
            message=final_message,
            spoken_response=spoken_response,
            audit_id=str(audit_report.id),
            status="success",
            action_taken=action_taken,
        )

    except Exception as e:
        if "audit_report" in locals():
            audit_report.execution_logs.append(
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "level": "error",
                    "message": f"Voice command failed: {str(e)}",
                    "source": "Voice Interface",
                }
            )
            audit_report.status = "failed"
            await audit_report.save()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Voice command execution failed: {str(e)}",
        )
