# WebSocket API Reference

**Base URL:** `/api/v1`
**Last Updated:** 2026-02-04

All WebSocket endpoints use the `ws://` (or `wss://` in production) protocol. Authentication is handled via token query parameter or in-band authentication messages.

---

## Live Feature WebSockets

### WS `/api/v1/ws/live/{channel_id}/subtitles`

Live subtitle translation. Client sends binary audio chunks, server sends translated subtitle cues.

- **Auth:** Token via in-band message
- **Path Params:** `channel_id`
- **Client Messages:**
  ```json
  { "type": "auth", "token": "string" }
  ```
  Binary audio chunks after authentication.
- **Server Messages:**
  ```json
  {
    "type": "subtitle",
    "text": "string",
    "language": "string",
    "start_time": 0.0,
    "end_time": 2.5,
    "is_predictive": false
  }
  ```

**Availability Check:** `GET /api/v1/live/{channel_id}/subtitles/status`

---

### WS `/api/v1/ws/live/{channel_id}/dubbing`

Live channel dubbing. Client sends binary audio chunks, server sends dubbed audio with sync status.

- **Auth:** Token via in-band message
- **Path Params:** `channel_id`
- **Client Messages:**
  ```json
  { "type": "auth", "token": "string" }
  ```
  Binary audio chunks after authentication.
- **Server Messages:**
  - Binary dubbed audio chunks
  ```json
  { "type": "sync_status", "offset_ms": 150, "quality": "good" }
  ```

**Availability Check:** `GET /api/v1/live/{channel_id}/dubbing/status`

---

### WS `/api/v1/ws/live/{channel_id}/trivia`

Live trivia fact delivery. Client sends transcript chunks, server sends trivia facts about on-screen topics.

- **Auth:** Token via in-band message
- **Path Params:** `channel_id`
- **Client Messages:**
  ```json
  { "type": "auth", "token": "string" }
  { "type": "transcript", "text": "string" }
  ```
- **Server Messages:**
  ```json
  {
    "type": "trivia",
    "fact": "string",
    "topic": "string",
    "source": "string",
    "confidence": 0.95
  }
  ```

**Availability Check:** `GET /api/v1/live/{channel_id}/trivia/status`

---

## Social WebSockets

### WS `/api/v1/ws/chess/{game_code}`

Real-time chess game with moves, chat, resign, and draw offers.

- **Auth:** Token via query parameter
- **Path Params:** `game_code`
- **Query Params:** `token`
- **Client Messages:**
  ```json
  { "type": "move", "from": "e2", "to": "e4" }
  { "type": "chat", "message": "Good move!" }
  { "type": "resign" }
  { "type": "draw_offer" }
  { "type": "draw_accept" }
  { "type": "draw_decline" }
  ```
- **Server Messages:**
  ```json
  { "type": "game_state", "board": "...", "turn": "white", "move_history": [] }
  { "type": "chat", "user_id": "string", "message": "string", "timestamp": "string" }
  { "type": "game_over", "result": "checkmate", "winner": "white" }
  ```

---

### WS `/api/v1/ws/dm/{friend_id}`

Real-time direct messaging between friends with typing indicators, read receipts, and reactions.

- **Auth:** Token via query parameter
- **Path Params:** `friend_id`
- **Query Params:** `token`
- **Client Messages:**
  ```json
  { "type": "message", "text": "string" }
  { "type": "typing" }
  { "type": "read", "message_id": "string" }
  { "type": "react", "message_id": "string", "emoji": "string" }
  ```
- **Server Messages:**
  ```json
  { "type": "message", "id": "string", "sender_id": "string", "text": "string", "timestamp": "string" }
  { "type": "typing", "user_id": "string" }
  { "type": "read_receipt", "message_id": "string" }
  { "type": "reaction", "message_id": "string", "user_id": "string", "emoji": "string" }
  ```

---

## Device Pairing WebSocket

### WS `/api/v1/auth/device-pairing/ws/{session_id}`

Real-time pairing status updates for TV device authentication. TV connects after calling `/init`.

- **Auth:** None (session-based)
- **Path Params:** `session_id`
- **Server Messages:**
  ```json
  { "type": "connected", "session_id": "string" }
  { "type": "companion_connected", "device_type": "string" }
  { "type": "authenticating" }
  { "type": "pairing_success", "access_token": "string", "user": {} }
  { "type": "pairing_failed", "reason": "string" }
  { "type": "session_expired" }
  ```

---

## Admin WebSocket

### WS `/ws/admin/diagnostics`

Real-time diagnostics updates for admin dashboard. Broadcasts every 5 seconds.

- **Auth:** Token via query parameter (admin/super_admin only)
- **Query Params:** `token`
- **Server Messages:**
  ```json
  {
    "type": "diagnostics_update",
    "active_connections": 150,
    "active_dubbing_sessions": 12,
    "active_subtitle_sessions": 45,
    "cpu_usage": 65.2,
    "memory_usage": 72.1,
    "timestamp": "string"
  }
  ```

---

## Voice Support WebSocket

### WS `/api/v1/support/voice`

Unified WebSocket for real-time voice support with STT/TTS pipeline.

- **Auth:** Token via query parameter
- **Query Params:** `token`, `language` (default: auto), `conversation_id` (optional), `voice_id` (optional)
- **Client Messages:** Binary audio chunks (user speech)
- **Server Messages:**
  ```json
  { "type": "transcript", "text": "string", "is_final": true }
  { "type": "response", "text": "string" }
  ```
  Binary audio (TTS response)

---

## Connection Best Practices

### Authentication

All WebSocket connections require authentication. Two patterns are used:

1. **Query Parameter Auth:** Token passed as `?token=<jwt>` in the connection URL
2. **In-Band Auth:** First message after connection must be an auth message

### Reconnection

Implement exponential backoff for reconnection:

::: v-pre
```typescript
const connect = (attempt = 0) => {
  const ws = new WebSocket(url);
  ws.onclose = () => {
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    setTimeout(() => connect(attempt + 1), delay);
  };
  ws.onopen = () => { attempt = 0; };
};
```
:::

### Heartbeat

Send periodic ping messages to keep the connection alive:

```json
{ "type": "ping" }
```

Server responds with:

```json
{ "type": "pong" }
```

### Error Handling

```json
{
  "type": "error",
  "code": "auth_failed",
  "message": "Invalid or expired token"
}
```

Common error codes:
- `auth_failed` - Invalid or expired token
- `rate_limited` - Too many messages
- `session_expired` - Session has ended
- `not_found` - Resource not found
- `internal_error` - Server error

---

**Document Status:** Complete
**Last Updated:** 2026-02-04
**Maintained by:** Backend Team
