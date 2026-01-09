from datetime import datetime
from typing import Optional
import tempfile
import os
import hmac
import hashlib
import httpx
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request, Header, BackgroundTasks, Form
from fastapi.responses import StreamingResponse
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

# ElevenLabs API endpoints
ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"
ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech"


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


SYSTEM_PROMPT = """אתה העוזר החכם של בית+. תפקידך להשיג מה שהמשתמש רוצה - לנווט, לחפש או לנגן.

עקוב אחרי הכללים הבאים בדיוק:
- תשובות קצרות מאוד (משפט אחד או שניים)
- התמקד בביצוע הפעולה, לא בהסברים
- אתן תוכן מידע רק אם ישנה בקשה ישירה
- אין סיפורים, אין המלצות, אין שיחה חברתית

תוכן זמין: סרטים (The Troupe, Footnote, Waltz with Bashir, Bonjour Monsieur Shlomi, Beaufort), ערוצים (Kan, Channel 2, Channel 13, i24NEWS), רדיו (גלי צה"ל, Radio Kan Beyt, 103FM, Eco 99FM), פודקאסטים.

פעולות שניתן לבצע (שמור את הטקסט המדויק):
- ניווט: "עבור לסרטים" / "עבור לסדרות" / "עבור לערוצים" / "עבור לרדיו" / "עבור לפודקאסטים" / "חזור הביתה"
- נגינה: "נגן את [שם]" / "השהה" / "המשך" / "דלג"
- חיפוש: "חפש [מילים]"
- שמירה: "הוסף למועדפים" / "הוסף לרשימה"
- הגדרות: "הגבר קול" / "הנמך קול" / "הצג כתוביות"

דוגמאות תשובות:
- "עבור לסרטים עכשיו" (לא: "יש לנו הרבה סרטים שאולי יעניינו אותך...")
- "נגן את The Troupe" (לא: "זה סרט מעולה שזכה לשבחים...")
- "חיפוש עבור דוקומנטרים" (לא: "יש הרבה דוקומנטרים טובים...")

חשוב: כלול תמיד את מילת המפתח בתשובתך כדי להפעיל את הפעולה. אם המשתמש לא ביקש משהו ספציפי, שאל בקצרה: "מה אתה רוצה? (סרטים / חיפוש / נגינה)"."""


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    # Context for smarter voice command processing
    context: Optional[dict] = None  # {currentRoute, visibleContentIds, lastMentionedContentIds}
    mode: Optional[str] = 'voice_only'  # voice_only, hybrid, or classic
    language: Optional[str] = None  # Language of the user's message ('en', 'he', etc.)


class ChatResponse(BaseModel):
    message: str
    conversation_id: str
    recommendations: Optional[list] = None
    language: str = "he"  # Response language (en, he, etc.)

    # Voice-first enhancements
    spoken_response: Optional[str] = None  # TTS-optimized text (shorter, natural)
    action: Optional[dict] = None  # {type, payload} for structured commands
    content_ids: Optional[list] = None  # Recommended content IDs
    visual_action: Optional[str] = None  # show_grid, navigate, highlight, scroll
    confidence: Optional[float] = None  # Command confidence score


def get_system_prompt(language: Optional[str] = None) -> str:
    """Get language-appropriate system prompt."""
    lang = (language or "he").lower()

    if lang == "en":
        return """You are Bayit+'s smart assistant. Your job: get users to what they want - navigate pages, search, or play content.

Follow these rules exactly:
- Very short responses (1-2 sentences max)
- Focus on the action, not explanations
- Only give information if directly asked
- No stories, no recommendations, no small talk

Available content: Movies (The Troupe, Footnote, Waltz with Bashir, Bonjour Monsieur Shlomi, Beaufort), Channels (Kan, Channel 2, Channel 13, i24NEWS), Radio (Galei Tzahal, Radio Kan Beyt, 103FM, Eco 99FM), Podcasts.

Actions you can trigger (use exact text):
- Navigation: "Go to movies" / "Go to series" / "Go to channels" / "Go to radio" / "Go to podcasts" / "Go home"
- Playback: "Play [name]" / "Pause" / "Resume" / "Skip"
- Search: "Search for [query]"
- Save: "Add to favorites" / "Add to watchlist"
- Settings: "Volume up" / "Volume down" / "Enable subtitles"

Example responses:
- "Going to movies now" (NOT: "We have amazing movies from Israel that you might enjoy...")
- "Playing Beaufort" (NOT: "This is an acclaimed film with great reviews...")
- "Searching for documentaries" (NOT: "There are many great documentaries available...")

Critical: Always include the action keyword in your response to trigger the action. If user didn't ask for something specific, ask briefly: "What do you want? (movies / search / play)"."""

    else:  # Hebrew or default
        return SYSTEM_PROMPT


@router.post("", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Send a message to the AI assistant."""
    # Determine language - use provided language or default to Hebrew
    user_language = (request.language or "he").lower()

    print(f"[CHAT] Received message: '{request.message}'")
    print(f"[CHAT] Language parameter: {request.language}")
    print(f"[CHAT] Resolved language: {user_language}")

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
        # Get appropriate system prompt for language
        system_prompt = get_system_prompt(user_language)

        # Call Claude API
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system_prompt,
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

        # Extract action intent from response (navigate, play, search, etc.)
        action = await extract_action_from_response(
            assistant_message, request.message, user_language
        )

        return ChatResponse(
            message=assistant_message,
            conversation_id=str(conversation.id),
            recommendations=recommendations,
            language=user_language,  # Return the language used
            # Voice-first fields
            spoken_response=assistant_message,  # Full message for TTS
            action=action,  # Structured command for frontend
            content_ids=None,  # Could extract recommended content IDs
            visual_action=None,  # Could infer from message content
            confidence=action.get("confidence", 0.8) if action else 0.8,  # Use action confidence if available
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


async def extract_action_from_response(
    response: str, query: str, language: str = "he"
) -> Optional[dict]:
    """
    Extract structured action commands from Claude's response.

    Supported action types:
    - navigate: Go to a section (movies, channels, etc.)
    - play: Play specific content
    - search: Search for content
    - pause: Pause playback
    - resume: Resume playback
    - skip: Skip to next
    - add_to_watchlist: Add content to watchlist
    - add_to_favorites: Mark as favorite
    - info: Get information about content
    - volume: Adjust volume
    - language: Change language/subtitle

    Returns:
    {
        "type": str,
        "payload": {...},  # Action-specific data
        "confidence": float  # 0-1 confidence score
    }
    """

    response_lower = response.lower()
    query_lower = query.lower()

    # ===== NAVIGATION ACTIONS =====
    nav_patterns = {
        "movies": ["סרטים", "movies", "show me the movies", "תראה לי סרטים", "עבור לסרטים", "go to movies"],
        "series": ["סדרות", "series", "shows", "תראה לי סדרות", "עבור לסדרות", "go to series"],
        "channels": ["ערוצים", "channels", "live tv", "שידור חי", "עבור לערוצים", "live channels", "open channels"],
        "radio": ["רדיו", "radio", "stations", "תחנות רדיו", "עבור לרדיו", "radio stations"],
        "podcasts": ["פודקאסטים", "podcasts", "עבור לפודקאסטים", "podcast"],
        "home": ["בית", "home", "main page", "דף הבית", "חזור הביתה"],
        "search": ["חפש", "search", "find"],
    }

    for target, patterns in nav_patterns.items():
        for pattern in patterns:
            if pattern in response_lower or pattern in query_lower:
                return {
                    "type": "navigate",
                    "payload": {"target": target},
                    "confidence": 0.9,
                }

    # ===== PLAYBACK CONTROL ACTIONS =====
    pause_triggers = ["pause", "השהה", "עצור", "stop playback", "עצור נגינה"]
    for trigger in pause_triggers:
        if trigger in response_lower or trigger in query_lower:
            return {
                "type": "pause",
                "payload": {},
                "confidence": 0.9,
            }

    resume_triggers = ["resume", "המשך", "continue", "המשך נגינה", "start playing"]
    for trigger in resume_triggers:
        if trigger in response_lower or trigger in query_lower:
            return {
                "type": "resume",
                "payload": {},
                "confidence": 0.9,
            }

    skip_triggers = ["skip", "דלג", "next song", "song הבא", "דלג לשיר הבא"]
    for trigger in skip_triggers:
        if trigger in response_lower or trigger in query_lower:
            return {
                "type": "skip",
                "payload": {},
                "confidence": 0.9,
            }

    # ===== PLAY CONTENT ACTIONS =====
    play_triggers = ["play", "נגן", "start", "watch", "צפה", "הפעל", "watch now"]
    known_titles = {
        "the troupe": "the_troupe",
        "footnote": "footnote",
        "waltz with bashir": "waltz_bashir",
        "bonjour monsieur shlomi": "shlomi",
        "beaufort": "beaufort",
        "tick tock": "tick_tock",
        "kan": "kan",
        "channel 2": "channel2",
        "channel 13": "channel13",
        "i24news": "i24news",
    }

    for trigger in play_triggers:
        if trigger in response_lower or trigger in query_lower:
            # Look for specific title
            for title, content_id in known_titles.items():
                if title in response_lower or title in query_lower:
                    return {
                        "type": "play",
                        "payload": {
                            "content_id": content_id,
                            "title": title,
                        },
                        "confidence": 0.85,
                    }
            # Generic play action
            return {
                "type": "play",
                "payload": {},
                "confidence": 0.7,
            }

    # ===== SEARCH ACTIONS =====
    search_triggers = ["search", "find", "look for", "חפש", "מצא", "חפש עבור"]
    for trigger in search_triggers:
        if trigger in response_lower or trigger in query_lower:
            return {
                "type": "search",
                "payload": {
                    "query": query,
                    "filters": {
                        "category": None,
                        "genre": None,
                        "type": None,
                    }
                },
                "confidence": 0.8,
            }

    # ===== WATCHLIST/FAVORITES ACTIONS =====
    watchlist_triggers = ["add to watchlist", "הוסף לרשימת הצפייה", "add to my list"]
    for trigger in watchlist_triggers:
        if trigger in response_lower or trigger in query_lower:
            return {
                "type": "add_to_watchlist",
                "payload": {},
                "confidence": 0.85,
            }

    favorites_triggers = ["add to favorites", "הוסף למועדפים", "mark as favorite", "like"]
    for trigger in favorites_triggers:
        if trigger in response_lower or trigger in query_lower:
            return {
                "type": "add_to_favorites",
                "payload": {},
                "confidence": 0.85,
            }

    # ===== VOLUME/SETTINGS ACTIONS =====
    volume_increase = ["volume up", "עוצמה יותר", "increase volume", "הגבר קול"]
    for trigger in volume_increase:
        if trigger in response_lower or trigger in query_lower:
            return {
                "type": "volume",
                "payload": {"change": "increase"},
                "confidence": 0.9,
            }

    volume_decrease = ["volume down", "עוצמה פחות", "decrease volume", "הנמך קול"]
    for trigger in volume_decrease:
        if trigger in response_lower or trigger in query_lower:
            return {
                "type": "volume",
                "payload": {"change": "decrease"},
                "confidence": 0.9,
            }

    language_triggers = ["change language", "שנה שפה", "switch language", "hebrew", "english"]
    for trigger in language_triggers:
        if trigger in response_lower or trigger in query_lower:
            detected_lang = "en" if "english" in response_lower else "he"
            return {
                "type": "language",
                "payload": {"language": detected_lang},
                "confidence": 0.85,
            }

    # ===== SUBTITLE ACTIONS =====
    subtitle_triggers = ["subtitle", "subtitles", "captions", "כתוביות"]
    for trigger in subtitle_triggers:
        if trigger in response_lower or trigger in query_lower:
            enable = not any(x in response_lower for x in ["off", "disable", "כבה", "בטל"])
            return {
                "type": "subtitles",
                "payload": {"enabled": enable},
                "confidence": 0.8,
            }

    # ===== INFO ACTIONS =====
    info_triggers = ["tell me about", "info about", "details", "סיפור על", "מידע על"]
    for trigger in info_triggers:
        if trigger in response_lower or trigger in query_lower:
            return {
                "type": "info",
                "payload": {"query": query},
                "confidence": 0.75,
            }

    # ===== HELP ACTIONS =====
    help_triggers = ["help", "how to", "עזרה", "איך", "instructions"]
    for trigger in help_triggers:
        if trigger in response_lower or trigger in query_lower:
            return {
                "type": "help",
                "payload": {},
                "confidence": 0.85,
            }

    # No action identified
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


class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None  # If None, uses default Hebrew voice
    language: str = "he"
    model_id: str = "eleven_turbo_v2"  # Fast, low-latency model


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
):
    """Transcribe audio using ElevenLabs Speech-to-Text with language hint for better accuracy."""
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

        # Use provided language hint or default to Hebrew
        language_code = (language or "he").lower()
        print(f"[STT] Received language parameter from client: {language}")
        print(f"[STT] Transcribing audio with language hint: {language_code}")

        # Build request data with language hint for better accuracy
        request_data = {
            "model_id": "scribe_v2",  # Latest available model (v3 not yet available)
            "language_code": language_code,  # Always send language code (ElevenLabs expects ISO 639-1: 'en', 'he', etc.)
        }

        print(f"[STT] Request data being sent to ElevenLabs: {request_data}")

        # Call ElevenLabs Speech-to-Text API with language hint
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
            # ElevenLabs might return a different language than we hint - use our hint as the authoritative source
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
    """
    Convert text to speech using ElevenLabs Text-to-Speech API.
    Returns audio stream (audio/mpeg) that can be played directly in browser.

    Supports:
    - Hebrew and English text
    - Multiple voice options
    - Low-latency streaming via eleven_turbo_v2 model
    - Audio ducking for video integration
    """
    # Validate text input
    if not request.text or not request.text.strip():
        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty"
        )

    # Limit text length to prevent abuse (ElevenLabs has limits)
    if len(request.text) > 5000:
        raise HTTPException(
            status_code=400,
            detail="Text is too long (max 5000 characters)"
        )

    # Use configured voice ID for all languages or provided voice ID
    if request.voice_id:
        voice_id = request.voice_id
    else:
        voice_id = settings.ELEVENLABS_DEFAULT_VOICE_ID  # From environment config

    try:
        # Build ElevenLabs TTS API request
        tts_url = f"{ELEVENLABS_TTS_URL}/{voice_id}/stream"

        request_body = {
            "text": request.text,
            "model_id": request.model_id,
            "voice_settings": {
                "stability": 0.5,  # Balanced - not too robotic, not too variable
                "similarity_boost": 0.75,  # Good speaker consistency
            }
        }

        # Call ElevenLabs TTS API with streaming
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
                # Log the actual error from ElevenLabs
                error_detail = response.text if response.text else "Unknown error"
                raise HTTPException(
                    status_code=500,
                    detail=f"ElevenLabs TTS error: {error_detail}",
                )

            # Return audio stream as audio/mpeg
            # This allows the browser to stream and play the audio directly
            return StreamingResponse(
                iter([response.content]),  # Wrap content in iterator for streaming
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
