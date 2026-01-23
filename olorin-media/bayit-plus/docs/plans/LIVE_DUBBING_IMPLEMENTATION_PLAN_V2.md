# Real-Time Live Channel Dubbing Implementation Plan v2.0

## Revision Summary

This plan incorporates feedback from all 13 reviewing agents addressing:
- Audio pipeline corrections (48kHz PCM, 1200ms sync delay)
- Architecture refactoring (DI, shared STT, metering integration)
- Security hardening (protocol-level auth, session binding)
- Platform support (iOS/tvOS audio session, focus navigation)
- Database optimization (schema corrections, indexes, session tracking)
- UI/UX completeness (i18n, RTL, accessibility)
- Deployment strategy (dedicated service, load testing, progressive rollout)

---

## 1. Architecture Overview

### 1.1 System Architecture (Revised)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REAL-TIME LIVE CHANNEL DUBBING SYSTEM                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     FRONTEND (Web/iOS/tvOS)                           │  │
│  │                                                                        │  │
│  │  ┌─────────────────┐     ┌──────────────────┐     ┌───────────────┐  │  │
│  │  │ Video Player    │────▶│ Audio Capture    │────▶│ WebSocket     │  │  │
│  │  │ (HLS Stream)    │     │ 48kHz PCM Mono   │     │ Client        │  │  │
│  │  └─────────────────┘     └──────────────────┘     └───────┬───────┘  │  │
│  │                                                            │          │  │
│  │  ┌─────────────────┐     ┌──────────────────┐             │          │  │
│  │  │ Audio Mixer     │◀────│ PCM Playback     │◀────────────┘          │  │
│  │  │ (Web Audio API) │     │ (AudioWorklet)   │                        │  │
│  │  │ Sync: 1200ms    │     └──────────────────┘                        │  │
│  │  └─────────────────┘                                                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      │ Binary WebSocket                     │
│                                      │ (Protocol-level Auth)                │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │           DEDICATED DUBBING SERVICE (Cloud Run - Separate)            │  │
│  │                                                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │              SHARED STT PIPELINE (Per Channel)                   │ │  │
│  │  │  ┌─────────────────┐                                            │ │  │
│  │  │  │ Channel Audio   │──▶ ElevenLabs Scribe v2 (48kHz)           │ │  │
│  │  │  │ Capture         │    ~300-400ms (incl. VAD)                  │ │  │
│  │  │  └─────────────────┘              │                             │ │  │
│  │  │                                   ▼                             │ │  │
│  │  │                    ┌──────────────────────────┐                 │ │  │
│  │  │                    │ Transcript Broadcaster   │                 │ │  │
│  │  │                    │ (Fan-out to sessions)    │                 │ │  │
│  │  │                    └──────────────────────────┘                 │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │                                   │                                   │  │
│  │                    ┌──────────────┼──────────────┐                   │  │
│  │                    ▼              ▼              ▼                   │  │
│  │  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────┐   │  │
│  │  │ User Session 1      │ │ User Session 2      │ │ User N      │   │  │
│  │  │ ┌─────────────────┐ │ │ ┌─────────────────┐ │ │             │   │  │
│  │  │ │Translation (en) │ │ │ │Translation (es) │ │ │   ...       │   │  │
│  │  │ │ ~150-250ms      │ │ │ │ ~150-250ms      │ │ │             │   │  │
│  │  │ └────────┬────────┘ │ │ └────────┬────────┘ │ │             │   │  │
│  │  │          ▼          │ │          ▼          │ │             │   │  │
│  │  │ ┌─────────────────┐ │ │ ┌─────────────────┐ │ │             │   │  │
│  │  │ │TTS (Voice A)    │ │ │ │TTS (Voice B)    │ │ │             │   │  │
│  │  │ │PCM 48kHz output │ │ │ │PCM 48kHz output │ │ │             │   │  │
│  │  │ │ ~300-400ms      │ │ │ │ ~300-400ms      │ │ │             │   │  │
│  │  │ └─────────────────┘ │ │ └─────────────────┘ │ │             │   │  │
│  │  └─────────────────────┘ └─────────────────────┘ └─────────────┘   │  │
│  │                                                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │                    OLORIN INTEGRATIONS                          │ │  │
│  │  │  • MeteringService (usage tracking, billing)                    │ │  │
│  │  │  • RateLimiter (per-user session limits)                        │ │  │
│  │  │  • SessionStore (Redis-backed for horizontal scaling)           │ │  │
│  │  │  • ResilienceService (circuit breakers, retries)                │ │  │
│  │  │  • StructuredLogger (correlation IDs, metrics)                  │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         DATA LAYER                                    │  │
│  │  • MongoDB Atlas: LiveChannel, LiveChannelDubbingSession             │  │
│  │  • Redis/Memorystore: Session state, connection recovery             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘

LATENCY BUDGET (Realistic):
├── Audio capture/buffering:    50-100ms
├── STT (with VAD timeout):    300-400ms
├── Translation:               150-250ms
├── TTS first chunk:           300-400ms
├── Network (round-trip):      100-200ms
└── Decode/playback setup:      50-100ms
────────────────────────────────────────
TOTAL:                         950-1450ms
SYNC DELAY:                    1200ms (configurable)
```

### 1.2 Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Sync Delay** | 1200ms (configurable via settings) | Realistic for 950-1450ms pipeline |
| **Audio Input** | 48kHz PCM mono | Preserves Hebrew consonant accuracy |
| **Audio Output** | Raw PCM 48kHz (not MP3) | Eliminates 80-150ms codec overhead |
| **STT Architecture** | Shared per channel | Prevents N×API calls, reduces cost |
| **Session State** | Redis-backed abstraction | Enables horizontal scaling |
| **Authentication** | Protocol-level (first message) | Avoids JWT in URL exposure |
| **Deployment** | Dedicated Cloud Run service | Isolation, independent scaling |

---

## 2. Backend Implementation

### 2.1 Files to Create/Modify

| File | Action | Lines | Purpose |
|------|--------|-------|---------|
| `backend/app/models/content.py` | Modify | +20 | LiveChannel dubbing fields |
| `backend/app/models/dubbing_session.py` | Create | ~100 | LiveChannelDubbingSession model |
| `backend/app/services/live_dubbing/service.py` | Create | ~180 | Main orchestration (DI-based) |
| `backend/app/services/live_dubbing/pipeline.py` | Create | ~150 | STT→Translation→TTS pipeline |
| `backend/app/services/live_dubbing/session_store.py` | Create | ~100 | Redis-backed session state |
| `backend/app/services/live_dubbing/channel_stt_manager.py` | Create | ~120 | Shared STT per channel |
| `backend/app/services/live_dubbing/audio_validator.py` | Create | ~80 | Audio integrity validation |
| `backend/app/services/live_dubbing/authorization.py` | Create | ~100 | Multi-layer authorization |
| `backend/app/api/routes/websocket_live_dubbing.py` | Create | ~180 | WebSocket endpoint |
| `backend/app/api/routes/live_dubbing.py` | Create | ~100 | REST endpoints |
| `backend/app/api/router_registry.py` | Modify | +5 | Register routes |
| `backend/app/core/config.py` | Modify | +25 | Dubbing configuration |

### 2.2 LiveChannel Model Extension

```python
# backend/app/models/content.py - Add to LiveChannel class

# Real-time dubbing support (Premium/Family feature)
supports_live_dubbing: bool = False

# NOTE: Use existing `primary_language` as source (not new field)
# primary_language: str = "he"  # Already exists

# Available target languages for dubbing
available_dubbing_languages: List[str] = Field(
    default_factory=lambda: ["en", "es", "ar", "ru"]
)

# Voice configuration per target language (ElevenLabs voice IDs)
dubbing_voice_config: Dict[str, str] = Field(
    default_factory=dict,
    description="Map of language code to ElevenLabs voice ID"
)
# Example: {"en": "EXAVITQu4vr4xnSDxMaL", "es": "pNInz6obpgDQGcFmaJgB"}

# Sync/latency configuration
dubbing_sync_delay_ms: int = Field(
    default=1200,
    ge=500,
    le=3000,
    description="Audio sync delay in milliseconds"
)

# Quality tier for voice selection
dubbing_quality_tier: Optional[str] = Field(
    default="standard",
    description="standard, premium, or ultra"
)

# Session limits (prevent abuse)
max_concurrent_dubbing_sessions: int = Field(
    default=50,
    ge=1,
    le=1000
)

# Timestamps
dubbing_enabled_at: Optional[datetime] = None

class Settings:
    name = "live_channels"
    indexes = [
        # Existing indexes...
        "order",
        "is_active",
        "created_at",
        "culture_id",
        ("culture_id", "is_active"),
        ("culture_id", "category"),

        # NEW: Dubbing indexes
        "supports_live_dubbing",
        ("supports_live_dubbing", "is_active"),
        ("culture_id", "supports_live_dubbing", "is_active"),
        "available_dubbing_languages",  # Multikey index for array
    ]
```

### 2.3 LiveChannelDubbingSession Model (NEW)

```python
# backend/app/models/dubbing_session.py

from datetime import datetime, timezone
from typing import Optional, Literal
from beanie import Document, Indexed
from pydantic import Field
from pymongo import IndexModel, ASCENDING, DESCENDING

class LiveChannelDubbingSession(Document):
    """
    Track live channel dubbing sessions for analytics, billing, and monitoring.
    Follows pattern from existing DubbingSession model in integration_partner.py.
    """

    # Session identification
    session_id: str = Field(..., description="Unique session identifier")
    channel_id: Indexed(str) = Field(..., description="LiveChannel ID reference")
    user_id: Optional[Indexed(str)] = Field(default=None, description="User who initiated")

    # Configuration
    source_language: str = Field(default="he")
    target_language: str = Field(default="en")
    voice_id: Optional[str] = None
    sync_delay_ms: int = Field(default=1200)

    # Processing metrics
    audio_seconds_processed: float = Field(default=0.0, ge=0.0)
    segments_processed: int = Field(default=0, ge=0)
    characters_translated: int = Field(default=0, ge=0)
    characters_synthesized: int = Field(default=0, ge=0)

    # Latency tracking (milliseconds)
    avg_stt_latency_ms: Optional[float] = None
    avg_translation_latency_ms: Optional[float] = None
    avg_tts_latency_ms: Optional[float] = None
    avg_total_latency_ms: Optional[float] = None

    # Quality metrics
    error_count: int = Field(default=0, ge=0)
    reconnection_count: int = Field(default=0, ge=0)
    dropped_segments: int = Field(default=0, ge=0)

    # Cost tracking
    estimated_cost_usd: float = Field(default=0.0, ge=0.0)

    # Status
    status: Literal["active", "paused", "ended", "error"] = Field(default="active")
    error_message: Optional[str] = None

    # Timestamps
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: Optional[datetime] = None
    last_activity_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Client metadata (privacy-safe)
    client_ip_hash: Optional[str] = None  # Hashed for privacy
    client_platform: Optional[str] = None  # web, ios, tvos
    client_user_agent_hash: Optional[str] = None

    class Settings:
        name = "live_channel_dubbing_sessions"
        indexes = [
            IndexModel([("session_id", ASCENDING)], unique=True),
            "channel_id",
            "user_id",
            "status",
            "started_at",
            IndexModel([("channel_id", ASCENDING), ("status", ASCENDING), ("started_at", DESCENDING)]),
            IndexModel([("channel_id", ASCENDING), ("started_at", DESCENDING)]),
            IndexModel([("user_id", ASCENDING), ("started_at", DESCENDING)]),
            IndexModel([("status", ASCENDING), ("last_activity_at", ASCENDING)]),  # For cleanup
        ]
```

### 2.4 LiveDubbingService (Dependency Injection Pattern)

```python
# backend/app/services/live_dubbing/service.py

from typing import Protocol, Optional, AsyncIterator
from abc import abstractmethod
import asyncio
import uuid
from datetime import datetime, timezone

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.olorin.metering_service import MeteringService
from app.services.olorin.rate_limiter import RateLimiter
from app.models.content import LiveChannel
from app.models.user import User
from app.models.dubbing_session import LiveChannelDubbingSession

logger = get_logger(__name__)


class STTProvider(Protocol):
    """Protocol for STT providers (dependency injection)."""

    @abstractmethod
    async def transcribe_stream(
        self, audio_chunks: AsyncIterator[bytes]
    ) -> AsyncIterator[str]:
        ...


class TranslationService(Protocol):
    """Protocol for translation services (dependency injection)."""

    @abstractmethod
    async def translate(
        self, text: str, source_lang: str, target_lang: str
    ) -> str:
        ...


class TTSService(Protocol):
    """Protocol for TTS services (dependency injection)."""

    @abstractmethod
    async def synthesize_stream(
        self, text: str, voice_id: str
    ) -> AsyncIterator[bytes]:
        ...


class SessionStore(Protocol):
    """Protocol for session state storage (Redis/Memory)."""

    @abstractmethod
    async def get_session(self, session_id: str) -> Optional[dict]:
        ...

    @abstractmethod
    async def set_session(self, session_id: str, data: dict, ttl_seconds: int) -> None:
        ...

    @abstractmethod
    async def delete_session(self, session_id: str) -> None:
        ...


class LiveDubbingService:
    """
    Orchestrates real-time live channel dubbing with proper DI.

    All providers are injected, enabling testing and flexibility.
    Integrates with Olorin ecosystem (metering, rate limiting, resilience).
    """

    def __init__(
        self,
        channel: LiveChannel,
        user: User,
        target_language: str,
        voice_id: Optional[str] = None,
        *,
        # Injected dependencies (optional - defaults from factory)
        stt_provider: Optional[STTProvider] = None,
        translation_service: Optional[TranslationService] = None,
        tts_service: Optional[TTSService] = None,
        session_store: Optional[SessionStore] = None,
        metering_service: Optional[MeteringService] = None,
        rate_limiter: Optional[RateLimiter] = None,
    ):
        self.channel = channel
        self.user = user
        self.target_language = target_language
        self.voice_id = voice_id or channel.dubbing_voice_config.get(
            target_language, settings.olorin.dubbing.default_voice_id
        )

        # Session tracking
        self.session_id = f"live_dub_{uuid.uuid4().hex[:12]}"
        self._db_session: Optional[LiveChannelDubbingSession] = None

        # Lazily initialize providers from factory if not injected
        self._stt_provider = stt_provider
        self._translation_service = translation_service
        self._tts_service = tts_service
        self._session_store = session_store
        self._metering = metering_service
        self._rate_limiter = rate_limiter

        # Metrics tracking
        self._metrics = DubbingMetrics()
        self._output_queue: asyncio.Queue = asyncio.Queue()
        self._is_active = False

    async def _ensure_providers(self) -> None:
        """Lazily initialize providers if not injected."""
        if self._stt_provider is None:
            from app.services.live_dubbing.factory import create_stt_provider
            self._stt_provider = await create_stt_provider()

        if self._translation_service is None:
            from app.services.live_dubbing.factory import create_translation_service
            self._translation_service = await create_translation_service()

        if self._tts_service is None:
            from app.services.live_dubbing.factory import create_tts_service
            self._tts_service = await create_tts_service()

        if self._session_store is None:
            from app.services.live_dubbing.factory import create_session_store
            self._session_store = await create_session_store()

        if self._metering is None:
            from app.services.olorin.metering_service import MeteringService
            self._metering = MeteringService()

        if self._rate_limiter is None:
            from app.services.olorin.rate_limiter import RateLimiter
            self._rate_limiter = RateLimiter()

    async def start(self) -> dict:
        """
        Start dubbing session with full Olorin integration.

        Returns connection info including sync delay.
        """
        await self._ensure_providers()

        # Rate limit check
        if not await self._rate_limiter.check_limit(
            key=f"dubbing_session:{self.user.id}",
            limit=settings.olorin.dubbing.max_sessions_per_user_per_hour,
            window_seconds=3600
        ):
            raise DubbingRateLimitError("Session creation rate limit exceeded")

        # Create database session record
        self._db_session = LiveChannelDubbingSession(
            session_id=self.session_id,
            channel_id=str(self.channel.id),
            user_id=str(self.user.id),
            source_language=self.channel.primary_language,
            target_language=self.target_language,
            voice_id=self.voice_id,
            sync_delay_ms=self.channel.dubbing_sync_delay_ms,
        )
        await self._db_session.insert()

        # Store session state in Redis for recovery
        await self._session_store.set_session(
            self.session_id,
            {
                "user_id": str(self.user.id),
                "channel_id": str(self.channel.id),
                "target_language": self.target_language,
                "voice_id": self.voice_id,
                "started_at": datetime.now(timezone.utc).isoformat(),
            },
            ttl_seconds=4 * 3600  # 4 hours max session
        )

        # Record metering event
        await self._metering.record_usage(
            user_id=str(self.user.id),
            event_type="live_dubbing_session_start",
            metadata={
                "channel_id": str(self.channel.id),
                "target_language": self.target_language,
            }
        )

        self._is_active = True

        logger.info(
            "Dubbing session started",
            extra={
                "session_id": self.session_id,
                "user_id": str(self.user.id),
                "channel_id": str(self.channel.id),
                "target_language": self.target_language,
            }
        )

        return {
            "session_id": self.session_id,
            "source_language": self.channel.primary_language,
            "target_language": self.target_language,
            "voice_id": self.voice_id,
            "sync_delay_ms": self.channel.dubbing_sync_delay_ms,
        }

    async def stop(self) -> dict:
        """Stop dubbing session and return summary."""
        self._is_active = False

        # Update database session
        if self._db_session:
            self._db_session.status = "ended"
            self._db_session.ended_at = datetime.now(timezone.utc)
            self._db_session.avg_stt_latency_ms = self._metrics.avg_stt_latency
            self._db_session.avg_translation_latency_ms = self._metrics.avg_translation_latency
            self._db_session.avg_tts_latency_ms = self._metrics.avg_tts_latency
            self._db_session.avg_total_latency_ms = self._metrics.avg_total_latency
            self._db_session.audio_seconds_processed = self._metrics.audio_seconds
            self._db_session.segments_processed = self._metrics.segments
            self._db_session.error_count = self._metrics.errors
            await self._db_session.save()

        # Remove from Redis
        await self._session_store.delete_session(self.session_id)

        # Record metering event
        await self._metering.record_usage(
            user_id=str(self.user.id),
            event_type="live_dubbing_session_end",
            metadata={
                "channel_id": str(self.channel.id),
                "duration_seconds": self._metrics.audio_seconds,
                "segments": self._metrics.segments,
            }
        )

        logger.info(
            "Dubbing session ended",
            extra={
                "session_id": self.session_id,
                "duration_seconds": self._metrics.audio_seconds,
                "segments_processed": self._metrics.segments,
                "avg_latency_ms": self._metrics.avg_total_latency,
            }
        )

        return self._metrics.to_dict()

    async def process_audio_chunk(self, audio_data: bytes, sequence: int) -> None:
        """Process incoming audio chunk through the pipeline."""
        if not self._is_active:
            return

        # Validate audio chunk (security)
        validation = validate_audio_chunk(audio_data, sequence, self._last_sequence)
        if not validation.valid:
            self._metrics.record_error(validation.error)
            return
        self._last_sequence = sequence

        # Process through pipeline (STT → Translation → TTS)
        # This is handled by the shared channel STT manager
        # Individual session only handles translation + TTS
        pass

    async def handle_transcript(self, transcript: str, timestamp_ms: int) -> None:
        """Handle transcript from shared STT pipeline."""
        if not self._is_active or not transcript.strip():
            return

        start_time = asyncio.get_event_loop().time()

        try:
            # Translation
            translation_start = asyncio.get_event_loop().time()
            translated = await self._translation_service.translate(
                transcript,
                self.channel.primary_language,
                self.target_language
            )
            translation_latency = (asyncio.get_event_loop().time() - translation_start) * 1000

            # TTS
            tts_start = asyncio.get_event_loop().time()
            audio_chunks = []
            async for chunk in self._tts_service.synthesize_stream(translated, self.voice_id):
                audio_chunks.append(chunk)
            tts_latency = (asyncio.get_event_loop().time() - tts_start) * 1000

            total_latency = (asyncio.get_event_loop().time() - start_time) * 1000

            # Record metrics
            self._metrics.record_segment(
                translation_latency_ms=translation_latency,
                tts_latency_ms=tts_latency,
                total_latency_ms=total_latency,
            )

            # Queue output message
            await self._output_queue.put(DubbingMessage(
                type="dubbed_audio",
                data=b"".join(audio_chunks),
                original_text=transcript,
                translated_text=translated,
                sequence=self._metrics.segments,
                timestamp_ms=timestamp_ms,
                latency_ms=total_latency,
            ))

        except Exception as e:
            self._metrics.record_error(str(e))
            logger.error(
                "Dubbing pipeline error",
                extra={"session_id": self.session_id, "error": str(e)}
            )

    async def receive_messages(self) -> AsyncIterator:
        """Yield dubbed audio messages to client."""
        while self._is_active:
            try:
                message = await asyncio.wait_for(
                    self._output_queue.get(),
                    timeout=1.0
                )
                yield message
            except asyncio.TimeoutError:
                # Send keepalive
                yield DubbingMessage(type="keepalive")
            except Exception as e:
                logger.error(f"Error receiving messages: {e}")
                break
```

### 2.5 WebSocket Endpoint (Protocol-Level Auth)

```python
# backend/app/api/routes/websocket_live_dubbing.py

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from starlette.websockets import WebSocketState
import asyncio
import json
from datetime import datetime, timezone

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import decode_token
from app.models.content import LiveChannel
from app.models.user import User
from app.services.live_dubbing.service import LiveDubbingService
from app.services.live_dubbing.authorization import DubbingAuthorizationService
from app.services.live_dubbing.channel_stt_manager import ChannelSTTManager

logger = get_logger(__name__)
router = APIRouter()

# Authentication timeout
AUTH_TIMEOUT_SECONDS = 5
MAX_RECONNECT_ATTEMPTS = 5


@router.websocket("/ws/live/{channel_id}/dubbing")
async def websocket_live_dubbing(
    websocket: WebSocket,
    channel_id: str,
):
    """
    WebSocket endpoint for live channel dubbing.

    Authentication: First message must be auth message with JWT token.
    This avoids exposing JWT in URL query parameters (security best practice).

    Protocol:
    - Client → Server: Binary audio chunks (48kHz PCM mono)
    - Server → Client: JSON messages (dubbed audio, transcripts, status)
    """

    await websocket.accept()

    # Set authentication timeout
    auth_task = None
    user = None
    channel = None
    service = None

    try:
        # Wait for authentication message
        auth_task = asyncio.create_task(
            asyncio.wait_for(websocket.receive_json(), timeout=AUTH_TIMEOUT_SECONDS)
        )

        try:
            auth_message = await auth_task
        except asyncio.TimeoutError:
            await websocket.close(code=4001, reason="Authentication timeout")
            return

        # Validate auth message
        if auth_message.get("type") != "auth" or "token" not in auth_message:
            await websocket.close(code=4002, reason="Invalid authentication message")
            return

        # Validate JWT token
        token = auth_message["token"]
        try:
            payload = decode_token(token)
            user_id = payload.get("sub") or payload.get("user_id")
            if not user_id:
                raise ValueError("Missing user ID in token")
        except Exception as e:
            logger.warning(f"Invalid token: {e}")
            await websocket.close(code=4003, reason="Invalid token")
            return

        # Verify timestamp to prevent replay attacks
        message_timestamp = auth_message.get("timestamp", 0)
        message_age = (datetime.now(timezone.utc).timestamp() * 1000) - message_timestamp
        if message_age > 30000:  # 30 seconds
            await websocket.close(code=4004, reason="Authentication message expired")
            return

        # Load user
        user = await User.get(user_id)
        if not user or user.status != "active":
            await websocket.close(code=4005, reason="User not found or inactive")
            return

        # Load channel
        channel = await LiveChannel.get(channel_id)
        if not channel:
            await websocket.close(code=4006, reason="Channel not found")
            return

        # Authorization check (multi-layer)
        auth_service = DubbingAuthorizationService()
        auth_result = await auth_service.authorize_dubbing_session(
            user=user,
            channel=channel,
            target_language=auth_message.get("target_lang", "en"),
            client_ip=websocket.client.host if websocket.client else None,
        )

        if not auth_result.authorized:
            await websocket.close(
                code=auth_result.code,
                reason=auth_result.reason
            )
            return

        # Create dubbing service
        service = LiveDubbingService(
            channel=channel,
            user=user,
            target_language=auth_message.get("target_lang", "en"),
            voice_id=auth_message.get("voice_id"),
        )

        # Start session
        connection_info = await service.start()

        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            **connection_info,
        })

        # Subscribe to shared STT pipeline for this channel
        stt_manager = ChannelSTTManager.get_instance()
        await stt_manager.subscribe_session(
            channel_id=channel_id,
            session_id=service.session_id,
            callback=service.handle_transcript,
        )

        # Main message loop
        receive_task = asyncio.create_task(handle_incoming(websocket, service))
        send_task = asyncio.create_task(handle_outgoing(websocket, service))

        done, pending = await asyncio.wait(
            [receive_task, send_task],
            return_when=asyncio.FIRST_COMPLETED,
        )

        # Cancel pending tasks
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    except WebSocketDisconnect:
        logger.info(f"Client disconnected: {channel_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close(code=4500, reason="Internal error")
    finally:
        # Cleanup
        if service:
            await service.stop()
        if channel_id:
            stt_manager = ChannelSTTManager.get_instance()
            await stt_manager.unsubscribe_session(
                channel_id=channel_id,
                session_id=service.session_id if service else None,
            )


async def handle_incoming(websocket: WebSocket, service: LiveDubbingService):
    """Handle incoming audio chunks from client."""
    sequence = 0
    while True:
        data = await websocket.receive()

        if "bytes" in data:
            # Binary audio chunk
            await service.process_audio_chunk(data["bytes"], sequence)
            sequence += 1
        elif "text" in data:
            # Control message
            message = json.loads(data["text"])
            if message.get("type") == "stop":
                break


async def handle_outgoing(websocket: WebSocket, service: LiveDubbingService):
    """Send dubbed audio and status messages to client."""
    async for message in service.receive_messages():
        if message.type == "dubbed_audio":
            # Send audio as binary
            await websocket.send_bytes(message.data)
            # Send metadata as JSON
            await websocket.send_json({
                "type": "audio_metadata",
                "original_text": message.original_text,
                "translated_text": message.translated_text,
                "sequence": message.sequence,
                "latency_ms": message.latency_ms,
            })
        elif message.type == "keepalive":
            await websocket.send_json({"type": "keepalive"})
        elif message.type == "latency_report":
            await websocket.send_json({
                "type": "latency_report",
                **message.metrics,
            })
```

### 2.6 Configuration Schema

```python
# backend/app/core/config.py - Add to OlorinConfig

class DubbingConfig(BaseSettings):
    """Live dubbing configuration (all values from environment)."""

    # Feature flag
    enabled: bool = Field(default=True, env="LIVE_DUBBING_ENABLED")

    # Audio settings
    input_sample_rate: int = Field(default=48000, env="LIVE_DUBBING_INPUT_SAMPLE_RATE")
    output_sample_rate: int = Field(default=48000, env="LIVE_DUBBING_OUTPUT_SAMPLE_RATE")
    output_format: str = Field(default="pcm", env="LIVE_DUBBING_OUTPUT_FORMAT")

    # Latency settings
    target_latency_ms: int = Field(default=1200, env="LIVE_DUBBING_TARGET_LATENCY_MS")
    max_latency_ms: int = Field(default=2000, env="LIVE_DUBBING_MAX_LATENCY_MS")
    drift_threshold_ms: int = Field(default=500, env="LIVE_DUBBING_DRIFT_THRESHOLD_MS")

    # Buffer settings
    max_buffer_seconds: int = Field(default=5, env="LIVE_DUBBING_MAX_BUFFER_SECONDS")
    chunk_size_bytes: int = Field(default=4096, env="LIVE_DUBBING_CHUNK_SIZE_BYTES")

    # Session limits
    max_sessions_per_user_per_hour: int = Field(default=10, env="LIVE_DUBBING_MAX_SESSIONS_PER_USER_HOUR")
    max_concurrent_sessions_per_user: int = Field(default=3, env="LIVE_DUBBING_MAX_CONCURRENT_PER_USER")
    max_session_duration_hours: int = Field(default=4, env="LIVE_DUBBING_MAX_SESSION_HOURS")

    # Default voice
    default_voice_id: str = Field(
        default="EXAVITQu4vr4xnSDxMaL",
        env="LIVE_DUBBING_DEFAULT_VOICE_ID"
    )

    # Circuit breaker
    circuit_breaker_threshold: int = Field(default=5, env="LIVE_DUBBING_CB_THRESHOLD")
    circuit_breaker_timeout_seconds: int = Field(default=30, env="LIVE_DUBBING_CB_TIMEOUT")

    # Reconnection
    max_reconnect_attempts: int = Field(default=5, env="LIVE_DUBBING_MAX_RECONNECT")
    initial_reconnect_delay_seconds: float = Field(default=1.0, env="LIVE_DUBBING_RECONNECT_DELAY")
    max_reconnect_delay_seconds: float = Field(default=30.0, env="LIVE_DUBBING_MAX_RECONNECT_DELAY")

    # Cost controls
    max_monthly_seconds_per_user_basic: int = Field(default=0, env="LIVE_DUBBING_LIMIT_BASIC")
    max_monthly_seconds_per_user_premium: int = Field(default=36000, env="LIVE_DUBBING_LIMIT_PREMIUM")  # 10 hours
    max_monthly_seconds_per_user_family: int = Field(default=108000, env="LIVE_DUBBING_LIMIT_FAMILY")  # 30 hours

    # Fallback
    fallback_to_subtitles: bool = Field(default=True, env="LIVE_DUBBING_FALLBACK_TO_SUBTITLES")

    class Config:
        env_prefix = ""
        env_file = ".env"
```

---

## 3. Frontend Implementation

### 3.1 Files to Create/Modify

| File | Action | Lines | Purpose |
|------|--------|-------|---------|
| `web/src/services/liveDubbingService.ts` | Create | ~150 | WebSocket client + audio playback |
| `web/src/services/dubbingAudioMixer.ts` | Create | ~120 | Web Audio API mixer |
| `web/src/services/dubbingBrowserDetection.ts` | Create | ~50 | Capability detection |
| `web/src/components/player/hooks/useLiveDubbing.ts` | Create | ~150 | React hook |
| `web/src/components/player/dubbing/DubbingControls.tsx` | Create | ~180 | Glass UI controls |
| `web/src/components/player/dubbing/DubbingStatusBadge.tsx` | Create | ~60 | Status indicator |
| `web/src/components/player/dubbing/DubbingInfoModal.tsx` | Create | ~80 | First-time info |
| `web/src/components/player/dubbing/index.ts` | Create | ~10 | Barrel export |
| `web/src/components/player/hooks/useVideoPlayer.ts` | Modify | +40 | Sync integration |
| `web/src/components/player/VideoPlayer.tsx` | Modify | +25 | Add controls |
| `shared/i18n/locales/en.json` | Modify | +30 | i18n keys |
| `shared/i18n/locales/he.json` | Modify | +30 | Hebrew translations |

### 3.2 Browser Capability Detection

```typescript
// web/src/services/dubbingBrowserDetection.ts

export interface BrowserCapabilities {
  captureStream: boolean;
  webAudio: boolean;
  webSocket: boolean;
  audioWorklet: boolean;
  supported: boolean;
  unsupportedReason?: string;
}

export function detectBrowserCapabilities(): BrowserCapabilities {
  const video = document.createElement('video');

  const captureStream = typeof video.captureStream === 'function' ||
                        typeof (video as any).mozCaptureStream === 'function';

  const webAudio = typeof AudioContext !== 'undefined' ||
                   typeof (window as any).webkitAudioContext !== 'undefined';

  const webSocket = typeof WebSocket !== 'undefined';

  const audioWorklet = typeof AudioWorkletNode !== 'undefined';

  // Check for Safari (limited captureStream support)
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  let supported = captureStream && webAudio && webSocket;
  let unsupportedReason: string | undefined;

  if (!captureStream) {
    supported = false;
    if (isSafari || isIOS) {
      unsupportedReason = 'Safari does not support audio capture from video. Please use Chrome, Firefox, or Edge.';
    } else {
      unsupportedReason = 'Your browser does not support audio capture.';
    }
  }

  if (!webAudio) {
    supported = false;
    unsupportedReason = 'Your browser does not support Web Audio API.';
  }

  return {
    captureStream,
    webAudio,
    webSocket,
    audioWorklet,
    supported,
    unsupportedReason,
  };
}
```

### 3.3 Audio Mixer Service

```typescript
// web/src/services/dubbingAudioMixer.ts

import { getLogger } from '@/utils/logger';

const logger = getLogger('DubbingAudioMixer');

export interface AudioMixerConfig {
  originalVolume: number;  // 0.0 - 1.0
  dubbedVolume: number;    // 0.0 - 1.0
  syncDelayMs: number;
}

export class DubbingAudioMixer {
  private audioContext: AudioContext | null = null;
  private originalGain: GainNode | null = null;
  private dubbedGain: GainNode | null = null;
  private videoSource: MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isInitialized = false;

  async initialize(videoElement: HTMLVideoElement): Promise<void> {
    try {
      // Create AudioContext with matching sample rate
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({
        sampleRate: 48000,
        latencyHint: 'interactive',
      });

      // Handle autoplay policy
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Capture video stream
      const captureMethod = (videoElement as any).captureStream ||
                           (videoElement as any).mozCaptureStream;

      if (!captureMethod) {
        throw new Error('Browser does not support stream capture');
      }

      const stream = captureMethod.call(videoElement);
      const audioTracks = stream.getAudioTracks();

      if (!audioTracks || audioTracks.length === 0) {
        throw new Error('No audio tracks available from video');
      }

      // Create audio graph
      this.videoSource = this.audioContext.createMediaStreamSource(stream);
      this.originalGain = this.audioContext.createGain();
      this.dubbedGain = this.audioContext.createGain();
      this.analyser = this.audioContext.createAnalyser();

      // Connect: Video → Original Gain → Destination
      this.videoSource.connect(this.originalGain);
      this.originalGain.connect(this.audioContext.destination);

      // Connect: Dubbed Gain → Destination (separate path)
      this.dubbedGain.connect(this.audioContext.destination);

      // Connect analyser for monitoring
      this.originalGain.connect(this.analyser);

      // Start with original audio only
      this.originalGain.gain.value = 1.0;
      this.dubbedGain.gain.value = 0.0;

      this.isInitialized = true;
      logger.info('Audio mixer initialized');

    } catch (error) {
      logger.error('Failed to initialize audio mixer', error);
      throw error;
    }
  }

  setOriginalVolume(volume: number): void {
    if (!this.originalGain || !this.audioContext) return;

    // Smooth transition over 100ms
    this.originalGain.gain.setTargetAtTime(
      Math.max(0, Math.min(1, volume)),
      this.audioContext.currentTime,
      0.1
    );
  }

  setDubbedVolume(volume: number): void {
    if (!this.dubbedGain || !this.audioContext) return;

    this.dubbedGain.gain.setTargetAtTime(
      Math.max(0, Math.min(1, volume)),
      this.audioContext.currentTime,
      0.1
    );
  }

  async playDubbedAudio(pcmData: ArrayBuffer): Promise<void> {
    if (!this.audioContext || !this.dubbedGain) return;

    try {
      // PCM data is already 48kHz mono - create AudioBuffer directly
      const samples = new Float32Array(pcmData.byteLength / 2);
      const view = new DataView(pcmData);

      for (let i = 0; i < samples.length; i++) {
        // Convert 16-bit PCM to float
        const sample = view.getInt16(i * 2, true);
        samples[i] = sample / 32768;
      }

      const audioBuffer = this.audioContext.createBuffer(1, samples.length, 48000);
      audioBuffer.getChannelData(0).set(samples);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.dubbedGain);
      source.start();

    } catch (error) {
      logger.error('Failed to play dubbed audio', error);
    }
  }

  getAudioLevel(): number {
    if (!this.analyser) return -60;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    const sum = dataArray.reduce((a, b) => a + b, 0);
    const avg = sum / dataArray.length;

    return avg > 0 ? 20 * Math.log10(avg / 255) : -60;
  }

  destroy(): void {
    this.videoSource?.disconnect();
    this.originalGain?.disconnect();
    this.dubbedGain?.disconnect();
    this.analyser?.disconnect();
    this.audioContext?.close();

    this.videoSource = null;
    this.originalGain = null;
    this.dubbedGain = null;
    this.analyser = null;
    this.audioContext = null;
    this.isInitialized = false;

    logger.info('Audio mixer destroyed');
  }

  get initialized(): boolean {
    return this.isInitialized;
  }
}
```

### 3.4 Live Dubbing Service

```typescript
// web/src/services/liveDubbingService.ts

import { getLogger } from '@/utils/logger';
import { DubbingAudioMixer } from './dubbingAudioMixer';
import { detectBrowserCapabilities, BrowserCapabilities } from './dubbingBrowserDetection';

const logger = getLogger('LiveDubbingService');

export interface DubbingState {
  isSupported: boolean;
  unsupportedReason?: string;
  isConnecting: boolean;
  isConnected: boolean;
  isActive: boolean;
  targetLanguage: string;
  syncDelayMs: number;
  currentLatencyMs: number;
  error?: string;
}

export interface DubbingConnectionInfo {
  sessionId: string;
  sourceLanguage: string;
  targetLanguage: string;
  voiceId: string;
  syncDelayMs: number;
}

type StateChangeCallback = (state: DubbingState) => void;
type TranscriptCallback = (original: string, translated: string) => void;

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;

export class LiveDubbingService {
  private ws: WebSocket | null = null;
  private audioMixer: DubbingAudioMixer;
  private capabilities: BrowserCapabilities;
  private state: DubbingState;
  private stateCallbacks: Set<StateChangeCallback> = new Set();
  private transcriptCallbacks: Set<TranscriptCallback> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private jwtToken: string = '';

  constructor() {
    this.audioMixer = new DubbingAudioMixer();
    this.capabilities = detectBrowserCapabilities();

    this.state = {
      isSupported: this.capabilities.supported,
      unsupportedReason: this.capabilities.unsupportedReason,
      isConnecting: false,
      isConnected: false,
      isActive: false,
      targetLanguage: 'en',
      syncDelayMs: 1200,
      currentLatencyMs: 0,
    };
  }

  async initialize(videoElement: HTMLVideoElement, jwtToken: string): Promise<void> {
    if (!this.capabilities.supported) {
      throw new Error(this.capabilities.unsupportedReason || 'Browser not supported');
    }

    this.jwtToken = jwtToken;
    await this.audioMixer.initialize(videoElement);
    logger.info('Live dubbing service initialized');
  }

  async connect(
    channelId: string,
    targetLanguage: string,
    voiceId?: string
  ): Promise<DubbingConnectionInfo> {
    if (!this.capabilities.supported) {
      throw new Error('Browser not supported');
    }

    this.updateState({ isConnecting: true, error: undefined });

    return new Promise((resolve, reject) => {
      try {
        // Build WebSocket URL (no token in URL - protocol-level auth)
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = API_BASE_URL.replace(/^https?:\/\//, '') || window.location.host;
        const wsUrl = `${wsProtocol}//${wsHost}/ws/live/${channelId}/dubbing`;

        this.ws = new WebSocket(wsUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          // Send authentication message (protocol-level auth)
          this.ws?.send(JSON.stringify({
            type: 'auth',
            token: this.jwtToken,
            timestamp: Date.now(),
            target_lang: targetLanguage,
            voice_id: voiceId,
          }));
        };

        this.ws.onmessage = (event) => {
          if (typeof event.data === 'string') {
            const message = JSON.parse(event.data);
            this.handleMessage(message, resolve, reject);
          } else if (event.data instanceof ArrayBuffer) {
            // Binary dubbed audio
            this.audioMixer.playDubbedAudio(event.data);
          }
        };

        this.ws.onerror = (error) => {
          logger.error('WebSocket error', error);
          this.updateState({ error: 'Connection error' });
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = (event) => {
          logger.info(`WebSocket closed: ${event.code} ${event.reason}`);
          this.handleDisconnect(event);
        };

      } catch (error) {
        this.updateState({ isConnecting: false, error: 'Failed to connect' });
        reject(error);
      }
    });
  }

  private handleMessage(
    message: any,
    resolve?: (info: DubbingConnectionInfo) => void,
    reject?: (error: Error) => void
  ): void {
    switch (message.type) {
      case 'connected':
        this.reconnectAttempts = 0;
        this.updateState({
          isConnecting: false,
          isConnected: true,
          isActive: true,
          targetLanguage: message.target_language,
          syncDelayMs: message.sync_delay_ms,
        });

        // Switch to dubbed audio
        this.audioMixer.setOriginalVolume(0);
        this.audioMixer.setDubbedVolume(1);

        if (resolve) {
          resolve({
            sessionId: message.session_id,
            sourceLanguage: message.source_language,
            targetLanguage: message.target_language,
            voiceId: message.voice_id,
            syncDelayMs: message.sync_delay_ms,
          });
        }
        break;

      case 'audio_metadata':
        this.updateState({ currentLatencyMs: message.latency_ms });
        this.notifyTranscript(message.original_text, message.translated_text);
        break;

      case 'latency_report':
        this.updateState({ currentLatencyMs: message.avg_total_ms });
        break;

      case 'error':
        this.updateState({ error: message.message });
        if (reject) {
          reject(new Error(message.message));
        }
        break;

      case 'keepalive':
        // Ignore
        break;
    }
  }

  private handleDisconnect(event: CloseEvent): void {
    const wasConnected = this.state.isConnected;

    this.updateState({
      isConnecting: false,
      isConnected: false,
      isActive: false,
    });

    // Restore original audio
    this.audioMixer.setOriginalVolume(1);
    this.audioMixer.setDubbedVolume(0);

    // Attempt reconnection if was connected and not intentional close
    if (wasConnected && event.code !== 1000 && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    logger.info(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    this.updateState({ error: `Reconnecting... (attempt ${this.reconnectAttempts})` });

    this.reconnectTimeout = setTimeout(() => {
      // Reconnection logic would go here
      // Requires storing channel/language info for reconnect
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }

    this.audioMixer.setOriginalVolume(1);
    this.audioMixer.setDubbedVolume(0);

    this.updateState({
      isConnecting: false,
      isConnected: false,
      isActive: false,
    });
  }

  destroy(): void {
    this.disconnect();
    this.audioMixer.destroy();
    this.stateCallbacks.clear();
    this.transcriptCallbacks.clear();
  }

  // State management
  private updateState(partial: Partial<DubbingState>): void {
    this.state = { ...this.state, ...partial };
    this.stateCallbacks.forEach(cb => cb(this.state));
  }

  onStateChange(callback: StateChangeCallback): () => void {
    this.stateCallbacks.add(callback);
    callback(this.state); // Immediate callback with current state
    return () => this.stateCallbacks.delete(callback);
  }

  onTranscript(callback: TranscriptCallback): () => void {
    this.transcriptCallbacks.add(callback);
    return () => this.transcriptCallbacks.delete(callback);
  }

  private notifyTranscript(original: string, translated: string): void {
    this.transcriptCallbacks.forEach(cb => cb(original, translated));
  }

  getState(): DubbingState {
    return { ...this.state };
  }
}
```

### 3.5 React Hook

```typescript
// web/src/components/player/hooks/useLiveDubbing.ts

import { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import { LiveDubbingService, DubbingState, DubbingConnectionInfo } from '@/services/liveDubbingService';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

interface UseLiveDubbingOptions {
  channelId: string;
  videoRef: RefObject<HTMLVideoElement>;
  isLive: boolean;
  isPremium: boolean;
}

interface UseLiveDubbingReturn {
  state: DubbingState;
  isSupported: boolean;
  unsupportedReason?: string;
  enableDubbing: (targetLanguage: string, voiceId?: string) => Promise<void>;
  disableDubbing: () => void;
  connectionInfo: DubbingConnectionInfo | null;
  transcript: { original: string; translated: string } | null;
}

export function useLiveDubbing({
  channelId,
  videoRef,
  isLive,
  isPremium,
}: UseLiveDubbingOptions): UseLiveDubbingReturn {
  const { t } = useTranslation();
  const { token } = useAuth();
  const serviceRef = useRef<LiveDubbingService | null>(null);

  const [state, setState] = useState<DubbingState>({
    isSupported: false,
    isConnecting: false,
    isConnected: false,
    isActive: false,
    targetLanguage: 'en',
    syncDelayMs: 1200,
    currentLatencyMs: 0,
  });

  const [connectionInfo, setConnectionInfo] = useState<DubbingConnectionInfo | null>(null);
  const [transcript, setTranscript] = useState<{ original: string; translated: string } | null>(null);

  // Initialize service
  useEffect(() => {
    const service = new LiveDubbingService();
    serviceRef.current = service;

    // Subscribe to state changes
    const unsubscribeState = service.onStateChange(setState);

    // Subscribe to transcripts
    const unsubscribeTranscript = service.onTranscript((original, translated) => {
      setTranscript({ original, translated });
    });

    return () => {
      unsubscribeState();
      unsubscribeTranscript();
      service.destroy();
      serviceRef.current = null;
    };
  }, []);

  // Initialize audio when video is ready
  useEffect(() => {
    if (!serviceRef.current || !videoRef.current || !token || !isLive) return;

    const initAudio = async () => {
      try {
        await serviceRef.current?.initialize(videoRef.current!, token);
      } catch (error) {
        console.error('Failed to initialize dubbing audio:', error);
      }
    };

    initAudio();
  }, [videoRef.current, token, isLive]);

  // Enable dubbing
  const enableDubbing = useCallback(async (targetLanguage: string, voiceId?: string) => {
    if (!serviceRef.current || !isPremium) {
      throw new Error(t('player.dubbing.premiumRequired'));
    }

    try {
      const info = await serviceRef.current.connect(channelId, targetLanguage, voiceId);
      setConnectionInfo(info);

      // Apply video sync delay
      if (videoRef.current && info.syncDelayMs > 0) {
        // Pause briefly to allow dubbing buffer to fill
        videoRef.current.pause();
        setTimeout(() => {
          videoRef.current?.play();
        }, info.syncDelayMs);
      }
    } catch (error) {
      console.error('Failed to enable dubbing:', error);
      throw error;
    }
  }, [channelId, isPremium, t, videoRef]);

  // Disable dubbing
  const disableDubbing = useCallback(() => {
    serviceRef.current?.disconnect();
    setConnectionInfo(null);
    setTranscript(null);
  }, []);

  return {
    state,
    isSupported: state.isSupported,
    unsupportedReason: state.unsupportedReason,
    enableDubbing,
    disableDubbing,
    connectionInfo,
    transcript,
  };
}
```

### 3.6 UI Components

```tsx
// web/src/components/player/dubbing/DubbingControls.tsx

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { GlassCard, GlassSelect, GlassButton, GlassBadge, GlassTooltip } from '@bayit/glass';
import { TVSwitch } from '@/components/ui/TVSwitch';
import { DubbingStatusBadge } from './DubbingStatusBadge';
import { DubbingInfoModal } from './DubbingInfoModal';
import { DubbingState } from '@/services/liveDubbingService';
import { colors, spacing } from '@/theme';

interface DubbingControlsProps {
  state: DubbingState;
  isSupported: boolean;
  unsupportedReason?: string;
  isPremium: boolean;
  availableLanguages: string[];
  onEnable: (language: string) => Promise<void>;
  onDisable: () => void;
  onShowUpgrade?: () => void;
}

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'ar', label: 'العربية' },
  { value: 'ru', label: 'Русский' },
];

export function DubbingControls({
  state,
  isSupported,
  unsupportedReason,
  isPremium,
  availableLanguages,
  onEnable,
  onDisable,
  onShowUpgrade,
}: DubbingControlsProps) {
  const { t } = useTranslation();
  const { isRTL, flexDirection, textAlign } = useDirection();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showInfo, setShowInfo] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  const handleToggle = useCallback(async (enabled: boolean) => {
    if (enabled) {
      if (!isPremium) {
        onShowUpgrade?.();
        return;
      }
      setIsEnabling(true);
      try {
        await onEnable(selectedLanguage);
      } catch (error) {
        console.error('Failed to enable dubbing:', error);
      } finally {
        setIsEnabling(false);
      }
    } else {
      onDisable();
    }
  }, [isPremium, selectedLanguage, onEnable, onDisable, onShowUpgrade]);

  const handleLanguageChange = useCallback(async (language: string) => {
    setSelectedLanguage(language);
    if (state.isActive) {
      // Reconnect with new language
      onDisable();
      setIsEnabling(true);
      try {
        await onEnable(language);
      } finally {
        setIsEnabling(false);
      }
    }
  }, [state.isActive, onEnable, onDisable]);

  // Browser not supported
  if (!isSupported) {
    return (
      <GlassCard style={styles.container}>
        <View style={[styles.row, { flexDirection }]}>
          <Text style={[styles.label, { textAlign }]}>
            {t('player.dubbing.title')}
          </Text>
          <GlassBadge variant="warning">
            {t('player.dubbing.notSupported')}
          </GlassBadge>
        </View>
        <Text style={[styles.unsupportedText, { textAlign }]}>
          {unsupportedReason}
        </Text>
      </GlassCard>
    );
  }

  const filteredLanguages = LANGUAGE_OPTIONS.filter(
    opt => availableLanguages.includes(opt.value)
  );

  return (
    <GlassCard style={styles.container}>
      {/* Header Row */}
      <View style={[styles.row, { flexDirection }]}>
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { textAlign }]}>
            {t('player.dubbing.title')}
          </Text>
          <GlassTooltip content={t('player.dubbing.tooltip')}>
            <GlassButton
              variant="ghost"
              size="sm"
              onPress={() => setShowInfo(true)}
              accessibilityLabel={t('player.dubbing.infoButton')}
            >
              ℹ️
            </GlassButton>
          </GlassTooltip>
        </View>

        <TVSwitch
          value={state.isActive || state.isConnecting}
          onValueChange={handleToggle}
          disabled={isEnabling || state.isConnecting || !isPremium}
          accessibilityLabel={t('player.dubbing.toggleLabel')}
          accessibilityHint={t('player.dubbing.toggleHint')}
          accessibilityRole="switch"
          accessibilityState={{ checked: state.isActive, disabled: !isPremium }}
        />
      </View>

      {/* Premium Required Banner */}
      {!isPremium && (
        <GlassButton
          variant="secondary"
          onPress={onShowUpgrade}
          style={styles.upgradeButton}
        >
          {t('player.dubbing.premiumRequired')}
        </GlassButton>
      )}

      {/* Language Selector */}
      {isPremium && (state.isActive || state.isConnecting) && (
        <View style={styles.languageSection}>
          <Text style={[styles.sectionLabel, { textAlign }]}>
            {t('player.dubbing.selectLanguage')}
          </Text>
          <GlassSelect
            options={filteredLanguages}
            value={selectedLanguage}
            onChange={handleLanguageChange}
            disabled={state.isConnecting}
            accessibilityLabel={t('player.dubbing.languageLabel')}
          />
        </View>
      )}

      {/* Status Badge */}
      {isPremium && (state.isActive || state.isConnecting || state.error) && (
        <DubbingStatusBadge
          isConnecting={state.isConnecting}
          isActive={state.isActive}
          error={state.error}
          latencyMs={state.currentLatencyMs}
          syncDelayMs={state.syncDelayMs}
        />
      )}

      {/* Sync Delay Info */}
      {isPremium && state.isActive && (
        <Text style={[styles.infoText, { textAlign }]}>
          {t('player.dubbing.syncInfo', { delay: (state.syncDelayMs / 1000).toFixed(1) })}
        </Text>
      )}

      {/* Info Modal */}
      <DubbingInfoModal
        visible={showInfo}
        onClose={() => setShowInfo(false)}
      />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  sectionLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  languageSection: {
    marginTop: spacing.sm,
  },
  upgradeButton: {
    marginTop: spacing.sm,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  unsupportedText: {
    fontSize: 12,
    color: colors.warning,
    marginTop: spacing.xs,
  },
});
```

### 3.7 i18n Keys

```json
// shared/i18n/locales/en.json - Add to "player" section

{
  "player": {
    "dubbing": {
      "title": "Live Dubbing",
      "tooltip": "Translates audio in real-time with AI voices",
      "toggleLabel": "Enable or disable live dubbing",
      "toggleHint": "When enabled, replaces original audio with AI-generated voice in your selected language",
      "selectLanguage": "Dubbing Language",
      "languageLabel": "Select dubbing language",
      "premiumRequired": "⭐ Upgrade to Premium for Live Dubbing",
      "notSupported": "Not Supported",
      "syncInfo": "Audio synced with ~{{delay}}s delay",
      "infoButton": "What is live dubbing?",
      "status": {
        "connecting": "Connecting...",
        "active": "Active",
        "reconnecting": "Reconnecting ({{attempt}}/5)...",
        "error": "Error"
      },
      "latency": "~{{ms}}ms delay",
      "latencyGood": "Excellent",
      "latencyOk": "Good",
      "latencyPoor": "Poor",
      "info": {
        "title": "What is Live Dubbing?",
        "description": "Live Dubbing uses AI to translate and voice-over live broadcasts in real-time.",
        "feature1": "🎙️ Real-time translation to your language",
        "feature2": "🌍 Available in English, Spanish, Arabic, Russian",
        "feature3": "⚡ ~1-2 second delay for synchronization",
        "note": "Works best with talk shows, news, and speech content."
      },
      "errors": {
        "connectionFailed": "Failed to connect to dubbing service",
        "audioCaptureFailed": "Could not capture audio from video",
        "browserNotSupported": "Your browser doesn't support live dubbing",
        "safariNotSupported": "Safari does not support audio capture. Please use Chrome, Firefox, or Edge."
      }
    }
  }
}
```

```json
// shared/i18n/locales/he.json - Add to "player" section

{
  "player": {
    "dubbing": {
      "title": "דיבוב חי",
      "tooltip": "תרגום אודיו בזמן אמת עם קולות AI",
      "toggleLabel": "הפעל או בטל דיבוב חי",
      "toggleHint": "כאשר מופעל, מחליף את האודיו המקורי בקול AI בשפה שבחרת",
      "selectLanguage": "שפת דיבוב",
      "languageLabel": "בחר שפת דיבוב",
      "premiumRequired": "⭐ שדרג לפרימיום עבור דיבוב חי",
      "notSupported": "לא נתמך",
      "syncInfo": "אודיו מסונכרן עם השהייה של ~{{delay}} שניות",
      "infoButton": "מה זה דיבוב חי?",
      "status": {
        "connecting": "מתחבר...",
        "active": "פעיל",
        "reconnecting": "מתחבר מחדש ({{attempt}}/5)...",
        "error": "שגיאה"
      },
      "latency": "השהייה של ~{{ms}} מ\"ש",
      "latencyGood": "מצוין",
      "latencyOk": "טוב",
      "latencyPoor": "חלש",
      "info": {
        "title": "מה זה דיבוב חי?",
        "description": "דיבוב חי משתמש ב-AI כדי לתרגם ולקרוא שידורים חיים בזמן אמת.",
        "feature1": "🎙️ תרגום בזמן אמת לשפה שלך",
        "feature2": "🌍 זמין באנגלית, ספרדית, ערבית, רוסית",
        "feature3": "⚡ השהייה של ~1-2 שניות לסנכרון",
        "note": "עובד הכי טוב עם תוכניות אירוח, חדשות ותוכן דיבור."
      },
      "errors": {
        "connectionFailed": "נכשל להתחבר לשירות הדיבוב",
        "audioCaptureFailed": "לא ניתן ללכוד אודיו מהווידאו",
        "browserNotSupported": "הדפדפן שלך לא תומך בדיבוב חי",
        "safariNotSupported": "Safari לא תומך בלכידת אודיו. אנא השתמש ב-Chrome, Firefox או Edge."
      }
    }
  }
}
```

---

## 4. Platform-Specific Implementation

### 4.1 iOS Audio Architecture

```swift
// ios-app/BayitPlus/Audio/DubbingAudioSessionManager.swift

import AVFoundation

class DubbingAudioSessionManager {
    static let shared = DubbingAudioSessionManager()

    private init() {
        setupNotifications()
    }

    func configureForLiveDubbing() throws {
        let session = AVAudioSession.sharedInstance()

        // Configure for playback with mixing
        try session.setCategory(
            .playback,
            mode: .moviePlayback,
            options: [.allowAirPlay, .allowBluetooth, .mixWithOthers]
        )

        // Request preferred sample rate
        try session.setPreferredSampleRate(48000)

        // Activate session
        try session.setActive(true)
    }

    private func setupNotifications() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleInterruption),
            name: AVAudioSession.interruptionNotification,
            object: nil
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleRouteChange),
            name: AVAudioSession.routeChangeNotification,
            object: nil
        )
    }

    @objc private func handleInterruption(_ notification: Notification) {
        guard let info = notification.userInfo,
              let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }

        switch type {
        case .began:
            // Pause dubbing
            NotificationCenter.default.post(name: .dubbingInterruptionBegan, object: nil)
        case .ended:
            // Resume dubbing
            NotificationCenter.default.post(name: .dubbingInterruptionEnded, object: nil)
        @unknown default:
            break
        }
    }

    @objc private func handleRouteChange(_ notification: Notification) {
        guard let info = notification.userInfo,
              let reasonValue = info[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            return
        }

        switch reason {
        case .oldDeviceUnavailable:
            // Headphones unplugged - pause
            NotificationCenter.default.post(name: .dubbingRouteChanged, object: nil)
        default:
            break
        }
    }
}

extension Notification.Name {
    static let dubbingInterruptionBegan = Notification.Name("dubbingInterruptionBegan")
    static let dubbingInterruptionEnded = Notification.Name("dubbingInterruptionEnded")
    static let dubbingRouteChanged = Notification.Name("dubbingRouteChanged")
}
```

### 4.2 tvOS Focus Navigation

```tsx
// tvos-app/components/player/dubbing/TVDubbingControls.tsx

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTVFocus } from '@/hooks/useTVFocus';
import { TVSwitch, GlassSelect, GlassCard, GlassBadge } from '@bayit/glass';
import { DubbingState } from '@/services/liveDubbingService';
import { colors, spacing } from '@/theme';

// 10-foot UI typography
const TV_TYPOGRAPHY = {
  heading: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  body: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  caption: { fontSize: 18, fontWeight: '500' as const, lineHeight: 24 },
};

interface TVDubbingControlsProps {
  state: DubbingState;
  isPremium: boolean;
  availableLanguages: string[];
  onEnable: (language: string) => Promise<void>;
  onDisable: () => void;
}

export function TVDubbingControls({
  state,
  isPremium,
  availableLanguages,
  onEnable,
  onDisable,
}: TVDubbingControlsProps) {
  const { t } = useTranslation();
  const switchFocus = useTVFocus({ styleType: 'button' });
  const languageFocus = useTVFocus({ styleType: 'input' });

  return (
    <GlassCard style={styles.container}>
      {/* Enable/Disable Row */}
      <View style={styles.row}>
        <Text style={styles.label}>{t('player.dubbing.title')}</Text>
        <TVSwitch
          value={state.isActive}
          onValueChange={(enabled) => enabled ? onEnable('en') : onDisable()}
          onFocus={switchFocus.handleFocus}
          onBlur={switchFocus.handleBlur}
          hasTVPreferredFocus={true}
          disabled={!isPremium}
          style={[styles.switch, switchFocus.scaleTransform]}
          accessibilityLabel={t('player.dubbing.toggleLabel')}
        />
      </View>

      {/* Language Selector */}
      {state.isActive && (
        <View style={styles.languageRow}>
          <Text style={styles.sectionLabel}>
            {t('player.dubbing.selectLanguage')}
          </Text>
          <GlassSelect
            options={availableLanguages.map(lang => ({
              value: lang,
              label: getLanguageName(lang),
            }))}
            value={state.targetLanguage}
            onChange={(lang) => {
              onDisable();
              onEnable(lang);
            }}
            onFocus={languageFocus.handleFocus}
            onBlur={languageFocus.handleBlur}
            style={languageFocus.scaleTransform}
          />
        </View>
      )}

      {/* Status */}
      {state.isActive && (
        <View style={styles.statusRow}>
          <GlassBadge variant="success" size="lg">
            ● {t('player.dubbing.status.active')}
          </GlassBadge>
          <Text style={styles.latencyText}>
            {t('player.dubbing.latency', { ms: state.currentLatencyMs })}
          </Text>
        </View>
      )}
    </GlassCard>
  );
}

function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    en: 'English',
    es: 'Español',
    ar: 'العربية',
    ru: 'Русский',
  };
  return names[code] || code;
}

const styles = StyleSheet.create({
  container: {
    padding: 24, // Larger padding for 10-foot UI
    gap: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60, // Larger touch target for TV
  },
  label: {
    ...TV_TYPOGRAPHY.heading,
    color: colors.text,
  },
  switch: {
    transform: [{ scale: 1.2 }], // Larger for TV
  },
  languageRow: {
    gap: 12,
  },
  sectionLabel: {
    ...TV_TYPOGRAPHY.body,
    color: colors.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  latencyText: {
    ...TV_TYPOGRAPHY.caption,
    color: colors.textSecondary,
  },
});
```

---

## 5. Deployment Strategy

### 5.1 Infrastructure

```yaml
# Dedicated Cloud Run service for dubbing
gcloud run deploy bayit-plus-dubbing \
  --image $ARTIFACT_REGISTRY/dubbing:$TAG \
  --region us-east1 \
  --memory 4Gi \
  --cpu 4 \
  --concurrency 20 \
  --timeout 3600 \
  --min-instances 2 \
  --max-instances 20 \
  --cpu-boost \
  --execution-environment gen2 \
  --set-env-vars "\
    LIVE_DUBBING_ENABLED=true,\
    LIVE_DUBBING_TARGET_LATENCY_MS=1200,\
    LIVE_DUBBING_INPUT_SAMPLE_RATE=48000,\
    LIVE_DUBBING_OUTPUT_SAMPLE_RATE=48000,\
    LIVE_DUBBING_OUTPUT_FORMAT=pcm,\
    LIVE_DUBBING_MAX_SESSIONS_PER_USER_HOUR=10,\
    LIVE_DUBBING_MAX_CONCURRENT_PER_USER=3"
```

### 5.2 Progressive Rollout

| Phase | Target | Criteria | Duration |
|-------|--------|----------|----------|
| 1. Internal | Test users | Feature flag `DUBBING_BETA=internal` | 1 week |
| 2. Beta | Premium + beta flag | `DUBBING_BETA=premium_beta` | 2 weeks |
| 3. Premium | 10% → 50% → 100% Premium | Gradual % rollout | 1 week |
| 4. GA | All Premium/Family | Full release | Ongoing |

### 5.3 Monitoring & Alerting

```yaml
# Required metrics
- dubbing_sessions_active (gauge)
- dubbing_sessions_total{status="completed|dropped|error"} (counter)
- dubbing_latency_seconds{stage="stt|translation|tts|total"} (histogram)
- dubbing_errors_total{stage="stt|translation|tts|websocket"} (counter)
- dubbing_cost_usd{provider="elevenlabs|google"} (counter)

# Alerts
- DubbingHighLatency: p95 > 1500ms for 5m
- DubbingHighErrorRate: error rate > 1% for 5m
- DubbingConnectionDrops: drop rate > 5% for 5m
- DubbingCostSpike: cost > $100/hour
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

- Audio buffer management
- Latency calculations
- Browser capability detection
- State machine transitions

### 6.2 Integration Tests

```python
# tests/integration/test_live_dubbing_websocket.py

async def test_dubbing_connection_lifecycle():
    """Test full dubbing session lifecycle."""
    async with websockets.connect(DUBBING_WS_URL) as ws:
        # Send auth
        await ws.send(json.dumps({
            "type": "auth",
            "token": TEST_TOKEN,
            "timestamp": int(time.time() * 1000),
            "target_lang": "en"
        }))

        # Verify connection
        response = json.loads(await ws.recv())
        assert response["type"] == "connected"
        assert response["sync_delay_ms"] == 1200

async def test_dubbing_latency_meets_sla():
    """Verify dubbing latency meets 1500ms SLA."""
    latencies = []
    # ... test implementation
    p95_latency = np.percentile(latencies, 95)
    assert p95_latency < 1500
```

### 6.3 E2E Tests (Playwright)

```typescript
// tests/e2e/live-dubbing.spec.ts

test.describe('Live Dubbing', () => {
  test('shows unsupported message in Safari', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Safari-specific test');
    await page.goto('/live/channel-123');
    await expect(page.locator('[data-testid="dubbing-unsupported"]')).toBeVisible();
  });

  test('enables dubbing on premium account', async ({ page }) => {
    await loginAsPremiumUser(page);
    await page.goto('/live/channel-123');

    await page.click('[data-testid="settings-button"]');
    await page.click('[data-testid="dubbing-tab"]');
    await page.click('[data-testid="dubbing-toggle"]');

    await expect(page.locator('[data-testid="dubbing-status"]')).toContainText('Active');
  });
});
```

---

## 7. Summary of Changes from v1

| Issue | v1 Approach | v2 Solution |
|-------|-------------|-------------|
| **Latency budget** | 550-750ms | 950-1450ms (realistic) |
| **Sync delay** | 600ms hardcoded | 1200ms configurable |
| **Audio input** | 16kHz PCM | 48kHz PCM (better accuracy) |
| **Audio output** | MP3 Base64 | Raw PCM (lower latency) |
| **STT architecture** | Per-user | Shared per channel |
| **Authentication** | JWT in URL | Protocol-level (first message) |
| **Dependency injection** | Direct instantiation | Protocol-based DI |
| **Session state** | In-memory | Redis-backed abstraction |
| **Metering** | Not integrated | Full Olorin integration |
| **Schema** | Redundant field | Uses `primary_language` |
| **Indexes** | None | Compound indexes added |
| **Session tracking** | None | Dedicated collection |
| **Browser detection** | None | Safari fallback/warning |
| **tvOS focus** | Not addressed | Full focus navigation |
| **iOS audio session** | Not addressed | AVAudioSession config |
| **i18n** | Not addressed | 30+ keys defined |
| **Accessibility** | Not addressed | ARIA labels, roles |
| **Deployment** | Same service | Dedicated Cloud Run |
| **Rollout** | Not addressed | 4-phase progressive |

---

## 8. Mobile Platform Architecture (Native Modules)

This section clarifies platform separation and provides native module specifications for iOS/Android/tvOS.

### 8.1 Platform Clarification

| Platform | Code Location | Styling | Audio APIs |
|----------|--------------|---------|------------|
| **Pure Web (React)** | `web/src/` | TailwindCSS | Web Audio API, WebSocket |
| **iOS (React Native)** | `shared/` + `ios-app/` | StyleSheet | AVAudioEngine via native module |
| **tvOS (React Native)** | `shared/` + `tvos-app/` | StyleSheet | AVAudioEngine via native module |
| **Android (React Native)** | `shared/` + `android-app/` | StyleSheet | AudioTrack via native module |

**Key Distinction:**
- `web/src/services/` → Pure web React (browser APIs allowed)
- `shared/services/` → Cross-platform React Native code
- `ios-app/`, `tvos-app/`, `android-app/` → Native modules

### 8.2 Platform-Specific File Organization

```
shared/services/dubbing/
├── DubbingService.ts              # Abstract interface/types
├── DubbingService.web.ts          # Web implementation (Web Audio API)
├── DubbingService.native.ts       # iOS/Android/tvOS (uses native modules)
├── DubbingAudioMixer.web.ts       # Web Audio API mixer
├── DubbingAudioMixer.native.ts    # Native module bridge
├── DubbingBrowserDetection.web.ts # Browser-only capability detection
├── WebSocketConnection.ts         # Shared WebSocket base
├── WebSocketConnection.web.ts     # Web-specific (no app lifecycle)
├── WebSocketConnection.native.ts  # Mobile lifecycle handling
└── types.ts                       # Shared TypeScript types

# React Native automatically picks:
# - .web.ts for web builds
# - .native.ts for iOS/Android/tvOS builds
```

### 8.3 iOS Native Module (Swift Bridge)

```swift
// ios-app/BayitPlus/Dubbing/AudioDubbingModule.swift

import Foundation
import AVFoundation
import React

@objc(AudioDubbingModule)
class AudioDubbingModule: RCTEventEmitter {

    private var audioEngine: AVAudioEngine?
    private var playerNode: AVAudioPlayerNode?
    private var mixerNode: AVAudioMixerNode?
    private var originalVolume: Float = 1.0
    private var dubbedVolume: Float = 0.0

    override static func moduleName() -> String! {
        return "AudioDubbingModule"
    }

    override func supportedEvents() -> [String]! {
        return ["onDubbingAudioLevel", "onDubbingError", "onDubbingStateChange"]
    }

    @objc func initialize(_ resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
        do {
            audioEngine = AVAudioEngine()
            playerNode = AVAudioPlayerNode()
            mixerNode = audioEngine?.mainMixerNode

            guard let engine = audioEngine, let player = playerNode else {
                reject("INIT_ERROR", "Failed to create audio engine", nil)
                return
            }

            engine.attach(player)

            // Connect player to mixer (for dubbed audio)
            let format = AVAudioFormat(standardFormatWithSampleRate: 48000, channels: 1)!
            engine.connect(player, to: engine.mainMixerNode, format: format)

            try engine.start()
            resolve(["status": "initialized"])
        } catch {
            reject("INIT_ERROR", error.localizedDescription, error)
        }
    }

    @objc func playPCMAudio(_ pcmData: [NSNumber],
                            resolver resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let player = playerNode, let engine = audioEngine else {
            reject("NOT_INITIALIZED", "Audio engine not initialized", nil)
            return
        }

        // Convert NSNumber array to Float32 samples
        let samples = pcmData.map { $0.floatValue }
        let frameCount = AVAudioFrameCount(samples.count)

        guard let format = AVAudioFormat(standardFormatWithSampleRate: 48000, channels: 1),
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else {
            reject("FORMAT_ERROR", "Failed to create audio buffer", nil)
            return
        }

        buffer.frameLength = frameCount
        let channelData = buffer.floatChannelData![0]
        for (index, sample) in samples.enumerated() {
            channelData[index] = sample
        }

        player.scheduleBuffer(buffer, completionHandler: nil)

        if !player.isPlaying {
            player.play()
        }

        resolve(["played": true, "samples": samples.count])
    }

    @objc func setMixVolumes(_ originalVol: NSNumber,
                             dubbedVol: NSNumber,
                             resolver resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) {
        originalVolume = originalVol.floatValue
        dubbedVolume = dubbedVol.floatValue

        // Adjust mixer volumes (implementation depends on how video audio is routed)
        playerNode?.volume = dubbedVolume

        resolve(["original": originalVolume, "dubbed": dubbedVolume])
    }

    @objc func stop(_ resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
        playerNode?.stop()
        audioEngine?.stop()
        resolve(["stopped": true])
    }

    @objc override static func requiresMainQueueSetup() -> Bool {
        return false
    }
}
```

```objc
// ios-app/BayitPlus/Dubbing/AudioDubbingModule.m (Bridge Header)

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(AudioDubbingModule, RCTEventEmitter)

RCT_EXTERN_METHOD(initialize:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(playPCMAudio:(NSArray<NSNumber *> *)pcmData
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setMixVolumes:(NSNumber *)originalVol
                  dubbedVol:(NSNumber *)dubbedVol
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stop:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
```

### 8.4 Android Native Module (Kotlin)

```kotlin
// android-app/app/src/main/java/com/bayitplus/dubbing/AudioDubbingModule.kt

package com.bayitplus.dubbing

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class AudioDubbingModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var audioTrack: AudioTrack? = null
    private val sampleRate = 48000
    private var isInitialized = false

    override fun getName(): String = "AudioDubbingModule"

    @ReactMethod
    fun initialize(promise: Promise) {
        try {
            val bufferSize = AudioTrack.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_FLOAT
            )

            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MOVIE)
                .build()

            val audioFormat = AudioFormat.Builder()
                .setSampleRate(sampleRate)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
                .build()

            audioTrack = AudioTrack.Builder()
                .setAudioAttributes(audioAttributes)
                .setAudioFormat(audioFormat)
                .setBufferSizeInBytes(bufferSize * 4) // Extra buffer for dubbed audio
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()

            audioTrack?.play()
            isInitialized = true

            val result = Arguments.createMap()
            result.putString("status", "initialized")
            result.putInt("bufferSize", bufferSize)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("INIT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun playPCMAudio(pcmData: ReadableArray, promise: Promise) {
        if (!isInitialized || audioTrack == null) {
            promise.reject("NOT_INITIALIZED", "Audio track not initialized")
            return
        }

        try {
            // Convert ReadableArray to FloatArray
            val samples = FloatArray(pcmData.size()) { i ->
                pcmData.getDouble(i).toFloat()
            }

            // Write to AudioTrack
            val written = audioTrack?.write(
                samples,
                0,
                samples.size,
                AudioTrack.WRITE_NON_BLOCKING
            ) ?: 0

            val result = Arguments.createMap()
            result.putBoolean("played", written > 0)
            result.putInt("samplesWritten", written)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("PLAY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setMixVolumes(originalVol: Double, dubbedVol: Double, promise: Promise) {
        try {
            // Set dubbed audio volume (0.0 - 1.0)
            audioTrack?.setVolume(dubbedVol.toFloat())

            // Note: Original video audio volume controlled via React Native Video player

            val result = Arguments.createMap()
            result.putDouble("original", originalVol)
            result.putDouble("dubbed", dubbedVol)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("VOLUME_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        try {
            audioTrack?.stop()
            audioTrack?.release()
            audioTrack = null
            isInitialized = false

            val result = Arguments.createMap()
            result.putBoolean("stopped", true)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
```

```kotlin
// android-app/app/src/main/java/com/bayitplus/dubbing/AudioDubbingPackage.kt

package com.bayitplus.dubbing

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AudioDubbingPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(AudioDubbingModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
```

### 8.5 React Native Bridge (TypeScript)

```typescript
// shared/services/dubbing/DubbingAudioMixer.native.ts

import { NativeModules, Platform, NativeEventEmitter } from 'react-native';
import { getLogger } from '@/utils/logger';

const logger = getLogger('DubbingAudioMixer.native');

const { AudioDubbingModule } = NativeModules;

if (!AudioDubbingModule) {
  throw new Error('AudioDubbingModule is not available. Check native module linking.');
}

const eventEmitter = new NativeEventEmitter(AudioDubbingModule);

export interface AudioMixerConfig {
  originalVolume: number;
  dubbedVolume: number;
  syncDelayMs: number;
}

export class DubbingAudioMixer {
  private isInitialized = false;
  private eventSubscriptions: Array<{ remove: () => void }> = [];

  async initialize(): Promise<void> {
    try {
      const result = await AudioDubbingModule.initialize();
      this.isInitialized = true;
      logger.info('Native audio mixer initialized', result);

      // Subscribe to native events
      this.eventSubscriptions.push(
        eventEmitter.addListener('onDubbingError', this.handleNativeError)
      );
    } catch (error) {
      logger.error('Failed to initialize native audio mixer', error);
      throw error;
    }
  }

  private handleNativeError = (event: { message: string }) => {
    logger.error('Native audio error', event);
  };

  setOriginalVolume(volume: number): void {
    // Original volume controlled via react-native-video volume prop
    // This is a no-op on native - volume is set at player level
    logger.debug('setOriginalVolume (native): controlled via video player', { volume });
  }

  setDubbedVolume(volume: number): void {
    if (!this.isInitialized) {
      logger.warn('setDubbedVolume called before initialization');
      return;
    }

    AudioDubbingModule.setMixVolumes(1.0, Math.max(0, Math.min(1, volume)))
      .catch((error: Error) => logger.error('Failed to set volume', error));
  }

  async playDubbedAudio(pcmData: ArrayBuffer): Promise<void> {
    if (!this.isInitialized) {
      logger.warn('playDubbedAudio called before initialization');
      return;
    }

    try {
      // Convert ArrayBuffer to Float32Array, then to number array
      const samples = new Float32Array(pcmData.byteLength / 2);
      const view = new DataView(pcmData);

      for (let i = 0; i < samples.length; i++) {
        // Convert 16-bit PCM to float (-1.0 to 1.0)
        const sample = view.getInt16(i * 2, true);
        samples[i] = sample / 32768;
      }

      // Convert to regular array for native module bridge
      const samplesArray = Array.from(samples);

      await AudioDubbingModule.playPCMAudio(samplesArray);
    } catch (error) {
      logger.error('Failed to play dubbed audio', error);
    }
  }

  getAudioLevel(): number {
    // Native module could expose this, but not critical for MVP
    return -30; // Placeholder
  }

  destroy(): void {
    this.eventSubscriptions.forEach(sub => sub.remove());
    this.eventSubscriptions = [];

    AudioDubbingModule.stop()
      .then(() => {
        this.isInitialized = false;
        logger.info('Native audio mixer destroyed');
      })
      .catch((error: Error) => logger.error('Failed to stop native audio', error));
  }

  get initialized(): boolean {
    return this.isInitialized;
  }
}
```

### 8.6 Mobile WebSocket with App Lifecycle

```typescript
// shared/services/dubbing/WebSocketConnection.native.ts

import { AppState, AppStateStatus, NativeEventEmitter, NativeModules } from 'react-native';
import { getLogger } from '@/utils/logger';

const logger = getLogger('WebSocketConnection.native');

export class MobileWebSocketConnection {
  private ws: WebSocket | null = null;
  private appState: AppStateStatus = 'active';
  private appStateSubscription: { remove: () => void } | null = null;
  private reconnectOnForeground = false;
  private lastConnectionParams: {
    url: string;
    authMessage: object;
  } | null = null;

  constructor() {
    this.setupAppLifecycleHandling();
  }

  private setupAppLifecycleHandling(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );
    this.appState = AppState.currentState;
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    logger.debug('App state changed', { from: this.appState, to: nextAppState });

    if (nextAppState === 'background' && this.ws) {
      // iOS/Android limit background network activity
      logger.info('App backgrounded, closing WebSocket');
      this.reconnectOnForeground = true;
      this.ws.close(1001, 'App backgrounded');
    } else if (
      nextAppState === 'active' &&
      this.appState !== 'active' &&
      this.reconnectOnForeground &&
      this.lastConnectionParams
    ) {
      // App returned to foreground - reconnect
      logger.info('App foregrounded, reconnecting WebSocket');
      this.reconnect();
    }

    this.appState = nextAppState;
  };

  async connect(
    url: string,
    authMessage: object,
    onMessage: (data: any) => void,
    onClose: (event: CloseEvent) => void
  ): Promise<void> {
    this.lastConnectionParams = { url, authMessage };
    this.reconnectOnForeground = false;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        logger.info('WebSocket connected');
        this.ws?.send(JSON.stringify(authMessage));
      };

      this.ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          const message = JSON.parse(event.data);
          if (message.type === 'connected') {
            resolve();
          }
          onMessage(message);
        } else if (event.data instanceof ArrayBuffer) {
          onMessage({ type: 'audio', data: event.data });
        }
      };

      this.ws.onerror = (error) => {
        logger.error('WebSocket error', error);
        reject(new Error('WebSocket connection failed'));
      };

      this.ws.onclose = (event) => {
        logger.info('WebSocket closed', { code: event.code, reason: event.reason });
        onClose(event);
      };
    });
  }

  private async reconnect(): Promise<void> {
    if (!this.lastConnectionParams) return;

    try {
      logger.info('Attempting reconnection');
      // Reconnection will be handled by the LiveDubbingService
      // which subscribes to state changes
    } catch (error) {
      logger.error('Reconnection failed', error);
    }
  }

  send(data: string | ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  close(): void {
    this.reconnectOnForeground = false;
    this.ws?.close(1000, 'User disconnected');
    this.ws = null;
  }

  destroy(): void {
    this.close();
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    this.lastConnectionParams = null;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
```

### 8.7 Mobile Performance Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Frame Rate** | 60 fps | No UI jank during dubbing |
| **Memory Overhead** | < 50 MB | Audio buffers + native modules |
| **Audio Latency** | < 100 ms (device) | Native AudioTrack/AVAudioEngine |
| **Battery Drain** | < 5%/hour | Background audio minimized |
| **Max Reconnect Time** | 3 seconds | After app foreground |
| **Keepalive Interval** | 30 seconds | Prevent connection timeout |

### 8.8 Mobile Files Summary

| File | Platform | Purpose |
|------|----------|---------|
| `shared/services/dubbing/DubbingService.native.ts` | iOS/Android/tvOS | Native module orchestration |
| `shared/services/dubbing/DubbingAudioMixer.native.ts` | iOS/Android/tvOS | Native audio bridge |
| `shared/services/dubbing/WebSocketConnection.native.ts` | iOS/Android/tvOS | App lifecycle handling |
| `ios-app/BayitPlus/Dubbing/AudioDubbingModule.swift` | iOS/tvOS | AVAudioEngine integration |
| `ios-app/BayitPlus/Dubbing/AudioDubbingModule.m` | iOS/tvOS | React Native bridge header |
| `android-app/.../AudioDubbingModule.kt` | Android | AudioTrack integration |
| `android-app/.../AudioDubbingPackage.kt` | Android | React Native package |

---

## 9. Verification Checklist

### Pre-Implementation
- [ ] Environment variables configured
- [ ] Redis/Memorystore provisioned
- [ ] ElevenLabs API quotas checked
- [ ] Feature flags configured

### Backend
- [ ] All unit tests passing (87%+ coverage)
- [ ] Integration tests passing
- [ ] Server starts without errors
- [ ] WebSocket health check returns 200

### Frontend
- [ ] TypeScript compiles without errors
- [ ] Lint passes
- [ ] Build succeeds
- [ ] Safari fallback works
- [ ] Accessibility audit passes

### E2E
- [ ] Connection lifecycle test passes
- [ ] Latency SLA test passes
- [ ] Reconnection test passes
- [ ] Premium gating test passes

### Deployment
- [ ] Feature flag disabled in production
- [ ] Monitoring dashboards created
- [ ] Alerts configured
- [ ] Rollback procedure tested

---

*Document Version: 2.1*
*Last Updated: 2026-01-22*
*Status: Pending Final Multi-Agent Review (Round 3)*

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-22 | Initial plan |
| 2.0 | 2026-01-22 | Addressed all 13 agent reviews (Round 1) |
| 2.1 | 2026-01-22 | Added Mobile Platform Architecture (Section 8) - Native modules for iOS/Android/tvOS |
