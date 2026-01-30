# Channel Live Chat - Public Chat for Live Channels

**Date**: 2026-01-30
**Status**: Implemented (Beta 500)
**Component**: Live Channel Chat System
**Platform**: Web (with mobile/tvOS planned)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Beta 500 Integration](#beta-500-integration)
4. [Backend Components](#backend-components)
5. [Frontend Components](#frontend-components)
6. [WebSocket Protocol](#websocket-protocol)
7. [Security](#security)
8. [Moderation](#moderation)
9. [i18n Support](#i18n-support)
10. [Configuration](#configuration)
11. [Testing](#testing)
12. [Related Documents](#related-documents)

---

## Overview

Twitch/YouTube-style public chat system for live TV channels on Bayit+. Viewers can participate in real-time conversations during live broadcasts. Beta 500 users receive automatic message translation as a premium feature.

### Key Capabilities

- Real-time WebSocket chat on live channels
- Auto-translation of messages for Beta 500 users
- Admin moderation tools (pin, delete, mute)
- Multi-layer XSS sanitization
- Rate limiting (global, per-IP, per-user)
- Session token authentication for state-changing messages
- Server heartbeat with configurable ping/timeout intervals
- Full moderation audit trail (append-only)

---

## Architecture

```
                     Frontend                              Backend
              +------------------+                 +------------------+
              | ChannelChatPanel |                 |  WebSocket       |
              | ChannelChatInput |----WebSocket--->|  Endpoint        |
              | ChannelChatMsg   |<---WebSocket----|  /ws/live/       |
              | useChannelChat   |                 |  {channel_id}/   |
              +--------+---------+                 |  chat            |
                       |                           +--------+---------+
              +--------+---------+                          |
              | channelChatSlice |                 +--------+---------+
              | (Zustand + persist)|               | ChannelChat      |
              +--------+---------+                 | Service          |
                       |                           +--------+---------+
              +--------+---------+                          |
              | channelChatService|                +--------+---------+
              | channelChatTypes  |                | MongoDB Models   |
              +------------------+                 | (Beanie ODM)     |
                                                   +------------------+
                                                   | ChannelChatMessage
                                                   | ChatTranslationCache
                                                   | ChatReaction
                                                   | ModerationAuditLog
                                                   +------------------+
```

---

## Beta 500 Integration

### Feature Tiers

| Feature | Standard Users | Beta 500 Users |
|---------|---------------|----------------|
| Send messages | Yes | Yes |
| Receive messages | Yes | Yes |
| View chat history | Yes | Yes |
| Auto-translation | No (original language only) | Yes (free, all 10 languages) |
| Reactions | Yes | Yes |

### Credit Cost

Auto-translation for Beta 500 users is **free** (no credit deduction). This is a value-add feature included with Beta 500 membership.

---

## Backend Components

### MongoDB Models

Located in `backend/app/models/channel_chat.py`:

| Model | Description |
|-------|-------------|
| `ChannelChatMessage` | Chat message with sender info, content, channel ID, timestamps |
| `ChatTranslationCache` | Cached translations keyed by message ID + target language |
| `ChatReaction` | Emoji reactions on messages with user tracking |
| `ModerationAuditLog` | Append-only audit trail for all moderation actions |

### Service Layer

Located in `backend/app/services/channel_chat_service.py`:

- Message creation with sanitization pipeline
- Chat history retrieval with pagination
- Translation request handling (Beta 500 gated)
- Moderation actions (pin, delete, mute)
- Connection management and session token validation

### WebSocket Endpoint

Located in `backend/app/api/routes/websocket_channel_chat.py`:

- Path: `/ws/live/{channel_id}/chat`
- Authentication via Firebase token in query params
- Session token issued via `secrets.token_urlsafe(32)`
- Server heartbeat: ping every 30s, timeout at 90s

### REST Endpoints

Located in `backend/app/api/routes/channel_chat.py`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/live/{channel_id}/chat/history` | Paginated chat history |
| GET | `/api/v1/live/{channel_id}/chat/translate` | Translate message (Beta 500) |
| POST | `/api/v1/live/{channel_id}/chat/pin` | Pin a message (admin) |
| DELETE | `/api/v1/live/{channel_id}/chat/{message_id}` | Delete message (admin) |
| POST | `/api/v1/live/{channel_id}/chat/mute` | Mute a user (admin) |

---

## Frontend Components

### Chat UI Components

| Component | File | Description |
|-----------|------|-------------|
| `ChannelChatPanel` | `web/src/components/player/chat/ChannelChatPanel.tsx` | Main floating chat overlay panel |
| `ChannelChatHeader` | `web/src/components/player/chat/ChannelChatHeader.tsx` | Header with participant count and controls |
| `ChannelChatInput` | `web/src/components/player/chat/ChannelChatInput.tsx` | Message input with rate limit indicator |
| `ChannelChatMessage` | `web/src/components/player/chat/ChannelChatMessage.tsx` | Single message bubble with RTL support |

### Hooks and State

| File | Description |
|------|-------------|
| `web/src/components/player/hooks/useChannelChat.ts` | WebSocket hook with exponential backoff reconnection |
| `web/src/stores/channelChatSlice.ts` | Zustand store with persist middleware |

### Services

| File | Description |
|------|-------------|
| `web/src/services/channelChatService.ts` | WebSocket connection manager and REST API client |
| `web/src/services/channelChatTypes.ts` | TypeScript type definitions for chat data |

---

## WebSocket Protocol

### Connection

```
ws://localhost:8000/ws/live/{channel_id}/chat?token={firebase_token}
```

### Message Types (Client to Server)

```json
{
  "type": "message",
  "content": "Hello everyone!",
  "session_token": "<token>"
}
```

```json
{
  "type": "reaction",
  "message_id": "<id>",
  "emoji": "heart",
  "session_token": "<token>"
}
```

### Message Types (Server to Client)

```json
{
  "type": "message",
  "data": {
    "id": "<message_id>",
    "user_id": "<user_id>",
    "display_name": "User Name",
    "content": "Hello everyone!",
    "timestamp": "2026-01-30T12:00:00Z",
    "is_admin": false
  }
}
```

```json
{
  "type": "system",
  "data": {
    "event": "user_joined",
    "participant_count": 42
  }
}
```

```json
{
  "type": "ping"
}
```

### Heartbeat

- Server sends `ping` every 30 seconds
- Client must respond with `pong` within 90 seconds
- Failure to respond results in connection termination
- Client hook implements exponential backoff reconnection

---

## Security

### XSS Sanitization Pipeline

All user messages pass through a multi-layer sanitization pipeline:

1. **Bleach sanitization**: Strips all HTML tags and attributes
2. **Pattern blocking**: Regex-based detection of script injection patterns
3. **HTML entity escaping**: `html.escape()` as final safety net

### Session Tokens

- Generated via `secrets.token_urlsafe(32)` upon WebSocket connection
- Required for all state-changing messages (send, react)
- Prevents CSRF-style attacks on WebSocket connections
- Tokens are bound to the WebSocket session and invalidated on disconnect

### Rate Limiting

Rate limiting enforced via `LiveFeatureRateLimiter` (in-memory):

| Limit Type | Scope | Description |
|------------|-------|-------------|
| Global | Server-wide | Maximum total concurrent connections |
| Per-IP | IP address | Maximum connections from a single IP |
| Per-User | Authenticated user | Maximum connections per user account |
| Message rate | Per-user | Maximum messages per minute (configurable) |

### Connection Limits

All connection limits are configurable via Google Cloud Secret Manager. See [GCLOUD_SECRETS_CHANNEL_CHAT.md](../deployment/GCLOUD_SECRETS_CHANNEL_CHAT.md).

---

## Moderation

### Admin Actions

| Action | Endpoint | Description |
|--------|----------|-------------|
| Pin message | `POST /api/v1/live/{channel_id}/chat/pin` | Pin a message to the top of the chat |
| Delete message | `DELETE /api/v1/live/{channel_id}/chat/{message_id}` | Remove a message from the chat |
| Mute user | `POST /api/v1/live/{channel_id}/chat/mute` | Mute a user for a specified duration |

### Audit Trail

All moderation actions are logged to the `ModerationAuditLog` MongoDB collection:

- **Append-only**: Logs cannot be modified or deleted
- **Fields**: admin user ID, action type, target user/message, timestamp, reason
- **Compliance**: Provides a complete audit trail for content moderation decisions

---

## i18n Support

All UI strings use i18n keys under the `channelChat.*` namespace. Translations are provided for all 10 supported languages:

| Language | Locale Code |
|----------|-------------|
| English | `en` |
| Hebrew | `he` |
| Spanish | `es` |
| French | `fr` |
| Italian | `it` |
| Bengali | `bn` |
| Hindi | `hi` |
| Tamil | `ta` |
| Japanese | `ja` |
| Chinese | `zh` |

RTL support is built into `ChannelChatMessage` for Hebrew content.

---

## Configuration

All configuration is managed via Google Cloud Secret Manager. See [GCLOUD_SECRETS_CHANNEL_CHAT.md](../deployment/GCLOUD_SECRETS_CHANNEL_CHAT.md) for the complete list of secrets.

Key configuration parameters:

| Parameter | Description |
|-----------|-------------|
| `CHANNEL_CHAT_MAX_MESSAGES_PER_MINUTE` | Rate limit for message sending |
| `CHANNEL_CHAT_MAX_MESSAGE_LENGTH` | Maximum character length per message |
| `CHANNEL_CHAT_HISTORY_LIMIT` | Number of messages returned in history endpoint |

---

## Testing

### Backend Tests (30 tests)

| Test File | Tests | Lines | Coverage |
|-----------|-------|-------|----------|
| `test_channel_chat_service.py` | 14 | 155 | Service layer logic |
| `test_channel_chat_websocket.py` | 16 | 200 | WebSocket protocol and connection handling |

### Frontend Tests (11 tests)

| Test File | Tests | Lines | Coverage |
|-----------|-------|-------|----------|
| `ChannelChatPanel.test.tsx` | 11 | 196 | Chat panel rendering and interaction |

---

## Related Documents

- [Channel Chat API Reference](../api/CHANNEL_CHAT_API.md) - Complete API documentation
- [Google Cloud Secrets: Channel Chat](../deployment/GCLOUD_SECRETS_CHANNEL_CHAT.md) - Secrets management
- [AI Catch-Up Summaries](./AI_CATCH_UP_SUMMARIES.md) - Companion Beta 500 live feature
- [Beta 500 Implementation Plan](../implementation/BETA_500_REVISED_PLAN.md) - Overall beta program
- [Beta 500 User Manual](../guides/BETA_500_USER_MANUAL.md) - User-facing documentation
