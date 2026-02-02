# Family Controls API Reference

**Version**: 1.0
**Base URL**: `/api/v1/family`
**Last Updated**: 2026-02-02

---

## Overview

The Family Controls API provides unified parental control management for Bayit+ content. It allows parents/guardians to:

- Set up a family PIN for content protection
- Configure age-based content restrictions
- Enable/disable content sections (Kids, Youngsters)
- Set content rating limits (G, PG, PG-13)
- Implement time-based viewing restrictions
- Migrate from legacy kids/youngsters PIN systems

### Key Features

- **Account Lockout Protection**: 5 failed PIN attempts trigger 15-minute lockout
- **Rate Limiting**: All mutation endpoints are rate-limited
- **Multi-Language Support**: Error messages in 10 languages
- **Household Integration**: Supports household-level and user-level controls
- **Profile Awareness**: Foundation for profile-level overrides (Phase 4)

---

## Authentication

**All endpoints require authentication** via Firebase JWT token.

**Header Required**:
```http
Authorization: Bearer <firebase_jwt_token>
```

**User Context**: All endpoints automatically use the authenticated user's ID.

---

## Rate Limiting

| Endpoint | Rate Limit |
|----------|------------|
| `POST /controls/setup` | 5 requests/hour |
| `POST /controls/reset-pin` | 5 requests/hour |
| `POST /controls/verify-pin` | 10 requests/minute |
| `PATCH /controls` | 20 requests/hour |
| `GET /controls` | No limit |
| `GET /controls/sections` | No limit |
| `POST /controls/migrate` | No limit |

**Rate Limit Exceeded Response**:
```json
{
  "detail": "Rate limit exceeded. Try again later."
}
```

---

## Security Features

### Account Lockout

**Protection**: Prevents brute force PIN attacks

**Policy**:
- Maximum 5 failed PIN verification attempts
- After 5 failures: Account locked for 15 minutes
- Lockout applies to both PIN verification and PIN reset
- Failed attempts reset on successful verification

**Lockout Response** (HTTP 423):
```json
{
  "detail": "Account locked due to too many failed attempts. Try again in 14 minutes."
}
```

### PIN Requirements

- **Length**: 4-6 digits
- **Format**: Numeric only
- **Storage**: bcrypt hashed (never stored in plain text)
- **Validation**: Enforced at API layer

---

## Endpoints

### 1. Get Family Controls

Retrieve current family control settings.

**Endpoint**: `GET /controls`

**Authentication**: Required

**Rate Limit**: None

**Response** (HTTP 200):
```json
{
  "user_id": "user_123",
  "kids_age_limit": 12,
  "youngsters_age_limit": 17,
  "kids_enabled": true,
  "youngsters_enabled": true,
  "max_content_rating": "PG-13",
  "viewing_hours_enabled": false,
  "viewing_start_hour": 6,
  "viewing_end_hour": 22,
  "created_at": "2026-01-15T10:30:00Z",
  "updated_at": "2026-02-01T14:20:00Z"
}
```

**Error Responses**:

| Status | Description |
|--------|-------------|
| 401 | Not authenticated |
| 404 | Family controls not set up |

**Example Error** (HTTP 404):
```json
{
  "detail": "Family controls not set up. Use /setup to create controls."
}
```

---

### 2. Setup Family Controls

Create initial family controls with a PIN.

**Endpoint**: `POST /controls/setup`

**Authentication**: Required

**Rate Limit**: 5 requests/hour

**Request Body**:
```json
{
  "pin": "1234",
  "kids_age_limit": 12,
  "youngsters_age_limit": 17
}
```

**Request Schema**:

| Field | Type | Required | Constraints | Default | Description |
|-------|------|----------|-------------|---------|-------------|
| `pin` | string | Yes | 4-6 digits | - | Family PIN |
| `kids_age_limit` | integer | No | 0-12 | 12 | Max age for kids content |
| `youngsters_age_limit` | integer | No | 12-17 | 17 | Max age for youngsters content |

**Response** (HTTP 200):
```json
{
  "status": "success",
  "message": "Family controls created successfully",
  "controls": {
    "user_id": "user_123",
    "kids_age_limit": 12,
    "youngsters_age_limit": 17,
    "kids_enabled": true,
    "youngsters_enabled": true,
    "max_content_rating": "PG-13",
    "viewing_hours_enabled": false,
    "viewing_start_hour": 6,
    "viewing_end_hour": 22,
    "created_at": "2026-02-02T10:30:00Z",
    "updated_at": "2026-02-02T10:30:00Z"
  }
}
```

**Error Responses**:

| Status | Description |
|--------|-------------|
| 400 | Family controls already exist |
| 401 | Not authenticated |
| 422 | Validation error (invalid PIN format, age limits) |
| 429 | Rate limit exceeded |

---

### 3. Update Family Controls

Update one or more family control settings.

**Endpoint**: `PATCH /controls`

**Authentication**: Required

**Rate Limit**: 20 requests/hour

**Request Body** (all fields optional):
```json
{
  "kids_age_limit": 10,
  "youngsters_age_limit": 16,
  "kids_enabled": true,
  "youngsters_enabled": false,
  "max_content_rating": "PG",
  "viewing_hours_enabled": true,
  "viewing_start_hour": 8,
  "viewing_end_hour": 20
}
```

**Request Schema**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `kids_age_limit` | integer | 0-12 | Max age for kids content |
| `youngsters_age_limit` | integer | 12-17 | Max age for youngsters content |
| `kids_enabled` | boolean | - | Enable/disable kids section |
| `youngsters_enabled` | boolean | - | Enable/disable youngsters section |
| `max_content_rating` | string | `G`, `PG`, `PG-13` | Maximum allowed rating |
| `viewing_hours_enabled` | boolean | - | Enable time-based restrictions |
| `viewing_start_hour` | integer | 0-23 | Start hour (24-hour format) |
| `viewing_end_hour` | integer | 0-23 | End hour (24-hour format) |

**Response** (HTTP 200):
```json
{
  "status": "success",
  "message": "Family controls updated successfully",
  "controls": {
    "user_id": "user_123",
    "kids_age_limit": 10,
    "youngsters_age_limit": 16,
    "kids_enabled": true,
    "youngsters_enabled": false,
    "max_content_rating": "PG",
    "viewing_hours_enabled": true,
    "viewing_start_hour": 8,
    "viewing_end_hour": 20,
    "created_at": "2026-01-15T10:30:00Z",
    "updated_at": "2026-02-02T15:45:00Z"
  }
}
```

**Error Responses**:

| Status | Description |
|--------|-------------|
| 401 | Not authenticated |
| 404 | Family controls not set up |
| 422 | Validation error |
| 429 | Rate limit exceeded |

---

### 4. Verify Family PIN

Verify family PIN with account lockout protection.

**Endpoint**: `POST /controls/verify-pin`

**Authentication**: Required

**Rate Limit**: 10 requests/minute

**Request Body**:
```json
{
  "pin": "1234"
}
```

**Request Schema**:

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `pin` | string | Yes | 4-6 digits |

**Response** (HTTP 200):
```json
{
  "status": "success",
  "message": "PIN verified successfully"
}
```

**Error Responses**:

| Status | Description |
|--------|-------------|
| 401 | Invalid PIN (failed attempt recorded) |
| 404 | Family controls not set up |
| 423 | Account locked (too many failed attempts) |
| 429 | Rate limit exceeded |

**Example Failed Verification** (HTTP 401):
```json
{
  "detail": "Invalid PIN"
}
```

**Example Account Locked** (HTTP 423):
```json
{
  "detail": "Account locked due to too many failed attempts. Try again in 12 minutes."
}
```

---

### 5. Reset Family PIN

Update family PIN with verification of old PIN.

**Endpoint**: `POST /controls/reset-pin`

**Authentication**: Required

**Rate Limit**: 5 requests/hour

**Request Body**:
```json
{
  "old_pin": "1234",
  "new_pin": "5678"
}
```

**Request Schema**:

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `old_pin` | string | Yes | 4-6 digits |
| `new_pin` | string | Yes | 4-6 digits |

**Response** (HTTP 200):
```json
{
  "status": "success",
  "message": "PIN updated successfully"
}
```

**Error Responses**:

| Status | Description |
|--------|-------------|
| 401 | Invalid old PIN (failed attempt recorded) |
| 404 | Family controls not set up |
| 423 | Account locked (too many failed attempts) |
| 429 | Rate limit exceeded |

**Security Note**: PIN reset also enforces lockout protection. If the account is locked, the reset will fail with HTTP 423 even before verifying the old PIN.

---

### 6. Get Enabled Sections

Get enabled content sections and current viewing status.

**Endpoint**: `GET /controls/sections`

**Authentication**: Required

**Rate Limit**: None

**Response** (HTTP 200 - With Controls):
```json
{
  "kids": {
    "enabled": true,
    "age_limit": 12
  },
  "youngsters": {
    "enabled": false,
    "age_limit": 17
  },
  "max_content_rating": "PG",
  "viewing_hours_enabled": true,
  "viewing_allowed": false,
  "viewing_hours": {
    "start": 8,
    "end": 20
  },
  "block_reason": "Viewing is only allowed between 8:00 and 20:00"
}
```

**Response** (HTTP 200 - No Controls):
```json
{
  "kids": {
    "enabled": true,
    "age_limit": 12
  },
  "youngsters": {
    "enabled": true,
    "age_limit": 17
  },
  "max_content_rating": "PG-13",
  "viewing_hours_enabled": false
}
```

**Response Schema**:

| Field | Type | Description |
|-------|------|-------------|
| `kids.enabled` | boolean | Kids section accessible |
| `kids.age_limit` | integer | Max age for kids content |
| `youngsters.enabled` | boolean | Youngsters section accessible |
| `youngsters.age_limit` | integer | Max age for youngsters content |
| `max_content_rating` | string | Maximum allowed rating |
| `viewing_hours_enabled` | boolean | Time restrictions enabled |
| `viewing_allowed` | boolean | Current viewing allowed status |
| `viewing_hours` | object \| null | Time window (if enabled) |
| `block_reason` | string \| null | Reason if viewing blocked |

---

### 7. Migrate Legacy Controls

Migrate from legacy kids/youngsters PIN systems to unified family controls.

**Endpoint**: `POST /controls/migrate`

**Authentication**: Required

**Rate Limit**: None

**Request Body**: None

**Response** (HTTP 200):
```json
{
  "status": "success",
  "message": "Legacy controls migrated to unified family controls",
  "controls": {
    "user_id": "user_123",
    "kids_age_limit": 12,
    "youngsters_age_limit": 17,
    "kids_enabled": true,
    "youngsters_enabled": true,
    "max_content_rating": "PG-13",
    "viewing_hours_enabled": false,
    "viewing_start_hour": 6,
    "viewing_end_hour": 22,
    "created_at": "2026-02-02T10:30:00Z",
    "updated_at": "2026-02-02T10:30:00Z"
  }
}
```

**Error Responses**:

| Status | Description |
|--------|-------------|
| 400 | No legacy controls found or unified controls already exist |
| 401 | Not authenticated |

**Migration Logic**:
- Detects existing `kids_pin_hash` or `youngsters_pin_hash` on User model
- Prefers `kids_pin` if both exist
- Creates unified `FamilyControls` with migrated PIN
- Preserves existing age limits from User model

---

## Common Response Schemas

### Success Response

```typescript
{
  status: "success",
  message: string,
  controls?: FamilyControlsResponse
}
```

### Error Response

```typescript
{
  detail: string
}
```

### Family Controls Response

```typescript
{
  user_id: string,
  kids_age_limit: number,         // 0-12
  youngsters_age_limit: number,   // 12-17
  kids_enabled: boolean,
  youngsters_enabled: boolean,
  max_content_rating: "G" | "PG" | "PG-13",
  viewing_hours_enabled: boolean,
  viewing_start_hour: number,     // 0-23
  viewing_end_hour: number,       // 0-23
  created_at: string,             // ISO 8601
  updated_at: string              // ISO 8601
}
```

---

## Error Codes

| HTTP Status | Description | When It Occurs |
|-------------|-------------|----------------|
| 400 | Bad Request | Controls already exist, no legacy controls found |
| 401 | Unauthorized | Not authenticated, invalid PIN |
| 404 | Not Found | Family controls not set up |
| 422 | Validation Error | Invalid request body, constraint violations |
| 423 | Locked | Account locked due to too many failed attempts |
| 429 | Rate Limit Exceeded | Too many requests within time window |
| 500 | Internal Server Error | Unexpected server error |

---

## Usage Examples

### Example 1: Initial Setup

```javascript
// 1. Setup family controls
const setupResponse = await api.post('/family/controls/setup', {
  pin: '1234',
  kids_age_limit: 10,
  youngsters_age_limit: 16
});

console.log(setupResponse);
// {
//   status: "success",
//   message: "Family controls created successfully",
//   controls: { ... }
// }
```

### Example 2: Update Settings

```javascript
// 2. Enable time-based restrictions
const updateResponse = await api.patch('/family/controls', {
  viewing_hours_enabled: true,
  viewing_start_hour: 8,
  viewing_end_hour: 20
});

console.log(updateResponse);
// {
//   status: "success",
//   message: "Family controls updated successfully",
//   controls: { viewing_hours_enabled: true, ... }
// }
```

### Example 3: PIN Verification with Error Handling

```javascript
// 3. Verify PIN with lockout handling
try {
  const verifyResponse = await api.post('/family/controls/verify-pin', {
    pin: '1234'
  });
  console.log('PIN valid:', verifyResponse.status);
} catch (error) {
  if (error.response.status === 401) {
    console.error('Invalid PIN. Please try again.');
  } else if (error.response.status === 423) {
    console.error('Account locked:', error.response.data.detail);
  }
}
```

### Example 4: Check Viewing Allowed

```javascript
// 4. Check if viewing is currently allowed
const sectionsResponse = await api.get('/family/controls/sections');

if (!sectionsResponse.viewing_allowed) {
  console.log('Viewing blocked:', sectionsResponse.block_reason);
  // "Viewing is only allowed between 8:00 and 20:00"
} else {
  console.log('Viewing allowed');
}
```

### Example 5: Reset PIN

```javascript
// 5. Update family PIN
try {
  const resetResponse = await api.post('/family/controls/reset-pin', {
    old_pin: '1234',
    new_pin: '5678'
  });
  console.log(resetResponse.message);
  // "PIN updated successfully"
} catch (error) {
  if (error.response.status === 401) {
    console.error('Old PIN incorrect');
  } else if (error.response.status === 423) {
    console.error('Account locked. Too many failed attempts.');
  }
}
```

---

## Best Practices

### For Frontend Developers

1. **Handle Lockout Gracefully**:
   - Display lockout time remaining from error message
   - Disable PIN input field during lockout
   - Show countdown timer if possible

2. **Rate Limiting**:
   - Implement client-side rate limiting hints
   - Show warning before rate limit is hit
   - Cache GET responses to reduce requests

3. **PIN Input UX**:
   - Use numeric keyboard on mobile
   - Mask PIN input (show dots/asterisks)
   - Validate format before sending (4-6 digits)

4. **Error Messages**:
   - Use localized error messages from `@bayit/shared-i18n`
   - Map HTTP status codes to user-friendly messages
   - Provide actionable guidance (e.g., "Try again in X minutes")

5. **Viewing Hours**:
   - Check `/sections` endpoint before content playback
   - Show countdown to next viewing window
   - Display viewing hours in user's timezone

### For Backend Integration

1. **Dependency Injection**:
   - Use `get_family_controls_for_user()` for control retrieval
   - Use `check_kids_section_allowed()` / `check_youngsters_section_allowed()` for access guards
   - Use `filter_content_by_controls()` for content filtering

2. **Error Handling**:
   - Always catch `ValueError` from `verify_pin()` and `update_pin()`
   - Return HTTP 423 for lockout scenarios
   - Log security events (failed attempts, lockouts)

3. **Migration**:
   - Call `/migrate` endpoint during user login if legacy controls detected
   - Show migration success message to user
   - Document PIN migration for user awareness

---

## Changelog

### Version 1.0 (2026-02-02)

**Initial Release**:
- 7 endpoints for family controls management
- Account lockout protection (5 attempts / 15 minutes)
- Rate limiting on all mutation endpoints
- Multi-language error messages (10 languages)
- Legacy PIN migration support
- Time-based viewing restrictions
- Content rating limits (G, PG, PG-13)
- Section enable/disable controls

**Security Enhancements**:
- bcrypt PIN hashing
- Lockout bypass prevention (applies to PIN reset)
- Structured logging of security events
- Rate limiting with configurable thresholds

---

## Related Documentation

- [Family Controls Architecture](/docs/architecture/FAMILY_CONTROLS_ARCHITECTURE.md)
- [Security Guide](/docs/security/FAMILY_CONTROLS_SECURITY.md)
- [Frontend Integration Guide](/docs/guides/FAMILY_CONTROLS_FRONTEND.md)
- [Migration Guide](/docs/guides/FAMILY_CONTROLS_MIGRATION.md)

---

**For Support**: Report issues at https://github.com/Olorin-ai-git/olorin/issues
**API Version**: 1.0
**Last Updated**: 2026-02-02
