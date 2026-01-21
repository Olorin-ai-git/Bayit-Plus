"""
Voice Command Service Proxy - User voice command processing

This module provides a secure proxy for voice command processing through the backend.
The mobile app sends transcribed user commands via OAuth token, backend processes
intent recognition and returns actionable commands with TTS responses.

Supported command patterns:
- Play commands: "play [content name]", "play movie", etc.
- Search commands: "search for [query]", "find [query]", etc.
- Playback control: "pause", "resume", "next", "previous", "volume [level]"
- Navigation: "show recommendations", "go to search", etc.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
import logging
import re
from typing import Optional, List, Dict, Any
from app.core.security import verify_oauth_token, get_current_user

router = APIRouter(prefix="/api/v1/voice", tags=["voice"])
logger = logging.getLogger(__name__)


class VoiceCommandRequest(BaseModel):
    """Request model for user voice command processing"""
    transcription: str = Field(..., min_length=1, max_length=500, description="User's spoken command (transcribed)")
    confidence: float = Field(default=0.9, ge=0.0, le=1.0, description="Speech recognition confidence (0.0-1.0)")
    language: str = Field(default="en", description="Language code (en, he, es)")


class VoiceCommandResponse(BaseModel):
    """Response model for voice command processing"""
    success: bool = Field(description="Whether command was understood")
    commandType: str = Field(description="Type of command: search, play, control, navigate, etc.")
    action: Optional[str] = Field(default=None, description="Action to execute (e.g., search query, play content)")
    actionData: Optional[Dict[str, Any]] = Field(default=None, description="Additional action data")
    responseText: str = Field(description="Natural language response to speak back to user")
    confidence: float = Field(description="Confidence in command interpretation (0.0-1.0)")


class VoiceCommandSuggestion(BaseModel):
    """Suggestion for partial transcription"""
    suggestion: str = Field(description="Suggested command")
    confidence: float = Field(description="Confidence in suggestion")


class VoiceCommandSuggestionsResponse(BaseModel):
    """Response with command suggestions"""
    suggestions: List[VoiceCommandSuggestion] = Field(description="List of suggested commands")


# Command patterns for intent recognition
COMMAND_PATTERNS = {
    "play": {
        "patterns": [
            r"(?:play|put on|start playing)\s+(.+?)(?:\s+movie|\s+series|\s+episode)?(?:\s+now)?$",
            r"(?:play|put on)\s+(?:the\s+)?(.+?)$",
        ],
        "type": "play",
        "description": "Play content by name"
    },
    "search": {
        "patterns": [
            r"(?:search|search for|find|look for|show me)\s+(.+?)$",
            r"(?:what is|tell me about)\s+(.+?)$",
        ],
        "type": "search",
        "description": "Search for content"
    },
    "pause": {
        "patterns": [
            r"^(?:pause|stop|hold on)(?:\s+.*)?$",
        ],
        "type": "control",
        "description": "Pause playback"
    },
    "resume": {
        "patterns": [
            r"^(?:resume|continue|play|unpause|go on)(?:\s+.*)?$",
        ],
        "type": "control",
        "description": "Resume playback"
    },
    "next": {
        "patterns": [
            r"^(?:next|skip|next episode|next chapter)(?:\s+.*)?$",
        ],
        "type": "control",
        "description": "Skip to next"
    },
    "previous": {
        "patterns": [
            r"^(?:previous|back|prior|go back|previous episode)(?:\s+.*)?$",
        ],
        "type": "control",
        "description": "Go to previous"
    },
    "volume": {
        "patterns": [
            r"(?:set\s+)?volume\s+(?:to\s+)?(\d+|\w+)(?:%)?(?:\s+.*)?$",
            r"(?:increase|turn up|raise)\s+volume(?:\s+.*)?$",
            r"(?:decrease|turn down|lower)\s+volume(?:\s+.*)?$",
            r"(?:mute|unmute)(?:\s+.*)?$",
        ],
        "type": "control",
        "description": "Control volume"
    },
    "favorites": {
        "patterns": [
            r"(?:show|list|get|display)\s+(?:my\s+)?(?:favorite|saved|liked|watchlist)(?:s)?(?:\s+.*)?$",
            r"(?:add to|save to)\s+(?:favorite|watchlist)(?:\s+.*)?$",
        ],
        "type": "navigate",
        "description": "Access favorites/watchlist"
    },
    "recommend": {
        "patterns": [
            r"(?:show|give me|what are|recommend)\s+(?:.*\s+)?(?:recommendation|suggestion|next to watch)(?:s)?(?:\s+.*)?$",
            r"(?:what should i watch)(?:\s+.*)?$",
        ],
        "type": "navigate",
        "description": "Get recommendations"
    },
    "language": {
        "patterns": [
            r"(?:change|switch|set)\s+(?:language|language setting)\s+(?:to\s+)?(\w+)(?:\s+.*)?$",
        ],
        "type": "settings",
        "description": "Change language"
    }
}


def parse_voice_command(transcription: str, language: str = "en") -> Dict[str, Any]:
    """
    Parse voice transcription and recognize intent.

    Args:
        transcription: User's spoken command
        language: Language code

    Returns:
        Dict with command type, action, and confidence
    """
    # Normalize input
    text = transcription.strip().lower()
    if not text:
        return {
            "success": False,
            "commandType": "unknown",
            "action": None,
            "actionData": None,
            "confidence": 0.0,
            "responseText": "I didn't catch that. Please try again."
        }

    best_match = None
    best_confidence = 0.0
    best_captured_group = None

    # Try to match against all patterns
    for command_name, command_info in COMMAND_PATTERNS.items():
        for pattern in command_info["patterns"]:
            match = re.match(pattern, text, re.IGNORECASE)
            if match:
                # Confidence based on how specific the pattern is
                # Full word boundaries and exact matches get higher confidence
                confidence = 0.85 + (len(pattern.split('|')[0]) / 100)
                confidence = min(confidence, 0.99)

                if confidence > best_confidence:
                    best_confidence = confidence
                    best_match = command_info
                    best_captured_group = match.group(1) if match.groups() else None

    if best_match:
        return {
            "success": True,
            "commandType": best_match["type"],
            "action": best_match["description"],
            "actionData": {
                "command": best_match["description"],
                "query": best_captured_group
            },
            "confidence": best_confidence,
            "responseText": _generate_response_text(best_match, best_captured_group, language)
        }
    else:
        # Treat as search query if nothing matches
        return {
            "success": True,
            "commandType": "search",
            "action": "Search for content",
            "actionData": {
                "command": "Search for content",
                "query": text
            },
            "confidence": 0.5,
            "responseText": _get_search_response(text, language)
        }


def _generate_response_text(command_info: Dict, captured_group: Optional[str], language: str) -> str:
    """Generate natural language response for command."""
    responses = {
        "en": {
            "play": lambda q: f"Playing {q}" if q else "Playing content",
            "search": lambda q: f"Searching for {q}" if q else "Searching",
            "pause": lambda q: "Pausing playback",
            "resume": lambda q: "Resuming playback",
            "next": lambda q: "Skipping to next",
            "previous": lambda q: "Going to previous",
            "volume": lambda q: f"Setting volume to {q}" if q else "Adjusting volume",
            "favorite": lambda q: "Added to favorites",
            "recommend": lambda q: "Getting recommendations",
            "language": lambda q: f"Switching to {q}" if q else "Changing language"
        },
        "he": {
            "play": lambda q: f"מנגן {q}" if q else "מנגן תוכן",
            "search": lambda q: f"מחפש {q}" if q else "מחפש",
            "pause": lambda q: "המשיכ של השמעה",
            "resume": lambda q: "המשך השמעה",
            "next": lambda q: "קפיצה לעיתון",
            "previous": lambda q: "חזור לקודם",
            "volume": lambda q: f"הצבת עוצמה ל {q}" if q else "כיוונון עוצמה",
            "favorite": lambda q: "נוסף למועדפים",
            "recommend": lambda q: "קבלת המלצות",
            "language": lambda q: f"מעבר ל {q}" if q else "שינוי שפה"
        },
        "es": {
            "play": lambda q: f"Reproduciendo {q}" if q else "Reproduciendo contenido",
            "search": lambda q: f"Buscando {q}" if q else "Buscando",
            "pause": lambda q: "Pausando reproducción",
            "resume": lambda q: "Reanudando reproducción",
            "next": lambda q: "Saltando al siguiente",
            "previous": lambda q: "Volviendo al anterior",
            "volume": lambda q: f"Ajustando volumen a {q}" if q else "Ajustando volumen",
            "favorite": lambda q: "Agregado a favoritos",
            "recommend": lambda q: "Obteniendo recomendaciones",
            "language": lambda q: f"Cambiando a {q}" if q else "Cambiando idioma"
        }
    }

    lang_responses = responses.get(language, responses["en"])
    command_name = command_info["description"].split()[0].lower()

    response_func = lang_responses.get(command_name, lambda q: "Command understood")
    return response_func(captured_group)


def _get_search_response(query: str, language: str) -> str:
    """Generate search response."""
    responses = {
        "en": f"Searching for {query}",
        "he": f"חיפוש עבור {query}",
        "es": f"Buscando {query}"
    }
    return responses.get(language, f"Searching for {query}")


@router.post("/command", response_model=VoiceCommandResponse)
async def process_voice_command(
    request: VoiceCommandRequest,
    current_user=Depends(verify_oauth_token),
) -> VoiceCommandResponse:
    """
    Process user voice command and return action + TTS response.

    Backend-only processing ensures all NLP and command parsing happens securely.
    Mobile app never makes assumptions about voice intent.

    Args:
        request: VoiceCommandRequest with transcription and confidence
        current_user: Verified OAuth token user

    Returns:
        VoiceCommandResponse with command type, action, and response text

    Raises:
        HTTPException: If processing fails
    """
    try:
        # Normalize and parse command
        result = parse_voice_command(request.transcription, request.language)

        # Log successful command parsing (no PII)
        logger.info(
            f"[Voice] Command parsed for user {current_user.id}: "
            f"type={result['commandType']}, confidence={result['confidence']}",
            extra={
                "language": request.language,
                "command_type": result["commandType"],
                "confidence": result["confidence"]
            }
        )

        return VoiceCommandResponse(
            success=result["success"],
            commandType=result["commandType"],
            action=result["action"],
            actionData=result["actionData"],
            responseText=result["responseText"],
            confidence=result["confidence"]
        )

    except Exception as e:
        logger.error(f"[Voice] Command processing error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Voice command processing failed"
        )


@router.post("/suggestions", response_model=VoiceCommandSuggestionsResponse)
async def get_voice_command_suggestions(
    partial: str = Query(..., min_length=1, max_length=200, description="Partial transcription"),
    language: str = Query("en", description="Language code (en, he, es)"),
    current_user=Depends(verify_oauth_token),
) -> VoiceCommandSuggestionsResponse:
    """
    Get command suggestions for partial transcription.

    Helps predict what user is trying to say and suggest likely commands.

    Args:
        partial: Partial user speech
        language: Language code
        current_user: Verified OAuth token user

    Returns:
        List of suggested commands with confidence scores

    Raises:
        HTTPException: If processing fails
    """
    try:
        text = partial.strip().lower()
        suggestions = []

        # Common command starters
        common_commands = {
            "en": ["play", "search", "pause", "resume", "next", "previous", "show favorites"],
            "he": ["הנגן", "חיפוש", "הפסק", "המשך", "הבא", "הקודם", "הצג מועדפים"],
            "es": ["reproducir", "buscar", "pausar", "reanudar", "siguiente", "anterior", "mostrar favoritos"]
        }

        commands = common_commands.get(language, common_commands["en"])

        # Fuzzy match against known commands
        for cmd in commands:
            if cmd.startswith(text) or text in cmd:
                confidence = len(text) / len(cmd)  # Simple fuzzy match
                suggestions.append(VoiceCommandSuggestion(
                    suggestion=cmd,
                    confidence=min(confidence + 0.5, 0.95)
                ))

        # Limit to top 5
        suggestions = sorted(suggestions, key=lambda s: s.confidence, reverse=True)[:5]

        # If no matches, suggest top commands
        if not suggestions:
            for cmd in commands[:3]:
                suggestions.append(VoiceCommandSuggestion(
                    suggestion=cmd,
                    confidence=0.3
                ))

        logger.info(
            f"[Voice] Generated {len(suggestions)} suggestions for user {current_user.id}",
            extra={"language": language, "partial": text}
        )

        return VoiceCommandSuggestionsResponse(suggestions=suggestions)

    except Exception as e:
        logger.error(f"[Voice] Suggestion generation error: {str(e)}")
        # Return empty suggestions on error rather than failing
        return VoiceCommandSuggestionsResponse(suggestions=[])


@router.get("/health")
async def health_check():
    """Health check endpoint for voice service"""
    return {
        "status": "healthy",
        "service": "voice_proxy",
        "features": ["command_processing", "command_suggestions"]
    }
