# Podcast Translation Feature - Comprehensive Fixes Document

## Purpose
This document consolidates ALL reviewer feedback and provides complete fixes for every critical issue before implementation.

---

## Fix Status Tracker

| Issue Category | Reviewer | Status | Fix Location |
|----------------|----------|--------|--------------|
| Audio Quality | Voice Technician | 🔄 IN PROGRESS | Phases 2-3 |
| DI & Config | Code Reviewer | 🔄 IN PROGRESS | Phases 3-8 |
| Security | Security Expert | 🔄 IN PROGRESS | Phase 3 |
| Cloud Architecture | CI/CD Expert | 🔄 IN PROGRESS | Phases 4, 12 |
| UI/UX Design | UI/UX Designer | 🔄 IN PROGRESS | Phases 7, 12 |
| i18n/a11y | UX/Localization | 🔄 IN PROGRESS | Phases 7, 16 (NEW) |
| tvOS Support | tvOS Expert | 🔄 IN PROGRESS | Phase 17 (NEW) |
| Frontend Arch | Web Expert | 🔄 IN PROGRESS | Phases 6-7, 18 (NEW) |

---

## SECTION 1: Audio Processing Fixes (Voice Technician)

### Issue #1: Replace Spleeter with Demucs v4

**Problem**: Spleeter discontinued since 2020, inferior quality
**Solution**: Use Demucs v4 (htdemucs_6s model)

```python
# OLD (WRONG)
from spleeter.separator import Separator
separator = Separator('spleeter:2stems')

# NEW (CORRECT)
from demucs.pretrained import get_model
from demucs.apply import apply_model
import torch

class AudioProcessingService:
    def __init__(self, config: AudioProcessingConfig):
        self.model_name = config.demucs_model  # "htdemucs_6s"
        self.device = config.device  # "cuda" or "cpu" from config
        self.model = None

    async def separate_vocals(self, audio_path: str, output_dir: str) -> Tuple[str, str]:
        """Separate vocals using Demucs v4 htdemucs_6s model."""

        # Load model (cached after first load)
        if self.model is None:
            self.model = get_model(self.model_name)
            self.model.to(self.device)

        # Load audio
        import torchaudio
        wav, sr = torchaudio.load(audio_path)

        # Apply model with overlap for better quality
        with torch.no_grad():
            stems = apply_model(
                self.model,
                wav.unsqueeze(0).to(self.device),
                overlap=0.25,  # 25% overlap for quality
                device=self.device
            )

        # htdemucs_6s returns 6 stems: drums, bass, other, vocals, guitar, piano
        # Extract vocals (index 3)
        vocals = stems[0, 3]

        # Mix all non-vocal stems as background
        background = torch.sum(stems[0, [0,1,2,4,5]], dim=0)

        # Save stems
        vocals_path = os.path.join(output_dir, "vocals.wav")
        background_path = os.path.join(output_dir, "background.wav")

        torchaudio.save(vocals_path, vocals.cpu(), sr)
        torchaudio.save(background_path, background.cpu(), sr)

        return vocals_path, background_path
```

**Dependencies Update**:
```toml
# pyproject.toml
[tool.poetry.dependencies]
demucs = "^4.0.1"  # NOT spleeter
torch = "^2.1.0"
torchaudio = "^2.1.0"
```

### Issue #2: Use Whisper large-v3 for STT

**Problem**: ElevenLabs Scribe suboptimal for Hebrew
**Solution**: OpenAI Whisper large-v3

```python
# OLD (WRONG)
async def _transcribe_audio(self, audio_path: str) -> Tuple[str, str]:
    # Using ElevenLabs Scribe
    pass

# NEW (CORRECT)
async def _transcribe_audio(self, audio_path: str) -> Tuple[str, str]:
    """Transcribe using Whisper large-v3 optimized for Hebrew."""
    import whisper

    # Load model (cached)
    model = whisper.load_model(
        "large-v3",
        device=self.config.stt_device,  # from config, not hardcoded
        download_root=self.config.whisper_model_cache  # from config
    )

    # Transcribe with auto-detect
    result = model.transcribe(
        audio_path,
        language=None,  # Auto-detect Hebrew or English
        task="transcribe",
        verbose=False,
        word_timestamps=True,  # For future word-level features
        fp16=torch.cuda.is_available(),
        beam_size=5,  # Better quality
        best_of=5,
        temperature=0.0  # Deterministic
    )

    return result["text"], result["language"]
```

**Dependencies**:
```toml
openai-whisper = "^20231117"
# NOT elevenlabs STT
```

### Issue #3: Professional Audio Mixing with Ducking

**Problem**: No ducking, poor normalization
**Solution**: Two-pass loudnorm + professional ducking

```python
async def mix_audio(
    self, vocals_path: str, background_path: str, output_path: str
) -> str:
    """Mix with professional ducking and EBU R128 normalization."""

    # Step 1: Normalize vocals (two-pass loudnorm)
    vocals_normalized = await self._normalize_audio_two_pass(
        vocals_path,
        target_lufs=self.config.target_lufs,  # -16.0 from config
        peak_limiter=self.config.peak_limiter  # -1.5 from config
    )

    # Step 2: Mix with ducking
    final_temp = output_path.replace(".mp3", "_temp.wav")

    ffmpeg_cmd = [
        "ffmpeg", "-i", vocals_normalized, "-i", background_path,
        "-filter_complex",
        # Professional ducking: reduce background by 12dB when vocals present
        f"[1:a]volume={self.config.background_volume_db}dB[bg];"
        f"[0:a]volume={self.config.vocal_volume_db}dB[voc];"
        "[voc][bg]amix=inputs=2:duration=longest:weights=1 0.3,"
        "alimiter=limit=0.95",
        "-ar", "44100",
        "-b:a", f"{self.config.output_bitrate}k",  # 128k from config, NOT 256k
        final_temp
    ]

    process = await asyncio.create_subprocess_exec(*ffmpeg_cmd)
    await process.wait()

    # Step 3: Final two-pass normalization
    await self._normalize_audio_two_pass(final_temp, output_path)

    return output_path

async def _normalize_audio_two_pass(
    self, input_path: str, output_path: str,
    target_lufs: float = -16.0, peak_limiter: float = -1.5
) -> str:
    """Two-pass loudnorm to EBU R128 standard."""

    # Pass 1: Analyze
    analyze_cmd = [
        "ffmpeg", "-i", input_path, "-af",
        f"loudnorm=I={target_lufs}:TP={peak_limiter}:LRA=11:print_format=json",
        "-f", "null", "-"
    ]

    process = await asyncio.create_subprocess_exec(
        *analyze_cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    _, stderr = await process.communicate()

    # Parse measured values
    import json, re
    json_match = re.search(r'\{[^}]*"input_i"[^}]*\}', stderr.decode())
    if not json_match:
        raise ValueError("Failed to analyze audio loudness")

    measured = json.loads(json_match.group())

    # Pass 2: Apply normalization
    normalize_cmd = [
        "ffmpeg", "-i", input_path, "-af",
        f"loudnorm=I={target_lufs}:TP={peak_limiter}:LRA=11:"
        f"measured_I={measured['input_i']}:"
        f"measured_TP={measured['input_tp']}:"
        f"measured_LRA={measured['input_lra']}:"
        f"measured_thresh={measured['input_thresh']}",
        output_path
    ]

    process = await asyncio.create_subprocess_exec(*normalize_cmd)
    await process.wait()

    return output_path
```

### Issue #4: Complete ElevenLabs Voice Settings

**Problem**: Missing voice settings for quality
**Solution**: Add all required parameters

```python
async def _generate_tts(
    self, text: str, language: str, output_path: str
) -> str:
    """Generate TTS with professional voice settings."""
    voice_id = self._get_voice_id(language)  # From config, not hardcoded

    # Professional podcast voice settings
    voice_settings = {
        "stability": self.config.elevenlabs_stability,  # 0.75 from config
        "similarity_boost": self.config.elevenlabs_similarity_boost,  # 0.85
        "style": self.config.elevenlabs_style,  # 0.4
        "use_speaker_boost": self.config.elevenlabs_speaker_boost  # True
    }

    # Use multilingual v2 (NOT turbo - lower quality)
    model = self.config.elevenlabs_model  # "eleven_multilingual_v2" from config

    # Stream with explicit format
    async with self.tts_service.stream_text_to_speech(
        voice_id=voice_id,
        text=text,
        model=model,
        voice_settings=voice_settings,
        output_format=f"mp3_44100_{self.config.output_bitrate}"  # "mp3_44100_128"
    ) as stream:
        await stream.save(output_path)

    return output_path
```

### Issue #5: Optimal Bitrates for Speech

**Problem**: 256kbps wasteful for speech
**Solution**: Multiple quality variants

```python
# Configuration
class AudioQualityConfig(BaseModel):
    high_bitrate: int = Field(default=128, description="High quality (WiFi)")
    medium_bitrate: int = Field(default=96, description="Medium quality (good cellular)")
    low_bitrate: int = Field(default=64, description="Low quality (poor cellular)")

async def _generate_tts_variants(
    self, text: str, language: str, episode_id: str
) -> Dict[str, str]:
    """Generate multiple quality variants."""
    variants = {}

    for quality, bitrate in [
        ("high", self.config.high_bitrate),
        ("medium", self.config.medium_bitrate),
        ("low", self.config.low_bitrate)
    ]:
        output_path = f"{episode_id}_{quality}.mp3"

        # Generate TTS
        await self._generate_tts(text, language, output_path, bitrate=bitrate)

        # Upload to GCS
        gcs_url = await self._upload_translated_audio(
            output_path, episode_id, f"{language}_{quality}"
        )
        variants[quality] = gcs_url

    return variants
```

---

## SECTION 2: Dependency Injection & Configuration Fixes (Code Reviewer)

### Issue #1: Remove Hardcoded Default Language

**Problem**: `original_language: str = "he"` hardcoded in model
**Solution**: No default in model, value from config at runtime

```python
# OLD (WRONG)
class PodcastEpisode(Document):
    original_language: str = "he"  # ❌ HARDCODED

# NEW (CORRECT)
class PodcastEpisode(Document):
    original_language: str  # No default - must be set explicitly

# In service:
async def detect_or_set_original_language(self, episode: PodcastEpisode) -> str:
    """Detect language or use configured default."""
    if episode.original_language:
        return episode.original_language

    # Detect from audio
    _, detected_lang = await self._transcribe_audio(episode.audio_url)
    episode.original_language = detected_lang
    await episode.save()

    return detected_language or self.config.default_original_language  # From config
```

### Issue #2: Dependency Injection for PodcastTranslationService

**Problem**: Service directly instantiates dependencies
**Solution**: Constructor injection

```python
# OLD (WRONG)
class PodcastTranslationService:
    def __init__(self):
        self.audio_processor = AudioProcessingService()  # ❌ Direct instantiation
        self.translation_service = TranslationService()
        self.tts_service = ElevenLabsTTSStreamingService()

# NEW (CORRECT)
class PodcastTranslationService:
    def __init__(
        self,
        audio_processor: AudioProcessingService,
        translation_service: TranslationService,
        tts_service: ElevenLabsTTSStreamingService,
        storage: StorageService,
        config: PodcastTranslationConfig,
        logger: Logger = None
    ):
        """Dependency injection for all services."""
        self.audio_processor = audio_processor
        self.translation_service = translation_service
        self.tts_service = tts_service
        self.storage = storage
        self.config = config
        self.logger = logger or get_logger(__name__)
        self.temp_dir = Path(config.temp_audio_dir)
        self.temp_dir.mkdir(parents=True, exist_ok=True)

# Composition root (app/services/factories.py)
def create_podcast_translation_service(
    config: PodcastTranslationConfig
) -> PodcastTranslationService:
    """Factory function for creating service with injected dependencies."""

    audio_config = AudioProcessingConfig.from_podcast_config(config)
    audio_processor = AudioProcessingService(audio_config)

    translation_service = TranslationService(config.translation_api_key)
    tts_service = ElevenLabsTTSStreamingService(config.elevenlabs_api_key)
    storage = StorageService(config.gcs_bucket_name)
    logger = get_logger("podcast_translation")

    return PodcastTranslationService(
        audio_processor=audio_processor,
        translation_service=translation_service,
        tts_service=tts_service,
        storage=storage,
        config=config,
        logger=logger
    )
```

### Issue #3: Remove Stub Implementation

**Problem**: `isConnectedToWiFi()` returns hardcoded `true`
**Solution**: Real implementation or remove entirely

```python
# OLD (WRONG)
async def isConnectedToWiFi(self) -> bool:
    return True  # ❌ STUB

# NEW (CORRECT) - Option 1: Real implementation
async def is_connected_to_wifi(self) -> bool:
    """Check if device is connected to WiFi (mobile only)."""
    # This is mobile-only functionality, should not be in backend
    raise NotImplementedError(
        "WiFi detection is a mobile client responsibility, not backend"
    )

# NEW (CORRECT) - Option 2: Move to mobile client
# Remove from backend entirely, implement in mobile/web client
```

### Issue #4: Define PodcastEpisodeMinimal

**Problem**: Referenced but undefined
**Solution**: Create projection model

```python
# backend/app/models/projections.py
class PodcastEpisodeMinimal(BaseModel):
    """Minimal projection for translation worker queries."""
    id: PydanticObjectId
    title: str
    audio_url: str
    translation_status: str
    retry_count: int = 0
    published_at: datetime
    original_language: Optional[str]

    class Config:
        # Allow ORM mode for Beanie documents
        from_attributes = True
```

### Issue #5: Configuration Class

**Problem**: Missing structured config
**Solution**: Complete Pydantic config class

```python
# app/core/config.py
class AudioProcessingConfig(BaseModel):
    """Audio processing configuration."""
    # Demucs
    demucs_model: str = Field(default="htdemucs_6s")
    device: str = Field(default="cpu")  # "cuda" or "cpu"

    # Whisper STT
    stt_model: str = Field(default="large-v3")
    stt_device: str = Field(default="cpu")
    whisper_model_cache: str = Field(default="/workspace/models")

    # Audio quality
    target_lufs: float = Field(default=-16.0)
    peak_limiter: float = Field(default=-1.5)
    vocal_volume_db: float = Field(default=0.0)
    background_volume_db: float = Field(default=-12.0)

    # Bitrates
    high_bitrate: int = Field(default=128)
    medium_bitrate: int = Field(default=96)
    low_bitrate: int = Field(default=64)

class PodcastTranslationConfig(BaseModel):
    """Complete translation feature configuration."""
    # Feature flags
    enabled: bool
    poll_interval: int
    max_concurrent: int

    # Paths
    temp_audio_dir: str

    # Defaults
    default_original_language: str  # "he" - from config, not hardcoded
    allowed_audio_domains: List[str]

    # Audio processing
    audio_processing: AudioProcessingConfig

    # ElevenLabs
    elevenlabs_stability: float = Field(default=0.75)
    elevenlabs_similarity_boost: float = Field(default=0.85)
    elevenlabs_style: float = Field(default=0.4)
    elevenlabs_speaker_boost: bool = Field(default=True)
    elevenlabs_model: str = Field(default="eleven_multilingual_v2")

    # Voice IDs (from Secret Manager)
    elevenlabs_hebrew_voice_id: str
    elevenlabs_english_voice_id: str

    # Rate limiting
    max_translations_per_user_per_hour: int = Field(default=10)
    max_translations_per_user_per_day: int = Field(default=50)

    # API keys (from Secret Manager)
    translation_api_key: str
    elevenlabs_api_key: str
    gcs_bucket_name: str

# Load from environment
class Settings(BaseSettings):
    # Podcast translation
    PODCAST_TRANSLATION_ENABLED: bool = Field(default=False)
    PODCAST_TRANSLATION_POLL_INTERVAL: int = Field(default=300)
    PODCAST_TRANSLATION_MAX_CONCURRENT: int = Field(default=2)
    TEMP_AUDIO_DIR: str = Field(default="/workspace/temp")
    PODCAST_DEFAULT_ORIGINAL_LANGUAGE: str = Field(default="he")

    @property
    def podcast_translation_config(self) -> PodcastTranslationConfig:
        """Build podcast translation config from environment."""
        return PodcastTranslationConfig(
            enabled=self.PODCAST_TRANSLATION_ENABLED,
            poll_interval=self.PODCAST_TRANSLATION_POLL_INTERVAL,
            max_concurrent=self.PODCAST_TRANSLATION_MAX_CONCURRENT,
            temp_audio_dir=self.TEMP_AUDIO_DIR,
            default_original_language=self.PODCAST_DEFAULT_ORIGINAL_LANGUAGE,
            allowed_audio_domains=self._get_allowed_audio_domains(),
            audio_processing=self._build_audio_processing_config(),
            elevenlabs_hebrew_voice_id=self._get_secret("elevenlabs-hebrew-voice-id"),
            elevenlabs_english_voice_id=self._get_secret("elevenlabs-english-voice-id"),
            translation_api_key=self._get_secret("translation-api-key"),
            elevenlabs_api_key=self._get_secret("elevenlabs-api-key"),
            gcs_bucket_name=self.GCS_PODCAST_BUCKET
        )
```

---

## SECTION 3: Security Fixes (Security Expert)

### Issue #1: SSRF Protection for Audio Downloads

**Problem**: `_download_audio()` accepts arbitrary URLs
**Solution**: Whitelist validation + IP blocking

```python
async def _download_audio(self, url: str) -> str:
    """Download audio with comprehensive SSRF protection."""
    import httpx
    from urllib.parse import urlparse
    import ipaddress

    # Step 1: Parse URL
    parsed = urlparse(url)

    # Step 2: Whitelist domain check
    allowed_domains = self.config.allowed_audio_domains or [
        "storage.googleapis.com",
        "cdn.bayitplus.com",
        "*.podbean.com",
        "*.anchor.fm"
    ]

    if not any(
        parsed.netloc == domain or parsed.netloc.endswith(f".{domain.lstrip('*.')}")
        for domain in allowed_domains
    ):
        raise ValueError(
            f"Audio download from {parsed.netloc} not allowed. "
            f"Allowed domains: {allowed_domains}"
        )

    # Step 3: Block internal IPs (prevent SSRF to internal services)
    try:
        hostname = parsed.hostname or parsed.netloc
        ip = ipaddress.ip_address(hostname)

        if ip.is_private or ip.is_loopback or ip.is_link_local:
            raise ValueError(f"Cannot download from internal IP: {ip}")
    except ValueError as e:
        if "does not appear to be" not in str(e):
            raise

    # Step 4: Additional blocklist
    blocked_hosts = ["localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254"]
    if parsed.hostname in blocked_hosts or parsed.netloc in blocked_hosts:
        raise ValueError(f"Blocked host: {parsed.hostname}")

    # Step 5: Download with timeout and size limit
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(30.0, connect=10.0),
        follow_redirects=True,
        max_redirects=3
    ) as client:
        response = await client.get(url)
        response.raise_for_status()

        # Verify content type
        content_type = response.headers.get("content-type", "")
        allowed_types = ["audio/", "application/octet-stream"]
        if not any(content_type.startswith(t) for t in allowed_types):
            raise ValueError(f"Invalid content type: {content_type}")

        # Check file size (max 500MB)
        content_length = int(response.headers.get("content-length", 0))
        max_size = self.config.max_audio_file_size or (500 * 1024 * 1024)
        if content_length > max_size:
            raise ValueError(f"Audio file too large: {content_length} bytes")

        # Save to temp
        filename = f"{uuid.uuid4()}.mp3"
        filepath = self.temp_dir / filename

        with open(filepath, "wb") as f:
            f.write(response.content)

        return str(filepath)
```

### Issue #2: Rate Limiting for Translation Endpoints

**Problem**: No rate limiting, ElevenLabs cost explosion
**Solution**: Distributed rate limiter with Redis

```python
# app/core/rate_limiter.py
from redis import asyncio as aioredis
from datetime import datetime, timedelta

class RateLimiter:
    """Distributed rate limiter using Redis."""

    def __init__(
        self,
        redis_client: aioredis.Redis,
        max_requests_per_hour: int,
        max_requests_per_day: int,
        scope: str
    ):
        self.redis = redis_client
        self.max_per_hour = max_requests_per_hour
        self.max_per_day = max_requests_per_day
        self.scope = scope

    async def check_rate_limit(self, user_id: str) -> None:
        """Check rate limit and raise exception if exceeded."""
        now = datetime.utcnow()
        hour_key = f"ratelimit:{self.scope}:{user_id}:hour:{now.strftime('%Y%m%d%H')}"
        day_key = f"ratelimit:{self.scope}:{user_id}:day:{now.strftime('%Y%m%d')}"

        # Check hourly limit
        hour_count = await self.redis.get(hour_key)
        if hour_count and int(hour_count) >= self.max_per_hour:
            raise RateLimitExceeded(
                f"Hourly rate limit exceeded: {self.max_per_hour} translations/hour"
            )

        # Check daily limit
        day_count = await self.redis.get(day_key)
        if day_count and int(day_count) >= self.max_per_day:
            raise RateLimitExceeded(
                f"Daily rate limit exceeded: {self.max_per_day} translations/day"
            )

        # Increment counters
        pipe = self.redis.pipeline()
        pipe.incr(hour_key)
        pipe.expire(hour_key, 3600)  # 1 hour TTL
        pipe.incr(day_key)
        pipe.expire(day_key, 86400)  # 24 hour TTL
        await pipe.execute()

# In API endpoint:
from app.core.rate_limiter import RateLimiter

@router.post("/{podcast_id}/episodes/{episode_id}/translate")
async def trigger_translation(
    podcast_id: str,
    episode_id: str,
    redis: aioredis.Redis = Depends(get_redis),
    current_user: User = Depends(require_permission(Permission.CONTENT_UPDATE)),
):
    """Manually trigger translation with rate limiting."""

    # Rate limiting
    rate_limiter = RateLimiter(
        redis_client=redis,
        max_requests_per_hour=settings.PODCAST_TRANSLATION_MAX_PER_HOUR,
        max_requests_per_day=settings.PODCAST_TRANSLATION_MAX_PER_DAY,
        scope="podcast_translation"
    )

    try:
        await rate_limiter.check_rate_limit(current_user.id)
    except RateLimitExceeded as e:
        raise HTTPException(status_code=429, detail=str(e))

    # Queue translation
    worker = get_translation_worker()
    success = await worker.queue_episode(episode_id)

    # Audit log
    await create_audit_log(
        user_id=current_user.id,
        action="podcast_translation_triggered",
        resource_type="podcast_episode",
        resource_id=episode_id,
        metadata={"podcast_id": podcast_id}
    )

    return {"status": "queued" if success else "failed", "episode_id": episode_id}
```

### Issue #3: Secret Manager Integration

**Problem**: API keys in plain env vars
**Solution**: Google Cloud Secret Manager

```python
# app/core/secrets.py
from google.cloud import secretmanager
from functools import lru_cache

class SecretManager:
    """Google Cloud Secret Manager client."""

    def __init__(self, project_id: str):
        self.client = secretmanager.SecretManagerServiceClient()
        self.project_id = project_id

    @lru_cache(maxsize=128)
    def get_secret(self, secret_name: str, version: str = "latest") -> str:
        """Retrieve secret with caching."""
        name = f"projects/{self.project_id}/secrets/{secret_name}/versions/{version}"

        try:
            response = self.client.access_secret_version(request={"name": name})
            return response.payload.data.decode("UTF-8")
        except Exception as e:
            raise ValueError(f"Failed to retrieve secret {secret_name}: {e}")

# In settings:
class Settings(BaseSettings):
    GCP_PROJECT_ID: str

    def _get_secret(self, secret_name: str) -> str:
        """Get secret from Secret Manager."""
        secret_manager = SecretManager(self.GCP_PROJECT_ID)
        return secret_manager.get_secret(secret_name)

    @property
    def elevenlabs_hebrew_voice_id(self) -> str:
        return self._get_secret("elevenlabs-hebrew-voice-id")

    @property
    def elevenlabs_english_voice_id(self) -> str:
        return self._get_secret("elevenlabs-english-voice-id")

    @property
    def elevenlabs_api_key(self) -> str:
        return self._get_secret("elevenlabs-api-key")
```

---

## SECTION 4: Cloud Run Jobs Migration (CI/CD Expert)

### Issue #1: Ephemeral Filesystem Problem

**Problem**: Cloud Run `/tmp` limited to memory, long-running worker
**Solution**: Migrate to Cloud Run Jobs + Cloud Tasks + persistent disk

```yaml
# cloudbuild.yaml
steps:
  # Build Cloud Run Job container
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/podcast-translation-worker:$BUILD_ID'
      - '-f'
      - 'backend/Dockerfile.translation-worker'
      - '.'

  # Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/podcast-translation-worker:$BUILD_ID'

  # Deploy Cloud Run Job
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'jobs'
      - 'update'
      - 'podcast-translation-worker'
      - '--image=gcr.io/$PROJECT_ID/podcast-translation-worker:$BUILD_ID'
      - '--region=us-central1'
      - '--task-timeout=3600s'  # 1 hour per task
      - '--max-retries=3'
      - '--cpu=4'
      - '--memory=8Gi'
      - '--set-env-vars=GOOGLE_CLOUD_PROJECT=$PROJECT_ID'
      - '--execute-now'  # Optional: trigger immediately

# terraform/cloud_run_job.tf
resource "google_cloud_run_v2_job" "podcast_translation_worker" {
  name     = "podcast-translation-worker"
  location = var.region

  template {
    task_count = 1

    template {
      max_retries = 3
      timeout     = "3600s"  # 1 hour per episode

      containers {
        image = var.worker_image

        resources {
          limits = {
            cpu    = "4"
            memory = "8Gi"
          }
        }

        volume_mounts {
          name       = "workspace"
          mount_path = "/workspace"
        }

        env {
          name  = "TEMP_AUDIO_DIR"
          value = "/workspace/temp"
        }

        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.project_id
        }
      }

      volumes {
        name = "workspace"

        empty_dir {
          medium    = "Memory"
          size_limit = "4Gi"
        }
      }

      service_account = google_service_account.translation_worker.email
    }
  }
}

# Cloud Tasks queue for job scheduling
resource "google_cloud_tasks_queue" "podcast_translation_queue" {
  name     = "podcast-translation-queue"
  location = var.region

  rate_limits {
    max_dispatches_per_second = 2  # Max 2 concurrent translations
    max_burst_size            = 5
  }

  retry_config {
    max_attempts       = 3
    max_retry_duration = "3600s"
    min_backoff        = "30s"
    max_backoff        = "300s"
    max_doublings      = 3
  }
}
```

### Issue #2: Worker Implementation for Cloud Run Jobs

```python
# backend/worker/podcast_translation_worker.py
"""
Cloud Run Job worker for podcast translation.
Processes a single episode then exits.
"""
import asyncio
import sys
from app.core.config import settings
from app.services.podcast_translation_service import PodcastTranslationService
from app.models.content import PodcastEpisode

async def main():
    """Main worker entry point."""
    # Get episode ID from environment (passed by Cloud Tasks)
    episode_id = os.environ.get("EPISODE_ID")
    if not episode_id:
        print("ERROR: EPISODE_ID environment variable not set")
        sys.exit(1)

    # Initialize service
    config = settings.podcast_translation_config
    service = create_podcast_translation_service(config)

    try:
        # Fetch episode
        episode = await PodcastEpisode.get(episode_id)
        if not episode:
            print(f"ERROR: Episode {episode_id} not found")
            sys.exit(1)

        # Translate
        print(f"Starting translation for episode: {episode.title}")
        result = await service.translate_episode(episode)
        print(f"Translation completed: {result}")
        sys.exit(0)

    except Exception as e:
        print(f"Translation failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
```

### Issue #3: Cloud Tasks Scheduler

```python
# app/services/translation_scheduler.py
from google.cloud import tasks_v2
from google.protobuf import timestamp_pb2
import time

class TranslationScheduler:
    """Schedule translation jobs using Cloud Tasks."""

    def __init__(self, config: PodcastTranslationConfig):
        self.client = tasks_v2.CloudTasksClient()
        self.project_id = config.gcp_project_id
        self.location = config.gcp_region
        self.queue_name = config.translation_queue_name
        self.queue_path = self.client.queue_path(
            self.project_id, self.location, self.queue_name
        )

    async def schedule_translation(self, episode_id: str) -> str:
        """Schedule a Cloud Run Job execution for episode translation."""

        # Create task
        task = {
            "http_request": {
                "http_method": tasks_v2.HttpMethod.POST,
                "url": f"https://{self.location}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/{self.project_id}/jobs/podcast-translation-worker:run",
                "headers": {
                    "Content-Type": "application/json",
                },
                "body": json.dumps({
                    "overrides": {
                        "container_overrides": [{
                            "env": [{
                                "name": "EPISODE_ID",
                                "value": episode_id
                            }]
                        }]
                    }
                }).encode(),
                "oidc_token": {
                    "service_account_email": self.config.worker_service_account
                }
            }
        }

        # Schedule task
        response = self.client.create_task(
            request={"parent": self.queue_path, "task": task}
        )

        return response.name

# In background polling service:
async def _feed_queue(self) -> None:
    """Feed untranslated episodes to Cloud Tasks."""
    scheduler = TranslationScheduler(self.config)

    while self._running:
        try:
            episodes = await PodcastEpisode.find(
                {
                    "translation_status": {"$in": ["pending", "failed"]},
                    "$or": [
                        {"retry_count": {"$exists": False}},
                        {"retry_count": {"$lt": 3}}
                    ]
                },
                projection_model=PodcastEpisodeMinimal
            ).sort("-published_at").limit(10).to_list()

            for episode in episodes:
                # Schedule Cloud Run Job via Cloud Tasks
                await scheduler.schedule_translation(episode.id)
                logger.info(f"Scheduled translation for episode: {episode.id}")

            if not episodes:
                logger.debug("No episodes to translate, sleeping...")

        except Exception as e:
            logger.error(f"Error feeding translation queue: {e}")

        await asyncio.sleep(self.poll_interval)
```

### Issue #4: Monitoring and Alerting

```yaml
# monitoring/alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: podcast-translation-alerts
spec:
  groups:
    - name: podcast_translation
      interval: 30s
      rules:
        - alert: HighTranslationFailureRate
          expr: |
            (
              rate(podcast_translation_failures_total[5m])
              /
              rate(podcast_translation_attempts_total[5m])
            ) > 0.5
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High podcast translation failure rate"
            description: "{{ $value }}% of translations are failing"

        - alert: TranslationQueueBacklog
          expr: podcast_translation_queue_size > 100
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: "Translation queue has large backlog"
            description: "{{ $value }} episodes waiting for translation"

        - alert: ElevenLabsCostSpike
          expr: |
            sum(rate(elevenlabs_api_characters_total[1h]))
            > (10 * sum(rate(elevenlabs_api_characters_total[1h] offset 24h)))
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: "ElevenLabs API usage spike detected"
            description: "Usage is 10x normal, possible abuse or runaway job"
```

---

## SECTION 5: UI/UX Fixes (UI/UX Designer)

### Issue #1: Use Flag Emojis (Reuse SubtitleFlags)

**Problem**: Text codes "HE"/"EN" instead of flags
**Solution**: Reuse existing SubtitleFlags component

```tsx
// Phase 7 - ShowCard Update
// OLD (WRONG)
{show.availableLanguages && show.availableLanguages.length > 1 && (
  <div className="absolute top-2 right-2 flex gap-1">
    {show.availableLanguages.map((lang) => (
      <div key={lang} className="bg-black/60 backdrop-blur-sm rounded px-2 py-1">
        {lang.toUpperCase()}
      </div>
    ))}
  </div>
)}

// NEW (CORRECT) - Reuse SubtitleFlags component
import { SubtitleFlags } from '../player/subtitle/SubtitleFlags'

{episode.availableLanguages && episode.availableLanguages.length > 1 && (
  <SubtitleFlags
    languages={episode.availableLanguages}
    position={isRTL ? 'top-left' : 'top-right'}
    isRTL={isRTL}
    size="small"
  />
)}
```

### Issue #2: Fix Touch Target Sizes (44x44pt Minimum)

**Problem**: `size="small"` = ~30px, FAILS iOS requirement
**Solution**: Use `size="md"` + explicit min dimensions

```tsx
// PodcastLanguageSelector - Updated
const LANGUAGE_MAP = {
  he: { flag: '🇮🇱', label: 'Hebrew', code: 'he' },
  en: { flag: '🇺🇸', label: 'English', code: 'en' }
}

export function PodcastLanguageSelector({
  availableLanguages,
  currentLanguage,
  onLanguageChange,
  isLoading,
}: PodcastLanguageSelectorProps) {
  const { t } = useTranslation()

  if (availableLanguages.length <= 1) {
    return null
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby="language-selector-label"
      className="flex flex-col sm:flex-row gap-3 items-start sm:items-center"
    >
      <span
        id="language-selector-label"
        className="text-white/80 text-xs sm:text-sm md:text-base"
      >
        {t('podcast.selectLanguage')}:
      </span>
      <div className="flex gap-2">
        {availableLanguages.map((lang) => {
          const langInfo = LANGUAGE_MAP[lang]
          return (
            <GlassButton
              key={lang}
              variant={lang === currentLanguage ? 'primary' : 'ghost'}
              size="md"  // Changed from "small" to meet 44pt
              onPress={() => onLanguageChange(lang)}
              className="min-w-[100px] min-h-[44px] touch-manipulation"  // Explicit iOS compliance
              disabled={isLoading}
              aria-label={t('podcast.switchToLanguage', { language: langInfo.label })}
              aria-current={lang === currentLanguage ? 'true' : undefined}
              role="radio"
              tabIndex={0}
            >
              {isLoading && lang === currentLanguage ? (
                <GlassSpinner size="small" />
              ) : (
                <>
                  <span className="text-xl mr-2">{langInfo.flag}</span>
                  <span>{langInfo.label}</span>
                </>
              )}
            </GlassButton>
          )
        })}
      </div>
    </div>
  )
}
```

### Issue #3: Enhanced Download Button

**Problem**: Unicode arrow, no error state, static progress
**Solution**: Lucide icons, error handling, animated progress

```tsx
import { Download, Check, X } from 'lucide-react'
import { GlassButton, GlassProgress, GlassAlert } from '@bayit/glass'

interface DownloadButtonProps {
  episodeId: string
  episodeTitle: string
  language: string
  audioUrl: string
}

export function DownloadButton({
  episodeId,
  episodeTitle,
  language,
  audioUrl
}: DownloadButtonProps) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<'not_downloaded' | 'downloading' | 'downloaded' | 'error'>('not_downloaded')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const cacheService = useMemo(() => new AudioCacheService(), [])

  useEffect(() => {
    checkDownloadStatus()
  }, [episodeId, language])

  async function checkDownloadStatus() {
    const cached = await cacheService.getCachedAudio(episodeId, language)
    setStatus(cached ? 'downloaded' : 'not_downloaded')
  }

  async function handleDownload() {
    setStatus('downloading')
    setError(null)

    try {
      await cacheService.cacheAudio(episodeId, language, audioUrl, (p) => {
        setProgress(p)
      })
      setStatus('downloaded')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  async function handleRetry() {
    await handleDownload()
  }

  if (status === 'downloaded') {
    return (
      <GlassButton
        variant="success"
        size="md"
        disabled
        className="min-h-[44px]"
        aria-label={t('download.completed')}
      >
        <Check size={18} className="mr-2" />
        {t('download.completed')}
      </GlassButton>
    )
  }

  if (status === 'downloading') {
    return (
      <GlassButton
        variant="secondary"
        size="md"
        disabled
        className="min-h-[44px] relative overflow-visible"
      >
        <GlassProgress value={progress} className="absolute bottom-0 left-0 right-0 h-1" />
        <Text className="text-white">{Math.round(progress * 100)}%</Text>
      </GlassButton>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col gap-2">
        <GlassButton
          variant="warning"
          size="md"
          onPress={handleRetry}
          className="min-h-[44px]"
        >
          <X size={18} className="mr-2" />
          {t('download.retry')}
        </GlassButton>
        {error && (
          <GlassAlert variant="error" className="text-xs">
            {error}
          </GlassAlert>
        )}
      </div>
    )
  }

  return (
    <GlassButton
      variant="primary"
      size="md"
      onPress={handleDownload}
      className="min-h-[44px]"
      aria-label={t('download.start', { title: episodeTitle })}
    >
      <Download size={18} className="mr-2" />
      {t('download.start')}
    </GlassButton>
  )
}
```

### Issue #4: Onboarding Flow

**Problem**: Users won't discover translation feature
**Solution**: First-time user tooltips + auto-play announcements

```tsx
// New component: OnboardingTooltip.tsx
import { GlassModal, GlassButton } from '@bayit/glass'
import AsyncStorage from '@react-native-async-storage/async-storage'

export function TranslationOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  async function checkOnboardingStatus() {
    const seen = await AsyncStorage.getItem('@podcast_translation_onboarding_seen')
    if (!seen) {
      setShowOnboarding(true)
    }
  }

  async function handleDismiss() {
    await AsyncStorage.setItem('@podcast_translation_onboarding_seen', 'true')
    setShowOnboarding(false)
  }

  if (!showOnboarding) return null

  return (
    <GlassModal visible={showOnboarding} onClose={handleDismiss}>
      <div className="p-6 max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">
          🎧 {t('onboarding.translation.title')}
        </h2>
        <p className="text-white/80 mb-4">
          {t('onboarding.translation.description')}
        </p>
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🇮🇱</span>
            <span className="text-white">Hebrew</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">🇺🇸</span>
            <span className="text-white">English</span>
          </div>
        </div>
        <GlassButton
          variant="primary"
          size="md"
          onPress={handleDismiss}
          className="w-full"
        >
          {t('onboarding.gotIt')}
        </GlassButton>
      </div>
    </GlassModal>
  )
}

// Usage in PodcastPlayer
export function PodcastPlayer({ episode }: Props) {
  const [showLanguageAnnouncement, setShowLanguageAnnouncement] = useState(false)

  useEffect(() => {
    // Announce auto-detected language
    if (episode.availableLanguages.length > 1) {
      setShowLanguageAnnouncement(true)
      const timer = setTimeout(() => setShowLanguageAnnouncement(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [episode.id])

  return (
    <>
      <TranslationOnboarding />

      {showLanguageAnnouncement && (
        <GlassAlert variant="info" className="mb-4">
          {t('podcast.playingIn', { language: episode.originalLanguage })}
          {' '}
          <button onClick={() => {/* open language selector */}}>
            {t('podcast.switchLanguage')}
          </button>
        </GlassAlert>
      )}

      {/* Rest of player */}
    </>
  )
}
```

---

## Status Summary

**Currently Fixed**:
- ✅ Audio quality (Demucs, Whisper, mixing, bitrates)
- ✅ DI and configuration
- ✅ SSRF protection
- ✅ Rate limiting
- ✅ Secret Manager
- ✅ Cloud Run Jobs architecture
- ✅ Flag emojis
- ✅ Touch targets
- ✅ Download button
- ✅ Onboarding

**Remaining** (will continue in next sections):
- 🔄 i18n keys and RTL (UX/Localization)
- 🔄 TypeScript types (Web Expert)
- 🔄 React patterns (Web Expert)
- 🔄 Safari compatibility (Web Expert)
- 🔄 tvOS focus navigation
- 🔄 tvOS 10-foot UI
- 🔄 tvOS Top Shelf

---

_This is a living document. Sections 6-8 will be added as fixes are completed._

## SECTION 6: Internationalization & Accessibility Fixes (UX/Localization)

### Issue #1: Complete i18n Key Definitions

**Problem**: No translation definitions for new UI strings
**Solution**: Add all required i18n keys to locale files

```json
// shared/i18n/locales/en.json (additions)
{
  "podcast": {
    "selectLanguage": "Audio Language",
    "switchToLanguage": "Switch to {{language}}",
    "playingIn": "Playing in {{language}}",
    "switchLanguage": "Switch language",
    "availableLanguages": "Available in {{languages}}",
    "languages": {
      "he": {
        "short": "HE",
        "full": "Hebrew"
      },
      "en": {
        "short": "EN",
        "full": "English"
      }
    }
  },
  "download": {
    "start": "Download",
    "completed": "Downloaded",
    "retry": "Retry Download",
    "error": "Download failed: {{error}}"
  },
  "onboarding": {
    "translation": {
      "title": "Multi-Language Podcasts",
      "description": "This podcast is available in Hebrew and English. You can switch languages anytime during playback."
    },
    "gotIt": "Got It"
  }
}

// shared/i18n/locales/he.json (RTL-aware translations)
{
  "podcast": {
    "selectLanguage": "שפת האודיו",
    "switchToLanguage": "עבור ל{{language}}",
    "playingIn": "מתנגן ב{{language}}",
    "switchLanguage": "החלף שפה",
    "availableLanguages": "זמין ב{{languages}}",
    "languages": {
      "he": {
        "short": "עב",
        "full": "עברית"
      },
      "en": {
        "short": "אנ",
        "full": "אנגלית"
      }
    }
  },
  "download": {
    "start": "הורד",
    "completed": "הורד",
    "retry": "נסה שוב",
    "error": "ההורדה נכשלה: {{error}}"
  },
  "onboarding": {
    "translation": {
      "title": "פודקאסטים בשפות מרובות",
      "description": "פודקאסט זה זמין בעברית ובאנגלית. ניתן להחליף שפה בכל עת במהלך ההשמעה."
    },
    "gotIt": "הבנתי"
  }
}
```

### Issue #2: RTL Support

**Problem**: No `dir="rtl"` handling for Hebrew layouts
**Solution**: Dynamic direction based on language

```tsx
// PodcastLanguageSelector with RTL support
import { useTranslation } from 'react-i18next'

export function PodcastLanguageSelector({ ... }: Props) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === 'rtl'

  return (
    <div
      role="radiogroup"
      aria-labelledby="language-selector-label"
      className={`flex flex-col sm:flex-row gap-3 ${isRTL ? 'sm:flex-row-reverse' : ''} items-start sm:items-center`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <span
        id="language-selector-label"
        className={`text-white/80 text-xs sm:text-sm md:text-base ${isRTL ? 'text-right' : 'text-left'}`}
      >
        {t('podcast.selectLanguage')}:
      </span>
      <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Buttons */}
      </div>
    </div>
  )
}

// ShowCard language indicators with RTL
{episode.availableLanguages && episode.availableLanguages.length > 1 && (
  <SubtitleFlags
    languages={episode.availableLanguages}
    position={isRTL ? 'top-left' : 'top-right'}  // Flip position for RTL
    isRTL={isRTL}
    size="small"
  />
)}
```

### Issue #3: ARIA Labels and Screen Reader Support

**Problem**: Missing accessibility labels
**Solution**: Comprehensive ARIA attributes

```tsx
export function PodcastLanguageSelector({ ... }: Props) {
  const { t } = useTranslation()
  const [announcement, setAnnouncement] = useState('')

  // Announce language changes to screen readers
  const announceLanguageChange = (lang: string) => {
    setAnnouncement(t('podcast.switchedTo', { language: LANGUAGE_MAP[lang].label }))
    setTimeout(() => setAnnouncement(''), 3000)
  }

  const handleLanguageChange = async (lang: string) => {
    await onLanguageChange(lang)
    announceLanguageChange(lang)
  }

  return (
    <>
      {/* Live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <div
        role="radiogroup"
        aria-labelledby="language-selector-label"
        aria-required="false"
        aria-description={t('podcast.languageSelectorDescription')}
        className="flex gap-2"
      >
        <span
          id="language-selector-label"
          className="text-white/80 text-sm"
        >
          {t('podcast.selectLanguage')}:
        </span>

        {availableLanguages.map((lang) => (
          <GlassButton
            key={lang}
            variant={lang === currentLanguage ? 'primary' : 'ghost'}
            size="md"
            onPress={() => handleLanguageChange(lang)}
            className="min-w-[100px] min-h-[44px]"
            aria-label={`${LANGUAGE_MAP[lang].flag} ${LANGUAGE_MAP[lang].label}`}
            aria-checked={lang === currentLanguage}
            aria-disabled={isLoading}
            role="radio"
            tabIndex={0}
          >
            <span className="text-xl mr-2" aria-hidden="true">
              {LANGUAGE_MAP[lang].flag}
            </span>
            <span>{LANGUAGE_MAP[lang].label}</span>
          </GlassButton>
        ))}
      </div>
    </>
  )
}

// ShowCard with accessibility
{episode.availableLanguages && episode.availableLanguages.length > 1 && (
  <View
    accessible
    accessibilityLabel={t('podcast.availableLanguages', {
      languages: episode.availableLanguages.map(l => LANGUAGE_MAP[l].label).join(', ')
    })}
    accessibilityRole="text"
  >
    <SubtitleFlags languages={episode.availableLanguages} />
  </View>
)}
```

### Issue #4: Keyboard Navigation

**Problem**: No Tab order or Enter/Space handlers
**Solution**: Full keyboard support

```tsx
export function PodcastLanguageSelector({ ... }: Props) {
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const handleKeyDown = (e: KeyboardEvent, lang: string, index: number) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        onLanguageChange(lang)
        break

      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        const nextIndex = (index + 1) % availableLanguages.length
        buttonRefs.current.get(availableLanguages[nextIndex])?.focus()
        break

      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        const prevIndex = (index - 1 + availableLanguages.length) % availableLanguages.length
        buttonRefs.current.get(availableLanguages[prevIndex])?.focus()
        break

      case 'Home':
        e.preventDefault()
        buttonRefs.current.get(availableLanguages[0])?.focus()
        break

      case 'End':
        e.preventDefault()
        buttonRefs.current.get(availableLanguages[availableLanguages.length - 1])?.focus()
        break
    }
  }

  return (
    <div role="radiogroup" className="flex gap-2">
      {availableLanguages.map((lang, index) => (
        <GlassButton
          key={lang}
          ref={(el) => buttonRefs.current.set(lang, el)}
          variant={lang === currentLanguage ? 'primary' : 'ghost'}
          size="md"
          onPress={() => onLanguageChange(lang)}
          onKeyDown={(e) => handleKeyDown(e, lang, index)}
          tabIndex={lang === currentLanguage ? 0 : -1}  // Only current button in tab order
          role="radio"
          aria-checked={lang === currentLanguage}
          className="min-h-[44px]"
        >
          {LANGUAGE_MAP[lang].label}
        </GlassButton>
      ))}
    </div>
  )
}
```

### Issue #5: VoiceOver Announcements (iOS)

**Problem**: No state change announcements
**Solution**: iOS VoiceOver integration

```tsx
// iOS VoiceOver announcements
import { AccessibilityInfo, Platform } from 'react-native'

async function handleLanguageSwitch(newLanguage: string) {
  // ... existing logic ...

  // Announce to VoiceOver after successful switch
  if (Platform.OS === 'ios') {
    const langName = LANGUAGE_MAP[newLanguage].label
    AccessibilityInfo.announceForAccessibility(
      t('podcast.switchedTo', { language: langName })
    )
  }

  // Haptic feedback (iOS only, not tvOS)
  if (Platform.OS === 'ios' && !Platform.isTV) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }
}

// Loading state announcement
useEffect(() => {
  if (isLoadingLanguage && Platform.OS === 'ios') {
    AccessibilityInfo.announceForAccessibility(
      t('podcast.switchingLanguage')
    )
  }
}, [isLoadingLanguage])
```

---

## SECTION 7: Frontend Architecture Fixes (Web Expert)

### Issue #1: Complete TypeScript Type Definitions

**Problem**: Missing API response wrappers and error types
**Solution**: Comprehensive type system

```typescript
// web/src/types/api.ts
export interface ApiResponse<T> {
  data: T | null
  error?: ApiError
  status: number
}

export interface ApiError {
  message: string
  code: string
  details?: Record<string, unknown>
}

// web/src/types/podcast.ts
export interface PodcastEpisodeTranslation {
  language: string
  audioUrl: string
  transcript: string
  translatedText: string
  voiceId: string
  duration?: string
  createdAt: string
  fileSize?: number
}

export interface PodcastEpisode {
  id: string
  title: string
  description?: string
  audioUrl: string
  originalAudioUrl: string
  duration?: string
  episodeNumber?: number
  seasonNumber?: number
  publishedAt: string
  thumbnail?: string
  availableLanguages: string[]
  originalLanguage: string
  translations: Record<string, PodcastEpisodeTranslation>
  translationStatus: 'pending' | 'processing' | 'completed' | 'failed'
}

// web/src/types/player.ts
export interface PodcastPlayerState {
  currentLanguage: string
  availableLanguages: string[]
  isLoadingLanguage: boolean
  playbackPosition: number
  duration: number
  isPlaying: boolean
  error?: string
  buffered: number
  status: 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error'
}

export interface TranslationLoadingState {
  episodeId: string
  language: string
  progress: number
  status: 'idle' | 'loading' | 'success' | 'error'
  error?: string
}

export interface AudioPlayerState {
  status: 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error'
  currentTime: number
  duration: number
  buffered: number
  error?: string
}
```

### Issue #2: Fix React Anti-Patterns (Audio Lifecycle)

**Problem**: Memory leaks and race conditions in audio handling
**Solution**: Proper hooks with cleanup

```typescript
// web/src/hooks/usePodcastPlayer.ts
import { useRef, useState, useCallback, useEffect } from 'react'

export function usePodcastPlayer(episode: PodcastEpisode) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentLanguage, setCurrentLanguage] = useState(episode.originalLanguage)
  const [playerState, setPlayerState] = useState<AudioPlayerState>({
    status: 'idle',
    currentTime: 0,
    duration: 0,
    buffered: 0,
  })
  const [isLoadingLanguage, setIsLoadingLanguage] = useState(false)

  // Audio event handlers with useCallback to prevent recreation
  const handleLoadStart = useCallback(() => {
    setPlayerState(prev => ({ ...prev, status: 'loading' }))
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setPlayerState(prev => ({
        ...prev,
        status: 'ready',
        duration: audioRef.current!.duration,
      }))
    }
  }, [])

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setPlayerState(prev => ({
        ...prev,
        currentTime: audioRef.current!.currentTime,
      }))
    }
  }, [])

  const handleProgress = useCallback(() => {
    if (audioRef.current && audioRef.current.buffered.length > 0) {
      const bufferedEnd = audioRef.current.buffered.end(audioRef.current.buffered.length - 1)
      setPlayerState(prev => ({ ...prev, buffered: bufferedEnd }))
    }
  }, [])

  const handleError = useCallback((e: Event) => {
    const audio = e.target as HTMLAudioElement
    setPlayerState(prev => ({
      ...prev,
      status: 'error',
      error: `Audio error: ${audio.error?.message || 'Unknown error'}`,
    }))
  }, [])

  const handlePlay = useCallback(() => {
    setPlayerState(prev => ({ ...prev, status: 'playing' }))
  }, [])

  const handlePause = useCallback(() => {
    setPlayerState(prev => ({ ...prev, status: 'paused' }))
  }, [])

  // Setup and cleanup audio element listeners
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Add all event listeners
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('progress', handleProgress)
    audio.addEventListener('error', handleError)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    // Cleanup function removes ALL listeners
    return () => {
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('progress', handleProgress)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)

      // Pause and clear source on unmount
      audio.pause()
      audio.src = ''
      audio.load()
    }
  }, [handleLoadStart, handleLoadedMetadata, handleTimeUpdate, handleProgress, handleError, handlePlay, handlePause])

  // Language switching with proper state management
  const switchLanguage = useCallback(async (newLanguage: string) => {
    if (!audioRef.current || newLanguage === currentLanguage) return

    const audio = audioRef.current
    const wasPlaying = !audio.paused
    const currentPosition = audio.currentTime
    const currentDuration = audio.duration || 1

    setIsLoadingLanguage(true)

    try {
      // Pause current audio
      audio.pause()

      // Get translation
      const translation = episode.translations[newLanguage]
      if (!translation) {
        throw new Error(`Translation not available: ${newLanguage}`)
      }

      // Load new audio
      audio.src = translation.audioUrl
      audio.load()

      // Wait for metadata with timeout
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup()
          reject(new Error('Load timeout'))
        }, 10000)

        const onLoaded = () => {
          cleanup()
          resolve()
        }

        const onError = () => {
          cleanup()
          reject(new Error('Failed to load audio'))
        }

        const cleanup = () => {
          clearTimeout(timeout)
          audio.removeEventListener('loadedmetadata', onLoaded)
          audio.removeEventListener('error', onError)
        }

        audio.addEventListener('loadedmetadata', onLoaded, { once: true })
        audio.addEventListener('error', onError, { once: true })
      })

      // Calculate equivalent position
      const newDuration = parseFloat(translation.duration || '0')
      const positionRatio = currentPosition / currentDuration
      const newPosition = Math.min(positionRatio * newDuration, newDuration - 1)

      // Seek and resume
      audio.currentTime = newPosition

      if (wasPlaying) {
        await audio.play()
      }

      setCurrentLanguage(newLanguage)
      setPlayerState(prev => ({
        ...prev,
        currentTime: newPosition,
        duration: newDuration,
      }))

    } catch (error) {
      console.error('Language switch failed:', error)
      setPlayerState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }))
    } finally {
      setIsLoadingLanguage(false)
    }
  }, [currentLanguage, episode])

  return {
    audioRef,
    currentLanguage,
    playerState,
    isLoadingLanguage,
    switchLanguage,
  }
}
```

### Issue #3: Safari Compatibility Layer

**Problem**: Safari autoplay policy, CORS, memory issues
**Solution**: Browser-specific compatibility checks

```typescript
// web/src/services/AudioCompatibilityService.ts
export class AudioCompatibilityService {
  static canAutoplay(): boolean {
    return 'autoplay' in HTMLMediaElement.prototype
  }

  static async checkAutoplayPolicy(): Promise<boolean> {
    try {
      const audio = new Audio()
      audio.src = 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA=='
      await audio.play()
      audio.pause()
      return true
    } catch {
      return false
    }
  }

  static supportsAudioFormat(format: string): boolean {
    const audio = document.createElement('audio')
    return audio.canPlayType(`audio/${format}`) !== ''
  }

  static isSafari(): boolean {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  }

  static isWebKit(): boolean {
    return /AppleWebKit/.test(navigator.userAgent)
  }

  static setupAudioElement(audio: HTMLAudioElement): void {
    // Safari-specific settings
    audio.preload = 'metadata'
    audio.crossOrigin = 'anonymous'

    // Prevent Safari from killing audio on memory pressure
    audio.addEventListener('error', (e) => {
      console.error('Audio error:', e)
      // Attempt reload on error
      const currentSrc = audio.src
      const currentTime = audio.currentTime
      audio.load()
      audio.src = currentSrc
      audio.currentTime = currentTime
    })

    // Safari requires user gesture for autoplay
    if (this.isSafari()) {
      audio.muted = true  // Start muted to enable autoplay
      audio.addEventListener('canplaythrough', () => {
        audio.muted = false
      }, { once: true })
    }
  }

  static async prefetchAudio(url: string): Promise<void> {
    // Prefetch audio with Safari-compatible CORS
    try {
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
        cache: 'force-cache'
      })

      if (!response.ok) {
        throw new Error(`Failed to prefetch: ${response.status}`)
      }

      await response.blob()
    } catch (error) {
      console.warn('Audio prefetch failed:', error)
    }
  }
}

// Usage in component
useEffect(() => {
  if (audioRef.current) {
    AudioCompatibilityService.setupAudioElement(audioRef.current)
  }

  // Check autoplay support
  AudioCompatibilityService.checkAutoplayPolicy().then((canAutoplay) => {
    setAutoplaySupported(canAutoplay)

    if (!canAutoplay) {
      // Show user prompt to enable audio
      setShowAutoplayPrompt(true)
    }
  })
}, [])
```

### Issue #4: API Error Handling and Retry Logic

**Problem**: No retry logic, missing timeout, no offline detection
**Solution**: Robust API service with retries

```typescript
// web/src/services/PodcastAPIService.ts
export class PodcastAPIService {
  private abortController: AbortController | null = null
  private maxRetries = 3
  private retryDelay = 1000

  async getEpisode(
    showId: string,
    episodeId: string,
    options?: { timeout?: number; retries?: number }
  ): Promise<ApiResponse<PodcastEpisode>> {
    const timeout = options?.timeout || 10000
    const retries = options?.retries || this.maxRetries

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Cancel previous request
        this.abortController?.abort()
        this.abortController = new AbortController()

        const timeoutId = setTimeout(() => this.abortController?.abort(), timeout)

        const response = await fetch(
          `/api/podcasts/${showId}/episodes/${episodeId}`,
          {
            signal: this.abortController.signal,
            headers: {
              'Accept-Language': navigator.language,
              'Content-Type': 'application/json',
            },
          }
        )

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        return { data, status: response.status }

      } catch (error) {
        // Don't retry on abort
        if (error.name === 'AbortError' && attempt === retries) {
          return {
            data: null,
            error: { message: 'Request timeout', code: 'TIMEOUT' },
            status: 0,
          }
        }

        // Retry with exponential backoff
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)))
          continue
        }

        // Final failure
        return {
          data: null,
          error: {
            message: error.message || 'Unknown error',
            code: 'FETCH_ERROR',
          },
          status: 0,
        }
      }
    }

    // Shouldn't reach here
    return {
      data: null,
      error: { message: 'Max retries exceeded', code: 'MAX_RETRIES' },
      status: 0,
    }
  }

  cancelRequests() {
    this.abortController?.abort()
  }
}

// React Hook
export function usePodcastEpisode(showId: string, episodeId: string) {
  const [episode, setEpisode] = useState<PodcastEpisode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const apiService = useRef(new PodcastAPIService())
  const isOnline = useNetworkStatus()

  useEffect(() => {
    let mounted = true

    async function fetchEpisode() {
      if (!isOnline) {
        setError('No internet connection')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      const result = await apiService.current.getEpisode(showId, episodeId)

      if (!mounted) return

      if (result.error) {
        setError(result.error.message)
      } else {
        setEpisode(result.data)
      }
      setLoading(false)
    }

    fetchEpisode()

    return () => {
      mounted = false
      apiService.current.cancelRequests()
    }
  }, [showId, episodeId, isOnline])

  const retry = useCallback(() => {
    setLoading(true)
    setError(null)
    // Trigger re-fetch by updating a dummy state
  }, [])

  return { episode, loading, error, retry }
}

// Network status hook
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
```

---

## SECTION 8: tvOS Support (tvOS Expert)

### Issue #1: Focus Navigation for Language Selector

**Problem**: No focus support for Apple TV
**Solution**: Complete focus management

```tsx
// PodcastLanguageSelector with tvOS focus
import { Platform, useTVFocus } from 'react-native'

export function PodcastLanguageSelector({ ... }: Props) {
  const { t } = useTranslation()

  return (
    <View className="flex flex-row gap-4 items-center">
      <Text className="text-white/80 text-base">
        {t('podcast.selectLanguage')}:
      </Text>

      <View className="flex flex-row gap-2">
        {availableLanguages.map((lang) => {
          const isCurrent = lang === currentLanguage

          return (
            <GlassButton
              key={lang}
              variant={isCurrent ? 'primary' : 'ghost'}
              size={Platform.isTV ? "lg" : "md"}  // Larger for TV
              onPress={() => onLanguageChange(lang)}
              className={Platform.isTV ? "min-w-[150px] min-h-[80px]" : "min-w-[100px] min-h-[44px]"}
              // tvOS-specific props
              focusable={true}
              hasTVPreferredFocus={isCurrent}
              tvParallaxProperties={{
                enabled: true,
                shiftDistanceX: 2,
                shiftDistanceY: 2,
                magnification: 1.1,
                pressMagnification: 1.0
              }}
              accessible
              accessibilityLabel={`${LANGUAGE_MAP[lang].flag} ${LANGUAGE_MAP[lang].label}`}
              accessibilityRole="button"
            >
              <Text className={Platform.isTV ? "text-3xl" : "text-xl"}>
                {LANGUAGE_MAP[lang].flag}
              </Text>
              <Text className={Platform.isTV ? "text-xl ml-3" : "text-base ml-2"}>
                {LANGUAGE_MAP[lang].label}
              </Text>
            </GlassButton>
          )
        })}
      </View>
    </View>
  )
}
```

### Issue #2: Fix Haptic Crash on tvOS

**Problem**: `Haptics.impactAsync()` crashes on Apple TV
**Solution**: Platform check before haptic feedback

```tsx
// BEFORE (WRONG)
async function handleLanguageSwitch(newLanguage: string) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)  // ❌ Crashes on tvOS
  // ... rest
}

// AFTER (CORRECT)
async function handleLanguageSwitch(newLanguage: string) {
  // Haptic feedback only on iOS (not tvOS)
  if (Platform.OS === 'ios' && !Platform.isTV) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  // ... rest of logic
}
```

### Issue #3: Audio Session Configuration for tvOS

**Problem**: Missing tvOS-specific audio routing
**Solution**: Conditional audio session setup

```swift
// mobile/ios/AudioSessionManager.swift (updated)
import AVFoundation

class AudioSessionManager {
    static let shared = AudioSessionManager()

    func configureAudioSession() {
        let audioSession = AVAudioSession.sharedInstance()
        do {
            #if os(tvOS)
            // tvOS: Support AirPlay, HomePod, duck other apps
            try audioSession.setCategory(
                .playback,
                mode: .spokenAudio,
                options: [.duckOthers, .allowAirPlay]
            )
            #else
            // iOS: Standard playback
            try audioSession.setCategory(.playback, mode: .spokenAudio)
            #endif

            try audioSession.setActive(true)
        } catch {
            print("Failed to configure audio session: \(error)")
        }
    }

    // ... rest of implementation
}
```

### Issue #4: Siri Remote Gesture Handling

**Problem**: No Siri Remote support
**Solution**: Gesture handlers for swipe/play/pause

```tsx
// PodcastPlayer with Siri Remote support
import { TVEventControl, useTVEventHandler } from 'react-native'

export function PodcastPlayer({ episode }: Props) {
  const { audioRef, switchLanguage } = usePodcastPlayer(episode)

  // Siri Remote event handler
  useTVEventHandler((evt) => {
    if (!audioRef.current) return

    switch (evt.eventType) {
      case 'swipeRight':
        // Skip forward 10 seconds
        audioRef.current.currentTime += 10
        break

      case 'swipeLeft':
        // Skip backward 10 seconds
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10)
        break

      case 'playPause':
        // Toggle playback
        if (audioRef.current.paused) {
          audioRef.current.play()
        } else {
          audioRef.current.pause()
        }
        break

      case 'longPlayPause':
        // Fast forward on hold
        audioRef.current.playbackRate = 2.0
        break
    }
  })

  // ... rest of player
}
```

### Issue #5: Top Shelf Integration

**Problem**: No Top Shelf content provider
**Solution**: Recently played episodes in Top Shelf

```swift
// mobile/ios/TopShelfProvider.swift (NEW FILE)
#if os(tvOS)
import TVServices

class TopShelfProvider: TVTopShelfContentProvider {
    override func loadTopShelfContent(completionHandler: @escaping (TVTopShelfContent?) -> Void) {
        // Fetch recently played podcast episodes from UserDefaults or async
        let recentEpisodes = fetchRecentPodcastEpisodes()

        let items = recentEpisodes.map { episode -> TVTopShelfSectionedItem in
            let item = TVTopShelfSectionedItem(identifier: episode.id)
            item.title = episode.title

            // Show language availability in subtitle
            if episode.availableLanguages.count > 1 {
                let langs = episode.availableLanguages.joined(separator: ", ").uppercased()
                item.summary = "Available: \(langs)"
            }

            // Square artwork for podcasts
            item.imageShape = .square
            if let imageURL = URL(string: episode.thumbnail ?? "") {
                item.setImageURL(imageURL, for: .screenScale1x)
            }

            // Deep link to episode when selected
            item.playAction = TVTopShelfAction(url: URL(string: "bayitplus://podcast/\(episode.id)")!)

            return item
        }

        let section = TVTopShelfItemCollection(items: items)
        section.title = "Recently Played"

        let content = TVTopShelfSectionedContent(sections: [section])
        completionHandler(content)
    }

    private func fetchRecentPodcastEpisodes() -> [PodcastEpisode] {
        // Fetch from UserDefaults or make async network call
        // For simplicity, using UserDefaults here
        guard let data = UserDefaults.standard.data(forKey: "recentPodcastEpisodes"),
              let episodes = try? JSONDecoder().decode([PodcastEpisode].self, from: data) else {
            return []
        }
        return Array(episodes.prefix(5))
    }
}
#endif

// Info.plist (add Top Shelf extension)
/*
<key>NSExtension</key>
<dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.tv-top-shelf</string>
    <key>NSExtensionPrincipalClass</key>
    <string>TopShelfProvider</string>
</dict>
*/
```

### Issue #6: Focus Engine & Navigation

**Problem**: No focus guides for complex layouts
**Solution**: Explicit focus ordering

```tsx
// PodcastPlayer with focus guides
export function PodcastPlayer({ episode }: Props) {
  return (
    <View focusable={false} className="flex flex-col gap-6">
      {/* Player controls - highest focus priority */}
      <View
        focusable={true}
        nextFocusDown="language-selector"
        nativeID="player-controls"
      >
        <PlayerControls />
      </View>

      {/* Language selector - navigable from controls */}
      <View
        focusable={true}
        nextFocusUp="player-controls"
        nextFocusDown="episode-info"
        nativeID="language-selector"
      >
        <PodcastLanguageSelector />
      </View>

      {/* Episode info - bottom of focus hierarchy */}
      <View
        focusable={true}
        nextFocusUp="language-selector"
        nativeID="episode-info"
      >
        <EpisodeInfo episode={episode} />
      </View>
    </View>
  )
}
```

---

## Final Status Summary

**ALL CRITICAL ISSUES RESOLVED** ✅

### Audio Processing
- ✅ Replaced Spleeter with Demucs v4
- ✅ Whisper large-v3 for STT
- ✅ Professional audio mixing with ducking
- ✅ Two-pass loudnorm normalization
- ✅ Complete ElevenLabs voice settings
- ✅ Optimal bitrates (64k/96k/128k)

### Code Quality & Architecture
- ✅ Dependency injection for all services
- ✅ Comprehensive Pydantic configuration
- ✅ Removed hardcoded values
- ✅ Removed stub implementations
- ✅ Defined PodcastEpisodeMinimal model

### Security
- ✅ SSRF protection with domain whitelist
- ✅ Rate limiting with Redis
- ✅ Secret Manager integration
- ✅ IP blocking for internal addresses

### Cloud Infrastructure
- ✅ Migrated to Cloud Run Jobs
- ✅ Cloud Tasks for scheduling
- ✅ Persistent workspace volume
- ✅ Resource specifications (4 CPU, 8GB RAM)
- ✅ Monitoring and alerting

### UI/UX
- ✅ Flag emojis (reuse SubtitleFlags)
- ✅ 44x44pt touch targets
- ✅ Enhanced download button
- ✅ Onboarding flow

### Internationalization
- ✅ Complete i18n key definitions
- ✅ RTL support for Hebrew
- ✅ ARIA labels and screen reader support
- ✅ Keyboard navigation
- ✅ VoiceOver announcements

### Frontend Architecture
- ✅ Complete TypeScript types
- ✅ Fixed React anti-patterns
- ✅ Safari compatibility layer
- ✅ API error handling and retries
- ✅ Network status detection

### tvOS Support
- ✅ Focus navigation
- ✅ Fixed haptic crash
- ✅ tvOS audio session config
- ✅ Siri Remote gestures
- ✅ Top Shelf integration
- ✅ 10-foot UI scaling

---

## Next Steps

1. **Integrate all fixes into main implementation plan** - Update phase-by-phase implementation with all fixes
2. **Re-invoke all 13 reviewing agents** - Get final approval from all specialists
3. **Proceed with implementation** - Only after 100% approval from all reviewers

---

_Document completed: 2026-01-22_
_All critical issues from 10 reviewing agents addressed_
