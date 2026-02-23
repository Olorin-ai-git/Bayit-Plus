# Pause & Ask

> **Dynamic Pause & Ask** -- Pause the movie, pick a character, ask anything. Your avatar speaks with your voice, the character answers with theirs. Resume.

## Overview

Pause & Ask extends the VOD Avatar Interaction system with an on-demand dialogue mode. Instead of waiting for a curated moment, the viewer pauses the movie at any point, selects a character, and has a face-to-face conversation powered by AI text generation, ElevenLabs voice synthesis, and Aurora lip-sync animation.

| Capability                         | Status                |
| ---------------------------------- | --------------------- |
| Character selection overlay        | Production            |
| Text input                         | Production            |
| Voice input (REST transcription)   | Production            |
| User avatar lip-sync (voice clone) | Production (optional) |
| Character animated response        | Production            |
| No-voice-clone fallback            | Production            |

---

## The Back to the Future 1 Experience

This walkthrough traces a complete Pause & Ask session on BTTF1 from button tap to resume.

### Content Data

BTTF1 ships with 4 interactive characters and 5 curated moments:

**Characters:**

| character_id      | Name            | ElevenLabs Voice       |
| ----------------- | --------------- | ---------------------- |
| `doc-brown`       | Doc Brown       | `pNInz6obpgDQGcFmaJgB` |
| `marty-mcfly`     | Marty McFly     | `VR6AewLTigWG4xSOukaG` |
| `biff-tannen`     | Biff Tannen     | `TX3LPaxmHKxFdv7VOQHJ` |
| `lorraine-baines` | Lorraine Baines | `EXAVITQu4vr4xnSDxMaL` |

Each character has a full personality prompt (speech patterns, catchphrases, knowledge of the film) and a context prompt (instructions for responding to a paused viewer).

**Interactive Moments:**

| Timestamp | Character       | Prompt                                    |
| --------- | --------------- | ----------------------------------------- |
| 2:00      | Doc Brown       | Doc Brown's lab is full of clocks         |
| 13:00     | Marty McFly     | Marty just invented skateboarding in 1955 |
| 70:00     | Biff Tannen     | Biff is causing trouble again             |
| 90:00     | Lorraine Baines | The Enchantment Under the Sea dance       |
| 105:00    | Doc Brown       | Doc is preparing to harness lightning     |

---

### Prerequisites: Player Initialization

When the player loads BTTF1, `initializeInteractiveMoments()` runs silently:

1. **Preference check** -- User must have `interactiveMomentsEnabled: true` in their profile preferences. If disabled, the entire feature is hidden.

2. **Avatar verification** -- Fetches the child's avatar status via `GET /api/v1/zeh-ani/avatar/status`. The avatar must be `ready` with a valid `avatarImageUrl`. If no avatar exists, a 5-second glass warning banner appears and the function returns. The Interact button never shows.

3. **Moments + Characters load** -- Loads `InteractiveMoment` records for the content. Then fetches `ContentCharacter` records via `GET /api/v1/vod-interactions/characters/{content_id}`. If either collection is non-empty, the Interact button appears in the top bar.

4. **Voice clone detection** -- The avatar status includes `hasVoiceClone: Bool`. This is stored but does not gate the feature. Users without voice clone skip the user-speaking video phase.

5. **Voice service initialization** -- A `VoiceInteractionService` is created with WebSocket and auth credentials for voice recording.

After initialization, BTTF1 sets both `interactionVM` (5 moments) and `hasInteractiveCharacters` (4 characters). The bubble icon appears in the top bar.

---

### Step 1: Button Tap

The user taps the Interact button (bubble icon in the player top bar). This calls `startPauseAskInteraction()`:

1. Creates `AvatarDialogueViewModel` if not already initialized
2. Loads characters for the content via the repository
3. **Pauses** the AVPlayer -- the video freezes on the current frame
4. Sets `showPauseAskOverlay = true`

The `PauseAskDialogueOverlayView` appears over the frozen video with a semi-transparent black background and a spring animation.

---

### Step 2: Character Selection (Phase: `.selecting`)

The overlay starts in the `.selecting` phase, rendering `PauseAskCharacterOverlayView`:

```
+----------------------------------------------+
|  [x] Close                                   |
|                                               |
|    +----------+    +----------+               |
|    | Doc Brown|    |  Marty   |               |
|    |  (icon)  |    |  (icon)  |               |
|    +----------+    +----------+               |
|                                               |
|    +----------+    +----------+               |
|    |   Biff   |    | Lorraine |               |
|    |  (icon)  |    |  (icon)  |               |
|    +----------+    +----------+               |
|                                               |
+----------------------------------------------+
```

Each character shows their GCS-hosted avatar image and name. The user taps one.

---

### Step 3: Session Start

`selectCharacter(character)` fires in `PauseAskDialogueOverlayView+Actions`:

1. If no session exists yet, starts one via `viewModel.startSession()`:
   - POST to `/api/v1/vod-interactions/sessions/start-free`
   - Body: `profile_id`, `avatar_id`, `content_id`, `character_name`, `current_timestamp`
   - Backend creates a `VODInteractionSession` document in MongoDB
   - Returns `session_id`, `character_name`, `status: "active"`

2. If a session already exists (user changed character mid-conversation), updates `selectedCharacter` directly.

3. Phase transitions to `.input`.

---

### Step 4: Input (Phase: `.input`)

The `PauseAskInputView` renders inside a `GlassCard`:

```
+----------------------------------------------+
|  Doc Brown              [mic] [x]            |
|                                               |
|  +------------------------------------------+|
|  | Type your question...              [Send]||
|  +------------------------------------------+|
+----------------------------------------------+
```

**Text mode:** User types a question and taps Send.

**Voice mode:** User taps the mic toggle to switch to voice mode. A large microphone button appears. The user taps to start recording (AVAudioEngine captures PCM 16-bit/16kHz mono audio). Taps again to stop.

When voice recording stops, the REST transcription flow activates:

```
[AVAudioEngine stops]
       |
[stopRecordingAndReturn() -> raw PCM Data]
       |
[onVoiceRecorded callback fires]
       |
[transcribeAndSend(audioData:)]
       |
[POST /api/v1/vod-interactions/sessions/{id}/transcribe]
  multipart/form-data: audio=recording.wav
       |
[EnhancedASRService.transcribe_child_speech()]
  Whisper ASR with child-speech optimization
  Hebrew-English code-switch detection
       |
[Returns {"transcript": "How does the time machine work?"}]
       |
[messageText = transcript]
       |
[sendQuestion() -- same path as text input]
```

---

### Step 5: Processing (Phase: `.polishing`)

`sendQuestion()` clears the text field and sets phase to `.polishing`. The user sees a "Processing..." spinner.

The call chain:

```
sendQuestion()
  -> viewModel.sendPauseAskMessage(text)
    -> repository.sendPauseAskMessage(sessionId, message, languageHint)
      -> POST /api/v1/vod-interactions/sessions/{id}/pause-ask
```

---

### Step 6: Backend Pipeline

The `PauseAskOrchestrator.process_exchange()` runs the full pipeline:

```
1. Fetch avatar          -> ChildAvatar from MongoDB
2. Polish text           -> TextPolisher cleans up input
3. PARALLEL:
   a. User animation     -> Aurora lip-sync (if voice clone exists)
   b. Character AI       -> Claude generates in-character response
4. Content moderation    -> Regex filter on response text
5. Character animation   -> ElevenLabs TTS + Aurora lip-sync
6. Save exchanges        -> Append to session.dialogue_exchanges
7. Charge credits        -> Deduct from user balance
```

**Voice clone handling:** If the user's avatar has `has_voice_clone: false`, step 3a returns `None` immediately. The user-speaking video phase is skipped on the iOS side. The character response pipeline runs identically regardless.

**Response model:**

```json
{
  "user_polished_text": "How does the time machine work?",
  "user_audio_url": "https://storage.googleapis.com/...",
  "user_animated_video_url": "https://storage.googleapis.com/...",
  "user_video_duration": 3.2,
  "character_name": "Doc Brown",
  "character_response_text": "Great Scott! The flux capacitor...",
  "character_audio_url": "https://storage.googleapis.com/...",
  "character_animated_video_url": "https://storage.googleapis.com/...",
  "character_video_duration": 4.8
}
```

When the user has no voice clone, `user_animated_video_url` and `user_audio_url` are empty strings and `user_video_duration` is `0.0`.

---

### Step 7: Video Playback Sequence

The iOS client plays the response as a multi-phase video sequence:

**Phase `.userSpeaking`** (skipped if no voice clone):

- `playUserVideo(response)` checks `userAnimatedVideoUrl`
- If non-empty: creates an `AVPlayer`, plays the user's lip-synced avatar speaking their polished question
- If empty: immediately calls `playCharacterVideo(response)`

**Phase `.transition`** (0.5s delay between videos)

**Phase `.characterSpeaking`**:

- `playCharacterVideo(response)` creates an `AVPlayer` for the character's animated lip-sync response
- Doc Brown's face animates with lip-sync matching his generated audio

**Phase `.idle`**:

- When the character video ends, the overlay returns to idle state
- User can type another question or dismiss

---

### Step 8: Dismiss

The user taps the close button or chooses to resume. `dismissPauseAsk()` fires:

1. `viewModel.player.avPlayer.play()` -- video resumes from the paused frame
2. `showPauseAskOverlay = false` -- overlay animates out
3. `dialogueVM?.endSession()` -- sends `POST /sessions/{id}/complete` to close the backend session

---

## Platform Support

| Feature                     |     iPhone / iPad      |    Apple TV    |   Web   | Android |
| --------------------------- | :--------------------: | :------------: | :-----: | :-----: |
| Pause & Ask (text)          |          Yes           |    Planned     |   Yes   |   Yes   |
| Pause & Ask (voice)         |          Yes           | Siri dictation | Planned | Planned |
| User avatar lip-sync        | Yes (with voice clone) |       No       |   No    |   No    |
| Character animated response |          Yes           |    Planned     |   Yes   |   Yes   |
| No-voice-clone fallback     |          Yes           |      Yes       |   Yes   |   Yes   |

---

## API Reference

### Pause & Ask Exchange

```http
POST /api/v1/vod-interactions/sessions/{session_id}/pause-ask
```

**Request:**

```json
{
  "message": "How does the time machine work?",
  "language_hint": "en"
}
```

**Response:**

```json
{
  "user_polished_text": "How does the time machine work?",
  "user_audio_url": "https://...",
  "user_animated_video_url": "https://...",
  "user_video_duration": 3.2,
  "character_name": "Doc Brown",
  "character_response_text": "Great Scott! The flux capacitor...",
  "character_audio_url": "https://...",
  "character_animated_video_url": "https://...",
  "character_video_duration": 4.8
}
```

**Error codes:**

| Status | Meaning                                       |
| ------ | --------------------------------------------- |
| 402    | Insufficient credits                          |
| 403    | Feature disabled or session not owned by user |
| 404    | Session not found                             |
| 409    | Session not active                            |
| 422    | Avatar not found or validation error          |
| 429    | Maximum dialogue exchanges reached            |

---

### Audio Transcription

```http
POST /api/v1/vod-interactions/sessions/{session_id}/transcribe
Content-Type: multipart/form-data
```

**Request:** Multipart form with `audio` field containing a WAV file (PCM 16-bit, 16kHz mono).

**Response:**

```json
{
  "transcript": "How does the time machine work?"
}
```

Uses the Enhanced ASR Service with child-speech optimizations and Hebrew-English code-switch detection.

---

### Session Lifecycle

```http
# Start session (before first question)
POST /api/v1/vod-interactions/sessions/start-free
{
  "profile_id": "...",
  "avatar_id": "...",
  "content_id": "...",
  "character_name": "Doc Brown",
  "current_timestamp": 4215.3
}

# Send Pause & Ask exchange (repeatable)
POST /api/v1/vod-interactions/sessions/{session_id}/pause-ask

# Transcribe voice input (optional, before pause-ask)
POST /api/v1/vod-interactions/sessions/{session_id}/transcribe

# End session
POST /api/v1/vod-interactions/sessions/{session_id}/complete
```

---

## Credit Costs

| Action               | Credits    | Config key                  |
| -------------------- | ---------- | --------------------------- |
| Pause & Ask exchange | Per config | `CREDIT_RATE_VOD_PAUSE_ASK` |

Each exchange includes: text polishing, user avatar animation (if applicable), character AI response generation, character TTS + lip-sync animation.

---

## Feature Flags

| Flag                                          | Default | Description                                      |
| --------------------------------------------- | ------- | ------------------------------------------------ |
| `VOD_INTERACTION_PAUSE_ASK_ENABLED`           | `true`  | Master kill switch for all Pause & Ask endpoints |
| `interactiveMomentsEnabled` (user preference) | `false` | Per-user opt-in for all VOD interactions         |

---

## Technical Constraints

| Constraint                | Value                   | Config key                      |
| ------------------------- | ----------------------- | ------------------------------- |
| Max message length        | 500 characters          | Pydantic validation             |
| Max exchanges per session | Per config              | `VOD_INTERACTION_MAX_EXCHANGES` |
| Transcribe rate limit     | 20/minute               | `vod_interaction_transcribe`    |
| Pause-ask rate limit      | 10/minute               | `vod_interaction_pause_ask`     |
| Audio format              | PCM 16-bit, 16kHz, mono | AVAudioEngine config            |

---

## iOS Architecture

### State Variables (PlayerView)

| Variable                   | Type                       | Purpose                                         |
| -------------------------- | -------------------------- | ----------------------------------------------- |
| `showPauseAskOverlay`      | `Bool`                     | Controls overlay visibility                     |
| `hasVoiceClone`            | `Bool`                     | Whether user avatar has voice clone             |
| `hasInteractiveCharacters` | `Bool`                     | Whether content has characters (enables button) |
| `interactionVM`            | `VODInteractionViewModel?` | Manages curated moments                         |
| `dialogueVM`               | `AvatarDialogueViewModel?` | Manages dialogue sessions                       |
| `voiceService`             | `VoiceInteractionService?` | Audio recording and playback                    |

### File Map

| File                                         | Responsibility                                        |
| -------------------------------------------- | ----------------------------------------------------- |
| `PlayerView.swift`                           | State declarations                                    |
| `PlayerView+TopBar.swift`                    | Interact button visibility and tap                    |
| `PlayerView+VODInteractions+Init.swift`      | Initialization, session management                    |
| `PlayerView+VODInteractions.swift`           | Overlay builders, volume ducking                      |
| `PlayerView+VODDialogue.swift`               | Duplicate overlay builders for alternate paths        |
| `PauseAskDialogueOverlayView.swift`          | Phase-based overlay container                         |
| `PauseAskDialogueOverlayView+Actions.swift`  | Character selection, send, transcribe, video playback |
| `PauseAskInputView.swift`                    | Input panel with text/voice mode                      |
| `PauseAskCharacterOverlayView.swift`         | Character selection grid                              |
| `DialogueInputView.swift`                    | Shared text/voice input component                     |
| `VoiceInteractionService+Recording.swift`    | Audio recording with return-data method               |
| `AvatarRepository+Protocol.swift`            | Protocol for transcribe + pause-ask                   |
| `AvatarMeshRepository+VODInteractions.swift` | API client implementation                             |
| `AvatarMeshModels.swift`                     | TranscriptionResponse model                           |

### Backend File Map

| File                            | Responsibility                                        |
| ------------------------------- | ----------------------------------------------------- |
| `vod_interaction_pause_ask.py`  | REST endpoints (pause-ask exchange, transcribe)       |
| `pause_ask_orchestrator.py`     | Pipeline: polish, animate, generate, moderate, charge |
| `enhanced_asr_service.py`       | Whisper transcription with child-speech optimization  |
| `text_polisher.py`              | Input text cleanup                                    |
| `user_avatar_animator.py`       | Aurora lip-sync for user avatar                       |
| `character_animator_service.py` | ElevenLabs TTS + Aurora lip-sync for character        |
| `character_ai_service.py`       | Claude response generation with personality prompts   |

---

## Consent Requirements

Pause & Ask text input requires no additional consent beyond standard app authentication.

Voice input requires the `VOICE_INTERACTION` biometric consent type to be active for the profile. See [Biometric Consent](/guides/ZEH_ANI_USER_GUIDE#step-2-parental-consent-privacy-first) for the full consent flow.
