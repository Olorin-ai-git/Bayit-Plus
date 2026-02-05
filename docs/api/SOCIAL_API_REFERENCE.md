# Social & Gaming API Reference

**Base URL:** `/api/v1`
**Last Updated:** 2026-02-04

---

## Friends (`/api/v1/friends`)

### POST `/api/v1/friends/request`

Send a friend request.

- **Auth:** Required
- **Request Body:** `SendFriendRequestRequest`
  ```json
  { "receiver_id": "string", "message": "string (optional)" }
  ```

### POST `/api/v1/friends/request/accept`

Accept a friend request.

- **Auth:** Required
- **Request Body:** `RespondToRequestRequest`
  ```json
  { "request_id": "string" }
  ```

### POST `/api/v1/friends/request/reject`

Reject a friend request.

- **Auth:** Required
- **Request Body:** `RespondToRequestRequest`

### POST `/api/v1/friends/request/cancel`

Cancel a sent friend request.

- **Auth:** Required
- **Request Body:** `RespondToRequestRequest`

### DELETE `/api/v1/friends/{friend_id}`

Remove a friend.

- **Auth:** Required

### GET `/api/v1/friends/list`

Get user's friend list.

- **Auth:** Required

### GET `/api/v1/friends/requests`

Get pending friend requests (incoming and outgoing).

- **Auth:** Required

### POST `/api/v1/friends/search`

Search for users to add as friends.

- **Auth:** Required
- **Request Body:** `SearchUsersRequest`
  ```json
  { "query": "string", "limit": 20 }
  ```

---

## Direct Messages (`/api/v1/dm`)

### POST `/api/v1/dm/{friend_id}`

Send a direct message to a friend.

- **Auth:** Required
- **Request Body:** `DirectMessageCreate`
  ```json
  { "message": "string", "message_type": "string" }
  ```
- **Response:** `DirectMessageResponse`

### GET `/api/v1/dm/{friend_id}`

Get conversation history with a friend.

- **Auth:** Required
- **Query Params:** `limit` (default 50), `before`

### GET `/api/v1/dm/conversations`

List all DM conversations with most recent message.

- **Auth:** Required

### PATCH `/api/v1/dm/{message_id}/read`

Mark a message as read.

- **Auth:** Required

### PATCH `/api/v1/dm/read-all/{friend_id}`

Mark all messages from a friend as read.

- **Auth:** Required

### POST `/api/v1/dm/{message_id}/translate`

Manually translate a message.

- **Auth:** Required
- **Response:** Original + translated text, source/target language, cache status

### POST `/api/v1/dm/{message_id}/react`

Add a reaction to a message.

- **Auth:** Required
- **Query Params:** `emoji`

### DELETE `/api/v1/dm/{message_id}/react`

Remove a reaction from a message.

- **Auth:** Required
- **Query Params:** `emoji`

---

## Chess (`/api/v1/chess`)

### POST `/api/v1/chess/create`

Create a new chess game.

- **Auth:** Required
- **Request Body:** `CreateGameRequest`
  ```json
  { "color": "string", "time_control": "string (optional)", "game_mode": "string", "bot_difficulty": "string (optional)" }
  ```

### POST `/api/v1/chess/join`

Join an existing chess game by code.

- **Auth:** Required
- **Request Body:** `JoinGameRequest`
  ```json
  { "game_code": "string" }
  ```

### GET `/api/v1/chess/{game_code}`

Get chess game state by code.

- **Auth:** Required

### GET `/api/v1/chess/{game_code}/chat`

Get chat history for a chess game.

- **Auth:** Required

### POST `/api/v1/chess/{game_code}/resign`

Resign from a chess game.

- **Auth:** Required

### POST `/api/v1/chess/{game_code}/offer-draw`

Offer a draw.

- **Auth:** Required

### POST `/api/v1/chess/invite`

Create a chess game and invite a friend by name.

- **Auth:** Required
- **Request Body:** `InvitePlayerRequest`
  ```json
  { "friend_name": "string", "color": "WHITE", "time_control": "string (optional)" }
  ```

---

## Player Stats (`/api/v1/stats`)

### GET `/api/v1/stats/me`

Get current user's game statistics.

- **Auth:** Required

### GET `/api/v1/stats/user/{user_id}`

Get statistics for any user (public).

- **Auth:** None

### GET `/api/v1/stats/history`

Get current user's match history.

- **Auth:** Required
- **Query Params:** `limit` (default 50)

### GET `/api/v1/stats/head-to-head/{opponent_id}`

Get head-to-head statistics vs opponent.

- **Auth:** Required

### GET `/api/v1/stats/leaderboard`

Get top players leaderboard.

- **Auth:** None
- **Query Params:** `limit` (default 100)

---

## Channel Chat Moderation (`/api/v1/live/{channel_id}/chat`)

### POST `/api/v1/live/{channel_id}/chat/{message_id}/pin`

Pin a chat message. Admin only.

- **Auth:** Required (Admin)

### DELETE `/api/v1/live/{channel_id}/chat/{message_id}`

Delete a chat message. Admin only.

- **Auth:** Required (Admin)

### POST `/api/v1/live/{channel_id}/chat/{user_id}/mute`

Mute a user in channel chat. Admin only.

- **Auth:** Required (Admin)

### DELETE `/api/v1/live/{channel_id}/chat/{user_id}/mute`

Unmute a user in channel chat. Admin only.

- **Auth:** Required (Admin)

---

## Avatar Dialogue (`/api/v1/avatar/dialogue`)

### POST `/api/v1/avatar/dialogue`

Generate dialogue using hybrid approach (predetermined + AI fallback).

- **Auth:** None
- **Request Body:** `DialogueRequest`
  ```json
  {
    "category": "string (optional)",
    "user_message": "string (optional)",
    "count": 1,
    "query": "string (optional)",
    "context": "string (optional)",
    "personality_context": "string (optional)",
    "force_ai": false
  }
  ```
- **Response:** `DialogueResponse` (text, gesture, source, tts_required)

### GET `/api/v1/avatar/dialogue/categories`

List all available predetermined dialogue categories.

- **Auth:** None

### GET `/api/v1/avatar/dialogue/preview/{category}`

Preview all dialogues in a category.

- **Auth:** None

### POST `/api/v1/avatar/dialogue/predetermined`

Get a predetermined dialogue (no AI).

- **Auth:** None
- **Query Params:** `category`, `count`, `query`

---

**Document Status:** Complete
**Last Updated:** 2026-02-04
**Maintained by:** Backend Team
