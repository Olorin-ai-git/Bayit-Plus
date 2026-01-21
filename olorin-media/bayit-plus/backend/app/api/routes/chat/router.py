"""
Chat API Router - Main router combining all chat endpoints

This router aggregates all chat-related endpoints from sub-modules:
- messaging: Chat message handling and conversation management
- content_resolution: Hebronics processing, content resolution, voice search
- audio: Speech-to-text transcription
- tts: Text-to-speech conversion
- sfx: Sound effect generation
- webhooks: External service webhook handlers
"""

from fastapi import APIRouter

from .audio import router as audio_router
from .content_resolution import router as content_resolution_router
from .messaging import router as messaging_router
from .sfx import router as sfx_router
from .tts import router as tts_router
from .webhooks import router as webhooks_router

router = APIRouter()

# Include messaging endpoints (chat messages, conversation management)
# POST "/" - send_message
# GET "/{conversation_id}" - get_conversation
# DELETE "/{conversation_id}" - clear_conversation
router.include_router(messaging_router)

# Include content resolution endpoints (hebronics, content resolution, voice search)
# POST "/hebronics" - process_hebronics
# POST "/resolve-content" - resolve_content
# POST "/voice-search" - voice_search
router.include_router(content_resolution_router)

# Include audio endpoints (speech-to-text)
# POST "/transcribe" - transcribe_audio
# GET "/transcription/{transcription_id}" - get_transcription_status
router.include_router(audio_router)

# Include TTS endpoints (text-to-speech)
# POST "/text-to-speech" - text_to_speech
router.include_router(tts_router)

# Include SFX endpoints (sound effects)
# POST "/sound-effect/{gesture}" - get_wizard_sfx
# POST "/sound-effect" - generate_custom_sfx
router.include_router(sfx_router)

# Include webhook endpoints (external service callbacks)
# POST "/webhook/elevenlabs" - elevenlabs_webhook
router.include_router(webhooks_router)
