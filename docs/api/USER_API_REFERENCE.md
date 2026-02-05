# User Management API Reference

**Base URL:** `/api/v1`
**Last Updated:** 2026-02-04

---

## Users (`/api/v1/users`)

### GET `/api/v1/users/search`

Search for users by name (for game invites, social features).

- **Auth:** Required
- **Query Params:** `name` (2-100 chars), `limit` (1-50)
- **Response:** `UserSearchResponse`

### GET `/api/v1/users/{user_id}`

Get public info about a specific user.

- **Auth:** Required
- **Response:** `PublicUserInfo` (id, name, avatar)

### GET `/api/v1/users/me/preferences`

Get current user's preferences.

- **Auth:** Required

### PATCH `/api/v1/users/me/preferences`

Update current user's preferences.

- **Auth:** Required
- **Request Body:** `UpdatePreferencesRequest`

---

## Profiles (`/api/v1/profiles`)

### GET `/api/v1/profiles`

Get all profiles for current user. Auto-creates default if none exist.

- **Auth:** Required
- **Response:** `List[ProfileResponse]`

### POST `/api/v1/profiles`

Create a new profile. Enforces subscription tier limits.

- **Auth:** Required
- **Request Body:** `ProfileCreate`

### GET `/api/v1/profiles/{profile_id}`

Get a specific profile.

- **Auth:** Required

### PUT `/api/v1/profiles/{profile_id}`

Update a profile (name, avatar, PIN, preferences).

- **Auth:** Required
- **Request Body:** `ProfileUpdate`

### DELETE `/api/v1/profiles/{profile_id}`

Delete a profile. Cannot delete last profile.

- **Auth:** Required

### POST `/api/v1/profiles/{profile_id}/select`

Select a profile as active. Verifies PIN if set.

- **Auth:** Required
- **Request Body:** `ProfileSelect`

### POST `/api/v1/profiles/{profile_id}/verify-pin`

Verify a profile's PIN.

- **Auth:** Required
- **Request Body:** `PinVerify`

### GET `/api/v1/profiles/{profile_id}/recommendations`

Get AI-powered recommendations for profile based on watch history.

- **Auth:** Required

### POST `/api/v1/profiles/kids-pin/set`

Set or update the master kids PIN for account.

- **Auth:** Required

### POST `/api/v1/profiles/kids-pin/verify`

Verify the master kids PIN to exit kids mode.

- **Auth:** Required

### GET `/api/v1/profiles/preferences/ai`

Get AI preferences for current user.

- **Auth:** Required

### PUT `/api/v1/profiles/preferences/ai`

Update AI preferences.

- **Auth:** Required
- **Request Body:** `AIPreferences`

### GET `/api/v1/profiles/preferences/voice`

Get voice and accessibility preferences. Returns defaults if not authenticated.

- **Auth:** Optional

### PUT `/api/v1/profiles/preferences/voice`

Update voice and accessibility preferences.

- **Auth:** Required
- **Request Body:** `VoicePreferences`

### GET `/api/v1/profiles/preferences/home_page`

Get home page section configuration preferences.

- **Auth:** Required

### PUT `/api/v1/profiles/preferences/home_page`

Update home page section configuration.

- **Auth:** Required
- **Request Body:** `HomePagePreferences`

### POST `/api/v1/profiles/avatar/upload`

Upload a profile avatar image (JPEG, PNG, WebP, GIF - max 5MB).

- **Auth:** Required
- **Content-Type:** multipart/form-data

### GET `/api/v1/profile/stats`

Get current user's profile statistics (watchlist, favorites, downloads, watch time).

- **Auth:** Required
- **Response:** `ProfileStatsResponse`

---

## Subscriptions (`/api/v1/subscriptions`)

### GET `/api/v1/subscriptions/plans`

Get available subscription plans.

- **Auth:** None

### GET `/api/v1/subscriptions/current`

Get current user's subscription.

- **Auth:** Required

### POST `/api/v1/subscriptions/checkout`

Create a Stripe checkout session. Requires user verification, admins blocked.

- **Auth:** Required
- **Request Body:** `CheckoutRequest`
- **Response:**
  ```json
  { "checkoutUrl": "string" }
  ```

### POST `/api/v1/subscriptions/cancel`

Cancel subscription at end of billing period.

- **Auth:** Required

### POST `/api/v1/subscriptions/webhook`

Handle Stripe webhooks with idempotency protection.

- **Auth:** None (Stripe signature verified)

---

## Watchlist (`/api/v1/watchlist`)

### GET `/api/v1/watchlist`

Get user's watchlist.

- **Auth:** Required

### POST `/api/v1/watchlist`

Add content to watchlist.

- **Auth:** Required
- **Request Body:** `WatchlistAdd`

### DELETE `/api/v1/watchlist/{content_id}`

Remove content from watchlist.

- **Auth:** Required

### GET `/api/v1/watchlist/check/{content_id}`

Check if content is in watchlist.

- **Auth:** Required

### POST `/api/v1/watchlist/toggle/{content_id}`

Toggle watchlist status for content.

- **Auth:** Required
- **Query Params:** `content_type`

---

## Favorites (`/api/v1/favorites`)

### GET `/api/v1/favorites`

Get user's favorite items.

- **Auth:** Required

### POST `/api/v1/favorites`

Add content to favorites.

- **Auth:** Required
- **Request Body:** `FavoriteAdd`

### DELETE `/api/v1/favorites/{content_id}`

Remove content from favorites.

- **Auth:** Required

### GET `/api/v1/favorites/check/{content_id}`

Check if content is in favorites.

- **Auth:** Required

### POST `/api/v1/favorites/toggle/{content_id}`

Toggle favorite status for content.

- **Auth:** Required
- **Query Params:** `content_type`

---

## Downloads (`/api/v1/downloads`)

### GET `/api/v1/downloads`

Get user's downloaded items.

- **Auth:** Required

### POST `/api/v1/downloads`

Start a new download.

- **Auth:** Required
- **Request Body:** `DownloadAdd`

### DELETE `/api/v1/downloads/{download_id}`

Delete a downloaded item.

- **Auth:** Required

### GET `/api/v1/downloads/check/{content_id}`

Check if content is downloaded.

- **Auth:** Required

---

## Devices (`/api/v1/devices`)

### GET `/api/v1/devices`

Get all registered devices for current user.

- **Auth:** Required
- **Response:** `DeviceListResponse`

### POST `/api/v1/devices/register`

Register or update a device.

- **Auth:** Required
- **Request Body:** `DeviceRegisterRequest`

### DELETE `/api/v1/devices/{device_id}`

Unregister a device and terminate all active sessions.

- **Auth:** Required

### POST `/api/v1/devices/heartbeat`

Update device activity heartbeat.

- **Auth:** Required
- **Request Body:** `HeartbeatRequest`

---

## Notifications (`/api/v1/notifications`)

### POST `/api/v1/notifications/events`

Log a notification lifecycle event (shown, dismissed, action_clicked).

- **Auth:** Optional
- **Request Body:** `NotificationEventCreate`

### GET `/api/v1/notifications/history`

Get user's notification history (paginated).

- **Auth:** Required
- **Query Params:** `limit`, `skip`

### GET `/api/v1/notifications/admin/analytics`

Get notification analytics for admin dashboard.

- **Auth:** Required (Admin)
- **Query Params:** `start_date`, `end_date`, `platform`

### DELETE `/api/v1/notifications/admin/cleanup`

Delete notification events older than N days.

- **Auth:** Required (Admin)
- **Query Params:** `days`

---

## Onboarding (`/api/v1/onboarding/ai`)

### POST `/api/v1/onboarding/ai/start`

Start a new AI-powered onboarding conversation.

- **Auth:** None
- **Request Body:** `StartOnboardingRequest`

### POST `/api/v1/onboarding/ai/message`

Send a message in the onboarding conversation.

- **Auth:** None
- **Request Body:** `SendMessageRequest`

### POST `/api/v1/onboarding/ai/complete`

Complete onboarding and create user account.

- **Auth:** None
- **Request Body:** `CompleteOnboardingRequest`

### GET `/api/v1/onboarding/ai/session/{conversation_id}`

Get the current state of an onboarding session.

- **Auth:** None

### DELETE `/api/v1/onboarding/ai/session/{conversation_id}`

Cancel an onboarding session.

- **Auth:** None

---

## Extension Subscriptions (`/api/v1/extension/subscriptions`)

### GET `/api/v1/extension/subscriptions/status`

Get Chrome extension subscription status (free/premium).

- **Auth:** Required

### POST `/api/v1/extension/subscriptions/checkout`

Create Stripe checkout session for $5/month premium.

- **Auth:** Required

### POST `/api/v1/extension/subscriptions/cancel`

Cancel premium subscription (active until period end).

- **Auth:** Required

### POST `/api/v1/extension/subscriptions/webhook`

Handle Stripe webhooks for extension subscription events.

- **Auth:** None (Stripe signature verified)

---

## GDPR (`/api/v1/gdpr`)

### DELETE `/api/v1/gdpr/users/me/data`

Delete all user data (right to erasure).

- **Auth:** Required

### GET `/api/v1/gdpr/users/me/data-summary`

Get user data summary.

- **Auth:** Required

---

**Document Status:** Complete
**Last Updated:** 2026-02-04
**Maintained by:** Backend Team
