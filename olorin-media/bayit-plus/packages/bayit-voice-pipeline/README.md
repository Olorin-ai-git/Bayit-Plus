# Bayit Voice Pipeline

ElevenLabs TTS/STT/SFX integration with configurable services.

## Features

- **Text-to-Speech (TTS)**: Real-time streaming TTS with ultra-low latency (~300ms)
- **Speech-to-Text (STT)**: Real-time audio transcription with excellent Hebrew support (~150ms latency)
- **Sound Effects (SFX)**: Generate custom sound effects from text descriptions

## Installation

```bash
poetry add bayit-voice-pipeline
```

## Usage

```python
from bayit_voice import (
    SimpleVoiceConfig,
    ElevenLabsTTSStreamingService,
    ElevenLabsRealtimeService,
    ElevenLabsSFXService
)

# Configure
config = SimpleVoiceConfig(
    api_key="your-elevenlabs-api-key",
    default_voice_id="21m00Tcm4TlvDq8ikWAM"  # Rachel
)

# Use services
tts = ElevenLabsTTSStreamingService(config)
stt = ElevenLabsRealtimeService(config)
sfx = ElevenLabsSFXService(config)
```

## License

Proprietary - Bayit+ Team
