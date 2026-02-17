# VOD Avatar Interaction - Phase 3: Enhanced Features

## Implementation Plan

**Date:** 2026-02-17
**Status:** Planning
**Depends On:** Phase 1 (MVP) - Completed 2026-02-15
**Platforms:** Backend, Web, iOS, tvOS, Android

---

## Executive Summary

Phase 1 delivered text-based avatar-character interactions at curated video moments with animated responses via ElevenLabs/Creatify. Phase 2 transforms this into a real-time, voice-driven, spatially-aware, multi-character, and social experience.

Four workstreams, ordered by dependency:

| # | Workstream | Description | New Files | Modified Files |
|---|-----------|-------------|-----------|----------------|
| 1 | Voice Interaction | Replace text input with speech; WebSocket streaming | 8 | 6 |
| 2 | Smart Avatar Positioning | Scene-aware avatar placement avoiding key visuals | 4 | 5 |
| 3 | Multi-Character Interactions | Multiple characters per scene, turn-based dialogue | 5 | 7 |
| 4 | Shared Interactive Sessions | Watch Party integration, multi-user avatars | 6 | 5 |

**Estimated total:** 23 new files, 23 modified files (all < 200 lines)

---

## Phase 1 Recap: What Already Exists

### Backend Services (reusable as-is)
- `interaction_service.py` - Session orchestration, credit charging
- `character_ai.py` - Claude Sonnet 4 dialogue generation with emotion inference
- `character_animator.py` - ElevenLabs TTS + Creatify Aurora lip-sync pipeline
- `reel_compositor.py` - FFmpeg-based reel generation with GCS upload
- `creatify_client.py` - Aurora API client with polling + GCS persistence
- `elevenlabs_animator.py` - TTS + video generation

### Data Models (extend, not replace)
- `InteractiveMoment` - Curated moment metadata in content documents
- `VODInteractionSession` - Runtime session state with dialogue history
- `DialogueExchange` - Individual conversation turns
- `VODInteractionReel` - Final compiled reel

### API Routes
- `POST /vod-interactions/sessions/start`
- `POST /vod-interactions/sessions/{session_id}/message`
- `POST /vod-interactions/sessions/{session_id}/complete`
- `POST /vod-interactions/reels/generate`

### Frontend (all platforms)
- Web: `VODInteractionPlayer`, `InteractiveMomentPrompt`, `InteractionOverlay`, `useVODInteraction` hook
- iOS: `VODInteractionViewModel`, `InteractiveMomentOverlayView`, `PlayerView+VODInteractions`
- tvOS: Same as iOS (shared ViewModel)
- Android: Minimal (models only)

### Existing Infrastructure Phase 2 Leverages
- **WebSocket auth pattern** from `websocket_v2v.py` (token-based, rate-limited)
- **Enhanced ASR** from `enhanced_asr_service.py` (Whisper + child-speech + code-switch detection)
- **FFmpeg service** (video analysis, overlay, concatenation, HLS conversion)
- **Watch Party** system (room codes, connection manager, broadcast)
- **Credit/metering** service with per-feature deduction
- **Biometric consent** system with PIN-protected consent types
- **GCS storage** service with signed URLs

---

## Workstream 1: Voice Interaction

**Goal:** Replace text input with real-time speech. User speaks to character via microphone; speech is transcribed, character responds with animated lip-sync, all within ~5 seconds.

### Architecture

```
User speaks into mic
       |
       v
[Browser/iOS: capture audio chunks]
       |
       v (WebSocket binary frames)
[Backend: /ws/vod-interaction/{session_id}]
       |
       v
[enhanced_asr_service.transcribe_child_speech()]
       |
       v
[character_ai_service.generate_response()]
       |
       v
[character_animator_service.animate_character_response()]
       |
       v (WebSocket JSON: {audio_url, video_url, text})
[Client: play animated character response]
```

### 1.1 Backend - WebSocket Endpoint

**New file:** `backend/app/api/routes/websocket_vod_interaction.py` (< 200 lines)

Follows the exact pattern from `websocket_v2v.py`:

```python
router = APIRouter()

@router.websocket("/ws/vod-interaction/{session_id}")
async def vod_interaction_ws(websocket: WebSocket, session_id: str):
    """Real-time voice interaction with movie characters."""
    await websocket.accept()

    # 1. Authenticate (reuse existing helper)
    token, error = await check_authentication_message(websocket)

    # 2. Validate session ownership + status
    session = await VODInteractionSession.get(session_id)

    # 3. Message loop
    while True:
        data = await websocket.receive()

        if data["type"] == "bytes":
            # Audio chunk from microphone
            transcript = await enhanced_asr_service.transcribe_child_speech(
                audio_data=data["bytes"],
                language_hints=["he", "en"],
            )
            # Process as user message
            exchange = await interaction_service.process_user_message(
                session_id=session_id,
                user_message=transcript.text,
            )
            await websocket.send_json({
                "type": "character_response",
                "text": exchange.message_text,
                "audio_url": exchange.audio_url,
                "animated_video_url": exchange.animated_video_url,
                "emotion": exchange.emotion,
                "transcript": transcript.text,
            })

        elif data.get("text"):
            msg = json.loads(data["text"])
            if msg["type"] == "end_session":
                await interaction_service.complete_session(session_id)
                await websocket.send_json({"type": "session_ended"})
                break
```

**Message protocol:**

| Direction | Type | Payload |
|-----------|------|---------|
| Client -> Server | binary | Raw audio bytes (PCM 16-bit, 16kHz mono) |
| Client -> Server | `{"type": "text_message"}` | `{"message": "..."}` (fallback text input) |
| Client -> Server | `{"type": "end_session"}` | - |
| Server -> Client | `{"type": "character_response"}` | `{text, audio_url, animated_video_url, emotion, transcript}` |
| Server -> Client | `{"type": "transcript"}` | `{text, language, is_final}` (interim transcription) |
| Server -> Client | `{"type": "error"}` | `{message, recoverable}` |
| Server -> Client | `{"type": "session_ended"}` | - |

### 1.2 Backend - Streaming Transcription Support

**New file:** `backend/app/services/vod_interaction/voice_interaction_handler.py` (< 200 lines)

Wraps the ASR + character AI + animator pipeline into a single async handler:

```python
class VoiceInteractionHandler:
    """Processes voice input and produces animated character responses."""

    async def process_voice_input(
        self,
        session: VODInteractionSession,
        audio_data: bytes,
    ) -> VoiceInteractionResult:
        # 1. Transcribe child speech (Whisper)
        transcript = await enhanced_asr_service.transcribe_child_speech(
            audio_data=audio_data,
            language_hints=settings.WHISPER_LANGUAGE_HINTS,
        )

        if not transcript.text.strip():
            return VoiceInteractionResult(
                status="empty_transcript",
                transcript="",
            )

        # 2. Generate character response (Claude)
        character_response = await character_ai_service.generate_response(
            character_name=session.character_name,
            scene_context=self._get_scene_context(session),
            user_message=transcript.text,
            conversation_history=session.dialogue_exchanges,
        )

        # 3. Animate character (ElevenLabs/Creatify)
        animated = await character_animator_service.animate_character_response(
            character_name=session.character_name,
            dialogue_text=character_response.text,
            character_frame_url=self._get_character_frame(session),
            voice_id=self._get_voice_id(session.character_name),
        )

        # 4. Save exchanges (user + character)
        user_exchange = DialogueExchange(
            speaker="user",
            message_text=transcript.text,
            audio_url=await self._store_user_audio(session, audio_data),
            timestamp=datetime.utcnow(),
        )
        character_exchange = DialogueExchange(
            speaker="character",
            message_text=character_response.text,
            audio_url=animated.audio_url,
            animated_video_url=animated.video_url,
            emotion=character_response.emotion,
            timestamp=datetime.utcnow(),
        )

        session.dialogue_exchanges.extend([user_exchange, character_exchange])
        await session.save()

        # 5. Charge credits
        await credit_service.deduct(
            session.user_id, settings.CREDIT_RATE_VOD_INTERACTION_MESSAGE,
            feature="vod_interaction_voice",
            metadata={"session_id": str(session.id)},
        )

        return VoiceInteractionResult(
            status="success",
            transcript=transcript.text,
            character_text=character_response.text,
            character_audio_url=animated.audio_url,
            character_video_url=animated.video_url,
            emotion=character_response.emotion,
        )
```

### 1.3 Backend - Config Additions

**Modified file:** `backend/app/core/config.py`

```python
# Voice Interaction settings
VOD_INTERACTION_VOICE_ENABLED: bool = True
VOD_INTERACTION_AUDIO_FORMAT: str = "pcm_16k_mono"  # Expected input format
VOD_INTERACTION_MAX_AUDIO_CHUNK_BYTES: int = 512000  # 500KB per chunk
VOD_INTERACTION_VOICE_TIMEOUT_SECONDS: int = 30  # Max silence before auto-end
VOD_INTERACTION_INTERIM_TRANSCRIPTS: bool = True  # Send partial transcriptions
```

### 1.4 Web - Voice Input Component

**New file:** `web/src/components/vod-interactions/VoiceInteractionInput.tsx` (< 200 lines)

```tsx
/**
 * Microphone capture + WebSocket streaming for voice interactions.
 * Uses Web Audio API for capture, sends PCM chunks over WebSocket.
 * Falls back to text input if microphone not available.
 */
export const VoiceInteractionInput: React.FC<Props> = ({
  sessionId,
  onTranscript,
  onCharacterResponse,
  onError,
}) => {
  // MediaRecorder for audio capture
  // WebSocket connection to /ws/vod-interaction/{sessionId}
  // Visual waveform indicator during recording
  // Push-to-talk or voice activity detection (VAD)
  // Interim transcript display
};
```

**New file:** `web/src/hooks/useVoiceInteractionWS.ts` (< 200 lines)

```typescript
/**
 * WebSocket hook for voice-based VOD interactions.
 * Manages connection lifecycle, audio streaming, and response handling.
 */
export const useVoiceInteractionWS = (sessionId: string) => {
  // Connect to /ws/vod-interaction/{sessionId}
  // Authenticate with stored token
  // Stream audio chunks as binary frames
  // Receive character responses as JSON
  // Handle reconnection and error recovery
  // Return: {isConnected, isRecording, startRecording, stopRecording, lastTranscript, sendTextFallback}
};
```

### 1.5 Web - Modified InteractionOverlay

**Modified file:** `web/src/components/vod-interactions/InteractionOverlay.tsx`

Changes:
- Replace text input with `VoiceInteractionInput` when voice is enabled
- Keep text input as fallback (togglable)
- Add voice activity indicator (pulsing microphone icon)
- Display interim transcripts while user speaks
- Auto-play character response video when received via WebSocket

### 1.6 iOS - Voice Capture

**New file:** `ios-app/BayitPlusApp/Services/VoiceInteractionService.swift` (< 200 lines)

```swift
/// Manages microphone capture and WebSocket streaming for voice interactions.
/// Uses AVAudioEngine for real-time audio capture and URLSessionWebSocketTask
/// for streaming to the backend.
class VoiceInteractionService: ObservableObject {
    @Published var isRecording = false
    @Published var lastTranscript = ""
    @Published var isProcessing = false

    private var audioEngine: AVAudioEngine?
    private var webSocketTask: URLSessionWebSocketTask?

    func startVoiceSession(sessionId: String) async throws
    func stopRecording()
    func sendAudioChunk(_ data: Data) async throws
    func disconnect()
}
```

**Modified file:** `ios-app/BayitPlusApp/Views/Player/InteractiveMomentOverlayView.swift`

Changes:
- Add microphone button alongside existing avatar/character circles
- Show waveform visualization during recording
- Display transcript text below avatar circle
- Support both voice and pre-generated video modes

### 1.7 tvOS - Voice via Siri Remote

**New file:** `ios-app/BayitPlusTVApp/Services/TVVoiceInteractionService.swift` (< 200 lines)

tvOS uses Siri Remote microphone button for voice input:
```swift
/// tvOS voice interaction using Siri Remote microphone.
/// Captures audio via SFSpeechRecognizer for on-device transcription,
/// then sends text to backend for character response generation.
class TVVoiceInteractionService: ObservableObject {
    // Uses SFSpeechRecognizer for on-device STT (lower latency on tvOS)
    // Sends transcribed text via REST API (not WebSocket, simpler for tvOS)
    // Receives character response and plays animated video
}
```

### 1.8 Android - Voice Capture

**New file:** `android-app/app/src/main/java/tv/bayit/plus/ui/screens/zehani/VoiceInteractionService.kt` (< 200 lines)

```kotlin
/**
 * Android voice capture using AudioRecord + OkHttp WebSocket.
 * Streams PCM audio to backend, receives character responses.
 */
class VoiceInteractionService @Inject constructor(
    private val okHttpClient: OkHttpClient,
) {
    // AudioRecord for microphone capture (PCM 16-bit, 16kHz)
    // OkHttp WebSocket for streaming
    // StateFlow<VoiceInteractionState> for UI binding
}
```

---

## Workstream 2: Smart Avatar Positioning

**Goal:** Dynamically position avatar overlays to avoid obscuring important visual content (faces, text, action). Uses FFmpeg scene analysis and character detection.

### Architecture

```
Content tagged with interactive moments
       |
       v (admin/curation tool or automated pipeline)
[Scene Analyzer: extract frame at moment.timestamp]
       |
       v
[FFmpeg: detect faces/regions of interest]
       |
       v
[Compute safe zones for avatar placement]
       |
       v
[Store position_hint in InteractiveMoment metadata]
       |
       v (runtime)
[Client reads position_hint, places avatar accordingly]
```

### 2.1 Backend - Scene Analysis Service

**New file:** `backend/app/services/vod_interaction/scene_analyzer.py` (< 200 lines)

```python
class SceneAnalyzer:
    """Analyzes video frames to determine safe avatar placement zones."""

    async def analyze_frame_for_placement(
        self,
        content_id: str,
        timestamp: float,
    ) -> AvatarPlacement:
        """
        1. Extract frame at timestamp via FFmpeg
        2. Detect faces/regions of interest
        3. Compute safe placement quadrants
        4. Return recommended position + fallback
        """

    async def extract_frame(
        self, video_url: str, timestamp: float,
    ) -> bytes:
        """Extract single frame as JPEG using FFmpeg."""
        # ffmpeg -ss {timestamp} -i {video_url} -frames:v 1 -f image2 -

    async def detect_regions_of_interest(
        self, frame_data: bytes,
    ) -> List[BoundingBox]:
        """
        Detect important visual regions using:
        1. FFmpeg cropdetect filter for active area
        2. Face detection via MediaPipe or dlib (if available)
        3. Fallback: rule-of-thirds heuristic
        """

    def compute_safe_placement(
        self,
        frame_width: int,
        frame_height: int,
        regions: List[BoundingBox],
        avatar_size: tuple,
    ) -> AvatarPlacement:
        """
        Score each candidate position (corners + edges):
        - bottom-left, bottom-right, top-left, top-right
        - Penalize overlap with regions of interest
        - Prefer bottom corners (natural viewing)
        - Return best position + confidence score
        """
```

### 2.2 Backend - Placement Models

**Modified file:** `backend/app/models/vod_interaction.py`

Add to `InteractiveMoment`:
```python
class AvatarPlacement(BaseModel):
    """Recommended avatar position for an interactive moment."""
    position: str = Field(
        default="bottom_left",
        description="Quadrant: bottom_left, bottom_right, top_left, top_right",
    )
    offset_x: float = Field(default=0.0, description="X offset from corner (0.0-1.0)")
    offset_y: float = Field(default=0.0, description="Y offset from corner (0.0-1.0)")
    confidence: float = Field(default=0.5, description="Confidence in placement (0.0-1.0)")
    fallback_position: str = Field(default="bottom_right")
    regions_of_interest: List[dict] = Field(
        default_factory=list,
        description="Detected bounding boxes [{x, y, w, h, label}]",
    )

# Add field to InteractiveMoment:
avatar_placement: Optional[AvatarPlacement] = Field(
    None, description="Computed safe placement for avatar overlay",
)
```

### 2.3 Backend - Batch Analysis Endpoint

**New file:** `backend/app/api/routes/vod_interaction_admin.py` (< 200 lines)

Admin endpoint to pre-compute placements for all interactive moments in a content item:

```python
@router.post("/vod-interactions/admin/analyze-placements/{content_id}")
async def analyze_placements(
    content_id: str,
    current_user: User = Depends(get_admin_user),
):
    """Pre-compute avatar placements for all interactive moments."""
    content = await Content.get(content_id)
    analyzer = SceneAnalyzer()

    for moment in content.interactive_moments:
        placement = await analyzer.analyze_frame_for_placement(
            content_id=content_id,
            timestamp=moment.timestamp,
        )
        moment.avatar_placement = placement

    await content.save()
    return {"analyzed": len(content.interactive_moments)}
```

### 2.4 Frontend - Dynamic Positioning (All Platforms)

**Modified file:** `web/src/components/vod-interactions/InteractionOverlay.tsx`

```tsx
// Read placement from moment metadata
const placement = moment.avatar_placement || { position: "bottom_left" };

// Compute CSS position from placement
const positionStyles = computeOverlayPosition(placement, containerRect);

// Apply to avatar and character elements
<div style={positionStyles.avatar}>
  <Avatar3DViewer />
</div>
<div style={positionStyles.character}>
  <video ref={characterVideoRef} />
</div>
```

**Modified file:** `ios-app/BayitPlusApp/Views/Player/InteractiveMomentOverlayView.swift`

```swift
// Read placement from activeMoment.avatarPlacement
// Compute frame position based on quadrant + offsets
// Animate transition when position changes between moments
private func overlayAlignment(for placement: AvatarPlacement?) -> Alignment {
    switch placement?.position {
    case "bottom_right": return .bottomTrailing
    case "top_left": return .topLeading
    case "top_right": return .topTrailing
    default: return .bottomLeading
    }
}
```

**Modified file:** `android-app/.../InteractionOverlayComposable.kt`

```kotlin
// BiasAlignment from placement metadata
val alignment = when (placement?.position) {
    "bottom_right" -> Alignment.BottomEnd
    "top_left" -> Alignment.TopStart
    "top_right" -> Alignment.TopEnd
    else -> Alignment.BottomStart
}
```

---

## Workstream 3: Multi-Character Interactions

**Goal:** Support scenes with 2-3 characters. User can talk to each character; characters can respond to each other. Turn-based dialogue with character relationship awareness.

### Architecture

```
InteractiveMoment defines multiple characters
       |
       v
[User selects character to address]
       |
       v
[Character AI generates response with multi-character context]
       |
       v (optional)
[Other characters react (1-sentence interjection)]
       |
       v
[Animate each character response independently]
       |
       v
[Client plays responses sequentially with transitions]
```

### 3.1 Backend - Extended Models

**Modified file:** `backend/app/models/vod_interaction.py`

```python
class CharacterProfile(BaseModel):
    """Character metadata for multi-character scenes."""
    name: str
    voice_id: str
    frame_url: Optional[str] = None
    personality_traits: List[str] = Field(default_factory=list)
    relationship_to_others: dict = Field(
        default_factory=dict,
        description="Map of character_name -> relationship (friend, rival, mentor, parent)",
    )

# Extend InteractiveMoment:
characters: List[CharacterProfile] = Field(
    default_factory=list,
    description="Characters available in this moment (empty = single character mode)",
)
allow_cross_character_reactions: bool = Field(
    default=False,
    description="Whether other characters can interject during dialogue",
)
max_active_characters: int = Field(
    default=1,
    description="Max characters responding simultaneously (1=turn-based, 2-3=group)",
)

# Extend DialogueExchange:
addressed_to: Optional[str] = Field(
    None, description="Character the user is speaking to (multi-character mode)",
)
reaction_to: Optional[str] = Field(
    None, description="If this is a reaction to another character's dialogue",
)
```

### 3.2 Backend - Multi-Character AI Service

**New file:** `backend/app/services/vod_interaction/multi_character_ai.py` (< 200 lines)

```python
class MultiCharacterAIService:
    """Generates dialogue for scenes with multiple characters."""

    async def generate_multi_character_response(
        self,
        addressed_character: str,
        all_characters: List[CharacterProfile],
        scene_context: str,
        user_message: str,
        conversation_history: List[DialogueExchange],
    ) -> MultiCharacterResponse:
        """
        1. Generate primary character response (addressed character)
        2. Optionally generate reactions from other characters
        3. Return ordered list of responses with timing hints
        """

    def _build_multi_character_prompt(
        self,
        addressed: CharacterProfile,
        others: List[CharacterProfile],
        scene_context: str,
        user_message: str,
        history: List[DialogueExchange],
    ) -> str:
        """
        Prompt includes:
        - All character personalities and relationships
        - Who the user is addressing
        - Scene context
        - Conversation history with speaker labels
        - Instruction for primary response + optional reactions
        """

    async def generate_reactions(
        self,
        primary_response: str,
        reacting_characters: List[CharacterProfile],
        scene_context: str,
    ) -> List[CharacterReaction]:
        """
        Generate 0-1 sentence reactions from other characters.
        Not every character reacts -- probability based on:
        - Relationship to addressed character
        - Relevance of the topic to the reacting character
        - Scene dynamics
        """
```

### 3.3 Backend - Extended Interaction Service

**Modified file:** `backend/app/services/vod_interaction/interaction_service.py`

Add to `VODInteractionService`:
```python
async def process_multi_character_message(
    self,
    session_id: str,
    user_message: str,
    addressed_character: str,
) -> List[DialogueExchange]:
    """
    Process user message in multi-character context.
    Returns list: [user_exchange, primary_response, ...reactions]
    """
    session = await VODInteractionSession.get(session_id)
    moment = await self._get_moment(session.content_id, session.moment_timestamp)

    # Get character profiles
    characters = moment.characters or [
        CharacterProfile(name=moment.character_name, voice_id=moment.voice_id)
    ]

    # Generate responses
    multi_response = await multi_character_ai_service.generate_multi_character_response(
        addressed_character=addressed_character,
        all_characters=characters,
        scene_context=moment.scene_context,
        user_message=user_message,
        conversation_history=session.dialogue_exchanges,
    )

    # Animate each response independently
    exchanges = []
    for response in multi_response.responses:
        char_profile = next(c for c in characters if c.name == response.character_name)
        animated = await character_animator_service.animate_character_response(
            character_name=response.character_name,
            dialogue_text=response.text,
            character_frame_url=char_profile.frame_url,
            voice_id=char_profile.voice_id,
        )
        exchange = DialogueExchange(
            speaker="character",
            message_text=response.text,
            audio_url=animated.audio_url,
            animated_video_url=animated.video_url,
            addressed_to=addressed_character,
            reaction_to=response.reaction_to,
            timestamp=datetime.utcnow(),
        )
        exchanges.append(exchange)

    session.dialogue_exchanges.extend(exchanges)
    await session.save()

    # Charge credits (1 per primary response, 0 for reactions)
    await credit_service.deduct(
        session.user_id, settings.CREDIT_RATE_VOD_INTERACTION_MESSAGE,
        feature="vod_interaction_multi_character",
    )

    return exchanges
```

### 3.4 API Route Extension

**Modified file:** `backend/app/api/routes/vod_interactions.py`

```python
@router.post("/sessions/{session_id}/multi-message")
async def send_multi_character_message(
    session_id: str,
    request: MultiCharacterMessageRequest,
    current_user: User = Depends(get_current_user),
):
    """Send message to a specific character in a multi-character scene."""
    exchanges = await interaction_service.process_multi_character_message(
        session_id=session_id,
        user_message=request.message,
        addressed_character=request.addressed_character,
    )
    return {
        "exchanges": [
            {
                "speaker": ex.speaker,
                "character_name": ex.message_text,  # TODO: add character_name field
                "response_text": ex.message_text,
                "audio_url": ex.audio_url,
                "animated_video_url": ex.animated_video_url,
                "is_reaction": ex.reaction_to is not None,
            }
            for ex in exchanges
        ]
    }
```

### 3.5 Frontend - Character Selection UI

**New file:** `web/src/components/vod-interactions/CharacterSelector.tsx` (< 200 lines)

```tsx
/**
 * Character selection strip for multi-character scenes.
 * Shows avatar circles for each available character.
 * Active character is highlighted; user taps to switch.
 */
export const CharacterSelector: React.FC<Props> = ({
  characters,
  activeCharacter,
  onSelectCharacter,
}) => {
  // Horizontal strip of character avatars
  // Name label below each
  // Glow effect on active character
  // Relationship indicators (friend/rival icons)
};
```

**Modified files (all platforms):**
- `web/src/components/vod-interactions/InteractionOverlay.tsx` - Add CharacterSelector above input
- `ios-app/.../InteractiveMomentOverlayView.swift` - Support multiple character circles
- `android-app/.../InteractionOverlayComposable.kt` - Character selection composable

### 3.6 Frontend - Sequential Response Playback

When multiple character responses arrive (primary + reactions), play them sequentially:

```
1. Primary character response video plays (2-4 seconds)
2. Brief transition (0.3s fade)
3. Reacting character video plays (1-2 seconds)
4. All character circles return to idle state
```

**Modified file:** `web/src/hooks/useVODInteraction.ts`

Add `playResponseSequence(exchanges)` that queues animated videos and plays them in order with transitions.

---

## Workstream 4: Shared Interactive Sessions

**Goal:** Multiple users in a Watch Party can participate in the same interactive moment. Each user's avatar appears in the scene. Synchronized playback + turn-based dialogue.

### Architecture

```
Host creates Watch Party (existing infrastructure)
       |
       v
[Interactive moment triggers for all participants]
       |
       v
[Each participant sees prompt simultaneously]
       |
       v
[Turn-based: participants take turns speaking to characters]
       |
       v
[Character responses broadcast to all participants]
       |
       v
[Composite reel includes all participants' avatars]
```

### 4.1 Backend - Shared Session Model

**New file:** `backend/app/models/shared_interaction.py` (< 200 lines)

```python
class SharedInteractionSession(Document):
    """Multi-user interaction session within a Watch Party."""
    party_id: str = Field(..., description="Watch Party room ID")
    content_id: str
    moment_timestamp: float
    character_name: str

    participants: List[SharedParticipant] = Field(default_factory=list)
    turn_order: List[str] = Field(
        default_factory=list,
        description="Ordered list of user_ids for turn-based dialogue",
    )
    current_turn_user_id: Optional[str] = None
    dialogue_exchanges: List[SharedDialogueExchange] = Field(default_factory=list)
    status: str = Field(default="waiting")  # waiting, active, completed

    class Settings:
        name = "shared_interaction_sessions"
        indexes = [
            IndexModel([("party_id", 1)]),
            IndexModel([("status", 1)]),
        ]


class SharedParticipant(BaseModel):
    """Participant in a shared interaction."""
    user_id: str
    profile_id: str
    avatar_id: str
    avatar_image_url: Optional[str] = None
    display_name: str


class SharedDialogueExchange(BaseModel):
    """Dialogue exchange with participant attribution."""
    participant_user_id: str
    participant_name: str
    speaker: str  # "user" or "character"
    message_text: str
    audio_url: Optional[str] = None
    animated_video_url: Optional[str] = None
    timestamp: datetime
```

### 4.2 Backend - Shared Interaction Service

**New file:** `backend/app/services/vod_interaction/shared_interaction_service.py` (< 200 lines)

```python
class SharedInteractionService:
    """Orchestrates multi-user interactive sessions within Watch Parties."""

    async def start_shared_session(
        self,
        party_id: str,
        content_id: str,
        moment_timestamp: float,
    ) -> SharedInteractionSession:
        """
        1. Get all participants from Watch Party
        2. Create SharedInteractionSession
        3. Randomize turn order
        4. Broadcast session start to all participants
        """

    async def process_participant_message(
        self,
        session_id: str,
        user_id: str,
        message: str,
    ) -> SharedDialogueExchange:
        """
        1. Verify it's this user's turn
        2. Generate character response with multi-participant context
        3. Broadcast response to all participants
        4. Advance turn to next participant
        """

    async def advance_turn(self, session: SharedInteractionSession):
        """Move to next participant in turn order. Skip disconnected users."""

    async def generate_shared_reel(
        self,
        session_id: str,
    ) -> VODInteractionReel:
        """
        Generate reel showing all participants' interactions.
        Uses highlight_rendering with multi-avatar layout.
        """
```

### 4.3 Backend - Watch Party Integration

**Modified file:** `backend/app/api/routes/party.py`

Add shared interaction endpoints within watch party context:

```python
@router.post("/parties/{party_id}/interaction/start")
async def start_party_interaction(
    party_id: str,
    request: StartSharedInteractionRequest,
    current_user: User = Depends(get_current_user),
):
    """Host triggers shared interaction for all party participants."""

@router.post("/parties/{party_id}/interaction/{session_id}/message")
async def send_party_interaction_message(
    party_id: str,
    session_id: str,
    request: UserMessageRequest,
    current_user: User = Depends(get_current_user),
):
    """Participant sends message during their turn."""
```

### 4.4 Backend - WebSocket Broadcast

**Modified file:** `backend/app/services/connection_manager.py`

Extend existing `broadcast_to_party` to support interaction-specific messages:

```python
async def broadcast_interaction_event(
    self,
    party_id: str,
    event_type: str,  # "interaction_start", "turn_change", "character_response", "interaction_end"
    data: dict,
):
    """Broadcast interaction event to all party participants."""
    message = {
        "type": "interaction_event",
        "event": event_type,
        "data": data,
    }
    await self.broadcast_to_party(party_id, message)
```

### 4.5 Frontend - Shared Session UI

**New file:** `web/src/components/vod-interactions/SharedInteractionOverlay.tsx` (< 200 lines)

```tsx
/**
 * Multi-user interaction overlay for Watch Parties.
 * Shows all participants' avatars, turn indicator, and shared conversation.
 */
export const SharedInteractionOverlay: React.FC<Props> = ({
  session,
  participants,
  currentTurnUserId,
  myUserId,
  onSendMessage,
}) => {
  // Row of participant avatars (max 4)
  // Active turn indicator (glowing border on current speaker)
  // "Your turn!" prompt when it's the user's turn
  // Shared conversation log visible to all
  // Character response video plays for everyone simultaneously
};
```

**New file:** `web/src/hooks/useSharedInteraction.ts` (< 200 lines)

```typescript
/**
 * Hook for shared interaction state within a Watch Party.
 * Listens to WebSocket broadcast for turn changes and responses.
 */
export const useSharedInteraction = (partyId: string) => {
  // Subscribe to party WebSocket for interaction events
  // Track current turn, all participants, conversation log
  // Provide sendMessage (only works when it's user's turn)
  // Return: {session, participants, currentTurn, isMyTurn, sendMessage, conversation}
};
```

### 4.6 iOS/tvOS - Shared Interaction Support

**New file:** `ios-app/BayitPlusApp/ViewModels/SharedInteractionViewModel.swift` (< 200 lines)

```swift
/// Manages shared interaction state for Watch Party sessions.
/// Listens to WebSocket broadcasts for turn changes and character responses.
class SharedInteractionViewModel: ObservableObject {
    @Published var participants: [SharedParticipant] = []
    @Published var currentTurnUserId: String?
    @Published var isMyTurn = false
    @Published var conversation: [SharedDialogueExchange] = []

    func joinSharedSession(partyId: String, sessionId: String) async
    func sendMessage(_ text: String) async throws
    func leaveSession()
}
```

---

## Config & Settings Summary

All new settings to add to `backend/app/core/config.py`:

```python
# Workstream 1: Voice Interaction
VOD_INTERACTION_VOICE_ENABLED: bool = True
VOD_INTERACTION_AUDIO_FORMAT: str = "pcm_16k_mono"
VOD_INTERACTION_MAX_AUDIO_CHUNK_BYTES: int = 512000
VOD_INTERACTION_VOICE_TIMEOUT_SECONDS: int = 30
VOD_INTERACTION_INTERIM_TRANSCRIPTS: bool = True

# Workstream 2: Smart Avatar Positioning
VOD_INTERACTION_SMART_POSITIONING: bool = True
VOD_INTERACTION_FACE_DETECTION_ENABLED: bool = True
VOD_INTERACTION_DEFAULT_AVATAR_POSITION: str = "bottom_left"

# Workstream 3: Multi-Character
VOD_INTERACTION_MULTI_CHARACTER_ENABLED: bool = True
VOD_INTERACTION_MAX_CHARACTERS_PER_MOMENT: int = 3
VOD_INTERACTION_REACTIONS_ENABLED: bool = True
VOD_INTERACTION_REACTION_PROBABILITY: float = 0.4

# Workstream 4: Shared Sessions
VOD_INTERACTION_SHARED_ENABLED: bool = True
VOD_INTERACTION_MAX_SHARED_PARTICIPANTS: int = 4
VOD_INTERACTION_TURN_TIMEOUT_SECONDS: int = 45
VOD_INTERACTION_SHARED_REEL_ENABLED: bool = True
```

---

## Consent & Privacy Additions

**Modified file:** `backend/app/models/biometric_consent.py`

Add consent type:
```python
class BiometricConsentType(str, Enum):
    # ... existing types ...
    VOICE_INTERACTION = "voice_interaction"  # Recording voice during VOD interactions
```

Voice interaction requires this consent before activating microphone capture. Text fallback always available without consent.

---

## Credit Costs

| Action | Credits | Config Key |
|--------|---------|------------|
| Text message to character | 1 | `CREDIT_RATE_VOD_INTERACTION_MESSAGE` (existing) |
| Voice message to character | 1 | `CREDIT_RATE_VOD_INTERACTION_MESSAGE` (same) |
| Multi-character response | 1 | `CREDIT_RATE_VOD_INTERACTION_MESSAGE` (reactions are free) |
| Shared session message | 1 | `CREDIT_RATE_VOD_INTERACTION_MESSAGE` (charged to speaker) |
| Reel generation | 25 | `CREDIT_RATE_VOD_INTERACTION_REEL` (existing) |
| Shared reel generation | 15 | `CREDIT_RATE_VOD_INTERACTION_SHARED_REEL` (new, split among participants) |

---

## Implementation Order & Dependencies

```
Workstream 1: Voice Interaction
  |
  |-- 1.1 Backend WebSocket endpoint
  |-- 1.2 Voice interaction handler
  |-- 1.3 Config additions
  |-- 1.4 Web voice input component + WS hook
  |-- 1.5 Web overlay modifications
  |-- 1.6 iOS voice capture service
  |-- 1.7 tvOS Siri Remote integration
  |-- 1.8 Android voice capture
  |
  v
Workstream 2: Smart Avatar Positioning (independent, can parallel with 1)
  |
  |-- 2.1 Scene analysis service
  |-- 2.2 Placement models
  |-- 2.3 Admin analysis endpoint
  |-- 2.4 Frontend positioning (all platforms)
  |
  v
Workstream 3: Multi-Character (depends on 1 for voice, but text works independently)
  |
  |-- 3.1 Extended models
  |-- 3.2 Multi-character AI service
  |-- 3.3 Extended interaction service
  |-- 3.4 API route extension
  |-- 3.5 Character selection UI (all platforms)
  |-- 3.6 Sequential response playback
  |
  v
Workstream 4: Shared Sessions (depends on 1 + 3)
  |
  |-- 4.1 Shared session model
  |-- 4.2 Shared interaction service
  |-- 4.3 Watch Party integration
  |-- 4.4 WebSocket broadcast extension
  |-- 4.5 Web shared session UI + hook
  |-- 4.6 iOS/tvOS shared interaction VM
```

**Parallelism:** Workstreams 1 and 2 can be developed in parallel. Workstream 3 can start backend work in parallel. Workstream 4 depends on 1 and 3 completing.

---

## File Inventory

### New Files (23)

| # | File | Workstream | Platform |
|---|------|-----------|----------|
| 1 | `backend/app/api/routes/websocket_vod_interaction.py` | 1 | Backend |
| 2 | `backend/app/services/vod_interaction/voice_interaction_handler.py` | 1 | Backend |
| 3 | `web/src/components/vod-interactions/VoiceInteractionInput.tsx` | 1 | Web |
| 4 | `web/src/hooks/useVoiceInteractionWS.ts` | 1 | Web |
| 5 | `ios-app/BayitPlusApp/Services/VoiceInteractionService.swift` | 1 | iOS |
| 6 | `ios-app/BayitPlusTVApp/Services/TVVoiceInteractionService.swift` | 1 | tvOS |
| 7 | `android-app/.../VoiceInteractionService.kt` | 1 | Android |
| 8 | `backend/app/services/vod_interaction/scene_analyzer.py` | 2 | Backend |
| 9 | `backend/app/api/routes/vod_interaction_admin.py` | 2 | Backend |
| 10 | `backend/app/services/vod_interaction/multi_character_ai.py` | 3 | Backend |
| 11 | `web/src/components/vod-interactions/CharacterSelector.tsx` | 3 | Web |
| 12 | `backend/app/models/shared_interaction.py` | 4 | Backend |
| 13 | `backend/app/services/vod_interaction/shared_interaction_service.py` | 4 | Backend |
| 14 | `web/src/components/vod-interactions/SharedInteractionOverlay.tsx` | 4 | Web |
| 15 | `web/src/hooks/useSharedInteraction.ts` | 4 | Web |
| 16 | `ios-app/BayitPlusApp/ViewModels/SharedInteractionViewModel.swift` | 4 | iOS |
| 17-23 | Android equivalents for WS 3 + 4 | 3, 4 | Android |

### Modified Files (23)

| # | File | Workstream | Changes |
|---|------|-----------|---------|
| 1 | `backend/app/core/config.py` | 1,2,3,4 | Add all new settings |
| 2 | `backend/app/models/vod_interaction.py` | 2,3 | AvatarPlacement, CharacterProfile, multi-char fields |
| 3 | `backend/app/models/biometric_consent.py` | 1 | Add VOICE_INTERACTION consent type |
| 4 | `backend/app/services/vod_interaction/interaction_service.py` | 3 | Add process_multi_character_message |
| 5 | `backend/app/api/routes/vod_interactions.py` | 3 | Add multi-message endpoint |
| 6 | `backend/app/api/routes/party.py` | 4 | Add shared interaction endpoints |
| 7 | `backend/app/services/connection_manager.py` | 4 | Add broadcast_interaction_event |
| 8 | `web/src/components/vod-interactions/InteractionOverlay.tsx` | 1,2,3 | Voice input, positioning, char selector |
| 9 | `web/src/hooks/useVODInteraction.ts` | 1,3 | Voice WS, multi-character, sequential playback |
| 10 | `ios-app/.../InteractiveMomentOverlayView.swift` | 1,2,3 | Voice button, positioning, multi-char |
| 11 | `ios-app/.../VODInteractionViewModel.swift` | 1,2,3 | Voice state, placement, multi-char |
| 12 | `ios-app/.../PlayerView+VODInteractions.swift` | 1 | Voice service integration |
| 13-23 | Android + tvOS equivalents | All | Platform-specific modifications |

---

## Success Metrics

### Voice Interaction (Workstream 1)
- Voice input adoption rate > 60% (vs text fallback)
- Transcription accuracy > 85% for Hebrew child speech
- End-to-end voice latency < 5 seconds (speak -> character response plays)
- Voice session completion rate > 70% (not abandoned mid-session)

### Smart Positioning (Workstream 2)
- Avatar placement satisfaction > 90% (no user complaints about obscured content)
- Face detection accuracy > 80% for common scenes
- Positioning computation < 500ms per frame

### Multi-Character (Workstream 3)
- Multi-character moment engagement > 2x single-character (more exchanges per session)
- Character reaction approval > 75% (users enjoy reactions)
- Average session length increase > 30%

### Shared Sessions (Workstream 4)
- Shared session adoption > 25% of Watch Party users
- Average participants per shared session > 2.5
- Shared reel generation rate > 40% of shared sessions
- Reel share rate > 2x solo reels

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Voice transcription inaccuracy for child Hebrew | Medium | High | Fallback to text input; tune Whisper prompts; use dialogue_options as hints |
| High latency in voice pipeline (STT + AI + TTS + animation) | Medium | High | Cache common character responses; pre-generate reactions; stream audio before video ready |
| Multi-character animation costs (2-3x per exchange) | Low | Medium | Reactions use text-only or static images; only primary response is animated |
| Watch Party sync issues during interactions | Medium | Medium | Server-authoritative turn order; 45s turn timeout; skip disconnected users |
| FFmpeg face detection quality varies by content | Low | Low | Fallback to rule-of-thirds heuristic; manual override in admin tool |
| Credit consumption spike with voice (faster exchanges) | Medium | Medium | Rate limit: max 10 voice exchanges per session; cooldown between exchanges |
