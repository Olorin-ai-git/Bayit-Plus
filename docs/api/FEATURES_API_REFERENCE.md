# Features & Cultural API Reference

**Base URL:** `/api/v1`
**Last Updated:** 2026-02-04

---

## Morning Ritual (`/api/v1/ritual`)

### GET `/api/v1/ritual/check`

Check if it's morning ritual time for user.

- **Auth:** Required

### GET `/api/v1/ritual/content`

Get morning ritual playlist content.

- **Auth:** Required

### GET `/api/v1/ritual/ai-brief`

Get AI-generated personalized morning brief.

- **Auth:** Required

### GET `/api/v1/ritual/israel-now`

Get current context about Israel.

- **Auth:** None

### POST `/api/v1/ritual/preferences`

Update morning ritual preferences.

- **Auth:** Required
- **Request Body:** `RitualPreferencesUpdate`

### GET `/api/v1/ritual/preferences`

Get current morning ritual preferences.

- **Auth:** Required

### POST `/api/v1/ritual/skip-today`

Skip morning ritual for today.

- **Auth:** Required

### GET `/api/v1/ritual/should-show`

Quick check if ritual should be shown.

- **Auth:** Optional

---

## Judaism (`/api/v1/judaism`)

### Calendar

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/judaism/calendar/today` | None | Get today's Jewish calendar information |
| GET | `/judaism/calendar/shabbat` | None | Get Shabbat times for a city. Query: `city`, `state`, `geoname_id` |
| GET | `/judaism/calendar/daf-yomi` | None | Get today's Daf Yomi |
| GET | `/judaism/calendar/holidays` | None | Get upcoming Jewish holidays. Query: `days` (default 30) |
| GET | `/judaism/calendar/cities` | None | Get available cities for Shabbat times |

### Shabbat

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/judaism/shabbat/featured` | None | Get featured Shabbat content |
| GET | `/judaism/shabbat/status` | None | Get current Shabbat status. Query: `city`, `state` |

### Content

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/judaism/categories` | None | Get Judaism content categories |
| GET | `/judaism/content` | None | Get Judaism content. Query: `category`, `page`, `limit` |
| GET | `/judaism/featured` | None | Get featured Judaism content |
| GET | `/judaism/daily-shiur` | None | Get daily Torah class recommendation |
| GET | `/judaism/live` | None | Get currently live Torah classes |

### Jewish News

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/judaism/news` | None | Get aggregated Jewish news. Query: `category`, `source`, `page`, `limit` |
| GET | `/judaism/news/sources` | None | Get Jewish news sources |

### Community Directory

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/judaism/community/regions` | None | Get supported US regions |
| GET | `/judaism/community/synagogues` | None | Get synagogues. Query: `region`, `denomination`, `page`, `limit` |
| GET | `/judaism/community/kosher` | None | Get kosher restaurants. Query: `region`, `city`, `state`, `certification` |
| GET | `/judaism/community/jcc` | None | Get JCC locations. Query: `region`, `page`, `limit` |
| GET | `/judaism/community/mikvaot` | None | Get mikvah locations. Query: `region`, `page`, `limit` |
| GET | `/judaism/community/events` | None | Get community events. Query: `region`, `event_type`, `days` |
| GET | `/judaism/community/organization/{org_id}` | None | Get organization details |
| GET | `/judaism/community/search` | None | Search community directory |

### Torah Shiurim

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/judaism/shiurim` | None | Get Torah shiurim from RSS. Query: `category`, `rabbi`, `source`, `page`, `limit` |
| GET | `/judaism/shiurim/live` | None | Get live Torah classes |
| GET | `/judaism/shiurim/daily` | None | Get daily shiur recommendation |

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/judaism/admin/community/seed` | Admin | Seed sample community data |
| POST | `/judaism/admin/news/refresh` | Admin | Clear news cache |
| POST | `/judaism/admin/shiurim/refresh` | Admin | Clear shiurim cache |
| POST | `/judaism/admin/content/seed` | Admin | Seed Judaism content |
| DELETE | `/judaism/admin/content/clear` | Admin | Clear Judaism content |

---

## Jerusalem (`/api/v1/jerusalem`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/jerusalem/content` | Optional | Get Jerusalem-focused content. Query: `category`, `page`, `limit`, geo params |
| GET | `/jerusalem/featured` | Optional | Get featured Jerusalem content |
| GET | `/jerusalem/categories` | Optional | Get Jerusalem categories |
| GET | `/jerusalem/kotel` | Optional | Get Western Wall content |
| GET | `/jerusalem/kotel/events` | Optional | Get Kotel events |
| GET | `/jerusalem/idf-ceremonies` | Optional | Get IDF ceremony news |
| GET | `/jerusalem/diaspora` | Optional | Get diaspora connection news |
| GET | `/jerusalem/sources` | Optional | Get Jerusalem content sources |
| POST | `/jerusalem/admin/refresh` | Admin | Clear Jerusalem cache |

---

## Tel Aviv (`/api/v1/tel-aviv`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tel-aviv/content` | Optional | Get Tel Aviv-focused content. Query: `category`, `page`, `limit`, geo params |
| GET | `/tel-aviv/featured` | Optional | Get featured Tel Aviv content |
| GET | `/tel-aviv/categories` | Optional | Get Tel Aviv categories |
| GET | `/tel-aviv/beaches` | Optional | Get beaches content |
| GET | `/tel-aviv/nightlife` | Optional | Get nightlife content |
| GET | `/tel-aviv/culture` | Optional | Get culture content |
| GET | `/tel-aviv/music` | Optional | Get music scene content |
| GET | `/tel-aviv/sources` | Optional | Get Tel Aviv sources |
| POST | `/tel-aviv/admin/refresh` | Admin | Clear Tel Aviv cache |

---

## Cultures (`/api/v1/cultures`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/cultures` | Optional | List all cultures. Query: `active_only` (default true) |
| GET | `/cultures/default` | Optional | Get default culture |
| GET | `/cultures/{culture_id}` | Optional | Get culture details |
| GET | `/cultures/{culture_id}/cities` | Optional | Get culture cities. Query: `featured_only` |
| GET | `/cultures/{culture_id}/cities/{city_id}` | Optional | Get city details |
| GET | `/cultures/{culture_id}/cities/{city_id}/content` | Optional | Get city content |
| GET | `/cultures/{culture_id}/trending` | Optional | Get trending culture content |
| GET | `/cultures/{culture_id}/featured` | Optional | Get featured culture content |
| GET | `/cultures/{culture_id}/time` | Optional | Get culture timezone info |
| GET | `/cultures/{culture_id}/categories` | Optional | Get culture categories |
| GET | `/cultures/{culture_id}/sources` | Optional | Get culture news sources |

---

## Location (`/api/v1`)

### GET `/api/v1/location/reverse-geocode`

Convert coordinates to city/state.

- **Auth:** None
- **Rate Limit:** 30/minute
- **Query Params:** `latitude`, `longitude`

### POST `/api/v1/location-consent`

Grant/revoke location consent.

- **Auth:** Optional
- **Request Body:** `ConsentRequest`

### GET `/api/v1/location-consent`

Get consent status.

- **Auth:** Optional

---

## NLP (Natural Language Processing) (`/api/v1/nlp`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/nlp/sessions` | None | Create conversation session |
| GET | `/nlp/sessions/{session_id}` | None | Get session details |
| DELETE | `/nlp/sessions/{session_id}` | None | End session |
| POST | `/nlp/confirm-action` | None | Confirm pending action |
| POST | `/nlp/parse-command` | None | Parse natural language command |
| POST | `/nlp/execute-agent` | None | Execute agent workflow |
| POST | `/nlp/search-content` | None | Semantic content search |
| POST | `/nlp/voice-command` | None | Process voice command |
| GET | `/nlp/health` | None | NLP service health check |

---

## Live Trivia (`/api/v1/trivia`)

### GET `/api/v1/trivia/preferences`

Get user trivia preferences.

- **Auth:** Required

### PUT `/api/v1/trivia/preferences`

Update trivia preferences.

- **Auth:** Required
- **Request Body:** `TriviaPreferencesRequest`

### GET `/api/v1/trivia/admin/topics/{channel_id}`

Get channel topics. Admin only.

- **Auth:** Required (Admin)
- **Query Params:** `limit` (default 50)

### GET `/api/v1/trivia/admin/sessions/{user_id}`

Get user sessions. Admin only.

- **Auth:** Required (Admin)
- **Query Params:** `limit` (default 20)

---

## Quiz (`/api/v1/quiz`)

### GET `/api/v1/quiz/health`

Health check for quiz service.

- **Auth:** None

### GET `/api/v1/quiz/{content_id}`

Get or generate quiz for kids content.

- **Auth:** Required
- **Query Params:** `profile_id`, `language`

### POST `/api/v1/quiz/{quiz_id}/submit`

Submit quiz answers and receive score with rewards.

- **Auth:** Required
- **Request Body:** `QuizSubmitRequest`

### GET `/api/v1/quiz/history/me`

Get user's quiz history with statistics.

- **Auth:** Required
- **Query Params:** `profile_id`, `limit`, `offset`

---

## Rewards (`/api/v1/rewards`)

### GET `/api/v1/rewards/me`

Get current user's rewards (points, badges, streaks).

- **Auth:** Required
- **Query Params:** `profile_id`

### GET `/api/v1/rewards/stats`

Get quick reward stats for UI display.

- **Auth:** Required
- **Query Params:** `profile_id`

### GET `/api/v1/rewards/badges`

Get all available badges (public).

- **Auth:** None

### GET `/api/v1/rewards/badges/{badge_id}`

Get details for specific badge.

- **Auth:** None

---

## Comprehension (`/api/v1/comprehension`)

### GET `/api/v1/comprehension/{content_id}/question`

Get comprehension question for scene (deducts beta credits).

- **Auth:** Required
- **Query Params:** `scene_start`, `scene_end`, `language`

### POST `/api/v1/comprehension/questions/{question_id}/submit`

Submit answer to comprehension question.

- **Auth:** Required
- **Request Body:** `ComprehensionSubmitRequest`

### GET `/api/v1/comprehension/{content_id}/scenes`

Get scene markers for content.

- **Auth:** Required

---

## Support (`/api/v1/support`)

### Voice Support

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/support/chat` | Required | Voice support chat endpoint |
| POST | `/support/chat/stream` | Required | Streaming voice support chat (SSE) |
| WebSocket | `/support/voice` | Required | Real-time voice support. Query: `token`, `language`, `conversation_id`, `voice_id` |
| POST | `/support/chat/rate` | Required | Rate a voice support conversation |

### Tickets (User)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/support/tickets` | Required | Create a new support ticket |
| GET | `/support/tickets` | Required | List current user's tickets. Query: `page`, `page_size`, `status` |
| GET | `/support/tickets/{ticket_id}` | Required | Get a specific ticket |
| POST | `/support/tickets/{ticket_id}/messages` | Required | Add a message to a ticket thread |

### Tickets (Admin)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/support/admin/tickets` | Admin | List all tickets |
| GET | `/support/admin/tickets/{ticket_id}` | Admin | Get ticket with admin details |
| PATCH | `/support/admin/tickets/{ticket_id}` | Admin | Update ticket status/priority/assignment |
| POST | `/support/admin/tickets/{ticket_id}/messages` | Admin | Add a support response |
| POST | `/support/admin/tickets/{ticket_id}/notes` | Admin | Add an internal note |

### FAQ

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/support/faq` | None | Get FAQ entries. Query: `category`, `language` |
| POST | `/support/faq/{faq_id}/view` | None | Record a view for FAQ entry |
| POST | `/support/faq/{faq_id}/feedback` | None | Record feedback for FAQ entry |

### Documentation

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/support/docs` | None | List available documentation |
| GET | `/support/docs/{path}` | None | Get a specific documentation article |
| GET | `/support/docs/search` | Optional | Search documentation articles and FAQ |
| GET | `/support/docs/search/popular` | None | Get popular search queries |
| GET | `/support/docs/search/gaps` | Admin | Get searches with zero results |

### Analytics (Admin)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/support/admin/analytics` | Admin | Get support analytics |

---

## News (`/api/v1/news`)

### GET `/api/v1/news/mivzakim`

Get Ynet breaking news (mivzakim) - cached for 2 minutes.

- **Auth:** None
- **Query Params:** `limit` (default 10)

### GET `/api/v1/news/cache-info`

Get cache status for debugging.

- **Auth:** None

---

## Widgets (`/api/v1/widgets/system`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/widgets/system/available` | Optional | Get all available system widgets with `is_added` flag |
| GET | `/widgets/system/my` | Required | Get user's subscribed system widgets |
| POST | `/widgets/system/{widget_id}/add` | Required | Add a system widget to user's collection |
| DELETE | `/widgets/system/{widget_id}/remove` | Required | Remove a system widget |
| PATCH | `/widgets/system/{widget_id}/position` | Required | Update widget position |
| PATCH | `/widgets/system/{widget_id}/preferences` | Required | Update widget preferences (mute, visibility, order) |
| POST | `/widgets/system/{widget_id}/close` | Required | Close/hide a system widget |
| POST | `/widgets/system/{widget_id}/show` | Required | Show/restore a previously closed widget |

---

**Document Status:** Complete
**Last Updated:** 2026-02-04
**Maintained by:** Backend Team
