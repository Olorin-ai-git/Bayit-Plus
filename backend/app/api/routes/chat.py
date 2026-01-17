from datetime import datetime
from typing import Optional
import tempfile
import os
import hmac
import hashlib
import httpx
import difflib
import json
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request, Header, BackgroundTasks, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import anthropic
from app.models.user import User
from app.models.watchlist import Conversation
from app.models.content import Content, LiveChannel, Podcast, PodcastEpisode, RadioStation
from app.core.config import settings
from app.core.security import get_current_active_user

router = APIRouter()

# In-memory store for pending transcriptions (use Redis in production)
pending_transcriptions: dict[str, dict] = {}

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

# Media context cache (to avoid repeated database queries)
_media_context_cache: Optional[dict] = None
_media_context_cache_ts: float = 0
MEDIA_CONTEXT_CACHE_TTL = 300  # 5 minutes

# ElevenLabs API endpoints
ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"
ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech"

# Wake word fuzzy matching - currently disabled
# WAKE_WORDS = ["buyit", "בויית"]
# FUZZY_MATCH_THRESHOLD = 0.65


async def build_media_context() -> dict:
    """
    Build a comprehensive media library context for the LLM.
    Fetches and formats all available content from the database.
    Results are cached to avoid excessive database queries.

    Returns dict with:
    - channels: Available live TV channels
    - podcasts: Available podcasts with episode counts
    - featured_content: Popular/featured VOD content
    - categories: Content categories
    - radio_stations: Available radio stations (if applicable)
    """
    global _media_context_cache, _media_context_cache_ts

    import time
    current_time = time.time()

    # Return cached context if fresh
    if _media_context_cache and (current_time - _media_context_cache_ts) < MEDIA_CONTEXT_CACHE_TTL:
        print("[CHAT] Using cached media context")
        return _media_context_cache

    print("[CHAT] Building fresh media context from database...")

    try:
        # Fetch active live channels
        channels = await LiveChannel.find(
            LiveChannel.is_active == True
        ).to_list()

        # Fetch active podcasts with episode counts
        podcasts = await Podcast.find(
            Podcast.is_active == True
        ).to_list()

        # Fetch featured/popular published content (limit to 30 for context size)
        featured_content = await Content.find(
            Content.is_published == True,
            Content.is_featured == True
        ).limit(30).to_list()

        # If not enough featured content, add popular published content
        if len(featured_content) < 20:
            all_published = await Content.find(
                Content.is_published == True
            ).limit(50).to_list()
            featured_content = all_published[:50]

        # Build formatted context
        context = {
            "channels": [
                {
                    "name": ch.name,
                    "description": ch.description or "",
                    "logo": ch.logo
                }
                for ch in channels
            ],
            "podcasts": [
                {
                    "title": p.title,
                    "author": p.author or "Unknown",
                    "description": p.description or "",
                    "category": p.category or "General"
                }
                for p in podcasts
            ],
            "featured_content": [
                {
                    "title": c.title,
                    "type": "series" if c.is_series else "movie",
                    "genre": c.genre or "General",
                    "year": c.year,
                    "description": c.description[:100] + "..." if c.description and len(c.description) > 100 else c.description or ""
                }
                for c in featured_content
            ],
            "summary": {
                "total_channels": len(channels),
                "total_podcasts": len(podcasts),
                "total_content_items": len(featured_content),
                "categories": list(set([c.category_name or "General" for c in featured_content if c.category_name]))
            }
        }

        # Cache the context
        _media_context_cache = context
        _media_context_cache_ts = current_time

        print(f"[CHAT] Media context built: {context['summary']}")
        return context

    except Exception as e:
        print(f"[CHAT] Error building media context: {e}")
        # Return empty context on error so chat still works
        return {
            "channels": [],
            "podcasts": [],
            "featured_content": [],
            "summary": {
                "total_channels": 0,
                "total_podcasts": 0,
                "total_content_items": 0,
                "categories": []
            }
        }


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


SYSTEM_PROMPT = """אתה עוזר של בית+ (מבוטא "בויית").

**חובה: תשיב בעברית בלבד. כל התשובות שלך חייבות להיות בעברית.**

עקוב אחרי הכללים הבאים:
- תשובות קצרות בלבד (1-2 משפטים בעברית)
- תשובה ישירה לבקשה ללא הצעות נוספות
- כלול מילות פעולה בתשובתך
- אל תמחייק או תציע עזרה
- אל תתרגם לאנגלית
- **אל תהבטח הפעלה או חיפוש - רק הכריז מה אתה עומד לעשות**

**מהם פעולות:**
אם המשתמש מבקש:
- ניווט לסקציה (סרטים, סדרות, רדיו וכו) - השתמש בפעולת "navigate"
- הפעלת תוכן ספציפי - השתמש בפעולת "play" (רק אם בקשה ברורה להפעל)
- חיפוש לתוכן - השתמש בפעולת "search" (כשהשם לא בטוח או שחיפוש בו)
- שליטה בהפעלה (השהיה, המשך, דלג) - השתמש בפעולות "pause", "resume", "skip"

אם המשתמש:
- רק שואל שאלה או מחפש המלצה - אל תשתמש בפעולה, רק תענה
- משוחח בדברים כלליים - אל תשתמש בפעולה, רק תענה

דוגמאות:
✓ "תמליץ לי על סרט?" → רק תשובה (אין פעולה)
✓ "עבור לסרטים" → navigate action (תשובה: "עוברת לסרטים")
✓ "תנגן את אסקימו לימון" → play action (תשובה: "מנסה לנגן אסקימו לימון")
✓ "חפש סרטי אקשן" → search action (תשובה: "מחפשת סרטי אקשן")

**חשוב: התשובה שלך חייבת להתאים לפעולה:**
- אם play action → התשובה צריכה לומר "מנסה לנגן" או "מחדלת"
- אם search action → התשובה צריכה לומר "מחפשת" או "משודרגת"
- אל תומר "מנגן" אם הפעולה היא search!

לא תהיה עזרה עודפת או הצעות. רק תענה לבקשה הספציפית בעברית."""


def extract_json_from_response(text: str) -> tuple[str, Optional[dict]]:
    """
    Extract JSON from Claude's response text.
    Claude includes JSON in multiple formats - code blocks or XML tags.

    Returns: (cleaned_text, json_dict)
    """
    if not text:
        return text, None

    import re
    import json

    json_data = None

    # Try XML format first: <action>{...}</action>
    xml_pattern = r'<action>\s*\n(\{[^}]+\})\s*\n</action>'
    match = re.search(xml_pattern, text, re.DOTALL)
    if match:
        try:
            json_str = match.group(1)
            json_data = json.loads(json_str)
            # Remove the XML block from text
            text = re.sub(xml_pattern, '', text, flags=re.DOTALL).strip()
            return text, json_data
        except json.JSONDecodeError:
            pass

    # Try JSON code blocks: ```json\n{...}\n```
    json_pattern = r'```(?:json)?\s*\n(\{[^}]+\})\n```'
    match = re.search(json_pattern, text, re.DOTALL)
    if match:
        try:
            json_str = match.group(1)
            json_data = json.loads(json_str)
            # Remove the JSON block from text
            text = re.sub(json_pattern, '', text, flags=re.DOTALL).strip()
            return text, json_data
        except json.JSONDecodeError:
            pass

    return text, json_data


async def extract_content_name_from_query(query: str, language: str = "he") -> str:
    """
    Use Claude to extract just the content/movie name from a voice command.

    Examples:
    - "נגן את הסרט אסקימו לימון" → "אסקימו לימון"
    - "play the movie Inception" → "Inception"
    """
    if not query:
        return query

    try:
        if language == "he":
            prompt = f"""Extract just the movie/show/content name from this Hebrew voice command.
Return ONLY the content name, nothing else.

Command: "{query}"

Content name:"""
        else:
            prompt = f"""Extract just the movie/show/content name from this English voice command.
Return ONLY the content name, nothing else.

Command: "{query}"

Content name:"""

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=50,
            messages=[{"role": "user", "content": prompt}]
        )

        content_name = response.content[0].text.strip()
        return content_name
    except Exception as e:
        print(f"[CHAT] Error extracting content name: {e}")
        return query


def strip_markdown(text: str) -> str:
    """
    Strip markdown formatting from text for TTS readability.
    Removes: **bold**, __bold__, *italic*, _italic_, [link](url), etc.
    Also removes JSON blocks and code formatting.
    """
    if not text:
        return text

    import re

    # Remove JSON code blocks first: ```json\n{...}\n```
    text = re.sub(r'```(?:json)?\s*\n\{[^}]+\}\n```', '', text, flags=re.DOTALL)

    # Remove any remaining code blocks: ```code``` or `code`
    text = re.sub(r'`{3}[^`]*`{3}', '', text, flags=re.DOTALL)
    text = re.sub(r'`(.+?)`', r'\1', text)

    # Remove bold: **text** or __text__
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'__(.+?)__', r'\1', text)

    # Remove italic: *text* or _text_
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'_(.+?)_', r'\1', text)

    # Remove markdown links: [text](url)
    text = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', text)

    # Remove HTML comments and other markdown syntax
    text = re.sub(r'<!--.*?-->', '', text, flags=re.DOTALL)

    return text.strip()


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


def get_system_prompt(language: Optional[str] = None, media_context: Optional[dict] = None) -> str:
    """
    Get language-appropriate system prompt with media context injected.

    Args:
        language: Language code (en, he, es)
        media_context: Dict with channels, podcasts, featured_content, and summary
    """
    lang = (language or "he").lower()

    # Format media context for inclusion in prompt
    context_str = ""
    if media_context:
        try:
            context_str = f"""
**קטלוג הערוצים שלנו ({media_context['summary']['total_channels']} ערוצים):**
{json.dumps([ch['name'] for ch in media_context['channels'][:10]], ensure_ascii=False)}

**הפודקאסטים הזמינים ({media_context['summary']['total_podcasts']} פודקאסטים):**
{json.dumps([p['title'] for p in media_context['podcasts'][:10]], ensure_ascii=False)}

**סדרות וסרטים פופולריים ({media_context['summary']['total_content_items']} פריטים):**
{json.dumps([c['title'] for c in media_context['featured_content'][:15]], ensure_ascii=False)}

**קטגוריות זמינות:**
{json.dumps(media_context['summary']['categories'][:10], ensure_ascii=False)}
"""
        except Exception as e:
            print(f"[CHAT] Error formatting media context: {e}")
            context_str = ""

    if lang == "en":
        prompt = """You are an assistant for Bayit+ (pronounced "Buyit").

**REQUIREMENT: You MUST respond in English only. All your responses must be in English.**

Follow these rules:
- Short responses only (1-2 sentences in English)
- Direct answer to the request with no extra offers
- Include action keywords in your response
- No excessive politeness or help offers
- Do NOT translate to Hebrew
- When recommending content, choose from the available catalog

Example responses (English only):
✓ "Going to movies"
✓ "Searching for documentaries"
✓ "Playing radio"

Actions:
- Navigation: "Go to movies" / "Go to series" / "Go to channels" / "Go to radio" / "Go to podcasts" / "Go to flows" / "Go to judaism" / "Go to children" / "Go home"
- Playback: "Play [name]" / "Pause" / "Resume" / "Skip"
- Search: "Search for [query]"
- Save: "Add to favorites" / "Add to watchlist"

No extra help or suggestions. Only answer the specific request in English."""

        if context_str:
            prompt += f"\n\n**AVAILABLE CONTENT:**\n{context_str}"

        return prompt

    elif lang == "es":
        prompt = """Eres un asistente de Bayit+ (pronunciado "Buyit").

**REQUISITO: DEBES responder SOLO en español. Todas tus respuestas deben estar en español.**

Sigue estas reglas:
- Respuestas cortas solamente (1-2 frases en español)
- Respuesta directa a la solicitud sin ofertas adicionales
- Incluye palabras de acción en tu respuesta
- Sin cortesía excesiva u ofertas de ayuda
- NO traduzcas al hebreo o inglés
- Cuando recomiendes contenido, elige del catálogo disponible

Ejemplos de respuestas (solo en español):
✓ "Yendo a películas"
✓ "Buscando documentales"
✓ "Reproduciendo radio"

Acciones:
- Navegación: "Ir a películas" / "Ir a series" / "Ir a canales" / "Ir a radio" / "Ir a podcasts" / "Ir a flows" / "Ir a judaísmo" / "Ir a niños" / "Ir al inicio"
- Reproducción: "Reproducir [nombre]" / "Pausar" / "Reanudar" / "Saltar"
- Búsqueda: "Buscar [consulta]"
- Guardar: "Agregar a favoritos" / "Agregar a lista"

Sin ayuda adicional ni sugerencias. Solo responde la solicitud específica en español."""

        if context_str:
            prompt += f"\n\n**CONTENIDO DISPONIBLE:**\n{context_str}"

        return prompt

    else:  # Hebrew or default
        prompt = SYSTEM_PROMPT
        if context_str:
            prompt += f"\n\n**קטלוג הזמין:**{context_str}"
        return prompt


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

    # Wake word filtering temporarily disabled for testing
    # Accept any input for now
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
        for msg in conversation.messages[-10:]  # Last 10 messages for context
    ]

    try:
        # Build media context for smarter LLM responses
        media_context = await build_media_context()

        # Get appropriate system prompt for language with media context
        system_prompt = get_system_prompt(user_language, media_context)

        print(f"[CHAT] System prompt includes {media_context['summary']['total_channels']} channels, {media_context['summary']['total_podcasts']} podcasts, {media_context['summary']['total_content_items']} content items")

        # Call Claude API
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
        )

        raw_response = response.content[0].text

        # Log Claude raw response
        print(f"[CHAT] Claude raw response (first 200 chars): {raw_response[:200]}")

        # Extract JSON if Claude included it in the response (shouldn't happen but handle it)
        assistant_message, embedded_json = extract_json_from_response(raw_response)

        # Log Claude response for language verification
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

        # Try to extract content recommendations if mentioned
        recommendations = await get_recommendations_from_response(
            assistant_message, request.message, media_context
        )

        # Extract action intent from response (navigate, play, search, etc.)
        action = await extract_action_from_response(
            assistant_message, request.message, user_language
        )

        # CRITICAL: Ensure message/action alignment for voice
        # If message says "playing" but action is "search", fix the message
        final_message = assistant_message
        print(f"[CHAT] ACTION DEBUG: action={action}, type={type(action)}")
        if action:
            action_type = action.get("type")
            msg_lower = assistant_message.lower()

            print(f"[CHAT] ACTION DEBUG: action_type='{action_type}', msg has play words={any(w in msg_lower for w in ['מנגן', 'נוגן', 'תנגן', 'משדרת', 'צופה', 'מפעיל', 'תפעל', 'מנסה לנגן', 'מנסה'])}")

            # If action is search but message says "playing/playing/תנגן/מנסה לנגן"
            if action_type == "search":
                # Check if message incorrectly claims playback or attempting playback
                playback_words = [
                    "מנגן", "נוגן", "תנגן", "משדרת", "צופה", "מפעיל", "תפעל",  # Hebrew playback
                    "מנסה לנגן", "מנסה",  # Hebrew "trying to play"
                    "playing", "attempting", "trying to play"  # English
                ]
                if any(word in msg_lower for word in playback_words):
                    print(f"[CHAT] ⚠️ Message/action mismatch: message says playing but action is search")
                    print(f"[CHAT] Original message: {assistant_message}")
                    # Use Claude to extract just the content name from the user's request
                    content_name = await extract_content_name_from_query(request.message, user_language)
                    print(f"[CHAT] Extracted content name: {content_name}")
                    # Correcting the message to match the search action
                    if user_language == "he":
                        final_message = f"מחפשת את {content_name}..."
                    else:
                        final_message = f"Searching for {content_name}..."
                    print(f"[CHAT] Corrected message: {final_message}")
            else:
                print(f"[CHAT] ACTION DEBUG: Not search action, skipping message alignment check (action_type={action_type})")

        return ChatResponse(
            message=final_message,
            conversation_id=str(conversation.id),
            recommendations=recommendations,
            language=user_language,  # Return the language used
            # Voice-first fields
            spoken_response=strip_markdown(final_message),  # Clean text for TTS
            action=action,  # Structured command for frontend
            content_ids=None,  # Could extract recommended content IDs
            visual_action=None,  # Could infer from message content
            confidence=action.get("confidence", 0.8) if action else 0.8,  # Use action confidence if available
        )

    except anthropic.APIError as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


async def get_recommendations_from_response(
    response: str, query: str, media_context: Optional[dict] = None
) -> Optional[list]:
    """
    Extract and recommend relevant content based on the conversation.
    Uses media context for smarter recommendations aligned with available catalog.
    """
    # Keywords indicating user is interested in recommendations
    keywords = ["סרט", "סדרה", "ערוץ", "פודקאסט", "תוכנית", "רדיו", "recommend", "suggest", "recommend", "תמליץ"]

    if not any(kw in query.lower() or kw in response.lower() for kw in keywords):
        return None

    recommendations = []

    # If we have media context, extract recommendations from available catalog
    if media_context:
        # Try to recommend relevant content based on query context
        if any(w in query.lower() for w in ["סרט", "movie", "film"]):
            # Recommend movies/series from featured content
            for item in media_context.get("featured_content", [])[:4]:
                if "type" in item:
                    recommendations.append({
                        "title": item["title"],
                        "type": item.get("type", "vod"),
                        "genre": item.get("genre", ""),
                        "year": item.get("year", "")
                    })
        elif any(w in query.lower() for w in ["פודקאסט", "podcast"]):
            # Recommend podcasts
            for item in media_context.get("podcasts", [])[:4]:
                recommendations.append({
                    "title": item["title"],
                    "type": "podcast",
                    "author": item.get("author", ""),
                    "category": item.get("category", "")
                })
        elif any(w in query.lower() for w in ["ערוץ", "channel", "tv"]):
            # Recommend channels
            for item in media_context.get("channels", [])[:4]:
                recommendations.append({
                    "title": item["name"],
                    "type": "channel",
                    "description": item.get("description", "")
                })
        else:
            # Default: recommend mix of available content
            for item in media_context.get("featured_content", [])[:2]:
                recommendations.append({
                    "title": item["title"],
                    "type": item.get("type", "vod"),
                    "genre": item.get("genre", "")
                })
            for item in media_context.get("podcasts", [])[:1]:
                recommendations.append({
                    "title": item["title"],
                    "type": "podcast",
                    "author": item.get("author", "")
                })
            for item in media_context.get("channels", [])[:1]:
                recommendations.append({
                    "title": item["name"],
                    "type": "channel"
                })

    if not recommendations:
        # Fallback to database query if no context-based recommendations
        content = await Content.find(
            Content.is_published == True
        ).limit(4).to_list()

        if content:
            recommendations = [
                {
                    "id": str(item.id),
                    "title": item.title,
                    "thumbnail": item.thumbnail,
                    "type": "vod",
                }
                for item in content
            ]

    return recommendations if recommendations else None


async def extract_action_from_response(
    response: str, query: str, language: str = "he"
) -> Optional[dict]:
    """
    Ask Claude to determine if an action is needed based on the user's request.
    The LLM is responsible for understanding context and deciding on actions.

    Special handling:
    - If user asks to play specific content, validate it exists in DB
    - If content doesn't exist but user asked to play, convert to search
    - If user asks to show multiple content items, parse the items list
    - If user asks to start a chess game with invite, parse the friend name
    """
    # Use Claude to determine if an action is needed
    try:
        action_prompt = f"""Based on this user request: "{query}"

Should the app take an action? Return ONLY a JSON response (no other text).

If NO action needed, return: {{"action": null}}

If action IS needed, return ONE of these formats:
- Navigation: {{"action": "navigate", "target": "movies|series|channels|radio|podcasts|flows|judaism|children|home|chess|games"}}
- Play: {{"action": "play"}}
- Search: {{"action": "search", "query": "search terms"}}
- Pause/Resume/Skip: {{"action": "pause"|"resume"|"skip"}}
- Show Multiple: {{"action": "show_multiple", "items": [{{"name": "content name", "type": "channel|movie|podcast|radio"}}]}}
- Chess Invite: {{"action": "chess_invite", "friend_name": "name of friend to invite"}}

Rules:
- "תמליץ לי על סרט" (recommend a movie) = NO action
- "עבור לסרטים" (go to movies) = navigate to movies
- "תנגן את X" (play X) = play action (we'll check if X exists)
- "חפש סרטי אקשן" (search action movies) = search action
- "תראה לי ערוצים כאן 11 וכאן 12" (show me channels Kan11 and Kan12) = show_multiple with items
- "Show me Kan11, Kan12" = show_multiple action with channel items
- "הפעל את כאן 11 וכאן 12 ביחד" (play Kan11 and Kan12 together) = show_multiple
- "התחל משחק שחמט עם דוד" (start chess game with David) = chess_invite with friend_name
- "Start a chess game and invite David" = chess_invite with friend_name

For show_multiple:
- Extract ALL content names mentioned
- Detect type from context (channels if TV names, movies if film titles, etc.)
- Default to "channel" for Israeli channel names like Kan11, Keshet, Reshet

Return ONLY valid JSON, nothing else."""

        action_response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=100,
            messages=[{"role": "user", "content": action_prompt}]
        )

        action_text = action_response.content[0].text.strip()
        print(f"[CHAT] Claude action decision: {action_text}")

        # Parse JSON response
        import json
        try:
            action_data = json.loads(action_text)
            if action_data.get("action"):
                action_type = action_data["action"]

                # Handle show_multiple action
                if action_type == "show_multiple":
                    items = action_data.get("items", [])
                    if items:
                        print(f"[CHAT] show_multiple action with {len(items)} items: {items}")
                        return {
                            "type": "show_multiple",
                            "payload": {"items": items},
                            "confidence": 0.9,
                        }
                    else:
                        print(f"[CHAT] show_multiple action but no items found")
                        return None

                # Handle chess_invite action
                if action_type == "chess_invite":
                    friend_name = action_data.get("friend_name")
                    if friend_name:
                        print(f"[CHAT] chess_invite action for friend: {friend_name}")
                        return {
                            "type": "chess_invite",
                            "payload": {"friend_name": friend_name},
                            "confidence": 0.9,
                        }
                    else:
                        # No friend name - just navigate to chess
                        print(f"[CHAT] chess_invite without friend name, converting to navigate")
                        return {
                            "type": "navigate",
                            "payload": {"target": "chess"},
                            "confidence": 0.8,
                        }

                # If it's a play action, validate the content exists in our library
                if action_type == "play":
                    try:
                        # Try to find the content by title (fuzzy match)
                        # If not found, convert to search action
                        print(f"[CHAT] Validating play action: checking if '{query}' exists in library")
                        content_found = await Content.find(
                            Content.is_published == True
                        ).to_list()

                        print(f"[CHAT] Found {len(content_found)} published content items in library")

                        # Simple check: does query appear in any content title?
                        query_lower = query.lower()
                        found = None
                        for c in content_found:
                            title = str(c.title).lower()
                            print(f"[CHAT]   Checking: '{title}' vs query '{query_lower}'")
                            if query_lower in title:
                                found = c
                                print(f"[CHAT]   ✓ Match found!")
                                break
                            if hasattr(c, 'name'):
                                name = str(c.name).lower()
                                if query_lower in name:
                                    found = c
                                    print(f"[CHAT]   ✓ Match found in name!")
                                    break

                        if not found:
                            # Content doesn't exist - convert to search instead of play
                            print(f"[CHAT] ⚠️ Content '{query}' not found in library, converting play to search action")
                            return {
                                "type": "search",
                                "payload": {"query": query},
                                "confidence": 0.8,
                            }
                        else:
                            print(f"[CHAT] ✓ Content '{query}' found in library, keeping play action")
                    except Exception as e:
                        print(f"[CHAT] Error validating content in library: {e}")
                        # If there's an error checking, don't convert - let play action through
                        pass

                # Build payload based on action type
                payload = action_data.get("payload") or {}
                if action_data.get("target"):
                    payload["target"] = action_data.get("target")
                if action_data.get("query"):
                    payload["query"] = action_data.get("query")
                if action_data.get("items"):
                    payload["items"] = action_data.get("items")
                if action_data.get("friend_name"):
                    payload["friend_name"] = action_data.get("friend_name")

                return {
                    "type": action_type,
                    "payload": payload,
                    "confidence": 0.9,
                }
        except json.JSONDecodeError:
            print(f"[CHAT] Failed to parse action JSON: {action_text}")
            return None

        return None

    except Exception as e:
        print(f"[CHAT] Error extracting action: {e}")
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
            "model_id": "scribe_v2",  # Latest STT model - supports 99+ languages including Hebrew
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
    # Log TTS request for language detection
    print(f"[TTS] Text-to-speech request: language='{request.language}', text='{request.text[:100]}'...")

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

    print(f"[TTS] Using voice_id='{voice_id}', language='{request.language}', model='{request.model_id}'")
    print(f"[TTS] Text preview: '{request.text[:100]}'")

    try:
        # Build ElevenLabs TTS API request
        tts_url = f"{ELEVENLABS_TTS_URL}/{voice_id}/stream"

        # Use eleven_v3 model for Hebrew and Spanish for better multilingual support
        model_to_use = request.model_id
        if request.language in ['he', 'es']:
            # Use eleven_v3 which has excellent Hebrew and Spanish support
            model_to_use = 'eleven_v3'
            print(f"[TTS] Using eleven_v3 model for {request.language} text")

        request_body = {
            "text": request.text,
            "model_id": model_to_use,
            # NOTE: Do NOT include language_code - ElevenLabs API doesn't support it
            # The voice itself (Rachel) handles multilingual content automatically
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
                print(f"[TTS] ElevenLabs API error status={response.status_code}: {error_detail}")
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


# ============================================================================
# Multi-Content Resolution API (for voice commands like "Show me Kan11, Kan12")
# ============================================================================

class ContentItemRequest(BaseModel):
    """Single content item to resolve."""
    name: str
    type: str = "any"  # channel, movie, series, podcast, radio, any


class ResolveContentRequest(BaseModel):
    """Request to resolve multiple content items by name."""
    items: list[ContentItemRequest]
    language: str = "he"


class ResolvedContentItem(BaseModel):
    """Resolved content item with stream info."""
    id: str
    name: str
    type: str  # channel, movie, series, podcast, radio
    thumbnail: Optional[str] = None
    stream_url: Optional[str] = None
    matched_name: str  # Original name matched
    confidence: float = 1.0  # Match confidence


class ResolveContentResponse(BaseModel):
    """Response with resolved content items."""
    items: list[ResolvedContentItem]
    unresolved: list[str] = []  # Names that couldn't be matched
    total_requested: int
    total_resolved: int


def fuzzy_match_score(query: str, target: str) -> float:
    """Calculate fuzzy match score between query and target strings."""
    query_lower = query.lower().strip()
    target_lower = target.lower().strip()
    
    # Exact match
    if query_lower == target_lower:
        return 1.0
    
    # Contains match
    if query_lower in target_lower or target_lower in query_lower:
        return 0.9
    
    # Use difflib for fuzzy matching
    return difflib.SequenceMatcher(None, query_lower, target_lower).ratio()


async def resolve_single_content(
    name: str,
    content_type: str,
    language: str = "he"
) -> Optional[ResolvedContentItem]:
    """
    Resolve a single content item by name using fuzzy matching.
    Searches across channels, VOD, podcasts, and radio based on type.
    """
    best_match: Optional[ResolvedContentItem] = None
    best_score = 0.0
    min_score = 0.5  # Minimum match threshold
    
    # Search in live channels
    if content_type in ["any", "channel"]:
        channels = await LiveChannel.find(LiveChannel.is_active == True).to_list()
        for ch in channels:
            # Try matching against name in different languages
            names_to_check = [ch.name]
            if ch.name_en:
                names_to_check.append(ch.name_en)
            if ch.name_es:
                names_to_check.append(ch.name_es)
            
            for check_name in names_to_check:
                score = fuzzy_match_score(name, check_name)
                if score > best_score and score >= min_score:
                    best_score = score
                    best_match = ResolvedContentItem(
                        id=str(ch.id),
                        name=ch.name,
                        type="channel",
                        thumbnail=ch.logo or ch.thumbnail,
                        stream_url=ch.stream_url,
                        matched_name=name,
                        confidence=score
                    )
    
    # Search in VOD content (movies/series)
    if content_type in ["any", "movie", "series", "vod"]:
        # Limit to reasonable number for fuzzy search
        content_items = await Content.find(Content.is_published == True).limit(500).to_list()
        for item in content_items:
            names_to_check = [item.title]
            if item.title_en:
                names_to_check.append(item.title_en)
            if item.title_es:
                names_to_check.append(item.title_es)
            
            for check_name in names_to_check:
                score = fuzzy_match_score(name, check_name)
                if score > best_score and score >= min_score:
                    best_score = score
                    item_type = "series" if item.is_series else "movie"
                    best_match = ResolvedContentItem(
                        id=str(item.id),
                        name=item.title,
                        type=item_type,
                        thumbnail=item.thumbnail or item.poster_url,
                        stream_url=item.stream_url,
                        matched_name=name,
                        confidence=score
                    )
    
    # Search in podcasts
    if content_type in ["any", "podcast"]:
        podcasts = await Podcast.find(Podcast.is_active == True).to_list()
        for pod in podcasts:
            names_to_check = [pod.title]
            if pod.title_en:
                names_to_check.append(pod.title_en)
            if pod.title_es:
                names_to_check.append(pod.title_es)
            
            for check_name in names_to_check:
                score = fuzzy_match_score(name, check_name)
                if score > best_score and score >= min_score:
                    best_score = score
                    # Get latest episode for stream URL
                    latest_ep = await PodcastEpisode.find_one(
                        PodcastEpisode.podcast_id == str(pod.id),
                        sort=[("published_at", -1)]
                    )
                    stream_url = latest_ep.audio_url if latest_ep else None
                    best_match = ResolvedContentItem(
                        id=str(pod.id),
                        name=pod.title,
                        type="podcast",
                        thumbnail=pod.cover,
                        stream_url=stream_url,
                        matched_name=name,
                        confidence=score
                    )
    
    # Search in radio stations
    if content_type in ["any", "radio"]:
        stations = await RadioStation.find(RadioStation.is_active == True).to_list()
        for station in stations:
            names_to_check = [station.name]
            if station.name_en:
                names_to_check.append(station.name_en)
            if station.name_es:
                names_to_check.append(station.name_es)
            
            for check_name in names_to_check:
                score = fuzzy_match_score(name, check_name)
                if score > best_score and score >= min_score:
                    best_score = score
                    best_match = ResolvedContentItem(
                        id=str(station.id),
                        name=station.name,
                        type="radio",
                        thumbnail=station.logo,
                        stream_url=station.stream_url,
                        matched_name=name,
                        confidence=score
                    )
    
    return best_match


@router.post("/resolve-content", response_model=ResolveContentResponse)
async def resolve_content(
    request: ResolveContentRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Resolve multiple content items by name for voice commands.
    
    Used by chatbot for commands like "Show me channels Kan11, Kan12"
    to look up content by name and return stream URLs for widget display.
    
    Supports fuzzy matching to handle voice recognition variations.
    """
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

    """
    Note: The following optional enhancements can be implemented in the future:

    1. WebSocket Integration: Push transcription results to connected clients in real-time
       - Requires: WebSocket server setup, connection management, and client notification system
       - Benefit: Eliminates need for polling, provides instant transcription updates

    2. Transcription History Storage: Store completed transcriptions in database
       - Requires: TranscriptionHistory model, database schema, and API endpoints
       - Benefit: Enables transcription history retrieval, analytics, and user search

    3. Chatbot Action Triggers: Automatically trigger chatbot responses based on transcription content
       - Requires: Intent detection, context extraction, and chatbot integration
       - Benefit: Enables voice-driven chatbot interactions without explicit commands

    These features are not critical for current transcription functionality to work.
    Transcriptions are currently retrieved via polling using the status endpoint.
    """


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
