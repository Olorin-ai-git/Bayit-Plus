# VOD Avatar Interaction - Phase 2: Live Character-Avatar Dialogue

## Implementation Plan

**Date:** 2026-02-17
**Status:** Planning
**Depends On:** Phase 1 (MVP) - Completed 2026-02-15
**Platforms:** Backend, Web, iOS, tvOS, Android

---

## Goal

Allow the child's Avatar to talk to movie characters during playback. The movie keeps playing (volume ducks to 15%). The character responds with a lip-synced video generated from an LLM response + Creatify animation + the character's real voice.

**Example flow:**
1. Avatar says: "Doc Brown, how does time travel work?"
2. Question sent to LLM with Doc Brown's personality + movie context
3. LLM response text sent to Creatify with Doc Brown's voice sample
4. Creatify returns lip-synced video of Doc Brown answering
5. Character video plays in overlay circle next to avatar circle
6. Movie continues playing at 15% volume throughout

---

## What Phase 1 Already Built

### Backend (fully implemented, production-ready)
- `interaction_service.py` (264 lines) - Session orchestration with `start_interaction_session()`, `process_user_message()`, `complete_session()`
- `character_ai.py` (155 lines) - Claude Sonnet 4 dialogue generation with character prompts, emotion inference, conversation history (last 4 exchanges)
- `character_animator.py` (299 lines) - Dual-provider animation: ElevenLabs (TTS + video) or Creatify Aurora (TTS + lip-sync). GCS upload, ffprobe duration detection
- `reel_compositor.py` - Reel generation from sessions
- `vod_interaction.py` models - `InteractiveMoment`, `DialogueExchange`, `VODInteractionSession`, `VODInteractionReel`, `AnimatedResponse`, `CharacterResponse`
- `vod_interactions.py` routes - `POST /sessions/start`, `POST /sessions/{id}/message`, `POST /sessions/{id}/complete`
- `creatify_client.py` - Aurora API client with persona creation, lip-sync, polling
- `elevenlabs_animator.py` - TTS + video generation
- 9 character voices configured: Moshe, David, Miriam, Esther, Doc Brown, George McFly, Lorraine, Marty, Jennifer

### iOS (implemented but one-directional)
- `VODInteractionViewModel.swift` (89 lines) - Detects moments at timestamps, tracks triggered moments, phases: idle/playing
- `InteractiveMomentOverlayView.swift` (204 lines) - Dual-circle overlay (avatar left, character right), AVPlayer playback, auto-dismiss
- `PlayerView+VODInteractions.swift` (137 lines) - Volume ducking (15%), avatar status check, moment loading, initialization
- **Current behavior:** Pre-generated videos only (`moment.lipsyncVideoUrl`). Skips moments with no video. No user input. One-way: avatar plays, then character plays, then dismiss.

### Web (implemented but pauses video)
- `useVODInteraction.ts` (206 lines) - Moment detection, session management, message sending via REST
- `InteractionOverlay.tsx` (176 lines) - Full-screen overlay with text input, conversation history, character video playback
- `InteractiveMomentPrompt.tsx` - Auto-pause prompt at moment timestamps
- **Current behavior:** Pauses video (`onPauseRequested`). Shows full-screen overlay. Text-based chat interface. Resumes on "End Interaction."

### What's Missing for Phase 2

| Component | Current State | Phase 2 Need |
|-----------|--------------|--------------|
| User input during playback | Web: text chat (pauses video). iOS: none | Non-blocking text/voice input while movie plays |
| Character response generation | Backend: fully works | Already done - reuse as-is |
| Character voice samples | 9 voices configured in config.py | Already done - ElevenLabs voice IDs |
| Creatify animation | Fully integrated in character_animator.py | Already done - reuse as-is |
| Non-blocking overlay | iOS: already non-blocking. Web: full-screen, pauses | Web needs non-blocking overlay |
| Volume ducking | iOS: 15% ducking works | Web needs volume ducking |
| User-initiated dialogue | Neither platform | Avatar "talk" button + input UI |

---

## Architecture: Phase 2 Flow

```
[Movie plays at normal volume]
       |
User taps "Talk to Character" button on overlay
       |
[Movie volume ducks to 15%]
       |
[Avatar circle appears with input method (text or voice)]
       |
User types/says: "Doc Brown, how does time travel work?"
       |
       v  POST /vod-interactions/sessions/{id}/message
[Backend: interaction_service.process_user_message()]
       |
       v  character_ai_service.generate_response()
[Claude Sonnet 4: generates Doc Brown response with movie context]
       |
       v  character_animator_service.animate_character_response()
[ElevenLabs TTS (Doc Brown voice) + Creatify lip-sync video]
       |
       v  Returns: {response_text, audio_url, animated_video_url}
[Client plays character video in overlay circle]
       |
[Volume restores when character finishes speaking]
       |
[User can ask another question or dismiss]
```

Key difference from Phase 1: The user initiates the conversation at any time. The movie never pauses. The interaction is a floating overlay, not a full-screen takeover.

---

## Implementation Tasks

### Task 1: Backend - Free-Form Interaction Endpoint

Phase 1 sessions are bound to `InteractiveMoment` timestamps in content metadata. Phase 2 needs sessions that can start at any point during playback, with character info provided by the client.

**Modified file:** `backend/app/api/routes/vod_interactions.py`

Add new endpoint:

```python
class StartFreeInteractionRequest(BaseModel):
    """Request to start a free-form interaction (not tied to a curated moment)."""
    profile_id: str
    avatar_id: str
    content_id: str
    character_name: str
    current_timestamp: float  # Where the user is in the video
```

```python
@router.post("/sessions/start-free")
async def start_free_interaction_session(
    request: StartFreeInteractionRequest,
    current_user: User = Depends(get_current_user),
):
    """Start interaction at any point during playback (not moment-bound)."""
```

**Modified file:** `backend/app/services/vod_interaction/interaction_service.py`

Add `start_free_interaction_session()` that:
- Does NOT require an `InteractiveMoment` at the timestamp
- Looks up content metadata (title, description, genre) for scene context
- Uses character name from request to find voice ID
- Creates session with content-level context instead of moment-level

### Task 2: Backend - Content-Level Character Registry

Characters available for interaction need to be defined per content item, not just per moment.

**Modified file:** `backend/app/models/vod_interaction.py`

Add model:

```python
class ContentCharacter(BaseModel):
    """A character available for interaction in a content item."""
    name: str = Field(..., description="Character display name")
    voice_id: str = Field(..., description="ElevenLabs voice ID")
    frame_url: str = Field(..., description="GCS URL of character still image for Creatify")
    description: str = Field(..., description="Character personality/background for LLM prompt")
    movie_context: str = Field(..., description="Role in the movie, key scenes, relationships")
```

**Modified file:** Content model (via API response) should include:

```python
interactive_characters: List[ContentCharacter]  # Characters user can talk to
```

**New endpoint:** `GET /vod-interactions/characters/{content_id}`

Returns list of characters available for dialogue in this content. Used by frontends to show character selection.

### Task 3: Backend - Enhanced Character AI Prompt

Phase 1 prompt uses `scene_context` from curated moments. Phase 2 needs richer context from movie metadata since interactions happen at arbitrary timestamps.

**Modified file:** `backend/app/services/vod_interaction/character_ai.py`

Enhance `_build_character_prompt()`:

```python
def _build_character_prompt(
    self,
    character_name: str,
    character_description: str,  # NEW: personality, background
    movie_context: str,          # NEW: movie title, plot, character's role
    scene_context: str,          # Kept for curated moments, empty for free-form
    user_message: str,
    conversation_history: List[DialogueExchange],
) -> str:
    return f"""You are {character_name}.

Character: {character_description}

Movie/Show Context: {movie_context}

{f"Current Scene: {scene_context}" if scene_context else ""}

A child is watching and their avatar just said to you: "{user_message}"

Respond in character as {character_name} would:
- Stay true to your personality, values, and speech patterns
- Speak naturally and warmly to a child (simple Hebrew or English)
- Be educational and encouraging when appropriate
- Keep responses under 2 sentences for natural speech

Previous conversation:
{self._format_history(conversation_history)}

Respond as {character_name}:"""
```

### Task 4: iOS - User-Initiated Dialogue Overlay

Replace the current one-way overlay with an interactive one where the user can type a question while the movie plays.

**New file:** `ios-app/BayitPlusApp/Views/Player/AvatarDialogueOverlayView.swift` (< 200 lines)

Floating overlay that:
- Shows avatar circle (bottom-left) with a speech bubble / text input
- Character circle (bottom-right) appears when responding
- Text field for typing questions (compact, single-line with send button)
- Movie keeps playing, volume ducks to 15% when overlay is active
- Character response video plays in the character circle via AVPlayer
- Volume restores after character finishes speaking
- "X" button to dismiss overlay entirely
- Non-blocking: `allowsHitTesting` only on the overlay area, not the full screen

```swift
struct AvatarDialogueOverlayView: View {
    let avatarImageUrl: String
    let characterName: String
    let characterImageUrl: String?
    let onSendMessage: (String) async -> CharacterResponseResult?
    let onDismiss: () -> Void

    @State private var messageText = ""
    @State private var isSending = false
    @State private var characterVideoUrl: String?
    @State private var characterPlayer: AVPlayer?
    // ...
}
```

**New file:** `ios-app/BayitPlusApp/ViewModels/AvatarDialogueViewModel.swift` (< 200 lines)

Manages the dialogue session lifecycle:

```swift
@MainActor @Observable
final class AvatarDialogueViewModel {
    private(set) var isActive = false
    private(set) var sessionId: String?
    private(set) var availableCharacters: [ContentCharacter] = []
    private(set) var selectedCharacter: ContentCharacter?
    private(set) var exchanges: [DialogueExchange] = []
    private(set) var isSending = false

    func loadCharacters(contentId: String) async
    func selectCharacter(_ character: ContentCharacter)
    func startSession(contentId: String, profileId: String, avatarId: String) async
    func sendMessage(_ text: String) async -> CharacterResponseResult?
    func endSession() async
}
```

**Modified file:** `ios-app/BayitPlusApp/Views/Player/PlayerView+VODInteractions.swift`

Add a "Talk" button to the player controls area that activates the dialogue overlay. When tapped:
1. Load available characters for content
2. Show character selection (if multiple) or go straight to dialogue
3. Start session via API
4. Duck volume
5. Show `AvatarDialogueOverlayView`

### Task 5: iOS - Character Selection Sheet

**New file:** `ios-app/BayitPlusApp/Views/Player/CharacterSelectionSheet.swift` (< 200 lines)

Bottom sheet showing available characters for the current content. Each character shows:
- Character still image (circular)
- Character name
- Short description

User taps a character to start dialogue.

### Task 6: tvOS - Siri Remote Dialogue

**New file:** `ios-app/BayitPlusTVApp/Views/Player/TVAvatarDialogueOverlayView.swift` (< 200 lines)

tvOS adaptation:
- Focusable text field (tvOS keyboard appears on select)
- Character selection via focus navigation
- Same dual-circle layout as iOS
- Siri Remote dictation button for voice input (native SFSpeechRecognizer)

### Task 7: Web - Non-Blocking Dialogue Overlay

The current web `InteractionOverlay.tsx` is full-screen and pauses the video. Phase 2 needs a compact floating panel.

**New file:** `web/src/components/vod-interactions/AvatarDialoguePanel.tsx` (< 200 lines)

Compact floating panel (bottom-right corner, ~400px wide):
- Avatar circle + character circle side by side at top
- Small conversation history (last 2-3 exchanges, scrollable)
- Text input + send button
- Character video plays inline when response arrives
- Close/minimize button
- Movie keeps playing, volume ducks via `videoRef.volume = 0.15`

```tsx
export const AvatarDialoguePanel: React.FC<Props> = ({
  session,
  characterInfo,
  onSendMessage,
  onClose,
  isSending,
  videoElement,  // Reference to movie player for volume control
}) => {
  // Duck volume on mount, restore on unmount
  useEffect(() => {
    if (videoElement) {
      const prevVolume = videoElement.volume;
      videoElement.volume = 0.15;
      return () => { videoElement.volume = prevVolume; };
    }
  }, [videoElement]);
  // ...
};
```

**New file:** `web/src/components/vod-interactions/CharacterSelectBar.tsx` (< 200 lines)

Horizontal bar of character avatars shown when user clicks "Talk to Character" button in player controls.

**Modified file:** `web/src/hooks/useVODInteraction.ts`

Add:
- `loadCharacters(contentId)` - Fetch available characters
- `startFreeInteraction(characterName)` - Start free-form session (not moment-bound)
- Remove `onPauseRequested` / `onResumeRequested` from the free-form path
- Add volume ducking via video element reference

### Task 8: Web - Player Integration

**Modified file:** `web/src/components/player/FullscreenVideoOverlay.tsx` (or wherever player controls live)

Add "Talk to Character" button to player controls bar. Only visible when content has `interactive_characters`.

### Task 9: Android - Dialogue Overlay

**New file:** `android-app/.../ui/screens/player/AvatarDialogueOverlay.kt` (< 200 lines)

Compose overlay matching iOS/Web behavior:
- Floating panel with avatar/character circles
- Text input with send
- ExoPlayer volume ducking via `player.volume = 0.15f`
- Character video playback in overlay

**New file:** `android-app/.../ui/screens/player/CharacterSelectionSheet.kt` (< 200 lines)

Bottom sheet for character selection.

**New file:** `android-app/.../data/api/VODInteractionApi.kt` (< 200 lines)

Retrofit interface for:
- `GET /vod-interactions/characters/{contentId}`
- `POST /vod-interactions/sessions/start-free`
- `POST /vod-interactions/sessions/{id}/message`
- `POST /vod-interactions/sessions/{id}/complete`

**New file:** `android-app/.../ui/viewmodel/AvatarDialogueViewModel.kt` (< 200 lines)

ViewModel with StateFlow for dialogue state.

### Task 10: Localization Keys

**Modified files:** All locale files (`en.json`, `he.json`, `es.json`)

Add keys:
```json
{
  "player.talkToCharacter": "Talk to Character",
  "player.selectCharacter": "Choose who to talk to",
  "player.typeQuestion": "Ask {{character}} something...",
  "player.sending": "Thinking...",
  "player.characterSpeaking": "{{character}} is speaking...",
  "player.endDialogue": "End Conversation",
  "player.noCharactersAvailable": "No characters available for this content"
}
```

---

## File Inventory

### New Files (11)

| # | File | Platform | Purpose |
|---|------|----------|---------|
| 1 | `ios-app/.../Views/Player/AvatarDialogueOverlayView.swift` | iOS | Floating dialogue overlay |
| 2 | `ios-app/.../ViewModels/AvatarDialogueViewModel.swift` | iOS | Dialogue session state |
| 3 | `ios-app/.../Views/Player/CharacterSelectionSheet.swift` | iOS | Character picker |
| 4 | `ios-app/BayitPlusTVApp/.../TVAvatarDialogueOverlayView.swift` | tvOS | tvOS dialogue overlay |
| 5 | `web/src/components/vod-interactions/AvatarDialoguePanel.tsx` | Web | Floating dialogue panel |
| 6 | `web/src/components/vod-interactions/CharacterSelectBar.tsx` | Web | Character picker bar |
| 7 | `android-app/.../ui/screens/player/AvatarDialogueOverlay.kt` | Android | Dialogue overlay |
| 8 | `android-app/.../ui/screens/player/CharacterSelectionSheet.kt` | Android | Character picker |
| 9 | `android-app/.../data/api/VODInteractionApi.kt` | Android | Retrofit endpoints |
| 10 | `android-app/.../ui/viewmodel/AvatarDialogueViewModel.kt` | Android | Dialogue ViewModel |
| 11 | None needed | Backend | All backend changes are modifications |

### Modified Files (10)

| # | File | Changes |
|---|------|---------|
| 1 | `backend/app/api/routes/vod_interactions.py` | Add `POST /sessions/start-free`, `GET /characters/{content_id}` |
| 2 | `backend/app/services/vod_interaction/interaction_service.py` | Add `start_free_interaction_session()`, character lookup |
| 3 | `backend/app/services/vod_interaction/character_ai.py` | Enhanced prompt with movie context + character description |
| 4 | `backend/app/models/vod_interaction.py` | Add `ContentCharacter` model |
| 5 | `ios-app/.../Views/Player/PlayerView+VODInteractions.swift` | Add "Talk" button, dialogue overlay integration |
| 6 | `web/src/hooks/useVODInteraction.ts` | Add `loadCharacters()`, `startFreeInteraction()`, volume ducking |
| 7 | `web/src/components/player/FullscreenVideoOverlay.tsx` | Add "Talk to Character" button in controls |
| 8 | `Packages/BayitLocalization/Sources/Resources/en.json` | Dialogue localization keys |
| 9 | `Packages/BayitLocalization/Sources/Resources/he.json` | Dialogue localization keys |
| 10 | `Packages/BayitLocalization/Sources/Resources/es.json` | Dialogue localization keys |

---

## What We Reuse Unchanged

| Component | File | Why No Changes |
|-----------|------|----------------|
| Character animation | `character_animator.py` | Already handles TTS + Creatify lip-sync + GCS upload |
| Creatify client | `creatify_client.py` | Already creates lip-sync videos from image + audio |
| ElevenLabs TTS | `elevenlabs_animator.py` | Already generates speech with character voices |
| Character voices | `config.py` (9 voice IDs) | Voice samples already configured |
| Session model | `VODInteractionSession` | Already tracks dialogue exchanges |
| Dialogue model | `DialogueExchange` | Already stores text + audio_url + video_url |
| Reel generation | `reel_compositor.py` | Already composites sessions into reels |
| Credit charging | `credit_service` | Already charges per exchange |
| iOS volume ducking | `PlayerView+VODInteractions.swift` | Already ducks to 15% and restores |
| iOS overlay circles | `InteractiveMomentOverlayView.swift` | Reuse circle layout pattern |

---

## Non-Blocking Behavior Contract

All platforms must follow these rules:

1. **Movie never pauses.** The video element / AVPlayer / ExoPlayer keeps playing.
2. **Volume ducks to 15%** when dialogue overlay appears.
3. **Volume restores** when character finishes speaking OR user closes overlay.
4. **Overlay is compact** (corner panel, not full-screen). Player controls remain accessible.
5. **User can dismiss** the overlay at any time. Movie continues unaffected.
6. **Multiple exchanges** allowed per session. User can ask follow-up questions.
7. **Interaction ends** when user dismisses overlay OR hits max exchanges.

---

## Credit Costs

Same as Phase 1 (no changes):

| Action | Credits | Config Key |
|--------|---------|------------|
| Message to character | 1 | `CREDIT_RATE_VOD_INTERACTION_MESSAGE` |
| Reel generation | 25 | `CREDIT_RATE_VOD_INTERACTION_REEL` |

---

## Implementation Order

```
1. Backend: ContentCharacter model + GET /characters/{id} endpoint
2. Backend: POST /sessions/start-free endpoint
3. Backend: Enhanced character_ai prompt with movie context
4. iOS: AvatarDialogueViewModel + AvatarDialogueOverlayView
5. iOS: CharacterSelectionSheet + PlayerView integration
6. tvOS: TVAvatarDialogueOverlayView
7. Web: AvatarDialoguePanel + CharacterSelectBar
8. Web: useVODInteraction additions + player controls button
9. Android: VODInteractionApi + AvatarDialogueViewModel
10. Android: AvatarDialogueOverlay + CharacterSelectionSheet
11. Localization: All locale files
```

Steps 1-3 (backend) are sequential. Steps 4-10 (frontends) can be parallelized.

---

## Success Metrics

- Character response latency < 8 seconds (LLM + TTS + Creatify)
- Users initiate dialogue in > 30% of eligible content plays
- Average 2+ exchanges per session
- Movie never pauses during interaction (0% pause rate)
- Volume ducking perceived as natural (< 5% complaints)
