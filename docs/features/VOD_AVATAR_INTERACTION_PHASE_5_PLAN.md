# VOD Avatar Interaction - Phase 5: Dynamic Pause & Ask

## Overview

Users with a ready avatar can pause ANY movie, select a character from tappable circles on the paused frame, ask a question (text or voice), and see their avatar speak the question with correct grammar/pronunciation followed by the character's lip-synced response.

---

## Pipeline

```
User pauses movie -> Character circles appear on paused frame
  -> User taps a character -> Input panel appears (text or voice)
  -> User sends question
  -> Backend:
     1. Polish text for grammar/pronunciation (Claude, fast)
     2. PARALLEL:
        a. Animate user avatar (ElevenLabs TTS with user's cloned voice + Aurora lip-sync)
        b. Generate character AI response (Claude)
     3. Animate character response (ElevenLabs TTS + Aurora lip-sync)
     4. Charge credits
     5. Return both videos + metadata
  -> iOS plays: user avatar video -> transition -> character video
  -> User can ask another question or dismiss -> movie RESUMES
```

---

## Backend Changes

### 1. NEW `backend/app/services/vod_interaction/text_polisher.py` (~85 lines)

Claude-based grammar/pronunciation polisher. Corrects speech-to-text errors while preserving the child's vocabulary level and intent.

- Accepts raw user text + language hint from the session
- Uses `get_anthropic_client()` with `settings.VOD_INTERACTION_AI_MODEL`
- System prompt: correct grammar and pronunciation only, never rewrite meaning
- Max tokens from `settings.VOD_INTERACTION_TEXT_POLISH_MAX_TOKENS` (default 150)
- Returns polished text string

### 2. NEW `backend/app/services/vod_interaction/user_avatar_animator.py` (~120 lines)

Animates the user's avatar speaking the polished question.

- Accepts polished text + `ChildAvatar` (has `elevenlabs_voice_id`, `creatify_avatar_image_url` / `primary_avatar_gcs_path`)
- Reuses `character_animator_service._generate_tts()` pattern with user's cloned voice
- Reuses `_ensure_public_url()` for URL bridging
- Calls `fal_aurora_client.create_lipsync(user_face_image, user_audio)`
- Uploads to `vod-interactions/user-avatar-audio/` and `vod-interactions/user-avatar-lipsync/`
- Returns `AnimatedResponse(audio_url, video_url, duration)`

### 3. NEW `backend/app/services/vod_interaction/pause_ask_orchestrator.py` (~150 lines)

Central orchestrator chaining all steps with parallel execution.

```python
class PauseAskOrchestrator:
    async def process_exchange(
        self, session: VODInteractionSession, user_message: str,
    ) -> PauseAskResult:
        # 1. Fetch user avatar (voice_id + face image)
        # 2. Polish user text (Claude)
        # 3. PARALLEL via asyncio.gather:
        #    a. Animate user avatar (TTS + Aurora)
        #    b. Generate character AI response (Claude)
        # 4. Content moderation on character response
        # 5. Animate character response (TTS + Aurora) -- depends on step 3b
        # 6. Save both DialogueExchanges to session
        # 7. Charge credits (CREDIT_RATE_VOD_PAUSE_ASK, default 3)
        # 8. Return PauseAskResult
```

```python
class PauseAskResult(BaseModel):
    user_polished_text: str
    user_audio_url: str
    user_animated_video_url: str
    user_video_duration: float
    character_name: str
    character_response_text: str
    character_audio_url: str
    character_animated_video_url: str
    character_video_duration: float
```

**Parallel optimization:** Steps 3a and 3b are independent. Running them concurrently saves ~15-30s of wall-clock time. Step 5 depends on 3b's output so runs after.

### 4. MODIFY `backend/app/models/vod_interaction.py` -- DialogueExchange (+5 lines)

Add two optional fields to `DialogueExchange` (line ~104):

```python
user_animated_video_url: Optional[str] = Field(
    None, description="Lip-sync video of user avatar speaking",
)
polished_text: Optional[str] = Field(
    None, description="Grammar-polished version of user message",
)
```

Only populated for user-speaker exchanges created by the Pause & Ask pipeline. Existing exchanges unaffected.

### 5. NEW `backend/app/api/routes/vod_interaction_pause_ask.py` (~100 lines)

REST endpoint for Pause & Ask.

```
POST /api/v1/vod-interactions/sessions/{session_id}/pause-ask
Body: { "message": "..." }
Response: PauseAskResponseModel
```

Validates: session ownership, avatar voice clone readiness (`elevenlabs_voice_id` + face image), session active status, credit balance, exchange limit.

### 6. MODIFY `backend/app/api/routes/websocket_vod_interaction.py` (+25 lines)

Add `pause_ask` message type alongside existing `text_message`:

```python
elif msg_type == "pause_ask":
    result = await pause_ask_orchestrator.process_exchange(session, data["message"])
    await websocket.send_json({"type": "pause_ask_result", **result.model_dump()})
```

WebSocket allows streaming progress phases to the client for the phased progress indicator.

### 7. MODIFY `backend/app/core/config.py` (+15 lines)

New settings in the VOD Interaction section:

| Setting                                  | Default | Description                                  |
| ---------------------------------------- | ------- | -------------------------------------------- |
| `VOD_INTERACTION_PAUSE_ASK_ENABLED`      | `True`  | Feature flag                                 |
| `VOD_INTERACTION_TEXT_POLISH_MAX_TOKENS` | `150`   | Max tokens for grammar polish                |
| `CREDIT_RATE_VOD_PAUSE_ASK`              | `3`     | Credits per exchange (2 animations + polish) |

### 8. MODIFY `backend/app/main.py` or `app/api/router.py` (+2 lines)

Register the new `vod_interaction_pause_ask` router.

---

## iOS/tvOS Changes

### 9. NEW `ios-app/BayitPlusApp/Models/PauseAskModels.swift` (~40 lines)

```swift
struct PauseAskResponse: Codable {
    let userPolishedText: String
    let userAudioUrl: String
    let userAnimatedVideoUrl: String
    let userVideoDuration: Double
    let characterName: String
    let characterResponseText: String
    let characterAudioUrl: String
    let characterAnimatedVideoUrl: String
    let characterVideoDuration: Double
}

enum PauseAskPhase: String {
    case selecting       // Character circles on paused frame
    case input           // Text/voice input panel
    case polishing       // "Preparing your question..."
    case userSpeaking    // Playing user avatar video
    case transition      // Brief pause between videos
    case characterSpeaking // Playing character response video
    case idle            // Ready for next question
}
```

### 10. MODIFY `ios-app/BayitPlusApp/Repositories/AvatarMeshRepository.swift` (+30 lines)

Add to protocol + implementation:

```swift
func sendPauseAskMessage(sessionId: String, message: String) async throws -> PauseAskResponse
// POST /api/v1/vod-interactions/sessions/{sessionId}/pause-ask
```

### 11. MODIFY `ios-app/BayitPlusApp/ViewModels/AvatarDialogueViewModel.swift` (+30 lines)

Add `sendPauseAskMessage(_:)` method that calls the repository, creates both user and character `DialogueExchange` records with video URLs, and returns the `PauseAskResponse`.

### 12. NEW `ios-app/BayitPlusApp/Views/Player/PauseAskCharacterOverlayView.swift` (~120 lines)

Tappable character circles overlaid on the paused video frame.

- Fetches `interactive_characters` for the content
- Renders each character as a circular avatar at calculated positions on screen
- Each circle shows the character's `frame_url` image + name label
- Tapping a circle selects that character and opens the input panel
- Glass-style circles with subtle pulse animation to indicate interactivity
- Positions calculated to avoid overlapping (grid or arc layout on the paused frame)

### 13. NEW `ios-app/BayitPlusApp/Views/Player/PauseAskDialogueOverlayView.swift` (~180 lines)

Phase-based overlay for the full Pause & Ask interaction. Follows `InteractiveMomentOverlayView` pattern.

- **selecting** phase: Shows `PauseAskCharacterOverlayView` on paused frame
- **input** phase: Shows text/voice input panel at bottom (reuses `DialogueInputView`)
- **polishing** phase: Progress label "Preparing your question..."
- **userSpeaking** phase: Left circle plays user's avatar lip-sync video via `AVPlayer`
- **transition** phase: 0.5s pause between videos
- **characterSpeaking** phase: Right circle plays character's lip-sync video via `AVPlayer`
- **idle** phase: "Ask Another Question" button + "Resume Movie" button
- Phased progress indicator transitions between stages with smooth animations

### 14. NEW `ios-app/BayitPlusApp/Views/Player/DialogueInputView.swift` (~70 lines)

Extracted shared input component (text field + send button + voice toggle). Used by both the existing `AvatarDialogueOverlayView` and the new `PauseAskDialogueOverlayView`.

### 15. MODIFY `ios-app/BayitPlusApp/Views/Player/PlayerView+VODInteractions.swift` (+20 lines)

Change the Talk button flow:

```swift
// When user has voice clone:
func startPauseAskInteraction() async {
    viewModel.player.avPlayer.pause()  // PAUSE instead of duck
    showPauseAskOverlay = true
}

// When dismissed:
func dismissPauseAsk() async {
    viewModel.player.avPlayer.play()   // RESUME
    showPauseAskOverlay = false
    await dialogueVM?.endSession()
}
```

Conditional overlay logic:

- Avatar has `voice_clone_status == "cloned"` -> show `PauseAskDialogueOverlayView` with movie PAUSED
- Avatar lacks voice clone -> show existing `AvatarDialogueOverlayView` with volume ducking (graceful fallback)

### 16. NEW `ios-app/BayitPlusTVApp/Views/Player/TVPauseAskDialogueOverlayView.swift` (~180 lines)

tvOS version with:

- Larger circles (160pt) for 10-foot UI
- Focus-based character selection (Siri Remote d-pad)
- Siri Remote voice input for questions
- Same phase-based pattern as iOS

### 17. MODIFY `packages/ui/bayit-i18n/locales/*.json` (10 files, +8 keys each)

```json
{
  "player": {
    "pauseAsk": {
      "title": "Ask a Character",
      "selectCharacter": "Choose who to talk to",
      "processing": "Preparing your question...",
      "userSpeaking": "You're asking...",
      "characterSpeaking": "Answering...",
      "resumeMovie": "Resume Movie",
      "askAnother": "Ask Another Question",
      "requiresVoiceClone": "Create your avatar voice to use this feature"
    }
  }
}
```

---

## File Summary

| #   | File                                                             | Action | ~Lines  | Description                                       |
| --- | ---------------------------------------------------------------- | ------ | ------- | ------------------------------------------------- |
| 1   | `backend/app/services/vod_interaction/text_polisher.py`          | NEW    | 85      | Grammar/pronunciation polisher                    |
| 2   | `backend/app/services/vod_interaction/user_avatar_animator.py`   | NEW    | 120     | User avatar TTS + Aurora lip-sync                 |
| 3   | `backend/app/services/vod_interaction/pause_ask_orchestrator.py` | NEW    | 150     | Pipeline orchestration                            |
| 4   | `backend/app/models/vod_interaction.py`                          | MODIFY | +5      | `user_animated_video_url`, `polished_text` fields |
| 5   | `backend/app/api/routes/vod_interaction_pause_ask.py`            | NEW    | 100     | REST endpoint                                     |
| 6   | `backend/app/api/routes/websocket_vod_interaction.py`            | MODIFY | +25     | `pause_ask` WS message type                       |
| 7   | `backend/app/core/config.py`                                     | MODIFY | +15     | Feature flag, credit rate, token limit            |
| 8   | `backend/app/main.py` or `app/api/router.py`                     | MODIFY | +2      | Route registration                                |
| 9   | `ios-app/.../Models/PauseAskModels.swift`                        | NEW    | 40      | Swift response model + phase enum                 |
| 10  | `ios-app/.../Repositories/AvatarMeshRepository.swift`            | MODIFY | +30     | Protocol + impl for pause-ask                     |
| 11  | `ios-app/.../ViewModels/AvatarDialogueViewModel.swift`           | MODIFY | +30     | `sendPauseAskMessage` method                      |
| 12  | `ios-app/.../Views/Player/PauseAskCharacterOverlayView.swift`    | NEW    | 120     | Tappable character circles on paused frame        |
| 13  | `ios-app/.../Views/Player/PauseAskDialogueOverlayView.swift`     | NEW    | 180     | Phase-based dialogue overlay                      |
| 14  | `ios-app/.../Views/Player/DialogueInputView.swift`               | NEW    | 70      | Shared text/voice input component                 |
| 15  | `ios-app/.../Views/Player/PlayerView+VODInteractions.swift`      | MODIFY | +20     | Pause/resume + conditional overlay                |
| 16  | `ios-app/BayitPlusTVApp/.../TVPauseAskDialogueOverlayView.swift` | NEW    | 180     | tvOS equivalent                                   |
| 17  | `packages/ui/bayit-i18n/locales/*.json` (10 files)               | MODIFY | +8 each | Localization keys                                 |

**New:** ~1,045 lines across 8 files
**Modified:** ~227 lines across 9 files + 10 locale files

---

## Implementation Order

### Phase A -- Backend (no frontend needed)

1. Config settings
2. TextPolisher service
3. UserAvatarAnimator service
4. DialogueExchange model additions
5. PauseAskOrchestrator service
6. REST route + WS handler + route registration

### Phase B -- iOS

7. PauseAskModels.swift
8. Repository + ViewModel additions
9. DialogueInputView extraction
10. PauseAskCharacterOverlayView
11. PauseAskDialogueOverlayView
12. PlayerView+VODInteractions pause/resume + conditional overlay

### Phase C -- tvOS + i18n

13. TVPauseAskDialogueOverlayView
14. Localization keys (10 languages)

---

## Latency Budget

| Step                      | Time        | Notes                                             |
| ------------------------- | ----------- | ------------------------------------------------- |
| Text polish               | ~1s         | Claude Haiku, small prompt                        |
| User avatar TTS           | ~2s         | ElevenLabs                                        |
| User Aurora lip-sync      | ~20-40s     | fal.ai (runs parallel with character AI)          |
| Character AI response     | ~2-3s       | Claude Sonnet (runs parallel with user animation) |
| Character TTS             | ~2s         | ElevenLabs                                        |
| Character Aurora lip-sync | ~20-40s     | fal.ai                                            |
| **Total wall-clock**      | **~45-85s** | Steps 3a/3b parallel saves ~20-40s                |

The phased progress indicator keeps the user engaged: selecting -> input -> "Preparing..." -> user avatar plays -> character plays.

---

## Fallbacks

- **No voice clone:** Falls back to existing `AvatarDialogueOverlayView` (duck volume, text chat)
- **Aurora fails for user avatar:** Return character response anyway, show polished text in a bubble instead of user video
- **No `interactive_characters` on content:** Talk button hidden (same as today)
- **Insufficient credits:** Show credit prompt before starting pipeline
