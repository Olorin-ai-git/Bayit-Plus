"""
Chat API Router - FastAPI endpoint handlers

All chat-related API endpoints including messaging, transcription,
TTS, content resolution, and webhook handling.
"""

import json
from datetime import datetime
from typing import Optional

import httpx
import anthropic
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request, Header, BackgroundTasks, Form
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.watchlist import Conversation
from app.models.content import Content, LiveChannel, Podcast
from app.services.chat_search_tool import CHAT_TOOLS, execute_chat_tool

from .models import (
    ChatRequest, ChatResponse, TranscriptionResponse, TTSRequest,
    HebronicsRequest, HebronicsResponse, ResolveContentRequest,
    ResolveContentResponse, VoiceSearchRequest, VoiceSearchResponse,
    ElevenLabsWebhookEvent, WebhookResponse, TranscriptionStatusResponse,
    SFXRequest
)
from .helpers import (
    build_media_context, process_hebronics_input, extract_json_from_response,
    strip_markdown
)
from .prompts import get_system_prompt
from .services import (
    get_recommendations_from_response, extract_action_from_response,
    resolve_single_content, verify_elevenlabs_signature,
    process_transcription_completed, pending_transcriptions,
    align_message_with_action
)


router = APIRouter()

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

# ElevenLabs API endpoints
ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"
ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech"


@router.post("", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Send a message to the AI assistant."""
    user_language = (request.language or "he").lower()

    print(f"[CHAT] Received message: '{request.message}'")
    print(f"[CHAT] Language parameter: {request.language}")
    print(f"[CHAT] Resolved language: {user_language}")
    print(f"[CHAT] Wake word filtering disabled - accepting all input")

    # Get or create conversation
    if request.conversation_id:
        conversation = await Conversation.get(request.conversation_id)
        if not conversation or conversation.user_id != str(current_user.id):
            conversation = None
    else:
        conversation = None

    if not conversation:
        conversation = Conversation(
            user_id=str(current_user.id),
            messages=[],
            context={},
        )
        await conversation.insert()

    # Add user message to history
    conversation.messages.append({
        "role": "user",
        "content": request.message,
        "timestamp": datetime.utcnow().isoformat(),
    })

    # Build messages for Claude
    messages = [
        {"role": msg["role"], "content": msg["content"]}
        for msg in conversation.messages[-10:]
    ]

    try:
        # Build media context for smarter LLM responses
        media_context = await build_media_context()

        # Get appropriate system prompt for language with media context
        system_prompt = get_system_prompt(user_language, media_context)

        print(f"[CHAT] System prompt includes {media_context['summary']['total_channels']} channels, {media_context['summary']['total_podcasts']} podcasts, {media_context['summary']['total_content_items']} content items")

        # Call Claude API with search tools
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
            tools=CHAT_TOOLS,
        )

        # Handle tool use loop
        tool_use_messages = list(messages)
        max_tool_iterations = 3

        while response.stop_reason == "tool_use" and max_tool_iterations > 0:
            max_tool_iterations -= 1

            tool_use_blocks = [block for block in response.content if block.type == "tool_use"]
            text_blocks = [block for block in response.content if block.type == "text"]

            if text_blocks:
                print(f"[CHAT] Claude text before tool use: {text_blocks[0].text[:100]}...")

            # Execute each tool
            tool_results = []
            for tool_use in tool_use_blocks:
                print(f"[CHAT] Tool called: {tool_use.name} with input: {tool_use.input}")
                try:
                    result = await execute_chat_tool(tool_use.name, tool_use.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_use.id,
                        "content": json.dumps(result, ensure_ascii=False)
                    })
                    print(f"[CHAT] Tool result: {len(result.get('results', []))} items found")
                except Exception as e:
                    print(f"[CHAT] Tool error: {e}")
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_use.id,
                        "content": json.dumps({"error": str(e)}),
                        "is_error": True
                    })

            # Add assistant response and tool results to messages
            tool_use_messages.append({
                "role": "assistant",
                "content": [{"type": block.type, **block.model_dump()} for block in response.content]
            })
            tool_use_messages.append({
                "role": "user",
                "content": tool_results
            })

            # Continue conversation with tool results
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=system_prompt,
                messages=tool_use_messages,
                tools=CHAT_TOOLS,
            )

        # Extract final text response
        raw_response = ""
        for block in response.content:
            if block.type == "text":
                raw_response = block.text
                break

        print(f"[CHAT] Claude raw response (first 200 chars): {raw_response[:200]}")

        # Extract JSON if Claude included it in the response
        assistant_message, embedded_json = extract_json_from_response(raw_response)

        print(f"[CHAT] Claude response: language='{user_language}', response='{assistant_message[:100]}'...")
        if embedded_json:
            print(f"[CHAT] Found embedded JSON in response: {embedded_json}")

        # Add assistant response to history
        conversation.messages.append({
            "role": "assistant",
            "content": assistant_message,
            "timestamp": datetime.utcnow().isoformat(),
        })
        conversation.updated_at = datetime.utcnow()
        await conversation.save()

        # Extract content recommendations if mentioned
        recommendations = await get_recommendations_from_response(
            assistant_message, request.message, media_context
        )

        # Extract action intent from response
        action = await extract_action_from_response(
            assistant_message, request.message, user_language
        )

        # Align message with action for voice
        final_message = await align_message_with_action(
            assistant_message, action, request.message, user_language
        )

        return ChatResponse(
            message=final_message,
            conversation_id=str(conversation.id),
            recommendations=recommendations,
            language=user_language,
            spoken_response=strip_markdown(final_message),
            action=action,
            content_ids=None,
            visual_action=None,
            confidence=action.get("confidence", 0.8) if action else 0.8,
        )

    except anthropic.APIError as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Get conversation history."""
    conversation = await Conversation.get(conversation_id)
    if not conversation or conversation.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "id": str(conversation.id),
        "messages": [
            {
                "role": msg["role"],
                "content": msg["content"],
                "timestamp": msg.get("timestamp"),
            }
            for msg in conversation.messages
        ],
        "created_at": conversation.created_at.isoformat(),
    }


@router.delete("/{conversation_id}")
async def clear_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Clear conversation history."""
    conversation = await Conversation.get(conversation_id)
    if not conversation or conversation.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation.messages = []
    conversation.updated_at = datetime.utcnow()
    await conversation.save()

    return {"message": "Conversation cleared"}


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
):
    """Transcribe audio using ElevenLabs Speech-to-Text with language hint."""
    allowed_types = ["audio/webm", "audio/wav", "audio/mp3", "audio/mpeg", "audio/ogg", "audio/m4a"]
    if audio.content_type and audio.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format. Allowed: {', '.join(allowed_types)}",
        )

    try:
        content = await audio.read()

        language_code = (language or "he").lower()
        print(f"[STT] Received language parameter from client: {language}")
        print(f"[STT] Transcribing audio with language hint: {language_code}")

        request_data = {
            "model_id": "scribe_v2",
            "language_code": language_code,
        }

        print(f"[STT] Request data being sent to ElevenLabs: {request_data}")

        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                ELEVENLABS_STT_URL,
                headers={
                    "xi-api-key": settings.ELEVENLABS_API_KEY,
                },
                files={
                    "file": (audio.filename or "recording.webm", content, audio.content_type),
                },
                data=request_data,
                timeout=60.0,
            )

            if response.status_code != 200:
                error_detail = response.text
                print(f"[STT] ElevenLabs API error {response.status_code}: {error_detail}")
                raise HTTPException(
                    status_code=500,
                    detail=f"ElevenLabs API error: {error_detail}",
                )

            result = response.json()
            transcribed_text = result.get("text", "").strip()
            detected_language = language_code.lower()

            print(f"[STT] ElevenLabs response language: {result.get('language')}")
            print(f"[STT] Using language hint as authoritative: {detected_language}")
            print(f"[STT] Transcription result: text='{transcribed_text}', final_language='{detected_language}'")
            print(f"[STT] Full API response: {result}")

            if not transcribed_text:
                raise HTTPException(
                    status_code=400,
                    detail="Could not transcribe audio. Please try again.",
                )

            return TranscriptionResponse(text=transcribed_text, language=detected_language)

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Transcription timed out. Please try again.")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Transcription service error: {str(e)}")


@router.post("/text-to-speech")
async def text_to_speech(
    request: TTSRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Convert text to speech using ElevenLabs Text-to-Speech API."""
    print(f"[TTS] Text-to-speech request: language='{request.language}', text='{request.text[:100]}'...")

    if not request.text or not request.text.strip():
        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty"
        )

    if len(request.text) > 5000:
        raise HTTPException(
            status_code=400,
            detail="Text is too long (max 5000 characters)"
        )

    if request.voice_id:
        voice_id = request.voice_id
    else:
        voice_id = settings.ELEVENLABS_DEFAULT_VOICE_ID

    print(f"[TTS] Using voice_id='{voice_id}', language='{request.language}', model='{request.model_id}'")
    print(f"[TTS] Text preview: '{request.text[:100]}'")

    try:
        tts_url = f"{ELEVENLABS_TTS_URL}/{voice_id}/stream"

        model_to_use = request.model_id
        if request.language in ['he', 'es']:
            model_to_use = 'eleven_v3'
            print(f"[TTS] Using eleven_v3 model for {request.language} text")

        request_body = {
            "text": request.text,
            "model_id": model_to_use,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
            }
        }

        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                tts_url,
                headers={
                    "xi-api-key": settings.ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                },
                json=request_body,
                timeout=60.0,
            )

            if response.status_code != 200:
                error_detail = response.text if response.text else "Unknown error"
                print(f"[TTS] ElevenLabs API error status={response.status_code}: {error_detail}")
                raise HTTPException(
                    status_code=500,
                    detail=f"ElevenLabs TTS error: {error_detail}",
                )

            return StreamingResponse(
                iter([response.content]),
                media_type="audio/mpeg",
                headers={
                    "Content-Disposition": 'inline; filename="tts.mp3"',
                    "Cache-Control": "no-store",
                }
            )

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="TTS service timed out. Please try again.")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"TTS service error: {str(e)}")


@router.post("/hebronics", response_model=HebronicsResponse)
async def process_hebronics(
    request: HebronicsRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Process Hebronics (Hebrew-English mixed) input."""
    result = await process_hebronics_input(request.text)
    return HebronicsResponse(**result)


@router.post("/resolve-content", response_model=ResolveContentResponse)
async def resolve_content(
    request: ResolveContentRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Resolve multiple content items by name for voice commands."""
    from .models import ResolvedContentItem

    resolved_items: list[ResolvedContentItem] = []
    unresolved: list[str] = []

    for item in request.items:
        result = await resolve_single_content(
            name=item.name,
            content_type=item.type,
            language=request.language
        )

        if result:
            resolved_items.append(result)
            print(f"[CHAT] Resolved '{item.name}' -> '{result.name}' (type={result.type}, confidence={result.confidence:.2f})")
        else:
            unresolved.append(item.name)
            print(f"[CHAT] Could not resolve: '{item.name}'")

    return ResolveContentResponse(
        items=resolved_items,
        unresolved=unresolved,
        total_requested=len(request.items),
        total_resolved=len(resolved_items)
    )


@router.post("/voice-search", response_model=VoiceSearchResponse)
async def voice_search(
    request: VoiceSearchRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Process voice search with Hebronics support."""
    processed = await process_hebronics_input(request.transcript)

    search_results = []

    if processed.get("intent") in ["search", "browse", "play"]:
        content_type = processed.get("content_type", "any")

        if content_type in ["any", "movie", "series"]:
            vod_results = await Content.find(
                Content.is_published == True
            ).limit(6).to_list()

            search_results.extend([
                {
                    "id": str(item.id),
                    "title": item.title,
                    "description": item.description,
                    "thumbnail": item.thumbnail,
                    "type": "vod",
                    "content_type": item.content_type,
                }
                for item in vod_results
            ])

        if content_type in ["any", "channel"]:
            channels = await LiveChannel.find(
                LiveChannel.is_active == True
            ).limit(4).to_list()

            search_results.extend([
                {
                    "id": str(ch.id),
                    "title": ch.name,
                    "description": ch.description,
                    "thumbnail": ch.logo,
                    "type": "live",
                }
                for ch in channels
            ])

        if content_type in ["any", "podcast"]:
            podcasts = await Podcast.find(
                Podcast.is_published == True
            ).limit(4).to_list()

            search_results.extend([
                {
                    "id": str(pod.id),
                    "title": pod.title,
                    "description": pod.description,
                    "thumbnail": pod.thumbnail,
                    "type": "podcast",
                }
                for pod in podcasts
            ])

    return VoiceSearchResponse(
        original_transcript=request.transcript,
        normalized_query=processed.get("normalized", request.transcript),
        intent=processed.get("intent"),
        keywords=processed.get("keywords", []),
        content_type=processed.get("content_type"),
        genre=processed.get("genre"),
        search_results=search_results,
    )


@router.post("/webhook/elevenlabs", response_model=WebhookResponse)
async def elevenlabs_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    elevenlabs_signature: Optional[str] = Header(None, alias="elevenlabs-signature"),
    x_elevenlabs_signature: Optional[str] = Header(None, alias="x-elevenlabs-signature"),
):
    """Handle ElevenLabs webhook events for transcription completion."""
    body = await request.body()

    signature = elevenlabs_signature or x_elevenlabs_signature

    if settings.ELEVENLABS_WEBHOOK_SECRET:
        if not signature:
            raise HTTPException(
                status_code=401,
                detail="Missing webhook signature header"
            )

        if not verify_elevenlabs_signature(body, signature, settings.ELEVENLABS_WEBHOOK_SECRET):
            raise HTTPException(
                status_code=401,
                detail="Invalid webhook signature"
            )

    try:
        payload = json.loads(body)
        event = ElevenLabsWebhookEvent(**payload)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid webhook payload: {str(e)}"
        )

    if event.event_type == "transcription.completed":
        background_tasks.add_task(
            process_transcription_completed,
            event.transcription_id or event.request_id,
            event.text,
            event.language_code,
            event.audio_duration,
            event.metadata
        )

        return WebhookResponse(
            event_type=event.event_type,
            message=f"Transcription completed: {len(event.text or '')} characters"
        )

    elif event.event_type == "transcription.failed":
        print(f"[ElevenLabs Webhook] Transcription failed: {event.error}")

        if event.transcription_id and event.transcription_id in pending_transcriptions:
            pending_transcriptions[event.transcription_id]["status"] = "failed"
            pending_transcriptions[event.transcription_id]["error"] = event.error

        return WebhookResponse(
            event_type=event.event_type,
            message=f"Transcription failed: {event.error}"
        )

    elif event.event_type == "transcription.started":
        if event.transcription_id:
            pending_transcriptions[event.transcription_id] = {
                "status": "processing",
                "started_at": datetime.utcnow().isoformat(),
                "metadata": event.metadata
            }

        return WebhookResponse(
            event_type=event.event_type,
            message="Transcription started"
        )

    else:
        print(f"[ElevenLabs Webhook] Unknown event type: {event.event_type}")
        return WebhookResponse(
            event_type=event.event_type,
            message=f"Event received: {event.event_type}"
        )


@router.get("/transcription/{transcription_id}", response_model=TranscriptionStatusResponse)
async def get_transcription_status(
    transcription_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Check the status of a pending transcription."""
    if transcription_id not in pending_transcriptions:
        raise HTTPException(
            status_code=404,
            detail="Transcription not found"
        )

    data = pending_transcriptions[transcription_id]

    return TranscriptionStatusResponse(
        transcription_id=transcription_id,
        status=data.get("status", "unknown"),
        text=data.get("text"),
        language_code=data.get("language_code"),
        audio_duration=data.get("audio_duration"),
        error=data.get("error"),
        processed=data.get("processed")
    )


@router.post("/sound-effect/{gesture}")
async def get_wizard_sfx(
    gesture: str,
    current_user: User = Depends(get_current_active_user),
):
    """Get a sound effect for a wizard gesture animation."""
    from app.services.elevenlabs_sfx_service import get_sfx_service, WIZARD_SFX_DESCRIPTIONS

    valid_gestures = list(WIZARD_SFX_DESCRIPTIONS.keys())
    if gesture not in valid_gestures:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid gesture: {gesture}. Valid options: {valid_gestures}"
        )

    try:
        sfx_service = get_sfx_service()
        audio_bytes = await sfx_service.get_wizard_sfx(gesture)

        return StreamingResponse(
            iter([audio_bytes]),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f'inline; filename="wizard_{gesture}.mp3"',
                "Cache-Control": "public, max-age=86400",
                "X-SFX-Gesture": gesture,
            }
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[SFX] Error generating sound effect: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate sound effect: {str(e)}"
        )


@router.post("/sound-effect")
async def generate_custom_sfx(
    request: SFXRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Generate a custom sound effect from a text description."""
    from app.services.elevenlabs_sfx_service import get_sfx_service

    if not request.custom_description:
        raise HTTPException(
            status_code=400,
            detail="custom_description is required for custom SFX generation"
        )

    if len(request.custom_description) > 500:
        raise HTTPException(
            status_code=400,
            detail="custom_description must be 500 characters or less"
        )

    if request.duration_seconds is not None:
        if not 0.5 <= request.duration_seconds <= 22:
            raise HTTPException(
                status_code=400,
                detail="duration_seconds must be between 0.5 and 22"
            )

    try:
        sfx_service = get_sfx_service()
        audio_bytes = await sfx_service.generate_sfx(
            text=request.custom_description,
            duration_seconds=request.duration_seconds,
        )

        return StreamingResponse(
            iter([audio_bytes]),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": 'inline; filename="custom_sfx.mp3"',
                "Cache-Control": "public, max-age=3600",
            }
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[SFX] Error generating custom sound effect: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate sound effect: {str(e)}"
        )
