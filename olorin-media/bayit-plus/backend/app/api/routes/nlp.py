"""
NLP API Routes - Natural language processing endpoints for Olorin CLI.

Provides endpoints for:
- parse-command: Parse natural language into structured commands
- execute-agent: Execute multi-step agent workflows
- search-content: Semantic search across content library
- voice-command: Process voice commands (STT → execution)
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.nlp.agent_executor import AgentExecutionResult, AgentExecutor
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


class ExecuteAgentRequest(BaseModel):
    """Request to execute multi-step agent workflow."""

    query: str = Field(description="Natural language request")
    platform: str = Field(default="bayit", description="Target platform")
    dry_run: bool = Field(default=False, description="Preview only, don't make changes")
    max_iterations: Optional[int] = Field(default=None, description="Max tool uses")
    budget_limit: Optional[float] = Field(default=None, description="Max cost in USD")


class ExecuteAgentResponse(BaseModel):
    """Response from agent execution."""

    success: bool
    summary: str
    tool_calls: List[Dict[str, Any]]
    total_cost: float
    iterations: int
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


# Endpoints

@router.post("/parse-command", response_model=ParseCommandResponse)
async def parse_command(request: ParseCommandRequest):
    """
    Parse natural language into structured CLI command.

    Uses Claude to understand user intent and extract parameters with confidence scoring.

    Example:
        ```
        POST /api/v1/nlp/parse-command
        {
            "query": "upload family ties season 2 from usb",
            "context": {"platform": "bayit"}
        }
        ```

    Returns:
        ```
        {
            "intent": "upload_series",
            "confidence": 0.95,
            "params": {
                "series": "family ties",
                "season": 2,
                "source": "usb"
            },
            "requires_confirmation": true,
            "suggested_command": "scripts/backend/upload_series.sh ..."
        }
        ```
    """
    if not settings.NLP_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="NLP features are disabled. Set OLORIN_NLP_ENABLED=true to enable."
        )

    try:
        parser = IntentParser()
        result: ParsedIntent = await parser.parse_command(request.query, request.context)

        return ParseCommandResponse(
            intent=result.intent,
            confidence=result.confidence,
            params=result.params,
            requires_confirmation=result.requires_confirmation,
            suggested_command=result.suggested_command
        )

    except Exception as e:
        logger.error(f"Parse command failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse command: {str(e)}"
        )


@router.post("/execute-agent", response_model=ExecuteAgentResponse)
async def execute_agent(request: ExecuteAgentRequest):
    """
    Execute multi-step agent workflow with tools.

    Supports complex workflows like:
    - "start monthly analysis on fraud platform for December 2024, email me the report"
    - "generate PDF with CV Plus user statistics for past month"
    - "find and update poster for Radio Station Galatz"

    The agent will:
    1. Understand the query and plan steps
    2. Use tools to gather data (web search, database queries, etc.)
    3. Perform transformations (generate PDFs, analyze data)
    4. Take actions (send emails, update content)
    5. Provide completion summary

    Example:
        ```
        POST /api/v1/nlp/execute-agent
        {
            "query": "find series about Jewish holidays and update missing posters",
            "platform": "bayit",
            "dry_run": false,
            "max_iterations": 20,
            "budget_limit": 0.50
        }
        ```

    Returns:
        ```
        {
            "success": true,
            "summary": "Found 5 series about Jewish holidays. Updated 3 missing posters.",
            "tool_calls": [
                {"tool": "search_bayit_content", "input": {...}, "output": "..."},
                {"tool": "update_content_metadata", "input": {...}, "output": "..."}
            ],
            "total_cost": 0.12,
            "iterations": 8
        }
        ```
    """
    if not settings.NLP_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="NLP features are disabled. Set OLORIN_NLP_ENABLED=true to enable."
        )

    try:
        executor = AgentExecutor()
        result: AgentExecutionResult = await executor.execute(
            query=request.query,
            platform=request.platform,
            dry_run=request.dry_run,
            max_iterations=request.max_iterations or settings.AGENT_MAX_ITERATIONS,
            budget_limit_usd=request.budget_limit or settings.AGENT_BUDGET_LIMIT_USD
        )

        # Convert to response model
        return ExecuteAgentResponse(
            success=result.success,
            summary=result.summary,
            tool_calls=[
                {
                    "tool": tc.tool,
                    "input": tc.input,
                    "output": tc.output,
                    "timestamp": tc.timestamp.isoformat()
                }
                for tc in result.tool_calls
            ],
            total_cost=result.total_cost,
            iterations=result.iterations,
            error=result.error
        )

    except Exception as e:
        logger.error(f"Agent execution failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent execution failed: {str(e)}"
        )


@router.post("/search-content", response_model=SearchResults)
async def search_content(request: SearchContentRequest):
    """
    Semantic search across content library.

    Uses Claude to understand natural language queries and generate appropriate
    MongoDB filters with optional semantic re-ranking.

    Example:
        ```
        POST /api/v1/nlp/search-content
        {
            "query": "jewish holiday content for kids",
            "content_type": "all",
            "limit": 20,
            "rerank": true
        }
        ```

    Returns:
        ```
        {
            "query": "jewish holiday content for kids",
            "total_found": 15,
            "results": [
                {
                    "content_id": "...",
                    "title": "Hanukkah Songs for Kids",
                    "content_type": "series",
                    "relevance_score": 0.95,
                    "match_reason": "Semantic relevance: 0.95"
                },
                ...
            ],
            "filter_used": {"topic_tags": {"$in": ["jewish", "holiday"]}}
        }
        ```
    """
    if not settings.SEMANTIC_SEARCH_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Semantic search is disabled. Set OLORIN_SEMANTIC_SEARCH_ENABLED=true to enable."
        )

    try:
        search_service = SemanticSearchService()
        results = await search_service.search(
            query=request.query,
            content_type=request.content_type,
            limit=request.limit,
            rerank=request.rerank
        )

        return results

    except Exception as e:
        logger.error(f"Semantic search failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )


@router.post("/voice-command", response_model=VoiceCommandResponse)
async def voice_command(request: VoiceCommandRequest):
    """
    Process voice command (STT → Agent execution → Optional TTS).

    Transcribes audio using configured STT provider, executes agent workflow,
    and optionally generates voice response.

    Example:
        ```
        POST /api/v1/nlp/voice-command
        {
            "audio_data": <bytes>,
            "platform": "bayit",
            "language": "en",
            "dry_run": false
        }
        ```

    Returns:
        ```
        {
            "transcript": "upload family ties season 2",
            "execution_result": {
                "success": true,
                "summary": "Uploaded Family Ties Season 2 (24 episodes)",
                ...
            },
            "voice_response": <optional audio bytes>
        }
        ```
    """
    if not settings.VOICE_COMMANDS_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Voice commands are disabled. Set OLORIN_VOICE_COMMANDS_ENABLED=true to enable."
        )

    try:
        processor = VoiceProcessor()
        result: VoiceCommandResult = await processor.process_voice_command(
            audio_data=request.audio_data,
            platform=request.platform,
            language=request.language,
            dry_run=request.dry_run
        )

        # Convert execution result
        execution_response = ExecuteAgentResponse(
            success=result.execution_result.success,
            summary=result.execution_result.summary,
            tool_calls=[
                {
                    "tool": tc.tool,
                    "input": tc.input,
                    "output": tc.output,
                    "timestamp": tc.timestamp.isoformat()
                }
                for tc in result.execution_result.tool_calls
            ],
            total_cost=result.execution_result.total_cost,
            iterations=result.execution_result.iterations,
            error=result.execution_result.error
        )

        return VoiceCommandResponse(
            transcript=result.transcript,
            execution_result=execution_response,
            voice_response=result.voice_response
        )

    except Exception as e:
        logger.error(f"Voice command processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Voice command failed: {str(e)}"
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
        "anthropic_api_configured": bool(settings.ANTHROPIC_API_KEY)
    }
