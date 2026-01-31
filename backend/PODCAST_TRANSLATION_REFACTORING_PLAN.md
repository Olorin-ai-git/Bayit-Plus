# Podcast Translation Service Refactoring Plan

## Overview

Refactor `podcast_translation_service.py` (1,275 lines) into a modular package structure following the same pattern as `live_translation` refactoring.

## Current State

- **File**: `app/services/podcast_translation_service.py`
- **Lines**: 1,275 lines
- **Main Issues**:
  - `translate_episode()` method is 503 lines (CRITICAL - needs immediate splitting)
  - Multiple responsibilities mixed together
  - Difficult to test individual pipeline stages
  - Poor separation of concerns

## Target Package Structure

Create package: `app/services/podcast_translation/`

```
podcast_translation/
├── __init__.py                         # Backward compatibility (~30 lines)
├── constants.py                        # Stage weights, voice IDs (~60 lines)
├── stage_manager.py                    # Stage tracking, progress, ETA (~180 lines)
├── webhook_handler.py                  # Webhook notifications (~120 lines)
├── pipeline/
│   ├── __init__.py                     # Pipeline exports (~20 lines)
│   ├── download.py                     # Audio download with SSRF protection (~80 lines)
│   ├── audio_processing.py             # Separation, mixing, trimming (~100 lines)
│   ├── transcription.py                # Whisper transcription (~40 lines)
│   ├── commercial_removal.py           # AI commercial detection (~120 lines)
│   ├── translation.py                  # Text translation with chunking (~140 lines)
│   ├── tts.py                          # TTS generation (ElevenLabs + Google) (~180 lines)
│   └── upload.py                       # GCS upload (~40 lines)
└── service.py                          # Main orchestrator (~200 lines)
```

**Total**: 11 files, all under 200 lines

## File Breakdown

### 1. constants.py (~60 lines)

**Extracts from lines 47-56, 1196-1214:**

```python
"""Constants for podcast translation service."""
from app.core.config import settings

# Weighted stage progress (total = 100%)
STAGE_WEIGHTS = {
    "downloaded": 2.0,
    "vocals_separated": 15.0,
    "transcribed": 20.0,
    "commercials_removed": 3.0,
    "translated": 10.0,
    "tts_generated": 40.0,
    "mixed": 8.0,
    "uploaded": 2.0,
}

# Language mapping for auto-detection
LANGUAGE_AUTO_MAP = {
    "en": "he",
    "en-US": "he",
    "english": "he",
    "he": "en",
    "he-IL": "en",
    "hebrew": "en",
}

SOURCE_LANG_MAP = {
    "english": "en",
    "hebrew": "he",
    "en": "en",
    "en-US": "en",
    "he": "he",
    "he-IL": "he",
}

def get_voice_id(language: str, gender: str = "female") -> str:
    """Get ElevenLabs voice ID for language and gender."""
    if gender == "male":
        if language == "he":
            return settings.ELEVENLABS_HEBREW_MALE_VOICE_ID
        return settings.ELEVENLABS_ENGLISH_MALE_VOICE_ID
    else:
        if language == "he":
            return settings.ELEVENLABS_HEBREW_VOICE_ID
        return settings.ELEVENLABS_ENGLISH_VOICE_ID
```

### 2. stage_manager.py (~180 lines)

**Extracts from lines 589-757:**

Handles:
- `_save_stage()`, `_start_stage()`, `_complete_stage()`
- `_calculate_progress()`
- `_calculate_eta()`
- Progress tracking and database updates
- Historical metrics updates

```python
"""Stage management for podcast translation pipeline."""
from datetime import datetime
from typing import List, Optional
from app.models.content import PodcastEpisode, TranslationStageMetrics
from .constants import STAGE_WEIGHTS
import logging

logger = logging.getLogger(__name__)

class StageManager:
    """Manages translation pipeline stages and progress tracking."""

    async def start_stage(self, episode_id: str, stage_name: str):
        """Mark the start of a translation stage."""
        ...

    async def complete_stage(
        self, episode_id: str, stage_name: str, stage_data: Optional[dict] = None
    ):
        """Mark stage completion, calculate duration, update progress and ETA."""
        ...

    def calculate_progress(self, completed_stages: List[str]) -> float:
        """Calculate weighted progress percentage."""
        ...

    async def calculate_eta(
        self, episode_id: str, completed_stages: List[str]
    ) -> Optional[int]:
        """Calculate estimated time remaining based on historical averages."""
        ...
```

### 3. webhook_handler.py (~120 lines)

**Extracts from lines 759-863:**

```python
"""Webhook notification handler for translation events."""
import hashlib
import hmac
import httpx
from typing import Dict, Optional
from app.models.content import PodcastEpisode
from app.models.integration_partner import IntegrationPartner, WebhookDelivery
import logging

logger = logging.getLogger(__name__)

class WebhookHandler:
    """Handles webhook notifications for translation events."""

    async def send_webhook(
        self,
        episode_id: str,
        event_type: str,
        payload: Dict,
        partner: Optional[IntegrationPartner] = None,
    ):
        """Send webhook notification for translation event."""
        ...
```

### 4. pipeline/download.py (~80 lines)

**Extracts from lines 865-919:**

```python
"""Audio download with SSRF protection."""
import uuid
import httpx
from pathlib import Path
from urllib.parse import urlparse
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

async def download_audio(url: str, temp_dir: Path) -> str:
    """
    Download audio file with SSRF protection.

    Args:
        url: Audio file URL
        temp_dir: Temporary directory for downloads

    Returns:
        Path to downloaded file

    Raises:
        ValueError: If URL is not allowed or invalid
    """
    # SSRF Protection implementation
    ...
```

### 5. pipeline/audio_processing.py (~100 lines)

**Extracts from lines 1216-1254 (trimming) + separation/mixing logic:**

```python
"""Audio processing: separation, mixing, trimming."""
import asyncio
from pathlib import Path
from app.services.audio_processing_service import AudioProcessingService
import logging

logger = logging.getLogger(__name__)

class AudioProcessor:
    """Handles audio processing operations."""

    def __init__(self, audio_processor: AudioProcessingService):
        self.audio_processor = audio_processor

    async def separate_vocals(self, audio_path: str, output_dir: str):
        """Separate vocals from background."""
        ...

    async def mix_audio(self, vocals_path: str, background_path: str, output_path: str):
        """Mix translated vocals with original background."""
        ...

    async def trim_audio(self, input_path: str, output_path: str, duration_seconds: int):
        """Trim audio file to specified duration using FFmpeg."""
        ...
```

### 6. pipeline/transcription.py (~40 lines)

**Extracts from lines 921-939:**

```python
"""Audio transcription using Whisper."""
from typing import Tuple
from app.services.whisper_transcription_service import WhisperTranscriptionService
import logging

logger = logging.getLogger(__name__)

async def transcribe_audio(
    audio_path: str, stt_service: WhisperTranscriptionService
) -> Tuple[str, str]:
    """
    Transcribe audio using OpenAI Whisper with automatic language detection.

    Args:
        audio_path: Path to audio file
        stt_service: Whisper transcription service

    Returns:
        Tuple of (transcript text, detected language code)
    """
    logger.info(f"Transcribing audio using OpenAI Whisper: {audio_path}")
    text, language = await stt_service.transcribe_audio_file(audio_path)
    logger.info(
        f"Transcription complete: {len(text)} characters, language: {language}"
    )
    return text, language
```

### 7. pipeline/commercial_removal.py (~120 lines)

**Extracts from lines 941-1033:**

```python
"""AI-powered commercial detection and removal."""
import json
import re
from typing import Tuple
from anthropic import AsyncAnthropic
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

async def remove_commercials(transcript: str) -> Tuple[str, list]:
    """
    Detect and remove commercial segments from podcast transcript using AI.

    Args:
        transcript: Full transcript text

    Returns:
        Tuple of (cleaned transcript, list of removed commercial texts)
    """
    logger.info("Analyzing transcript for commercial segments...")

    # Initialize Claude client
    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    # Prompt Claude to identify commercial segments
    prompt = f"""..."""  # Full prompt from original

    # Call Claude API and parse response
    ...
```

### 8. pipeline/translation.py (~140 lines)

**Extracts from lines 338-426:**

```python
"""Text translation with chunking for large transcripts."""
import re
from app.services.olorin.dubbing.translation import TranslationProvider
import logging

logger = logging.getLogger(__name__)

async def translate_text(
    transcript: str,
    source_lang_code: str,
    target_lang_code: str,
) -> str:
    """
    Translate transcript with automatic chunking for large texts.

    Args:
        transcript: Text to translate
        source_lang_code: Source language ISO code
        target_lang_code: Target language ISO code

    Returns:
        Translated text
    """
    # Create translation provider
    translation_provider = TranslationProvider(target_language=target_lang_code)
    await translation_provider.initialize()

    # CRITICAL: Chunk large transcripts to avoid Google Translate API 200KB limit
    MAX_CHUNK_BYTES = 50000
    transcript_bytes = transcript.encode('utf-8')

    if len(transcript_bytes) > MAX_CHUNK_BYTES:
        # Chunking logic
        ...
    else:
        # Direct translation
        ...
```

### 9. pipeline/tts.py (~180 lines)

**Extracts from lines 1035-1194:**

```python
"""TTS generation with ElevenLabs and Google fallback."""
import asyncio
from pathlib import Path
from app.services.elevenlabs_tts_streaming_service import ElevenLabsTTSStreamingService
from app.services.google_tts_service import GoogleTTSService
from ..constants import get_voice_id
import logging

logger = logging.getLogger(__name__)

async def generate_tts(
    text: str,
    language: str,
    output_path: str,
    gender: str,
    tts_service: ElevenLabsTTSStreamingService,
) -> str:
    """
    Generate TTS audio for translated text.

    Args:
        text: Text to convert to speech
        language: Target language code
        output_path: Path to save generated audio
        gender: Voice gender ('male' or 'female')
        tts_service: ElevenLabs TTS service

    Returns:
        Path to generated audio file
    """
    # Ensure output directory exists
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # Use Google TTS for Hebrew (ElevenLabs doesn't support it properly)
    if language == "he":
        return await _generate_tts_google(text, language, gender, output_path)

    # Use ElevenLabs for other languages
    ...

async def _generate_tts_google(
    text: str, language: str, gender: str, output_path: str
) -> str:
    """Generate TTS using Google Cloud TTS for Hebrew."""
    ...
```

### 10. pipeline/upload.py (~40 lines)

**Extracts from lines 1256-1275:**

```python
"""GCS upload for translated audio."""
from datetime import datetime
from app.core.storage import StorageService
import logging

logger = logging.getLogger(__name__)

async def upload_translated_audio(
    audio_path: str,
    episode_id: str,
    language: str,
    storage: StorageService,
) -> str:
    """
    Upload translated audio to Google Cloud Storage with cache-busting timestamp.

    Args:
        audio_path: Path to audio file
        episode_id: Episode ID for GCS path
        language: Language code for GCS path
        storage: Storage service

    Returns:
        Public URL to uploaded audio
    """
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    gcs_path = f"podcasts/translations/{episode_id}/{language}_{timestamp}.mp3"
    url = await storage.upload_file(audio_path, gcs_path)
    logger.info(f"Uploaded translated audio to: {url}")
    return url
```

### 11. service.py (~200 lines)

**Main orchestrator - simplified `translate_episode()` method:**

```python
"""Podcast translation service - main orchestrator."""
from pathlib import Path
from typing import Dict, Optional
from datetime import datetime
from app.models.content import PodcastEpisode
from app.core.config import settings
from app.services.audio_processing_service import AudioProcessingService
from app.services.elevenlabs_tts_streaming_service import ElevenLabsTTSStreamingService
from app.services.whisper_transcription_service import WhisperTranscriptionService
from app.core.storage import StorageService

from .constants import LANGUAGE_AUTO_MAP, SOURCE_LANG_MAP
from .stage_manager import StageManager
from .webhook_handler import WebhookHandler
from .pipeline import (
    download_audio,
    AudioProcessor,
    transcribe_audio,
    remove_commercials,
    translate_text,
    generate_tts,
    upload_translated_audio,
)
import logging

logger = logging.getLogger(__name__)

class PodcastTranslationService:
    """Orchestrates podcast episode translation pipeline."""

    def __init__(
        self,
        audio_processor: Optional[AudioProcessingService] = None,
        tts_service: Optional[ElevenLabsTTSStreamingService] = None,
        stt_service: Optional[WhisperTranscriptionService] = None,
        storage: Optional[StorageService] = None,
    ):
        """Initialize service with dependency injection."""
        self.audio_processor_service = audio_processor or AudioProcessingService(
            temp_dir=settings.TEMP_AUDIO_DIR
        )
        self.tts_service = tts_service or ElevenLabsTTSStreamingService()
        self.stt_service = stt_service or WhisperTranscriptionService()
        self.storage = storage or StorageService()
        self.temp_dir = Path(settings.TEMP_AUDIO_DIR)
        self.temp_dir.mkdir(parents=True, exist_ok=True)

        # Initialize components
        self.stage_manager = StageManager()
        self.webhook_handler = WebhookHandler()
        self.audio_processor = AudioProcessor(self.audio_processor_service)

    async def translate_episode(
        self,
        episode: PodcastEpisode,
        target_lang_code: Optional[str] = None,
        force: bool = False,
        max_duration_seconds: Optional[int] = None,
        gender: str = "female",
    ) -> Dict[str, str]:
        """
        Complete translation pipeline for a podcast episode.

        NOTE: This method now delegates to pipeline components.
        Implementation is streamlined to ~150 lines by extracting:
        - Stage management → StageManager
        - Webhook handling → WebhookHandler
        - Pipeline stages → pipeline/* modules
        """
        try:
            # 1. Initialize translation (atomic status update)
            # 2. Send translation.started webhook
            # 3. Execute pipeline stages (delegate to pipeline modules)
            # 4. Update episode document
            # 5. Cleanup temporary files
            # 6. Send translation.completed webhook

            # Each stage now calls:
            # - self.stage_manager.start_stage()
            # - pipeline function (e.g., download_audio())
            # - self.stage_manager.complete_stage()
            # - self.webhook_handler.send_webhook() (at milestones)

            ...
```

### 12. __init__.py (~30 lines)

**Backward compatibility layer:**

```python
"""Podcast translation package - backward compatible exports."""
from .service import PodcastTranslationService
from .constants import STAGE_WEIGHTS, get_voice_id

__all__ = [
    "PodcastTranslationService",
    "STAGE_WEIGHTS",
    "get_voice_id",
]
```

## Migration Strategy

### Step 1: Create Package Structure

```bash
mkdir -p backend/app/services/podcast_translation/pipeline
touch backend/app/services/podcast_translation/__init__.py
touch backend/app/services/podcast_translation/pipeline/__init__.py
```

### Step 2: Extract Files (Order Matters)

1. Create `constants.py` first (no dependencies)
2. Create `stage_manager.py` (depends on constants)
3. Create `webhook_handler.py` (independent)
4. Create `pipeline/download.py` through `pipeline/upload.py`
5. Create `service.py` (main orchestrator)
6. Create `__init__.py` (re-exports)

### Step 3: Update Imports Across Codebase

Files that import `podcast_translation_service`:

**Search pattern:**
```bash
grep -r "podcast_translation_service" backend/app --include="*.py"
```

**Change:**
```python
from app.services.podcast_translation_service import PodcastTranslationService
```

**To:**
```python
from app.services.podcast_translation import PodcastTranslationService
```

### Step 4: Deprecation Path (Optional)

Keep `podcast_translation_service.py` as thin wrapper:

```python
"""DEPRECATED: Use app.services.podcast_translation instead."""
import warnings
from app.services.podcast_translation import *

warnings.warn(
    "Importing from podcast_translation_service is deprecated. "
    "Use 'from app.services.podcast_translation import ...' instead.",
    DeprecationWarning,
    stacklevel=2
)
```

## Critical Files to Modify

**Files to create:**
- `app/services/podcast_translation/__init__.py`
- `app/services/podcast_translation/constants.py`
- `app/services/podcast_translation/stage_manager.py`
- `app/services/podcast_translation/webhook_handler.py`
- `app/services/podcast_translation/pipeline/__init__.py`
- `app/services/podcast_translation/pipeline/download.py`
- `app/services/podcast_translation/pipeline/audio_processing.py`
- `app/services/podcast_translation/pipeline/transcription.py`
- `app/services/podcast_translation/pipeline/commercial_removal.py`
- `app/services/podcast_translation/pipeline/translation.py`
- `app/services/podcast_translation/pipeline/tts.py`
- `app/services/podcast_translation/pipeline/upload.py`
- `app/services/podcast_translation/service.py`

**Files to update:**
- Search and replace imports across backend (likely API routes, background tasks)

**Files to deprecate/remove:**
- `app/services/podcast_translation_service.py` (optional: keep as wrapper with deprecation warning)

## Testing Strategy

1. **Unit Tests**: Test each module independently
   - Mock services in pipeline tests
   - Test stage manager progress calculations
   - Test webhook handler signature generation
   - Test translation chunking logic

2. **Integration Tests**: Test full pipeline
   - Use test audio files
   - Verify stage resumption logic
   - Check progress tracking accuracy

3. **Backward Compatibility Tests**: Ensure existing imports still work

4. **Manual Testing**: Test with real podcast episode

## Verification

After implementation:

```bash
# 1. Verify all new files exist and are under 200 lines
find backend/app/services/podcast_translation -name "*.py" -exec wc -l {} \; | awk '{print $1, $2}' | sort -rn

# 2. Run tests
cd backend
poetry run pytest tests/ -v

# 3. Check imports work
poetry run python -c "from app.services.podcast_translation import PodcastTranslationService; print('Imports OK')"

# 4. Start backend server (verify no errors)
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Success Criteria

- [ ] All files in `podcast_translation/` package are under 200 lines
- [ ] All existing functionality preserved
- [ ] All tests pass
- [ ] No performance regressions
- [ ] Backward compatible imports work
- [ ] Stage resumption logic intact
- [ ] Webhook notifications functional
- [ ] Progress tracking accurate

## Estimated Effort

- **Total Time**: 4-5 hours
- **Phase 3B Progress**: Ready to start implementation
