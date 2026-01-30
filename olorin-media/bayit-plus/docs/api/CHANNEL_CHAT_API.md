# Channel Chat API Reference

**Date**: 2026-01-30
**Status**: Implemented (Beta 500)
**Component**: Live Channel Chat System
**Base URL**: `/api/v1/live/{channel_id}/chat`

---

## Table of Contents

1. [WebSocket Endpoint](#websocket-endpoint)
2. [REST Endpoints](#rest-endpoints)
3. [Authentication](#authentication)
4. [Error Codes](#error-codes)
5. [Data Models](#data-models)
6. [Related Documents](#related-documents)

---

## WebSocket Endpoint

### `ws /ws/live/{channel_id}/chat`

Real-time bidirectional chat connection for a live channel.

**Connection URL**:
```
ws://localhost:8000/ws/live/{channel_id}/chat?token={firebase_jwt_token}
```

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `channel_id` | string | The unique identifier of the live channel |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Firebase JWT authentication token |

---

### Authentication Flow

1. Client connects with Firebase JWT in query parameter `token`
2. Server validates the JWT against Firebase Auth
3. On success, server sends a `connected` message containing a `session_token`
4. Client must include `session_token` in all subsequent state-changing messages (chat, reaction)
5. If authentication fails, server sends an `error` message with code `auth_failed` and closes the connection

---

### Client-to-Server Message Types

#### `authenticate`

Initial authentication message (sent automatically on connection via query param). If reconnecting without query param support, the client may send:

```json
{
  "type": "authenticate",
  "token": "<firebase_jwt_token>"
}
```

#### `chat`

Send a chat message to the channel. Requires `session_token`.

```json
{
  "type": "chat",
  "content": "Hello everyone!",
  "session_token": "<session_token>"
}
```

**Validation**:
- `content` must be non-empty and within `CHANNEL_CHAT_MAX_MESSAGE_LENGTH` characters
- Messages are sanitized through a multi-layer XSS pipeline (Bleach, regex pattern blocking, HTML entity escaping)
- Rate limited to `CHANNEL_CHAT_MAX_MESSAGES_PER_MINUTE` per user

#### `reaction`

React to an existing message. Requires `session_token`.

```json
{
  "type": "reaction",
  "message_id": "<message_id>",
  "emoji": "heart",
  "session_token": "<session_token>"
}
```

**Supported emoji values**: `heart`, `thumbsup`, `laugh`, `wow`, `sad`, `fire`

#### `pong`

Response to server heartbeat ping. No `session_token` required.

```json
{
  "type": "pong"
}
```

---

### Server-to-Client Message Types

#### `connected`

Sent upon successful authentication. Contains the session token for subsequent requests.

```json
{
  "type": "connected",
  "data": {
    "session_token": "<session_token>",
    "user_id": "<user_id>",
    "display_name": "User Name",
    "is_admin": false,
    "participant_count": 42
  }
}
```

#### `channel_chat_message`

Broadcast to all connected clients when a new chat message is sent.

```json
{
  "type": "channel_chat_message",
  "data": {
    "id": "<message_id>",
    "user_id": "<user_id>",
    "display_name": "User Name",
    "content": "Hello everyone!",
    "timestamp": "2026-01-30T12:00:00Z",
    "is_admin": false,
    "is_pinned": false
  }
}
```

#### `user_joined`

Broadcast when a user connects to the channel chat.

```json
{
  "type": "user_joined",
  "data": {
    "user_id": "<user_id>",
    "display_name": "User Name",
    "participant_count": 43
  }
}
```

#### `user_left`

Broadcast when a user disconnects from the channel chat.

```json
{
  "type": "user_left",
  "data": {
    "user_id": "<user_id>",
    "display_name": "User Name",
    "participant_count": 42
  }
}
```

#### `ping`

Server heartbeat message sent every `CHANNEL_CHAT_HEARTBEAT_INTERVAL_SECONDS` (default: 30 seconds). Client must respond with `pong` within `CHANNEL_CHAT_HEARTBEAT_TIMEOUT_SECONDS` (default: 90 seconds) or the connection is terminated.

```json
{
  "type": "ping"
}
```

#### `error`

Sent when a client request fails.

```json
{
  "type": "error",
  "data": {
    "code": "rate_limit",
    "message": "You are sending messages too quickly. Please wait before sending another message."
  }
}
```

---

### Heartbeat Protocol

| Parameter | Default | Source |
|-----------|---------|--------|
| Ping interval | 30 seconds | `CHANNEL_CHAT_HEARTBEAT_INTERVAL_SECONDS` |
| Pong timeout | 90 seconds | `CHANNEL_CHAT_HEARTBEAT_TIMEOUT_SECONDS` |

1. Server sends `ping` at the configured interval
2. Client must respond with `pong` within the timeout window
3. If no `pong` received, server terminates the WebSocket connection
4. Client-side hook implements exponential backoff reconnection on disconnect

---

### Connection Limits

| Limit | Default | Secret |
|-------|---------|--------|
| Max global connections | 10,000 | `CHANNEL_CHAT_MAX_GLOBAL_CONNECTIONS` |
| Max connections per IP | 5 | `CHANNEL_CHAT_MAX_CONNECTIONS_PER_IP` |
| Max connections per user | 3 | `CHANNEL_CHAT_MAX_CONNECTIONS_PER_USER` |

When a limit is reached, the server sends an `error` with code `rate_limit` and closes the connection.

---

## REST Endpoints

### GET `/api/v1/live/{channel_id}/chat/history`

Retrieve paginated chat history for a channel using cursor-based pagination.

**Authentication**: Required (Firebase JWT Bearer token)

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `channel_id` | string | The unique identifier of the live channel |

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `before` | string (ISO 8601) | (none) | Cursor: return messages before this timestamp |
| `limit` | integer | 50 | Number of messages to return (max: `CHANNEL_CHAT_HISTORY_LIMIT`) |

**Response** (200 OK):

```json
{
  "messages": [
    {
      "id": "msg_abc123",
      "user_id": "user_123",
      "display_name": "User Name",
      "content": "Hello everyone!",
      "timestamp": "2026-01-30T12:00:00Z",
      "is_admin": false,
      "is_pinned": false,
      "reactions": {
        "heart": 3,
        "thumbsup": 1
      }
    }
  ],
  "has_more": true,
  "next_cursor": "2026-01-30T11:55:00Z"
}
```

**Errors**:

| Status | Code | Description |
|--------|------|-------------|
| 401 | `auth_failed` | Missing or invalid authentication token |
| 404 | `channel_not_found` | Channel does not exist or is not live |

---

### GET `/api/v1/live/{channel_id}/chat/translate`

Translate a chat message to a target language. **Beta 500 users only** (no credit cost).

**Authentication**: Required (Firebase JWT Bearer token, Beta 500 user)

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `channel_id` | string | The unique identifier of the live channel |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | The text to translate |
| `from` | string | Yes | Source language code (ISO 639-1, e.g., `he`) |
| `to` | string | Yes | Target language code (ISO 639-1, e.g., `en`) |

**Response** (200 OK):

```json
{
  "translated_text": "Hello everyone, how is the show?",
  "source_language": "he",
  "target_language": "en",
  "cached": true
}
```

**Errors**:

| Status | Code | Description |
|--------|------|-------------|
| 401 | `auth_failed` | Missing or invalid authentication token |
| 403 | `beta_required` | Translation requires Beta 500 membership |
| 408 | `translation_timeout` | Translation request exceeded timeout (`CHANNEL_CHAT_TRANSLATION_TIMEOUT_SECONDS`) |
| 422 | `invalid_language` | Unsupported language code |
| 503 | `service_unavailable` | Translation service temporarily unavailable |

---

### POST `/api/v1/live/{channel_id}/chat/{message_id}/pin`

Pin a message to the top of the channel chat. **Admin only**.

**Authentication**: Required (Firebase JWT Bearer token, admin role)

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `channel_id` | string | The unique identifier of the live channel |
| `message_id` | string | The ID of the message to pin |

**Response** (200 OK):

```json
{
  "message_id": "msg_abc123",
  "pinned": true,
  "pinned_by": "admin_user_id",
  "pinned_at": "2026-01-30T12:05:00Z"
}
```

**Errors**:

| Status | Code | Description |
|--------|------|-------------|
| 401 | `auth_failed` | Missing or invalid authentication token |
| 403 | `admin_required` | Only admin users can pin messages |
| 404 | `message_not_found` | Message does not exist in this channel |

---

### DELETE `/api/v1/live/{channel_id}/chat/{message_id}`

Delete a message from the channel chat. **Admin only**. The deletion is logged in the moderation audit trail.

**Authentication**: Required (Firebase JWT Bearer token, admin role)

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `channel_id` | string | The unique identifier of the live channel |
| `message_id` | string | The ID of the message to delete |

**Response** (200 OK):

```json
{
  "message_id": "msg_abc123",
  "deleted": true,
  "deleted_by": "admin_user_id",
  "deleted_at": "2026-01-30T12:06:00Z"
}
```

**Errors**:

| Status | Code | Description |
|--------|------|-------------|
| 401 | `auth_failed` | Missing or invalid authentication token |
| 403 | `admin_required` | Only admin users can delete messages |
| 404 | `message_not_found` | Message does not exist in this channel |

---

### POST `/api/v1/live/{channel_id}/chat/{user_id}/mute`

Mute a user in the channel chat for a specified duration. **Admin only**. The mute action is logged in the moderation audit trail.

**Authentication**: Required (Firebase JWT Bearer token, admin role)

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `channel_id` | string | The unique identifier of the live channel |
| `user_id` | string | The ID of the user to mute |

**Request Body**:

```json
{
  "duration_minutes": 30,
  "reason": "Inappropriate language"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `duration_minutes` | integer | Yes | Mute duration in minutes |
| `reason` | string | No | Reason for muting (logged in audit trail) |

**Response** (200 OK):

```json
{
  "user_id": "user_456",
  "muted": true,
  "muted_by": "admin_user_id",
  "muted_until": "2026-01-30T12:35:00Z",
  "reason": "Inappropriate language"
}
```

**Errors**:

| Status | Code | Description |
|--------|------|-------------|
| 401 | `auth_failed` | Missing or invalid authentication token |
| 403 | `admin_required` | Only admin users can mute other users |
| 404 | `user_not_found` | User is not connected to this channel |

---

## Authentication

### WebSocket Authentication

1. Include Firebase JWT as `token` query parameter when establishing the WebSocket connection
2. Server validates the token against Firebase Auth
3. On success, server returns a `connected` message with a `session_token`
4. Include `session_token` in all state-changing messages (`chat`, `reaction`)
5. The `session_token` is bound to the WebSocket session and invalidated on disconnect

### REST Authentication

All REST endpoints require a Firebase JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <firebase_jwt_token>
```

Admin endpoints additionally verify that the authenticated user has an admin role.

---

## Error Codes

### WebSocket Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `rate_limit` | Message rate limit exceeded or connection limit reached | Wait before retrying; connection may be closed |
| `auth_failed` | Firebase JWT validation failed | Re-authenticate and reconnect |
| `session_invalid` | Session token is missing, expired, or invalid | Reconnect to obtain a new session token |
| `invalid_message` | Message format is invalid or content exceeds max length | Fix message format and resend |
| `user_muted` | User is muted and cannot send messages | Wait for mute duration to expire |

### REST HTTP Status Codes

| Status | Description |
|--------|-------------|
| 200 | Success |
| 400 | Bad request (invalid parameters) |
| 401 | Authentication required or token invalid |
| 403 | Forbidden (insufficient permissions or Beta 500 required) |
| 404 | Resource not found |
| 408 | Request timeout (translation) |
| 422 | Validation error (unsupported language, etc.) |
| 429 | Rate limit exceeded |
| 503 | Service unavailable |

---

## Data Models

### ChatMessage

```typescript
interface ChatMessage {
  id: string
  user_id: string
  display_name: string
  content: string
  timestamp: string          // ISO 8601
  is_admin: boolean
  is_pinned: boolean
  reactions: Record<string, number>
}
```

### ChatHistoryResponse

```typescript
interface ChatHistoryResponse {
  messages: ChatMessage[]
  has_more: boolean
  next_cursor: string | null  // ISO 8601 timestamp
}
```

### TranslationResponse

```typescript
interface TranslationResponse {
  translated_text: string
  source_language: string
  target_language: string
  cached: boolean
}
```

---

## Related Documents

- [Channel Live Chat Feature](../features/CHANNEL_LIVE_CHAT.md) - Feature overview and architecture
- [Google Cloud Secrets: Channel Chat](../deployment/GCLOUD_SECRETS_CHANNEL_CHAT.md) - Secrets management
- [Catch-Up API Reference](./CATCH_UP_API.md) - Companion Beta 500 API
- [Beta 500 Implementation Plan](../implementation/BETA_500_REVISED_PLAN.md) - Overall beta program
