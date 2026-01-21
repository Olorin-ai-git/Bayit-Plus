"""
Support API Routes
Endpoints for voice support chat, tickets, documentation, and FAQ.

Includes streaming endpoints for low-latency voice interactions.
"""

import asyncio
import base64
import json
import logging
import math
from datetime import datetime
from typing import List, Optional

from fastapi import (APIRouter, Depends, HTTPException, Query, WebSocket,
                     WebSocketDisconnect)
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import get_current_active_user, require_role
from app.models.user import User
from app.schemas.support import (ConversationRatingRequest,
                                 ConversationRatingResponse,
                                 FAQFeedbackRequest, FAQItem, FAQListResponse,
                                 SupportAnalyticsResponse, SupportChatRequest,
                                 SupportChatResponse, TicketAdminListResponse,
                                 TicketAdminResponse, TicketCreateRequest,
                                 TicketListResponse, TicketMessageRequest,
                                 TicketNoteRequest, TicketResponse,
                                 TicketUpdateRequest)
from app.services.docs_search_service import docs_search_service
from app.services.support_service import support_service
from app.services.voice_pipeline_service import (PipelineMessage,
                                                 VoicePipelineService)

router = APIRouter()

logger = logging.getLogger(__name__)


# =============================================================================
# Voice Support Chat
# =============================================================================


@router.post("/chat", response_model=SupportChatResponse)
async def support_chat(
    request: SupportChatRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Voice support chat endpoint.
    Processes user queries with documentation context for intelligent responses.
    """
    try:
        result = await support_service.chat(
            message=request.message,
            user=current_user,
            language=request.language or "en",
            conversation_id=request.conversation_id,
            app_context=request.app_context,
        )

        return SupportChatResponse(
            message=result["message"],
            conversation_id=result["conversation_id"],
            language=result["language"],
            spoken_response=result.get("spoken_response"),
            docs_referenced=result.get("docs_referenced", []),
            escalation_needed=result.get("escalation_needed", False),
            escalation_reason=result.get("escalation_reason"),
            confidence=result.get("confidence", 0.8),
        )

    except Exception as e:
        print(f"[Support API] Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Support chat error: {str(e)}")


@router.post("/chat/stream")
async def support_chat_stream(
    request: SupportChatRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Streaming voice support chat endpoint using Server-Sent Events (SSE).

    Streams LLM response tokens as they are generated for ultra-low latency.
    First token arrives in ~100-300ms instead of waiting for full response.

    Event types:
    - chunk: Text chunk from LLM (data: {"type": "chunk", "text": "..."})
    - complete: Final metadata (data: {"type": "complete", "conversation_id": "...", ...})
    - error: Error occurred (data: {"type": "error", "message": "..."})
    """

    async def generate_sse():
        try:
            async for chunk in support_service.chat_streaming(
                message=request.message,
                user=current_user,
                language=request.language or "en",
                conversation_id=request.conversation_id,
                app_context=request.app_context,
            ):
                # Format as Server-Sent Event
                event_type = chunk.get("type", "chunk")
                data = json.dumps(chunk)
                yield f"event: {event_type}\ndata: {data}\n\n"

        except Exception as e:
            logger.error(f"[Support API] Streaming chat error: {e}")
            error_data = json.dumps({"type": "error", "message": str(e)})
            yield f"event: error\ndata: {error_data}\n\n"

    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


# =============================================================================
# Unified Voice Pipeline WebSocket
# =============================================================================


async def get_user_from_ws_token(token: str) -> Optional[User]:
    """Validate JWT token from WebSocket query param and return user."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            return None

        user = await User.get(user_id)
        if user is None or not user.is_active:
            return None

        return user
    except JWTError:
        return None


@router.websocket("/voice")
async def voice_pipeline_websocket(
    websocket: WebSocket,
    token: str = Query(...),
    language: str = Query("auto"),
    conversation_id: Optional[str] = Query(None),
    voice_id: Optional[str] = Query(None),
):
    """
    Unified WebSocket endpoint for real-time voice support interactions.

    Provides end-to-end streaming: Audio → STT → LLM → TTS → Audio
    Expected latency: ~3-5 seconds (down from ~20 seconds)

    Query Parameters:
    - token: JWT authentication token
    - language: Language hint for STT ("auto", "he", "en", "es", etc.)
    - conversation_id: Optional conversation ID to continue
    - voice_id: Optional TTS voice ID

    Client → Server Messages:
    - {"type": "audio", "data": "<base64 PCM audio chunk>"}
    - {"type": "commit", "reason": "silence|button"}  # Manual end of speech
    - {"type": "cancel"}  # Cancel current interaction

    Server → Client Messages:
    - {"type": "transcript_partial", "text": "..."}  # Interim STT result
    - {"type": "transcript_final", "text": "...", "language": "he"}
    - {"type": "llm_chunk", "text": "..."}  # LLM response token
    - {"type": "tts_audio", "data": "<base64 MP3 audio chunk>"}
    - {"type": "complete", "conversation_id": "...", "escalation_needed": false}
    - {"type": "error", "message": "..."}
    """
    # Authenticate user
    user = await get_user_from_ws_token(token)
    if not user:
        await websocket.close(code=4001, reason="Invalid token")
        return

    # Accept WebSocket connection
    await websocket.accept()
    logger.info(f"🎤 Voice pipeline WebSocket connected for user {user.id}")

    # Initialize pipeline
    pipeline: Optional[VoicePipelineService] = None

    try:
        # Create and start pipeline
        pipeline = VoicePipelineService(
            user=user,
            language=language,
            conversation_id=conversation_id,
            voice_id=voice_id,
        )
        await pipeline.start()

        # Start background task to forward pipeline output to WebSocket
        async def forward_output():
            try:
                async for message in pipeline.receive_messages():
                    await websocket.send_json(message.to_dict())
            except WebSocketDisconnect:
                pass
            except Exception as e:
                logger.error(f"Error forwarding output: {e}")

        output_task = asyncio.create_task(forward_output())

        # Process incoming messages
        try:
            while True:
                data = await websocket.receive_text()
                message = json.loads(data)
                msg_type = message.get("type")

                if msg_type == "audio":
                    # Decode and process audio chunk
                    audio_b64 = message.get("data", "")
                    if audio_b64:
                        audio_bytes = base64.b64decode(audio_b64)
                        await pipeline.process_audio_chunk(audio_bytes)

                elif msg_type == "commit":
                    # Manual end of speech signal
                    await pipeline.commit_audio()

                elif msg_type == "cancel":
                    # Cancel current interaction
                    await pipeline.cancel()

                elif msg_type == "ping":
                    # Keep-alive ping
                    await websocket.send_json({"type": "pong"})

        except WebSocketDisconnect:
            logger.info(f"Voice pipeline WebSocket disconnected for user {user.id}")

        # Cancel output task
        output_task.cancel()
        try:
            await output_task
        except asyncio.CancelledError:
            pass

    except Exception as e:
        logger.error(f"Voice pipeline error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass

    finally:
        # Cleanup pipeline
        if pipeline:
            await pipeline.stop()
        logger.info(f"Voice pipeline WebSocket closed for user {user.id}")


@router.post("/chat/rate", response_model=ConversationRatingResponse)
async def rate_conversation(
    request: ConversationRatingRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Rate a voice support conversation."""
    success = await support_service.rate_conversation(
        conversation_id=request.conversation_id,
        user=current_user,
        rating=request.rating,
        feedback=request.feedback,
    )

    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return ConversationRatingResponse(
        conversation_id=request.conversation_id,
        rating=request.rating,
        feedback=request.feedback,
    )


# =============================================================================
# Tickets (User)
# =============================================================================


@router.post("/tickets", response_model=TicketResponse)
async def create_ticket(
    request: TicketCreateRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Create a new support ticket."""
    ticket = await support_service.create_ticket(
        user=current_user,
        subject=request.subject,
        message=request.message,
        category=request.category,
        priority=request.priority,
        language=request.language or "en",
        voice_conversation_id=request.voice_conversation_id,
    )

    return _ticket_to_response(ticket)


@router.get("/tickets", response_model=TicketListResponse)
async def list_tickets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
):
    """List current user's support tickets."""
    tickets, total = await support_service.list_user_tickets(
        user=current_user,
        page=page,
        page_size=page_size,
        status=status,
    )

    return TicketListResponse(
        tickets=[_ticket_to_response(t) for t in tickets],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size),
    )


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific ticket."""
    ticket = await support_service.get_ticket(
        ticket_id=ticket_id,
        user=current_user,
    )

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return _ticket_to_response(ticket)


@router.post("/tickets/{ticket_id}/messages", response_model=TicketResponse)
async def add_ticket_message(
    ticket_id: str,
    request: TicketMessageRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Add a message to a ticket thread."""
    # Check ownership first
    existing = await support_service.get_ticket(ticket_id, user=current_user)
    if not existing:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket = await support_service.add_ticket_message(
        ticket_id=ticket_id,
        author=current_user,
        content=request.content,
        is_support=False,
    )

    return _ticket_to_response(ticket)


# =============================================================================
# Tickets (Admin)
# =============================================================================


@router.get("/admin/tickets", response_model=TicketAdminListResponse)
async def admin_list_tickets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    assigned_to: Optional[str] = None,
    current_user: User = Depends(require_role(["admin", "support"])),
):
    """List all tickets (admin only)."""
    tickets, total, stats = await support_service.list_admin_tickets(
        page=page,
        page_size=page_size,
        status=status,
        priority=priority,
        category=category,
        assigned_to=assigned_to,
    )

    return TicketAdminListResponse(
        tickets=[_ticket_to_admin_response(t) for t in tickets],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size),
        by_status=stats["by_status"],
        by_priority=stats["by_priority"],
        by_category=stats["by_category"],
    )


@router.get("/admin/tickets/{ticket_id}", response_model=TicketAdminResponse)
async def admin_get_ticket(
    ticket_id: str,
    current_user: User = Depends(require_role(["admin", "support"])),
):
    """Get a specific ticket with admin details."""
    ticket = await support_service.get_ticket(
        ticket_id=ticket_id,
        is_admin=True,
    )

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return _ticket_to_admin_response(ticket)


@router.patch("/admin/tickets/{ticket_id}", response_model=TicketAdminResponse)
async def admin_update_ticket(
    ticket_id: str,
    request: TicketUpdateRequest,
    current_user: User = Depends(require_role(["admin", "support"])),
):
    """Update ticket status/priority/assignment (admin only)."""
    ticket = await support_service.update_ticket(
        ticket_id=ticket_id,
        admin=current_user,
        status=request.status,
        priority=request.priority,
        assigned_to=request.assigned_to,
        tags=request.tags,
    )

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return _ticket_to_admin_response(ticket)


@router.post("/admin/tickets/{ticket_id}/messages", response_model=TicketAdminResponse)
async def admin_add_ticket_message(
    ticket_id: str,
    request: TicketMessageRequest,
    current_user: User = Depends(require_role(["admin", "support"])),
):
    """Add a support response to a ticket."""
    ticket = await support_service.add_ticket_message(
        ticket_id=ticket_id,
        author=current_user,
        content=request.content,
        is_support=True,
    )

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return _ticket_to_admin_response(ticket)


@router.post("/admin/tickets/{ticket_id}/notes", response_model=TicketAdminResponse)
async def admin_add_ticket_note(
    ticket_id: str,
    request: TicketNoteRequest,
    current_user: User = Depends(require_role(["admin", "support"])),
):
    """Add an internal note to a ticket (not visible to user)."""
    ticket = await support_service.add_ticket_note(
        ticket_id=ticket_id,
        admin=current_user,
        content=request.content,
    )

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return _ticket_to_admin_response(ticket)


# =============================================================================
# FAQ
# =============================================================================


@router.get("/faq", response_model=FAQListResponse)
async def list_faq(
    category: Optional[str] = None,
    language: str = "en",
):
    """Get FAQ entries, optionally filtered by category."""
    items = await support_service.get_faq_by_category(
        category=category,
        language=language,
    )

    return FAQListResponse(
        items=[FAQItem(**item) for item in items],
        total=len(items),
    )


@router.post("/faq/{faq_id}/view")
async def record_faq_view(faq_id: str):
    """Record a view for an FAQ entry."""
    await support_service.record_faq_view(faq_id)
    return {"success": True}


@router.post("/faq/{faq_id}/feedback")
async def record_faq_feedback(
    faq_id: str,
    request: FAQFeedbackRequest,
):
    """Record feedback for an FAQ entry."""
    await support_service.record_faq_feedback(faq_id, request.helpful)
    return {"success": True}


# =============================================================================
# Documentation
# =============================================================================


@router.get("/docs")
async def list_docs(language: str = "en"):
    """
    List available documentation.
    Returns categories and articles.
    """
    # Documentation is served from static files
    # This endpoint returns the manifest for navigation
    import json
    from pathlib import Path

    docs_path = (
        Path(__file__).parent.parent.parent.parent.parent
        / "shared"
        / "data"
        / "support"
        / "docs"
    )
    manifest_path = docs_path / "manifest.json"

    try:
        if manifest_path.exists():
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)

            # Filter by language
            articles = [
                a for a in manifest.get("articles", []) if a.get("language") == language
            ]

            categories = manifest.get("categories", [])

            return {
                "categories": categories,
                "articles": articles,
                "total_articles": len(articles),
            }
    except Exception as e:
        print(f"[Support API] Error loading docs manifest: {e}")

    return {"categories": [], "articles": [], "total_articles": 0}


@router.get("/docs/{path:path}")
async def get_doc(path: str, language: str = "en"):
    """
    Get a specific documentation article.
    Returns the markdown content.
    """
    from pathlib import Path

    docs_path = (
        Path(__file__).parent.parent.parent.parent.parent
        / "shared"
        / "data"
        / "support"
        / "docs"
    )
    full_path = docs_path / language / path

    # Ensure path doesn't escape the docs directory
    try:
        full_path.resolve().relative_to(docs_path.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid path")

    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()

        return {
            "path": path,
            "language": language,
            "content": content,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading document: {str(e)}")


@router.get("/docs/search")
async def search_docs(
    q: str = Query(..., min_length=1, description="Search query"),
    lang: str = Query("en", description="Language code (en, he, es)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    audience: Optional[str] = Query(
        None, description="Filter by audience (user, parent, admin, developer)"
    ),
    platform: Optional[str] = Query(
        None,
        description="Filter by platform (web, ios, android, apple_tv, android_tv, carplay)",
    ),
    limit: int = Query(20, ge=1, le=100, description="Maximum results"),
    current_user: Optional[User] = Depends(get_current_active_user),
):
    """
    Search documentation articles and FAQ entries.

    Returns combined results from both documentation and FAQ, ranked by relevance.
    """
    user_id = str(current_user.id) if current_user else None

    results = await docs_search_service.search(
        query=q,
        language=lang,
        category=category,
        audience=audience,
        platform=platform,
        limit=limit,
        user_id=user_id,
    )

    return results


@router.get("/docs/search/popular")
async def get_popular_searches(
    lang: str = Query("en", description="Language code"),
    limit: int = Query(10, ge=1, le=50),
    days: int = Query(7, ge=1, le=30),
):
    """Get popular search queries from the last N days."""
    results = await docs_search_service.get_popular_searches(
        language=lang,
        limit=limit,
        days=days,
    )
    return {"popular_searches": results}


@router.get("/docs/search/gaps")
async def get_search_gaps(
    lang: str = Query("en", description="Language code"),
    limit: int = Query(20, ge=1, le=100),
    days: int = Query(7, ge=1, le=30),
    current_user: User = Depends(require_role(["admin"])),
):
    """
    Get searches that returned zero results (admin only).
    Useful for identifying content gaps.
    """
    results = await docs_search_service.get_zero_result_searches(
        language=lang,
        limit=limit,
        days=days,
    )
    return {"zero_result_searches": results}


# =============================================================================
# Analytics (Admin)
# =============================================================================


@router.get("/admin/analytics", response_model=SupportAnalyticsResponse)
async def get_analytics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(require_role(["admin"])),
):
    """Get support analytics (admin only)."""
    analytics = await support_service.get_analytics(
        start_date=start_date,
        end_date=end_date,
    )

    return SupportAnalyticsResponse(**analytics)


# =============================================================================
# Helper Functions
# =============================================================================


def _ticket_to_response(ticket) -> TicketResponse:
    """Convert ticket model to response schema."""
    return TicketResponse(
        id=str(ticket.id),
        subject=ticket.subject,
        message=ticket.message,
        category=ticket.category,
        status=ticket.status,
        priority=ticket.priority,
        language=ticket.language,
        user_id=str(ticket.user_id),
        user_email=ticket.user_email,
        user_name=ticket.user_name,
        assigned_to=ticket.assigned_to,
        assigned_at=ticket.assigned_at,
        messages=[
            {
                "author_id": m.author_id,
                "author_name": m.author_name,
                "author_role": m.author_role,
                "content": m.content,
                "created_at": m.created_at,
                "attachments": m.attachments,
            }
            for m in ticket.messages
        ],
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        resolved_at=ticket.resolved_at,
        closed_at=ticket.closed_at,
        tags=ticket.tags,
    )


def _ticket_to_admin_response(ticket) -> TicketAdminResponse:
    """Convert ticket model to admin response schema."""
    base = _ticket_to_response(ticket)
    return TicketAdminResponse(
        **base.model_dump(),
        notes=[
            {
                "author_id": n.author_id,
                "author_name": n.author_name,
                "content": n.content,
                "created_at": n.created_at,
            }
            for n in ticket.notes
        ],
        first_response_at=ticket.first_response_at,
        resolution_time_minutes=ticket.resolution_time_minutes,
        voice_conversation_id=ticket.voice_conversation_id,
    )
