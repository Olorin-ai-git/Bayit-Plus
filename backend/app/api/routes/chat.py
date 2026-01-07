from datetime import datetime
from typing import Optional
import tempfile
import os
import hmac
import hashlib
import httpx
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request, Header, BackgroundTasks
from pydantic import BaseModel
import anthropic
from app.models.user import User
from app.models.watchlist import Conversation
from app.models.content import Content, LiveChannel, Podcast
from app.core.config import settings
from app.core.security import get_current_active_user

router = APIRouter()

# In-memory store for pending transcriptions (use Redis in production)
pending_transcriptions: dict[str, dict] = {}

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

# ElevenLabs API endpoint
ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"


async def process_hebronics_input(text: str) -> dict:
    """
    Process "Hebronics" - Hebrew-English mixed input common among Israeli expats.
    Uses Claude to normalize mixed language queries into coherent Hebrew search terms.

    Examples:
    - "אני רוצה לראות movie עם action" -> "אני רוצה לראות סרט פעולה"
    - "תראה לי את ה-shows החדשים" -> "תראה לי את התוכניות החדשות"
    - "יש לכם documentaries על history?" -> "יש לכם דוקומנטרים על היסטוריה?"
    """
    if not text or not text.strip():
        return {"original": text, "normalized": text, "intent": None}

    prompt = f"""אתה מעבד קלט קולי מישראלים שגרים בארה"ב. הם לפעמים מערבבים עברית ואנגלית ("עברנגלית" או "Hebronics").

הקלט: "{text}"

עליך לעשות:
1. לזהות את הכוונה (חיפוש, שאלה, בקשה)
2. לנרמל את הטקסט לעברית תקנית
3. לחלץ מילות מפתח לחיפוש

החזר JSON בפורמט:
{{
    "normalized": "הטקסט המנורמל בעברית",
    "intent": "search|question|browse|play",
    "keywords": ["מילה1", "מילה2"],
    "content_type": "movie|series|channel|radio|podcast|any",
    "genre": "action|comedy|drama|documentary|news|kids|null",
    "english_terms": ["original", "english", "words"]
}}"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = response.content[0].text.strip()

        # Parse JSON from response
        import json
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        result = json.loads(response_text)
        result["original"] = text
        return result

    except Exception as e:
        print(f"Hebronics processing error: {e}")
        return {
            "original": text,
            "normalized": text,
            "intent": "search",
            "keywords": text.split(),
            "content_type": "any",
            "genre": None,
            "english_terms": []
        }


SYSTEM_PROMPT = """אתה העוזר החכם של בית+, פלטפורמת סטרימינג ישראלית לישראלים בארה"ב.

התפקיד שלך:
1. לעזור למשתמשים למצוא תוכן לצפייה (סרטים, סדרות, ערוצי שידור חי, רדיו, פודקאסטים)
2. לתת המלצות מותאמות אישית
3. לענות על שאלות על תוכניות ספציפיות
4. לסייע בניווט באפליקציה

כללים:
- תמיד ענה בעברית
- היה ידידותי ותמציתי
- אם המשתמש מחפש תוכן, נסה להבין את ההעדפות שלו
- אם אתה לא יודע משהו על תוכן ספציפי, אמור זאת בכנות

קטגוריות תוכן זמינות:
- סרטים ישראליים
- סדרות דרמה
- קומדיה
- דוקומנטרים
- ילדים ומשפחה
- חדשות ואקטואליה

ערוצי שידור חי:
- כאן (תאגיד השידור הישראלי)
- קשת 12
- רשת 13
- ערוץ 14
- i24NEWS

תחנות רדיו:
- גלי צה"ל
- רדיו כאן (בית, גימל, 88FM, רשת א')
- 103FM
- Eco 99FM"""


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    conversation_id: str
    recommendations: Optional[list] = None


@router.post("", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Send a message to the AI assistant."""
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
        for msg in conversation.messages[-10:]  # Last 10 messages for context
    ]

    try:
        # Call Claude API
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=messages,
        )

        assistant_message = response.content[0].text

        # Add assistant response to history
        conversation.messages.append({
            "role": "assistant",
            "content": assistant_message,
            "timestamp": datetime.utcnow().isoformat(),
        })
        conversation.updated_at = datetime.utcnow()
        await conversation.save()

        # Try to extract content recommendations if mentioned
        recommendations = await get_recommendations_from_response(
            assistant_message, request.message
        )

        return ChatResponse(
            message=assistant_message,
            conversation_id=str(conversation.id),
            recommendations=recommendations,
        )

    except anthropic.APIError as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


async def get_recommendations_from_response(
    response: str, query: str
) -> Optional[list]:
    """Try to find relevant content to recommend based on the conversation."""
    # Simple keyword-based search for recommendations
    keywords = ["סרט", "סדרה", "ערוץ", "פודקאסט", "תוכנית", "רדיו"]

    if not any(kw in query.lower() or kw in response.lower() for kw in keywords):
        return None

    # Search for relevant content
    content = await Content.find(
        Content.is_published == True
    ).limit(4).to_list()

    if content:
        return [
            {
                "id": str(item.id),
                "title": item.title,
                "thumbnail": item.thumbnail,
                "type": "vod",
            }
            for item in content
        ]

    return None


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


class TranscriptionResponse(BaseModel):
    text: str
    language: str = "he"


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """Transcribe audio to Hebrew text using ElevenLabs Speech-to-Text."""
    # Validate file type
    allowed_types = ["audio/webm", "audio/wav", "audio/mp3", "audio/mpeg", "audio/ogg", "audio/m4a"]
    if audio.content_type and audio.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format. Allowed: {', '.join(allowed_types)}",
        )

    try:
        # Read audio content
        content = await audio.read()

        # Call ElevenLabs Speech-to-Text API
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                ELEVENLABS_STT_URL,
                headers={
                    "xi-api-key": settings.ELEVENLABS_API_KEY,
                },
                files={
                    "audio": (audio.filename or "recording.webm", content, audio.content_type),
                },
                data={
                    "model_id": "scribe_v2_realtime",
                    "language_code": "he",  # Hebrew
                },
                timeout=60.0,
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=500,
                    detail=f"ElevenLabs API error: {response.text}",
                )

            result = response.json()
            transcribed_text = result.get("text", "").strip()

            if not transcribed_text:
                raise HTTPException(
                    status_code=400,
                    detail="Could not transcribe audio. Please try again.",
                )

            return TranscriptionResponse(text=transcribed_text, language="he")

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Transcription timed out. Please try again.")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Transcription service error: {str(e)}")


class HebronicsRequest(BaseModel):
    text: str


class HebronicsResponse(BaseModel):
    original: str
    normalized: str
    intent: Optional[str] = None
    keywords: list = []
    content_type: Optional[str] = None
    genre: Optional[str] = None
    english_terms: list = []


@router.post("/hebronics", response_model=HebronicsResponse)
async def process_hebronics(
    request: HebronicsRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Process Hebronics (Hebrew-English mixed) input.
    Normalizes mixed language queries and extracts search intent.

    Useful for voice search where Israeli expats commonly mix Hebrew and English.
    """
    result = await process_hebronics_input(request.text)
    return HebronicsResponse(**result)


class VoiceSearchRequest(BaseModel):
    transcript: str
    language: str = "he"


class VoiceSearchResponse(BaseModel):
    original_transcript: str
    normalized_query: str
    intent: Optional[str] = None
    keywords: list = []
    content_type: Optional[str] = None
    genre: Optional[str] = None
    search_results: list = []


@router.post("/voice-search", response_model=VoiceSearchResponse)
async def voice_search(
    request: VoiceSearchRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Process voice search with Hebronics support.
    Combines speech transcription processing with content search.
    """
    # Process the transcript with Hebronics normalization
    processed = await process_hebronics_input(request.transcript)

    # Search for content based on processed query
    search_results = []

    if processed.get("intent") in ["search", "browse", "play"]:
        # Build search query
        keywords = processed.get("keywords", [])
        content_type = processed.get("content_type", "any")

        # Search in VOD content
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

        # Search in live channels
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

        # Search in podcasts
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


# ============================================================================
# ElevenLabs Webhook Handler
# ============================================================================

def verify_elevenlabs_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Verify ElevenLabs webhook signature using HMAC-SHA256.

    ElevenLabs signs webhooks with: HMAC-SHA256(webhook_secret, raw_body)
    The signature is sent in the 'elevenlabs-signature' header.
    """
    if not secret:
        return False

    try:
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()

        # Compare signatures (constant-time comparison to prevent timing attacks)
        return hmac.compare_digest(expected_signature, signature)
    except Exception:
        return False


class ElevenLabsWebhookEvent(BaseModel):
    """ElevenLabs webhook event payload."""
    event_type: str
    request_id: Optional[str] = None
    transcription_id: Optional[str] = None
    status: Optional[str] = None
    text: Optional[str] = None
    language_code: Optional[str] = None
    audio_duration: Optional[float] = None
    error: Optional[str] = None
    metadata: Optional[dict] = None


class WebhookResponse(BaseModel):
    """Response for webhook acknowledgment."""
    received: bool = True
    event_type: str
    message: str


@router.post("/webhook/elevenlabs", response_model=WebhookResponse)
async def elevenlabs_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    elevenlabs_signature: Optional[str] = Header(None, alias="elevenlabs-signature"),
    x_elevenlabs_signature: Optional[str] = Header(None, alias="x-elevenlabs-signature"),
):
    """
    Handle ElevenLabs webhook events for transcription completion.

    Events:
    - transcription.completed: Transcription finished successfully
    - transcription.failed: Transcription failed
    - transcription.started: Transcription job started (optional)

    The webhook verifies the signature using the ELEVENLABS_WEBHOOK_SECRET.
    """
    # Get raw body for signature verification
    body = await request.body()

    # Try both header formats
    signature = elevenlabs_signature or x_elevenlabs_signature

    # Verify signature if secret is configured
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

    # Parse the event payload
    try:
        import json
        payload = json.loads(body)
        event = ElevenLabsWebhookEvent(**payload)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid webhook payload: {str(e)}"
        )

    # Handle different event types
    if event.event_type == "transcription.completed":
        # Process completed transcription
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
        # Log failed transcription
        print(f"[ElevenLabs Webhook] Transcription failed: {event.error}")

        # Clean up pending transcription
        if event.transcription_id and event.transcription_id in pending_transcriptions:
            pending_transcriptions[event.transcription_id]["status"] = "failed"
            pending_transcriptions[event.transcription_id]["error"] = event.error

        return WebhookResponse(
            event_type=event.event_type,
            message=f"Transcription failed: {event.error}"
        )

    elif event.event_type == "transcription.started":
        # Track started transcription
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
        # Unknown event type - acknowledge receipt
        print(f"[ElevenLabs Webhook] Unknown event type: {event.event_type}")
        return WebhookResponse(
            event_type=event.event_type,
            message=f"Event received: {event.event_type}"
        )


async def process_transcription_completed(
    transcription_id: Optional[str],
    text: Optional[str],
    language_code: Optional[str],
    audio_duration: Optional[float],
    metadata: Optional[dict]
):
    """
    Background task to process completed transcription.

    This can be extended to:
    - Store transcriptions in database
    - Trigger chatbot actions based on voice commands
    - Send notifications to connected clients via WebSocket
    - Process Hebronics normalization
    """
    print(f"[ElevenLabs Webhook] Processing transcription: {transcription_id}")
    print(f"  Text: {text}")
    print(f"  Language: {language_code}")
    print(f"  Duration: {audio_duration}s")

    if not text:
        return

    # Update pending transcription status
    if transcription_id and transcription_id in pending_transcriptions:
        pending_transcriptions[transcription_id].update({
            "status": "completed",
            "text": text,
            "language_code": language_code,
            "audio_duration": audio_duration,
            "completed_at": datetime.utcnow().isoformat()
        })

    # Process Hebronics normalization if needed
    if language_code in ["he", "iw"]:  # Hebrew
        try:
            processed = await process_hebronics_input(text)
            print(f"  Normalized: {processed.get('normalized')}")
            print(f"  Intent: {processed.get('intent')}")

            if transcription_id and transcription_id in pending_transcriptions:
                pending_transcriptions[transcription_id]["processed"] = processed
        except Exception as e:
            print(f"  Hebronics processing error: {e}")

    # TODO: Integrate with WebSocket to push results to connected clients
    # TODO: Store transcription in database for history
    # TODO: Trigger chatbot action if metadata contains user context


class TranscriptionStatusResponse(BaseModel):
    """Response for transcription status check."""
    transcription_id: str
    status: str
    text: Optional[str] = None
    language_code: Optional[str] = None
    audio_duration: Optional[float] = None
    error: Optional[str] = None
    processed: Optional[dict] = None


@router.get("/transcription/{transcription_id}", response_model=TranscriptionStatusResponse)
async def get_transcription_status(
    transcription_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Check the status of a pending transcription.

    This endpoint allows clients to poll for transcription completion
    when using async transcription with webhooks.
    """
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
