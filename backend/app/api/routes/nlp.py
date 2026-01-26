"""
NLP API Routes - Natural language processing endpoints for Olorin CLI.

Provides endpoints for:
- parse-command: Parse natural language into structured commands
- execute-agent: Execute multi-step agent workflows with session support
- search-content: Semantic search across content library
- voice-command: Process voice commands (STT → execution)
- sessions: Manage conversation sessions for interactive mode
- confirm-action: Confirm pending destructive actions
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.nlp.agent_executor import AgentExecutionResult, AgentExecutor
from app.services.nlp.conversation_session import (
    ConversationSessionManager,
    SessionSummary,
    get_session_manager,
)
from app.services.nlp.intent_parser import IntentParser, ParsedIntent
from app.services.nlp.semantic_search import SearchResults, SemanticSearchService
from app.services.nlp.voice_processor import VoiceCommandResult, VoiceProcessor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/nlp", tags=["nlp"])


# Request/Response Models

class ParseCommandRequest(BaseModel):
    """Request to parse natural language command."""

    query: str = Field(description="Natural language command")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Optional context")


class ParseCommandResponse(BaseModel):
    """Response with parsed intent."""

    intent: str
    confidence: float
    params: Dict[str, Any]
    requires_confirmation: bool
    suggested_command: Optional[str] = None


class CreateSessionRequest(BaseModel):
    """Request to create a new conversation session."""

    platform: str = Field(default="bayit", description="Target platform")
    user_id: Optional[str] = Field(default=None, description="Optional user ID")
    action_mode: Literal["smart", "confirm_all"] = Field(
        default="smart", description="Action execution mode"
    )
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Optional metadata")


class CreateSessionResponse(BaseModel):
    """Response with created session details."""

    session_id: str
    platform: str
    action_mode: str
    created_at: datetime
    expires_at: datetime


class ExecuteAgentRequest(BaseModel):
    """Request to execute multi-step agent workflow."""

    query: str = Field(description="Natural language request")
    platform: str = Field(default="bayit", description="Target platform")
    dry_run: bool = Field(default=False, description="Preview only, don't make changes")
    max_iterations: Optional[int] = Field(default=None, description="Max tool uses")
    budget_limit: Optional[float] = Field(default=None, description="Max cost in USD")
    session_id: Optional[str] = Field(default=None, description="Session ID for continuity")
    action_mode: Literal["smart", "confirm_all"] = Field(
        default="smart", description="Action execution mode"
    )


class PendingActionResponse(BaseModel):
    """Pending action requiring confirmation."""

    action_id: str
    action_type: str
    description: str
    parameters: Dict[str, Any]


class ExecuteAgentResponse(BaseModel):
    """Response from agent execution."""

    success: bool
    summary: str
    tool_calls: List[Dict[str, Any]]
    total_cost: float
    iterations: int
    error: Optional[str] = None
    session_id: Optional[str] = None
    session_cost: Optional[float] = None
    pending_confirmations: List[PendingActionResponse] = Field(default_factory=list)


class ConfirmActionRequest(BaseModel):
    """Request to confirm a pending action."""

    session_id: str = Field(description="Session ID containing the pending action")
    action_id: str = Field(description="ID of the action to confirm")


class ConfirmActionResponse(BaseModel):
    """Response from action confirmation."""

    success: bool
    action_type: str
    result: str
    error: Optional[str] = None


class SearchContentRequest(BaseModel):
    """Request to search content library."""

    query: str = Field(description="Natural language search query")
    content_type: str = Field(default="all", description="Filter by type")
    limit: int = Field(default=20, description="Maximum results")
    rerank: bool = Field(default=True, description="Re-rank by relevance")


class VoiceCommandRequest(BaseModel):
    """Request to process voice command."""

    audio_data: bytes = Field(description="Audio bytes (WAV, MP3, etc.)")
    platform: str = Field(default="bayit", description="Target platform")
    language: str = Field(default="en", description="Language code")
    dry_run: bool = Field(default=False, description="Preview only")


class VoiceCommandResponse(BaseModel):
    """Response from voice command processing."""

    transcript: str
    execution_result: ExecuteAgentResponse
    voice_response: Optional[bytes] = None


# Session Endpoints

@router.post("/sessions", response_model=CreateSessionResponse)
async def create_session(request: CreateSessionRequest):
    """
    Create a new conversation session for interactive CLI mode.

    Sessions maintain conversation history and track costs across multiple
    requests. They automatically expire after the configured TTL.

    Example:
        ```
        POST /api/v1/nlp/sessions
        {
            "platform": "bayit",
            "action_mode": "smart"
        }
        ```

    Returns:
        Session ID and details for subsequent requests.
    """
    if not settings.NLP_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="NLP features are disabled. Set OLORIN_NLP_ENABLED=true to enable.",
        )

    try:
        manager = get_session_manager()
        session = await manager.create_session(
            platform=request.platform,
            user_id=request.user_id,
            action_mode=request.action_mode,
            metadata=request.metadata,
        )

        return CreateSessionResponse(
            session_id=session.session_id,
            platform=session.platform,
            action_mode=session.action_mode,
            created_at=session.created_at,
            expires_at=session.expires_at,
        )

    except Exception as e:
        logger.error(f"Failed to create session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create session: {str(e)}",
        )


@router.get("/sessions/{session_id}", response_model=SessionSummary)
async def get_session(session_id: str):
    """
    Get session details and summary.

    Example:
        ```
        GET /api/v1/nlp/sessions/abc123
        ```

    Returns:
        Session summary including message count, cost, and status.
    """
    if not settings.NLP_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="NLP features are disabled.",
        )

    try:
        manager = get_session_manager()
        summary = await manager.get_session_summary(session_id)

        if not summary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session not found: {session_id}",
            )

        return summary

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get session: {str(e)}",
        )


@router.delete("/sessions/{session_id}", response_model=SessionSummary)
async def end_session(session_id: str):
    """
    End a session and get final summary.

    Example:
        ```
        DELETE /api/v1/nlp/sessions/abc123
        ```

    Returns:
        Final session summary including total cost.
    """
    if not settings.NLP_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="NLP features are disabled.",
        )

    try:
        manager = get_session_manager()
        summary = await manager.end_session(session_id)

        if not summary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session not found: {session_id}",
            )

        return summary

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to end session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to end session: {str(e)}",
        )


# Action Confirmation Endpoint

@router.post("/confirm-action", response_model=ConfirmActionResponse)
async def confirm_action(request: ConfirmActionRequest):
    """
    Confirm and execute a pending destructive action.

    Destructive actions (deploy, git push, delete) require explicit
    confirmation before execution. This endpoint executes the confirmed action.

    Example:
        ```
        POST /api/v1/nlp/confirm-action
        {
            "session_id": "abc123",
            "action_id": "deploy_platform_xyz789"
        }
        ```

    Returns:
        Execution result or error.
    """
    if not settings.NLP_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="NLP features are disabled.",
        )

    try:
        manager = get_session_manager()
        session = await manager.get_session(request.session_id)

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session not found: {request.session_id}",
            )

        action = await manager.consume_pending_action(request.session_id, request.action_id)

        if not action:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Action not found or expired: {request.action_id}",
            )

        executor = AgentExecutor()
        result = await executor.execute_confirmed_action(action, session.platform)

        logger.info(
            "nlp_action_confirmed",
            extra={
                "session_id": request.session_id,
                "action_id": request.action_id,
                "action_type": action.action_type,
            },
        )

        return ConfirmActionResponse(
            success=True,
            action_type=action.action_type,
            result=result,
        )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to confirm action: {e}")
        return ConfirmActionResponse(
            success=False,
            action_type=request.action_id,
            result="",
            error=str(e),
        )


# Existing Endpoints (Updated)

@router.post("/parse-command", response_model=ParseCommandResponse)
async def parse_command(request: ParseCommandRequest):
    """
    Parse natural language into structured CLI command.

    Uses Claude to understand user intent and extract parameters with confidence scoring.
    """
    if not settings.NLP_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="NLP features are disabled. Set OLORIN_NLP_ENABLED=true to enable.",
        )

    try:
        parser = IntentParser()
        result: ParsedIntent = await parser.parse_command(request.query, request.context)

        return ParseCommandResponse(
            intent=result.intent,
            confidence=result.confidence,
            params=result.params,
            requires_confirmation=result.requires_confirmation,
            suggested_command=result.suggested_command,
        )

    except Exception as e:
        logger.error(f"Parse command failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse command: {str(e)}",
        )


@router.post("/execute-agent", response_model=ExecuteAgentResponse)
async def execute_agent(request: ExecuteAgentRequest):
    """
    Execute multi-step agent workflow with optional session support.

    Supports complex workflows and maintains conversation continuity
    when a session_id is provided.

    Example:
        ```
        POST /api/v1/nlp/execute-agent
        {
            "query": "find series about Jewish holidays and update missing posters",
            "platform": "bayit",
            "session_id": "abc123",
            "action_mode": "smart"
        }
        ```

    Returns:
        Execution result with any pending confirmations for destructive actions.
    """
    if not settings.NLP_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="NLP features are disabled. Set OLORIN_NLP_ENABLED=true to enable.",
        )

    try:
        manager = get_session_manager()
        conversation_history = None
        session_cost = None

        if request.session_id:
            session = await manager.get_session(request.session_id)
            if session:
                conversation_history = session.get_conversation_history(
                    settings.NLP_SESSION_MAX_HISTORY
                )
                await manager.add_message(request.session_id, "user", request.query)

        executor = AgentExecutor()
        result: AgentExecutionResult = await executor.execute(
            query=request.query,
            platform=request.platform,
            dry_run=request.dry_run,
            max_iterations=request.max_iterations or settings.AGENT_MAX_ITERATIONS,
            budget_limit_usd=request.budget_limit or settings.AGENT_BUDGET_LIMIT_USD,
            session_id=request.session_id,
            action_mode=request.action_mode,
            conversation_history=conversation_history,
        )

        if request.session_id:
            await manager.add_message(request.session_id, "assistant", result.summary)
            session_cost = await manager.update_cost(
                request.session_id, result.total_cost, result.iterations
            )

            for pending in result.pending_confirmations:
                await manager.add_pending_action(
                    session_id=request.session_id,
                    action_type=pending["action_type"],
                    description=pending["description"],
                    parameters=pending.get("parameters", {}),
                    context_snapshot=pending.get("context_snapshot", ""),
                )

        return ExecuteAgentResponse(
            success=result.success,
            summary=result.summary,
            tool_calls=[
                {
                    "tool": tc.tool,
                    "input": tc.input,
                    "output": tc.output,
                    "timestamp": tc.timestamp.isoformat(),
                }
                for tc in result.tool_calls
            ],
            total_cost=result.total_cost,
            iterations=result.iterations,
            error=result.error,
            session_id=request.session_id,
            session_cost=session_cost,
            pending_confirmations=[
                PendingActionResponse(
                    action_id=p["action_id"],
                    action_type=p["action_type"],
                    description=p["description"],
                    parameters=p.get("parameters", {}),
                )
                for p in result.pending_confirmations
            ],
        )

    except Exception as e:
        logger.error(f"Agent execution failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent execution failed: {str(e)}",
        )


@router.post("/search-content", response_model=SearchResults)
async def search_content(request: SearchContentRequest):
    """
    Semantic search across content library.

    Uses Claude to understand natural language queries and generate appropriate
    MongoDB filters with optional semantic re-ranking.
    """
    if not settings.SEMANTIC_SEARCH_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Semantic search is disabled. Set OLORIN_SEMANTIC_SEARCH_ENABLED=true to enable.",
        )

    try:
        search_service = SemanticSearchService()
        results = await search_service.search(
            query=request.query,
            content_type=request.content_type,
            limit=request.limit,
            rerank=request.rerank,
        )

        return results

    except Exception as e:
        logger.error(f"Semantic search failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}",
        )


@router.post("/voice-command", response_model=VoiceCommandResponse)
async def voice_command(request: VoiceCommandRequest):
    """
    Process voice command (STT → Agent execution → Optional TTS).

    Transcribes audio using configured STT provider, executes agent workflow,
    and optionally generates voice response.
    """
    if not settings.VOICE_COMMANDS_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Voice commands are disabled. Set OLORIN_VOICE_COMMANDS_ENABLED=true to enable.",
        )

    try:
        processor = VoiceProcessor()
        result: VoiceCommandResult = await processor.process_voice_command(
            audio_data=request.audio_data,
            platform=request.platform,
            language=request.language,
            dry_run=request.dry_run,
        )

        execution_response = ExecuteAgentResponse(
            success=result.execution_result.success,
            summary=result.execution_result.summary,
            tool_calls=[
                {
                    "tool": tc.tool,
                    "input": tc.input,
                    "output": tc.output,
                    "timestamp": tc.timestamp.isoformat(),
                }
                for tc in result.execution_result.tool_calls
            ],
            total_cost=result.execution_result.total_cost,
            iterations=result.execution_result.iterations,
            error=result.execution_result.error,
        )

        return VoiceCommandResponse(
            transcript=result.transcript,
            execution_result=execution_response,
            voice_response=result.voice_response,
        )

    except Exception as e:
        logger.error(f"Voice command processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Voice command failed: {str(e)}",
        )


@router.get("/health")
async def health_check():
    """
    Health check endpoint for NLP services.

    Returns service status and feature availability.
    """
    return {
        "status": "healthy",
        "nlp_enabled": settings.NLP_ENABLED,
        "voice_commands_enabled": settings.VOICE_COMMANDS_ENABLED,
        "semantic_search_enabled": settings.SEMANTIC_SEARCH_ENABLED,
        "anthropic_api_configured": bool(settings.ANTHROPIC_API_KEY),
        "session_ttl_minutes": settings.NLP_SESSION_TTL_MINUTES,
        "default_action_mode": settings.NLP_DEFAULT_ACTION_MODE,
    }
