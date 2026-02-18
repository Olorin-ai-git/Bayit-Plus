# VOD Avatar Interaction

> **Zeh Ani — The Living Movie.** Children don't just watch Back to the Future — they talk to Doc Brown, argue with Marty, and the whole family watches together from three continents.

## Overview

VOD Avatar Interaction transforms passive viewing into an AI-powered conversation between the child's 3D avatar and the characters in the content. The movie **never pauses**. Voice, text, or Siri Remote — the character responds with a lip-synced animated video in under 5 seconds.

The feature shipped in three phases:

| Phase | Name | Status |
|-------|------|--------|
| 1 | Curated Moments | Production |
| 2 | Free-Form Dialogue | Production |
| 3 | Voice · Smart Positioning · Multi-Character · Watch Party | Production |

---

## The Back to the Future Experience (Phases 2 + 3)

This walkthrough traces a single family session from start to finish to illustrate the full feature.

### Before the movie starts

The player silently runs `initializeInteractiveMoments()`:

1. Checks the user has **interactive moments enabled** in preferences
2. Fetches the child's **3D avatar status** — must be `ready` with a Creatify persona image URL
3. Loads all tagged `InteractiveMoment` records for the content — each carries timestamp, character name, pre-computed `AvatarPlacement` (safe screen quadrant), and optionally a pre-rendered lip-sync video clip

If all checks pass, the Talk button appears and timestamp detection begins. No visible UI change.

---

### Act 1 — Phase 1: A curated moment fires (~12:00)

At the flux capacitor scene the player detects the tagged timestamp. A glass prompt card slides up:

> *"Doc Brown wants to tell you something! Tap to join the scene."*

The child taps **Join**. Volume ducks to 15% instantly. Doc Brown's **pre-rendered lip-sync circle** appears at bottom-right (the smart-positioned safe zone — Doc Brown is on the left side of the frame at that timestamp, so the overlay avoids him). The child's avatar circle sits beside it.

The clip plays. Volume restores. Moment auto-dismisses.

---

### Act 2 — Phase 2: Free-form dialogue (any time)

A **microphone button** is always visible at the bottom-right corner throughout playback (`showTalkButton: true` — the content has tagged characters). The movie keeps playing.

The child taps it. A **character selection bar** slides up from the bottom:

```
[ Doc Brown ]  [ Marty McFly ]  [ Lorraine ]  [ George McFly ]  [ Jennifer ]
```

Child picks **Doc Brown**. The backend creates a free-form session (`POST /vod-interactions/sessions/start-free`). Volume ducks to 15%.

A side panel slides in from the right (`AvatarDialoguePanel`) — Doc Brown's image in the header, an empty conversation, and a text field. On Apple TV the `TVAvatarDialogueOverlayView` appears as a focusable glass panel.

---

### Act 3 — Phase 3 WS1: Voice interaction

Instead of typing, the child holds the **push-to-talk microphone button** and speaks:

> *"Doc Brown, how does the time machine work?"*

**End-to-end in under 5 seconds:**

```
[Child speaks]
       ↓ PCM 16-bit/16kHz audio frames
[WebSocket: /ws/vod-interaction/{session_id}]
       ↓
[Whisper ASR: "Doc Brown, how does the time machine work?"]
       ↓
[Claude Sonnet 4 + Doc Brown personality + movie context]
       ↓ "Great Scott! The flux capacitor — that's what makes time travel possible!"
[ElevenLabs TTS: Doc Brown voice ID → audio_url]
       ↓
[Creatify Aurora: character frame image + audio → lip-sync video]
       ↓
[WebSocket response: {text, audio_url, animated_video_url}]
       ↓
[Doc Brown circle plays lip-synced video, waveform pulses]
```

The exchange appears in the conversation list. The child can ask follow-up questions. The movie plays at 15% volume throughout. Volume fully restores when the child closes the panel.

**tvOS:** Uses Siri Remote dictation (tap mic button → Siri keyboard → dictated text sent via REST instead of WebSocket).

---

### Act 4 — Phase 3 WS2: Smart avatar positioning

The avatar circles never cover a character's face. Before a session begins, `scene_analyzer.py` has already:

1. Extracted the frame at the moment's timestamp via FFmpeg
2. Run face/region-of-interest detection
3. Scored all four corner positions
4. Stored `avatar_placement: { position: "bottom_right", confidence: 0.91 }` on the `InteractiveMoment` record

The client reads this and positions the dual circles accordingly. When the child opens a free-form session mid-movie, the placement uses the nearest pre-computed moment's metadata or defaults to `bottom_left`.

---

### Act 5 — Phase 3 WS3: Multi-character scene (~55:00)

The Enchantment Under the Sea scene has been tagged with **two characters**: Marty McFly and Doc Brown, with `allow_cross_character_reactions: true`.

The character selection strip shows both names:

```
[ • Marty McFly (active) ]   [ Doc Brown ]
```

Child speaks to Marty:
> *"Marty, are you nervous about playing guitar?"*

Marty responds with his voice and lip-sync. The `multi_character_ai.py` service then rolls a 40% probability reaction for Doc Brown and generates a one-sentence interjection: *"Of course he is, but he's our only hope!"* His circle briefly animates.

Responses play **sequentially** — Marty → 0.3s fade → Doc Brown — then input re-enables.

---

### Act 6 — Phase 3 WS4: Watch Party shared session

The family watches together in a Watch Party — parents on iPad, grandparents on Apple TV in Israel.

When an interactive moment fires it triggers for **all participants simultaneously** via WebSocket broadcast. Instead of a solo session, the `SharedInteractionOverlay` appears on all screens:

```
[ Mom  ]  [ Dad ]  [ Saba Moshe ]      Doc Brown is ready
          ↑ Your turn — 45s
```

Turn order is randomized. **Mom speaks** via voice — Doc Brown's animated response is broadcast to all three screens. **Dad's turn** next. **Saba Moshe** on Apple TV uses Siri Remote dictation to ask in Hebrew — the backend detects language via Whisper and Doc Brown responds in Hebrew via the appropriate ElevenLabs voice.

After all turns complete, a **Shared Highlight Reel** is generated — FFmpeg composites all three avatar circles alongside Doc Brown's responses. A WhatsApp share link is sent automatically to all registered contacts:

> `bayit.tv/zeh-ani/reels/{token}`

---

### What the grandparents receive

> *"Saba! Your grandchild just had a conversation with Doc Brown while watching Back to the Future. Tap to watch the moment."*

The reel shows the child's avatar asking → Doc Brown lip-syncing the answer → the family's shared exchange. Saba taps **Reply** and sends a voice message back, which appears in the child's **Feedback Inbox** the next time they open Zeh Ani.

---

## Platform Support Matrix

| Feature | iPhone / iPad | Apple TV | Web | Android |
|---------|:---:|:---:|:---:|:---:|
| Phase 1: Curated moments | Yes | Yes | Yes | Yes |
| Phase 2: Free dialogue | Yes | Yes | Yes | Yes |
| Phase 2: Character selection | Yes | Yes | Yes | Yes |
| Phase 2: Volume ducking | Yes | Yes | Yes | Yes |
| Phase 3 WS1: Voice input | Yes (WebSocket PCM) | Yes (Siri dictation) | Yes (WebSocket PCM) | Yes (AudioRecord WS) |
| Phase 3 WS2: Smart positioning | Yes | Yes | Yes | Yes |
| Phase 3 WS3: Multi-character | Yes | Yes | Yes | Yes |
| Phase 3 WS4: Shared Watch Party | Yes | Yes | Yes | Yes |

---

## API Reference

### Interactive Moments

```http
GET /api/v1/vod-interactions/moments/{content_id}
```

Returns all `InteractiveMoment` records for a content item including timestamps, character names, pre-rendered video URLs, and avatar placement metadata.

---

### Characters

```http
GET /api/v1/vod-interactions/characters/{content_id}
```

Returns all `ContentCharacter` records available for free-form dialogue in this content — name, personality description, frame image URL, ElevenLabs voice ID.

---

### Sessions

```http
# Start a moment-triggered session (Phase 1)
POST /api/v1/vod-interactions/sessions/start
{
  "content_id": "...",
  "moment_id": "...",
  "profile_id": "...",
  "avatar_id": "..."
}

# Start a free-form session at any timestamp (Phase 2)
POST /api/v1/vod-interactions/sessions/start-free
{
  "content_id": "...",
  "character_name": "Doc Brown",
  "current_timestamp": 720.5,
  "profile_id": "...",
  "avatar_id": "..."
}

# Send a text message
POST /api/v1/vod-interactions/sessions/{session_id}/message
{ "message": "How does the flux capacitor work?" }

# Send a multi-character message (Phase 3 WS3)
POST /api/v1/vod-interactions/multi/sessions/{session_id}/message
{
  "message": "...",
  "addressed_character": "Marty McFly"
}

# End session
POST /api/v1/vod-interactions/sessions/{session_id}/complete
```

---

### Voice WebSocket (Phase 3 WS1)

```
WS /ws/vod-interaction/{session_id}
```

**Authentication handshake (first message):**
```json
{ "type": "authenticate", "token": "<jwt>" }
```

**Client → Server:**

| Type | Payload | Description |
|------|---------|-------------|
| `bytes` | Raw PCM audio (16-bit, 16kHz mono) | Audio chunk from microphone |
| `text_input` | `{ "type": "text_input", "text": "..." }` | Text fallback |
| `end_session` | `{ "type": "end_session" }` | Close session cleanly |

**Server → Client:**

| Type | Payload | Description |
|------|---------|-------------|
| `processing` | `{ "stage": "transcribing" \| "thinking" \| "generating" }` | Pipeline stage indicator |
| `character_response` | `{ text, audio_url, animated_video_url, transcript, emotion }` | Character reply ready |
| `error` | `{ "message": "...", "recoverable": true }` | Error with retry hint |
| `session_ended` | — | Server closed session |

**Processing stages shown to user:**

1. `transcribing` — Whisper ASR running on audio
2. `thinking` — Claude generating character response
3. `generating` — ElevenLabs TTS + Creatify lip-sync rendering

---

### Shared Watch Party Sessions (Phase 3 WS4)

```http
# Start a shared session (host only)
POST /api/v1/vod-interactions/sessions/start-shared
{
  "party_id": "...",
  "content_id": "...",
  "moment_timestamp": 720.5,
  "character_name": "Doc Brown"
}

# Send message on your turn
POST /api/v1/vod-interactions/sessions/{session_id}/message
{
  "message_text": "...",
  "addressed_character": "Doc Brown"
}

# End shared session
POST /api/v1/vod-interactions/sessions/{session_id}/complete
```

Party-level interaction events are broadcast via the Watch Party WebSocket connection:

| Event | Payload | Description |
|-------|---------|-------------|
| `interaction_start` | `{ session_id, character_name, participants, turn_order }` | Session opened for all |
| `turn_change` | `{ current_turn_user_id, turns_completed }` | Next participant's turn |
| `turn_warning` | `{ seconds_remaining }` | Turn countdown warning |
| `character_response` | `{ text, audio_url, animated_video_url, responding_to_user_id }` | Broadcast response |
| `interaction_end` | `{ session_id, reel_url? }` | Session closed, optional reel |

---

### Admin — Avatar Placement (Phase 3 WS2)

```http
# Pre-compute avatar placement for all moments in a content item
POST /api/v1/vod-interactions/admin/analyze-placements/{content_id}
Authorization: Bearer <admin_token>
```

Triggers `scene_analyzer.py` to run FFmpeg face detection on every tagged moment's timestamp and write `avatar_placement` metadata back to each `InteractiveMoment` record. Run this after tagging new content.

---

## Tagging Content for Interaction

### 1. Tag interactive moments

In the Admin CMS, open the content item and navigate to **Interactive Moments**:

| Field | Description | Example |
|-------|-------------|---------|
| `timestamp` | Seconds from start | `720.5` |
| `character_name` | Must match a ContentCharacter name | `Doc Brown` |
| `interaction_prompt` | Text shown to user before they accept | `Doc Brown wants to tell you something!` |
| `dialogue_options` | Quick-reply suggestions (optional) | `["How does the flux capacitor work?", "Can I come with you?"]` |
| `scene_context` | Sent to Claude for in-scene context | `Doc Brown reveals the flux capacitor to Marty in the parking lot` |
| `lipsync_video_url` | Pre-rendered GCS URL (optional — falls back to real-time) | `gs://bayit-plus/interactions/...` |

After saving, run **Analyze Placements** to compute safe avatar zones for all moments.

### 2. Register content characters

In **Content Characters**, add each character available for free-form dialogue:

| Field | Description |
|-------|-------------|
| `character_name` | Display name (e.g. `Doc Brown`) |
| `voice_id` | ElevenLabs voice ID |
| `frame_url` | GCS URL of a high-quality character still (Creatify uses this for lip-sync) |
| `personality` | 2–3 word descriptor (e.g. `eccentric, passionate, scientific`) |
| `description` | Full personality prompt for Claude |
| `movie_context` | Character's role, key scenes, relationships with other characters |

### 3. Multi-character scenes

On any `InteractiveMoment`, set:

```json
{
  "characters": [
    { "name": "Marty McFly", "voice_id": "...", "frame_url": "..." },
    { "name": "Doc Brown",   "voice_id": "...", "frame_url": "..." }
  ],
  "allow_cross_character_reactions": true,
  "max_active_characters": 2
}
```

---

## Credit Costs

| Action | Credits | Config key |
|--------|---------|------------|
| Text message to character | 1 | `CREDIT_RATE_VOD_INTERACTION_MESSAGE` |
| Voice message to character | 1 | `CREDIT_RATE_VOD_INTERACTION_MESSAGE` |
| Multi-character response (reactions free) | 1 | `CREDIT_RATE_VOD_INTERACTION_MESSAGE` |
| Shared session message (charged to speaker) | 1 | `CREDIT_RATE_VOD_INTERACTION_MESSAGE` |
| Solo highlight reel | 25 | `CREDIT_RATE_VOD_INTERACTION_REEL` |
| Shared highlight reel (split equally) | 15 total | `CREDIT_RATE_VOD_INTERACTION_SHARED_REEL` |

A typical 90-minute session with 5 voice exchanges: **5 credits** + reel generation.

---

## Technical Constraints

| Constraint | Value | Reason |
|------------|-------|--------|
| Max voice audio chunk | 500 KB | Backend config `VOD_INTERACTION_MAX_AUDIO_CHUNK_BYTES` |
| Voice session silence timeout | 30 s | Config `VOD_INTERACTION_VOICE_TIMEOUT_SECONDS` |
| Max voice exchanges per session | 10 | Rate limiting |
| Turn timeout in Watch Party | 45 s | Config `VOD_INTERACTION_TURN_TIMEOUT_SECONDS` |
| Max shared session participants | 4 | Config `VOD_INTERACTION_MAX_SHARED_PARTICIPANTS` |
| Max characters per moment | 3 | Config `VOD_INTERACTION_MAX_CHARACTERS_PER_MOMENT` |
| Character reaction probability | 40% | Config `VOD_INTERACTION_REACTION_PROBABILITY` |
| Target end-to-end voice latency | < 5 s | Whisper + Claude + ElevenLabs + Creatify pipeline |

---

## Consent Requirements

Voice interaction requires the `VOICE_INTERACTION` biometric consent type to be active for the profile. Text input is always available without additional consent.

See [Biometric Consent](/guides/ZEH_ANI_USER_GUIDE#step-2-parental-consent-privacy-first) for the full consent flow.
