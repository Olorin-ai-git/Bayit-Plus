# Assistant Avatar Voice Configuration

## Overview

Configured the ElevenLabs voice ID `ashjVK50jp28G73AUTnb` (Olorin custom cloned voice) for the Assistant Avatar voice interactions.

## Configuration Changes

### Backend Configuration (`backend/app/core/config.py`)

Added new configuration option:

```python
# Olorin Assistant Avatar - custom cloned voice for AI assistant interactions
ELEVENLABS_ASSISTANT_VOICE_ID: str = (
    "ashjVK50jp28G73AUTnb"  # Olorin - custom cloned voice
)
```

### Environment Configuration (`backend/.env.example`)

Added documentation:

```bash
# Assistant Avatar - custom voice for AI assistant interactions
ELEVENLABS_ASSISTANT_VOICE_ID=ashjVK50jp28G73AUTnb
# Support Wizard - custom voice for support interactions (can use same voice as assistant)
ELEVENLABS_SUPPORT_VOICE_ID=ashjVK50jp28G73AUTnb
```

## Voice Configuration Summary

The system now has three voice configuration options:

1. **`ELEVENLABS_DEFAULT_VOICE_ID`** = `EXAVITQu4vr4xnSDxMaL`
   - Rachel - multilingual female voice
   - Used for general TTS operations
   - Fallback for TTS requests without explicit voice_id

2. **`ELEVENLABS_ASSISTANT_VOICE_ID`** = `ashjVK50jp28G73AUTnb` ✅ **NEW**
   - Olorin - custom cloned voice
   - Dedicated voice for AI assistant/chat interactions
   - Provides consistent voice identity for assistant avatar

3. **`ELEVENLABS_SUPPORT_VOICE_ID`** = `ashjVK50jp28G73AUTnb`
   - Olorin - custom cloned voice (same as assistant)
   - Used for support wizard interactions
   - Can be configured separately if different voice needed

## Usage in Code

### TTS Endpoints

The TTS endpoints (`backend/app/api/routes/chat/tts.py`) accept an optional `voice_id` parameter:

```python
voice_id = request.voice_id or settings.ELEVENLABS_DEFAULT_VOICE_ID
```

For assistant interactions, explicitly pass the assistant voice:

```python
from app.core.config import settings

tts_request = TTSRequest(
    text="Hello, how can I help you?",
    voice_id=settings.ELEVENLABS_ASSISTANT_VOICE_ID,  # Use assistant voice
    language="en"
)
```

### Chat/Assistant Services

Services that implement assistant chat functionality should use:

```python
settings.ELEVENLABS_ASSISTANT_VOICE_ID
```

Instead of:

```python
settings.ELEVENLABS_DEFAULT_VOICE_ID
```

## Benefits

1. **Explicit Configuration**: Clear separation between assistant, support, and general TTS voices
2. **Voice Consistency**: Assistant avatar always uses the custom Olorin voice
3. **Flexibility**: Each voice role can be configured independently
4. **Easy Updates**: Voice IDs can be changed via environment variables without code changes

## Voice Details

**Voice ID**: `ashjVK50jp28G73AUTnb`
- **Name**: Olorin (custom cloned)
- **Purpose**: AI assistant/support interactions
- **Provider**: ElevenLabs
- **Characteristics**: Custom voice optimized for assistant personality

## Testing

To test the assistant voice:

1. **Set environment variable**:
   ```bash
   export ELEVENLABS_ASSISTANT_VOICE_ID=ashjVK50jp28G73AUTnb
   ```

2. **Make TTS request with assistant voice**:
   ```bash
   curl -X POST "http://localhost:8000/api/v1/chat/text-to-speech" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "text": "Hello, I am your AI assistant",
       "voice_id": "ashjVK50jp28G73AUTnb",
       "language": "en"
     }'
   ```

3. **Verify voice is used in logs**:
   ```
   [TTS] Using voice_id='ashjVK50jp28G73AUTnb', language='en'
   ```

## Future Enhancements

Potential improvements:

1. **Voice Profiles**: Store multiple voice profiles per user preference
2. **Language-Specific Voices**: Auto-select optimal voice based on content language
3. **Emotion Variations**: Use different voice settings for different emotional tones
4. **Voice Analytics**: Track which voices perform best for engagement

## Related Files

- `backend/app/core/config.py` - Configuration class
- `backend/.env.example` - Environment variable documentation
- `backend/app/api/routes/chat/tts.py` - TTS endpoint implementation
- `backend/app/api/routes/chat/models.py` - Request/response models

## Date

2026-01-23
