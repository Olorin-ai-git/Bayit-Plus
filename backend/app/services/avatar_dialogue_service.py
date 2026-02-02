"""
Avatar Dialogue Service - Hybrid Mode

Handles dialogue generation using a hybrid approach:
1. Predetermined responses for known scenarios (greetings, errors, etc.)
2. AI-generated responses for complex queries and conversations

Character: Olorin the Wizard
- Wise but warm, not intimidating
- Slight twinkle of humor (Gandalf's wry smile)
- Patient with users, never condescending
- Mysterious yet approachable
"""

import logging
import random
from enum import Enum
from typing import Any, Optional

from anthropic import Anthropic

from app.core.config import settings

logger = logging.getLogger(__name__)


class DialogueCategory(str, Enum):
    """Categories that use predetermined responses."""

    WAKE = "wake"
    GREETING = "greeting"
    LISTENING = "listening"
    PROCESSING = "processing"
    PRESENTING = "presenting"
    PRESENTING_MEDIA = "presenting_media"
    PRESENTING_LIST = "presenting_list"
    PRESENTING_SINGLE = "presenting_single"
    FUZZY_SEARCH = "fuzzy_search"
    NOTHING_FOUND = "nothing_found"
    CLARIFICATION = "clarification"
    CONFIRMATION = "confirmation"
    DISMISSAL = "dismissal"
    INTERRUPTION = "interruption"
    ERROR = "error"
    IDLE_TIMEOUT = "idle_timeout"
    SUCCESS = "success"
    WARNING = "warning"
    PERSONALITY = "personality"
    AGREEMENT = "agreement"
    DISAGREEMENT = "disagreement"


class GestureType(str, Enum):
    """Gesture types for avatar animation."""

    IDLE = "idle"
    GREETING = "greeting"
    LISTENING = "listening"
    THINKING = "thinking"
    PRESENTING = "presenting"
    CONJURING = "conjuring"
    BROWSING = "browsing"
    CONFUSED = "confused"
    SHRUGGING = "shrugging"
    FAREWELL = "farewell"
    ATTENTIVE = "attentive"
    SUCCESS = "success"
    WARNING = "warning"
    AGREEMENT = "agreement"
    DISAGREEMENT = "disagreement"


# Predetermined dialogues for common scenarios
# NOTE: Text is pre-written but still requires TTS conversion on the frontend.
# Benefit: No AI latency for text generation, only TTS latency remains.
PREDETERMINED_DIALOGUES: dict[str, list[dict[str, Any]]] = {
    "wake": [
        {"text": "I am here.", "gesture": "greeting"},
        {"text": "At your service.", "gesture": "greeting"},
        {"text": "Speak, and I shall listen.", "gesture": "listening"},
        {"text": "Yes?", "gesture": "attentive"},
        {"text": "What do you seek?", "gesture": "greeting"},
        {"text": "I'm listening.", "gesture": "listening"},
        {"text": "The wizard awaits.", "gesture": "greeting"},
    ],
    "greeting_morning": [
        {"text": "Good morning. What do you seek?", "gesture": "greeting"},
        {"text": "A fine morning to explore. How may I help?", "gesture": "greeting"},
    ],
    "greeting_afternoon": [
        {"text": "Good afternoon. How may I help?", "gesture": "greeting"},
        {"text": "The afternoon finds you well, I hope. What do you need?", "gesture": "greeting"},
    ],
    "greeting_evening": [
        {"text": "Good evening. I am at your service.", "gesture": "greeting"},
        {"text": "The evening hours bring you here. How may I assist?", "gesture": "greeting"},
    ],
    "greeting_night": [
        {"text": "The hour grows late. What do you need?", "gesture": "greeting"},
        {"text": "Even in darkness, the wizard aids. What do you seek?", "gesture": "greeting"},
    ],
    "listening": [
        {"text": "Hmm, let me see...", "gesture": "thinking"},
        {"text": "One moment...", "gesture": "thinking"},
        {"text": "Consulting the archives...", "gesture": "browsing"},
        {"text": "Ah, yes...", "gesture": "thinking"},
        {"text": "Let me find that...", "gesture": "browsing"},
    ],
    "processing": [
        {"text": "The scrolls are vast... patience.", "gesture": "thinking"},
        {"text": "Searching the depths...", "gesture": "browsing"},
        {"text": "This requires a deeper look...", "gesture": "thinking"},
        {"text": "Consulting ancient knowledge...", "gesture": "conjuring"},
    ],
    # Presenting media (channels, direct content)
    "presenting_media": [
        {"text": "Here you are.", "gesture": "presenting"},
        {"text": "As you wish. Your channels.", "gesture": "presenting"},
        {"text": "Behold.", "gesture": "presenting"},
        {"text": "I've summoned them for you.", "gesture": "conjuring"},
        {"text": "Here — exactly as requested.", "gesture": "presenting"},
    ],
    # Presenting lists (multiple results)
    "presenting_list": [
        {"text": "I found {count} that may interest you...", "gesture": "presenting"},
        {"text": "Your podcasts have new tales to tell.", "gesture": "presenting"},
        {"text": "Several treasures match your request...", "gesture": "presenting"},
        {"text": "The archives reveal these...", "gesture": "browsing"},
        {"text": "Here is what I found...", "gesture": "presenting"},
    ],
    # Presenting single item
    "presenting_single": [
        {"text": "This is what you seek.", "gesture": "presenting"},
        {"text": "Found it.", "gesture": "presenting"},
        {"text": "Here — exactly as you described.", "gesture": "presenting"},
        {"text": "Ah! This one.", "gesture": "presenting"},
    ],
    # Legacy aliases for backward compatibility
    "presenting_multiple": [
        {"text": "Here is what I found...", "gesture": "presenting"},
        {"text": "Several treasures match your request...", "gesture": "presenting"},
        {"text": "The archives reveal these...", "gesture": "browsing"},
    ],
    # Fuzzy search success (found partial matches)
    "fuzzy_search": [
        {"text": "You said '{query}'... I found these in your collection.", "gesture": "presenting"},
        {"text": "Ah — '{query}.' Several possibilities here.", "gesture": "presenting"},
        {"text": "The word '{query}' appears in these titles...", "gesture": "browsing"},
        {"text": "Searching for '{query}'... here are the matches.", "gesture": "presenting"},
    ],
    "nothing_found": [
        {"text": "Hmm. The archives reveal nothing. Perhaps rephrase?", "gesture": "shrugging"},
        {"text": "I searched, but found no match. Shall we try another way?", "gesture": "thinking"},
        {"text": "Nothing by that name. Could you describe it differently?", "gesture": "confused"},
        {"text": "Even wizards have limits. I couldn't find that.", "gesture": "shrugging"},
        {"text": "The scrolls are silent on this matter.", "gesture": "thinking"},
    ],
    "clarification": [
        {"text": "I didn't quite catch that. Once more?", "gesture": "confused"},
        {"text": "My hearing isn't what it was. Again?", "gesture": "listening"},
        {"text": "Say that again for me.", "gesture": "listening"},
        {"text": "I'm uncertain what you mean. Could you clarify?", "gesture": "confused"},
        {"text": "Did you say '{guess}', or something else?", "gesture": "thinking"},
    ],
    "confirmation": [
        {"text": "Shall I play it?", "gesture": "attentive"},
        {"text": "Want me to continue?", "gesture": "attentive"},
        {"text": "Should I read through the list?", "gesture": "attentive"},
        {"text": "Would you like more details?", "gesture": "attentive"},
    ],
    "confirmation_done": [
        {"text": "Done.", "gesture": "presenting"},
        {"text": "As you wish.", "gesture": "presenting"},
        {"text": "It is done.", "gesture": "success"},
    ],
    "dismissal": [
        {"text": "The wizard rests. Call when you need me.", "gesture": "farewell"},
        {"text": "Until next time.", "gesture": "farewell"},
        {"text": "I'll be here.", "gesture": "farewell"},
        {"text": "Farewell for now.", "gesture": "farewell"},
        {"text": "I am but a word away.", "gesture": "farewell"},
    ],
    "dismissal_late": [
        {"text": "The hour grows late. Sweet dreams.", "gesture": "farewell"},
        {"text": "Goodnight. May your dreams be peaceful.", "gesture": "farewell"},
        {"text": "Rest well. The wizard watches over you.", "gesture": "farewell"},
    ],
    "interruption": [
        {"text": "Got it — what would you like instead?", "gesture": "attentive"},
        {"text": "Understood. I await your new command.", "gesture": "listening"},
        {"text": "Very well. What now?", "gesture": "attentive"},
        {"text": "Stopped. What do you seek?", "gesture": "listening"},
    ],
    "error": [
        {"text": "Something went awry. Shall we try again?", "gesture": "confused"},
        {"text": "The magic faltered. Once more?", "gesture": "thinking"},
        {"text": "An unexpected obstacle. Let me try differently.", "gesture": "thinking"},
    ],
    "idle_timeout": [
        {"text": "Still there? Or shall I rest?", "gesture": "attentive"},
        {"text": "The wizard awaits your command...", "gesture": "idle"},
        {"text": "I remain at your service.", "gesture": "idle"},
    ],
    "success": [
        {"text": "Excellent! It is done.", "gesture": "success"},
        {"text": "Success! As you commanded.", "gesture": "success"},
        {"text": "The task is complete.", "gesture": "success"},
    ],
    "warning": [
        {"text": "A moment — proceed with caution.", "gesture": "warning"},
        {"text": "Take care. This may have consequences.", "gesture": "warning"},
    ],
    "agreement": [
        {"text": "Indeed.", "gesture": "agreement"},
        {"text": "Certainly.", "gesture": "agreement"},
        {"text": "Yes, that is correct.", "gesture": "agreement"},
    ],
    "disagreement": [
        {"text": "I'm afraid not.", "gesture": "disagreement"},
        {"text": "That doesn't seem right.", "gesture": "disagreement"},
        {"text": "Unfortunately, no.", "gesture": "disagreement"},
    ],
    # Personality moments (use sparingly - 10% chance)
    "personality": [
        {"text": "You ask much... but I deliver.", "gesture": "presenting", "context": "complex_request"},
        {"text": "Ah! Hidden, but not from me.", "gesture": "cheering", "context": "obscure_find"},
        {"text": "Manners. I appreciate that.", "gesture": "greeting", "context": "polite_user"},
        {"text": "You already asked me this, but very well...", "gesture": "thinking", "context": "repeat_request"},
        {"text": "A worthy challenge for a wizard.", "gesture": "conjuring", "context": "complex_request"},
    ],
}

# System prompt for AI-generated responses
OLORIN_SYSTEM_PROMPT = """You are Olorin, a wise and warm wizard who serves as the voice assistant for Bayit+, a Jewish streaming platform.

CHARACTER TRAITS:
- Wise but approachable, like a friendly mentor
- Slight twinkle of humor (think Gandalf's wry smile)
- Patient and never condescending
- Mysterious enough to feel magical, warm enough to feel like a companion
- Speaks in a refined but not archaic manner

SPEAKING STYLE:
- Keep responses concise (1-2 sentences max)
- Use subtle wizard-like phrases occasionally ("the archives", "scrolls", "seeking")
- Never use emojis
- Be helpful and direct while maintaining character
- For content recommendations, briefly describe why something might interest the user

CONTEXT:
- You help users find movies, series, live TV, podcasts, and radio
- The platform focuses on Jewish and Israeli content
- You can search, play content, answer questions, and provide recommendations

IMPORTANT:
- Stay in character as Olorin
- Keep responses short and suitable for TTS (text-to-speech)
- If you don't know something, admit it gracefully
- Suggest alternatives when appropriate"""


def get_predetermined_dialogue(
    category: str,
    count: int | None = None,
    query: str | None = None,
    context: str | None = None,
) -> dict[str, Any] | None:
    """
    Get a predetermined dialogue for a known category.

    NOTE: Predetermined text still requires TTS conversion on the frontend.
    The benefit is eliminating AI text generation latency (~100-300ms saved).

    Args:
        category: Dialogue category
        count: Optional result count for presenting responses
        query: Optional search query for context
        context: Optional context for personality dialogues

    Returns:
        Dialogue dict with text, gesture, and source, or None if AI should handle
    """
    import datetime

    # Handle time-based greetings
    if category == "greeting":
        hour = datetime.datetime.now().hour
        if 5 <= hour < 12:
            category = "greeting_morning"
        elif 12 <= hour < 17:
            category = "greeting_afternoon"
        elif 17 <= hour < 21:
            category = "greeting_evening"
        else:
            category = "greeting_night"

    # Handle late-night dismissal
    if category == "dismissal":
        hour = datetime.datetime.now().hour
        if hour >= 22 or hour < 5:
            category = "dismissal_late"

    # Handle presenting with count
    if category == "presenting" and count is not None:
        if count == 0:
            category = "nothing_found"
        elif count == 1:
            category = "presenting_single"
        else:
            category = "presenting_multiple"

    # Handle presenting_list with count (alias for presenting_multiple)
    if category == "presenting_list" and count is not None:
        if count == 0:
            category = "nothing_found"
        elif count == 1:
            category = "presenting_single"

    # Handle fuzzy_search - requires query
    if category == "fuzzy_search" and not query:
        category = "presenting_list"

    dialogues = PREDETERMINED_DIALOGUES.get(category)
    if not dialogues:
        return None

    # Filter by context for personality dialogues
    if category == "personality" and context:
        context_dialogues = [d for d in dialogues if d.get("context") == context]
        if context_dialogues:
            dialogues = context_dialogues

    dialogue = random.choice(dialogues)

    # Format with count/query/guess if present
    text = dialogue["text"]
    if "{count}" in text and count is not None:
        text = text.replace("{count}", str(count))
    if "{query}" in text and query:
        text = text.replace("{query}", query)
    if "{guess}" in text and query:
        text = text.replace("{guess}", query)

    return {
        "text": text,
        "gesture": dialogue.get("gesture", "idle"),
        "source": "predetermined",
        "tts_required": True,  # Flag indicating TTS conversion needed
    }


async def generate_ai_dialogue(
    user_message: str,
    context: dict[str, Any] | None = None,
    conversation_history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """
    Generate AI response for complex queries.

    Args:
        user_message: User's query/message
        context: Optional context (search results, current content, etc.)
        conversation_history: Optional previous messages for context

    Returns:
        Dialogue dict with text, gesture, and source
    """
    try:
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        # Build messages
        messages = []

        # Add conversation history if provided
        if conversation_history:
            for msg in conversation_history[-6:]:  # Keep last 6 messages for context
                messages.append(msg)

        # Add context to user message if provided
        user_content = user_message
        if context:
            context_str = "\n".join(
                f"- {k}: {v}" for k, v in context.items() if v
            )
            user_content = f"{user_message}\n\nContext:\n{context_str}"

        messages.append({"role": "user", "content": user_content})

        # Generate response
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=150,  # Keep responses short for TTS
            system=OLORIN_SYSTEM_PROMPT,
            messages=messages,
        )

        text = response.content[0].text.strip()

        # Determine appropriate gesture based on content
        gesture = _infer_gesture_from_response(text, user_message)

        return {
            "text": text,
            "gesture": gesture,
            "source": "ai",
        }

    except Exception as e:
        logger.error(f"AI dialogue generation failed: {e}")
        # Fallback to error dialogue
        return get_predetermined_dialogue("error") or {
            "text": "The magic faltered. Please try again.",
            "gesture": "confused",
            "source": "fallback",
        }


def _infer_gesture_from_response(text: str, query: str) -> str:
    """Infer appropriate gesture from response content."""
    text_lower = text.lower()
    query_lower = query.lower()

    # Check for question/clarification
    if "?" in text and any(
        word in text_lower for word in ["which", "what", "could you", "did you mean"]
    ):
        return "confused"

    # Check for apology/nothing found
    if any(word in text_lower for word in ["sorry", "couldn't find", "no results", "nothing"]):
        return "shrugging"

    # Check for success/found
    if any(word in text_lower for word in ["found", "here", "excellent", "success"]):
        return "presenting"

    # Check for thinking/processing
    if any(word in text_lower for word in ["let me", "searching", "looking"]):
        return "thinking"

    # Check for warning
    if any(word in text_lower for word in ["caution", "careful", "warning", "note"]):
        return "warning"

    # Check for agreement
    if any(word in text_lower for word in ["yes", "indeed", "certainly", "correct"]):
        return "agreement"

    # Check for disagreement
    if any(word in text_lower for word in ["no", "afraid not", "unfortunately"]):
        return "disagreement"

    # Default to presenting for informational responses
    return "presenting"


async def get_dialogue(
    category: str | None = None,
    user_message: str | None = None,
    count: int | None = None,
    query: str | None = None,
    context: dict[str, Any] | None = None,
    personality_context: str | None = None,
    force_ai: bool = False,
) -> dict[str, Any]:
    """
    Get dialogue using hybrid approach.

    Priority:
    1. If force_ai=True, always use AI
    2. If category matches predetermined, use predetermined (faster, still needs TTS)
    3. Otherwise, use AI for complex queries

    Args:
        category: Optional dialogue category for predetermined response
        user_message: User's message (required for AI generation)
        count: Optional result count
        query: Optional search query
        context: Optional context dict for AI generation
        personality_context: Optional context for personality dialogues (complex_request, etc.)
        force_ai: Force AI generation even for known categories

    Returns:
        Dialogue dict with text, gesture, source, and tts_required flag
    """
    # Try predetermined first (unless force_ai)
    if not force_ai and category:
        predetermined = get_predetermined_dialogue(category, count, query, personality_context)
        if predetermined:
            return predetermined

    # Fall back to AI for complex queries
    if user_message:
        result = await generate_ai_dialogue(user_message, context)
        result["tts_required"] = True
        return result

    # Last resort fallback
    return {
        "text": "How may I help you?",
        "gesture": "attentive",
        "source": "fallback",
        "tts_required": True,
    }
