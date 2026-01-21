# User API

The User API provides access to user accounts, profiles, preferences, and watchlists. These endpoints require appropriate OAuth scopes for user data access.

## Get Current User

Retrieve the authenticated user's account information:

```
GET /v1/users/me
Authorization: Bearer {access_token}
```

**Response**:

```json
{
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00Z",
    "subscription": {
      "plan": "premium",
      "status": "active",
      "expires_at": "2025-01-01T00:00:00Z"
    }
  }
}
```

## User Profiles

List profiles under the account:

```
GET /v1/users/me/profiles
```

Create a new profile:

```
POST /v1/users/me/profiles
Content-Type: application/json

{
  "name": "Profile Name",
  "avatar_id": "avatar_01",
  "is_kids_profile": false,
  "age_range": "adult"
}
```

Update profile settings:

```
PATCH /v1/users/me/profiles/{profile_id}
```

## Profile Preferences

Get profile preferences:

```
GET /v1/profiles/{profile_id}/preferences
```

Update preferences:

```
PATCH /v1/profiles/{profile_id}/preferences
Content-Type: application/json

{
  "language": "en",
  "subtitle_language": "en",
  "autoplay_enabled": true,
  "maturity_level": "pg13"
}
```

## Watchlist

Get the profile's watchlist:

```
GET /v1/profiles/{profile_id}/watchlist
```

Add content to watchlist:

```
POST /v1/profiles/{profile_id}/watchlist
Content-Type: application/json

{
  "content_id": "cnt_abc123"
}
```

Remove from watchlist:

```
DELETE /v1/profiles/{profile_id}/watchlist/{content_id}
```

## Watch History

Retrieve viewing history:

```
GET /v1/profiles/{profile_id}/history
  ?page=1&per_page=50
```

Record playback progress:

```
POST /v1/profiles/{profile_id}/history
Content-Type: application/json

{
  "content_id": "cnt_abc123",
  "position_seconds": 1234,
  "completed": false
}
```

## Continue Watching

Get in-progress content for the profile:

```
GET /v1/profiles/{profile_id}/continue-watching
```

Returns content with saved progress, sorted by last watched time.
