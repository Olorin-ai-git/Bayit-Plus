# Audible API Integration - Examples & Quick Reference

**Date**: 2026-01-27
**Purpose**: Developer quick reference with complete OAuth flow examples and curl commands

---

## Complete OAuth Flow

### Step 1: Request Authorization URL

Get the URL where users authorize Bayit+ to access their Audible library.

```bash
curl -X POST http://localhost:8090/user/audible/oauth/authorize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "redirect_uri": "https://yourdomain.com/audible/callback"
  }'
```

**Response** (200 OK):
```json
{
  "auth_url": "https://www.audible.com/auth/oauth2/authorize?client_id=your_client_id&response_type=code&redirect_uri=https%3A%2F%2Fyourdomain.com%2Faudible%2Fcallback&state=8Zm9sTkVUqx6IwYw_sWvUf7XqzYo2ixqpXJwH3K-oqc&scope=library+profile",
  "state": "8Zm9sTkVUqx6IwYw_sWvUf7XqzYo2ixqpXJwH3K-oqc"
}
```

**What's Happening**:
1. Save the `state` value for CSRF protection
2. Redirect user to `auth_url`
3. User logs in to Audible.com and authorizes Bayit+
4. User is redirected back to your redirect_uri with `code` and `state` params

---

### Step 2: Handle OAuth Callback

After user authorizes, they're redirected back with an authorization code.

```bash
curl -X POST http://localhost:8090/user/audible/oauth/callback \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "authorization_code_received_from_audible",
    "state": "same_state_from_step_1"
  }'
```

**Response** (200 OK):
```json
{
  "status": "connected",
  "audible_user_id": "amzn1.ask.account.EXAMPLE_USER_ID",
  "synced_at": "2026-01-27T14:35:00Z"
}
```

**What's Happening**:
1. Authorization code is exchanged for OAuth tokens
2. Tokens are stored securely in database
3. User Audible account is now linked to their Bayit+ account
4. Ready to sync library

**Error Cases**:
```json
// If state doesn't match (CSRF attack)
{
  "detail": "Invalid CSRF state"
}

// If code is invalid
{
  "detail": "audible_callback_failed"
}

// If Audible service is down
{
  "detail": "audible_service_unavailable"
}
```

---

### Step 3: Sync Audible Library

After connecting, sync user's audiobooks from Audible to Bayit+.

```bash
curl -X POST http://localhost:8090/user/audible/library/sync \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response** (200 OK):
```json
{
  "status": "synced",
  "audiobooks_count": 42,
  "synced_at": "2026-01-27T14:35:00Z"
}
```

**What's Happening**:
1. Audible access token is refreshed if expired (automatic)
2. User's library is fetched from Audible API
3. 100 most recently added audiobooks are synced
4. Sync timestamp is recorded for status tracking

**Error Cases**:
```json
// If user hasn't connected Audible account
{
  "detail": "Audible account not connected"
}

// If token refresh fails
{
  "detail": "audible_service_unavailable"
}

// If user is not premium
{
  "detail": "audible_requires_premium"
}
```

---

### Step 4: Check Connection Status

Check if user has connected their Audible account.

```bash
curl http://localhost:8090/user/audible/connected \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response** (200 OK) - Connected:
```json
{
  "connected": true,
  "audible_user_id": "amzn1.ask.account.EXAMPLE_USER_ID",
  "synced_at": "2026-01-27T14:35:00Z",
  "last_sync_error": null
}
```

**Response** (200 OK) - Not Connected:
```json
{
  "connected": false,
  "audible_user_id": null,
  "synced_at": null,
  "last_sync_error": null
}
```

**Response** (200 OK) - Error on Last Sync:
```json
{
  "connected": true,
  "audible_user_id": "amzn1.ask.account.EXAMPLE_USER_ID",
  "synced_at": "2026-01-27T10:00:00Z",
  "last_sync_error": "Token refresh failed: Connection timeout"
}
```

---

## Accessing User's Library

### Get Synced Audiobooks

Retrieve audiobooks the user has synced from their Audible library.

```bash
# Get first 20 audiobooks
curl "http://localhost:8090/user/audible/library?skip=0&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response** (200 OK):
```json
[
  {
    "asin": "B0ABCDEF1234",
    "title": "The Midnight Library",
    "author": "Matt Haig",
    "narrator": "Davina Porter",
    "image": "https://images.audible.com/images/w/eAAAAAY3YjwAKAAAAAAAA_sLzELPQ-18c1BqvhQ_9KPKFLRPx_ZzJ8VZZ8sUHN5_oE4wMAAA.jpg",
    "description": "A dazzling novel about all the choices that go into a life well lived.",
    "duration_minutes": 504,
    "rating": 4.5,
    "is_owned": true,
    "source": "audible"
  },
  {
    "asin": "B0BCDEFG5678",
    "title": "Educated",
    "author": "Tara Westover",
    "narrator": "Tara Westover",
    "image": "https://images.audible.com/images/w/eAAAAAZ8cKwAKAAAAAAAAA_sLzELXX.jpg",
    "description": "A memoir about a woman who leaves her survivalist family to pursue education.",
    "duration_minutes": 720,
    "rating": 4.8,
    "is_owned": true,
    "source": "audible"
  }
]
```

### Pagination

```bash
# Get next 20 audiobooks (offset by 20)
curl "http://localhost:8090/user/audible/library?skip=20&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get 50 audiobooks at a time
curl "http://localhost:8090/user/audible/library?skip=0&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Pagination Parameters**:
- `skip`: Number of results to skip (default: 0)
- `limit`: Results per page (default: 20, max: 100)

---

## Searching the Audible Catalog

### Basic Search

Search for audiobooks in the Audible catalog (works without account connection).

```bash
curl "http://localhost:8090/user/audible/search?q=harry+potter&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response** (200 OK):
```json
[
  {
    "asin": "B00DG3RXGK",
    "title": "Harry Potter and the Philosopher's Stone",
    "author": "J.K. Rowling",
    "narrator": "Stephen Fry",
    "image": "https://images.audible.com/images/w/eAAAAAZXYjwAKAAAAAAAA_sLzELXX.jpg",
    "description": "An orphaned boy attends a magical school...",
    "duration_minutes": 537,
    "rating": 4.9,
    "is_owned": false,
    "source": "audible"
  }
]
```

### Search Validation

```bash
# Too short (minimum 2 characters required)
curl "http://localhost:8090/user/audible/search?q=a&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Error Response** (400 Bad Request):
```json
{
  "detail": "Search query must be at least 2 characters"
}
```

### Search Tips

- Minimum query length: 2 characters
- Works with title, author, or narrator names
- Returns up to specified limit (max 50)
- Includes availability and ownership info

---

## Getting Audiobook Details

### Get Full Audiobook Information

```bash
curl "http://localhost:8090/user/audible/B0ABCDEF1234/details" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response** (200 OK):
```json
{
  "asin": "B0ABCDEF1234",
  "title": "The Midnight Library",
  "author": "Matt Haig",
  "narrator": "Davina Porter",
  "image": "https://images.audible.com/images/w/eAAAAAY3YjwAKAAAAAAAA_sLzELPQ-18c1BqvhQ.jpg",
  "description": "A dazzling novel about all the choices that go into a life well lived. Nora Seed finds herself in the Midnight Library, between life and death. She has a chance to see how things would be different if she had made other choices...",
  "duration_minutes": 504,
  "rating": 4.5,
  "is_owned": false,
  "source": "audible"
}
```

### Error Case

```bash
# Non-existent ASIN
curl "http://localhost:8090/user/audible/INVALID123/details" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Error Response** (404 Not Found):
```json
{
  "detail": "audiobook_not_found"
}
```

---

## Opening Audiobook in Audible App

### Get Deep Link for App Opening

```bash
curl "http://localhost:8090/user/audible/B0ABCDEF1234/play-url?platform=ios" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response** (200 OK):
```json
{
  "url": "https://www.audible.com/pd/B0ABCDEF1234",
  "platform": "ios",
  "action": "redirect_to_audible"
}
```

### Platform-Specific Deep Links

**iOS**:
```
audible://www.audible.com/pd/B0ABCDEF1234
```

**Android**:
```
audible://www.audible.com/pd/B0ABCDEF1234
```

**Web**:
```
https://www.audible.com/pd/B0ABCDEF1234
```

---

## Disconnecting Account

### Remove Audible Connection

```bash
curl -X POST http://localhost:8090/user/audible/disconnect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response** (200 OK):
```json
{
  "status": "disconnected"
}
```

**What Happens**:
- Stored OAuth tokens are deleted
- Future library syncs won't work until reconnected
- Synced audiobooks remain in Bayit+ database
- User can reconnect anytime by repeating OAuth flow

**Error Case**:
```json
// If no Audible account is connected
{
  "detail": "No Audible account connected"
}
```

---

## Common Error Responses

### Authentication Errors

```json
// User not premium/family tier
Status: 403 Forbidden
{
  "detail": "audible_requires_premium"
}
```

```json
// User not logged in / invalid token
Status: 401 Unauthorized
{
  "detail": "Not authenticated"
}
```

### Configuration Errors

```json
// Audible integration not configured on server
Status: 503 Service Unavailable
{
  "detail": "audible_integration_not_configured"
}
```

### Validation Errors

```json
// Invalid search query
Status: 400 Bad Request
{
  "detail": "Search query must be at least 2 characters"
}
```

### Resource Errors

```json
// Audiobook ASIN not found
Status: 404 Not Found
{
  "detail": "audiobook_not_found"
}
```

```json
// No Audible account connected
Status: 400 Bad Request
{
  "detail": "Audible account not connected"
}
```

### Service Errors

```json
// Audible API is down or unreachable
Status: 503 Service Unavailable
{
  "detail": "audible_service_unavailable"
}
```

---

## Auto-Refresh Behavior

**Important**: Access tokens are automatically refreshed on demand.

You do not need to manually refresh tokens. The API handles this transparently:

- When syncing library: Token auto-refreshes if expired
- When fetching library: Token auto-refreshes if expired
- When an error occurs: Failure details are logged to `last_sync_error`

**Example**:
```bash
# This works even if token expired hours ago
curl -X POST http://localhost:8090/user/audible/library/sync \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response indicates success
{
  "status": "synced",
  "audiobooks_count": 42,
  "synced_at": "2026-01-27T14:35:00Z"
}
```

---

## API Summary

### Base URL
```
http://localhost:8090/user/audible
```

### Authentication
All requests require:
```
Authorization: Bearer {your_jwt_token}
```

### All Endpoints

| Method | Path | Purpose | Premium | Config |
|--------|------|---------|---------|--------|
| POST | /oauth/authorize | Get authorization URL | ✅ | ✅ |
| POST | /oauth/callback | Handle OAuth callback | ✅ | ✅ |
| GET | /connected | Check connection status | ✅ | ❌ |
| POST | /disconnect | Disconnect account | ✅ | ❌ |
| POST | /library/sync | Sync library from Audible | ✅ | ✅ |
| GET | /library | Get synced audiobooks | ✅ | ❌ |
| GET | /search | Search Audible catalog | ✅ | ✅ |
| GET | /{asin}/details | Get audiobook details | ✅ | ❌ |
| GET | /{asin}/play-url | Get playback URL | ✅ | ❌ |

**Premium**: Requires Premium or Family subscription
**Config**: Requires Audible OAuth configuration on server

---

## JavaScript/TypeScript Examples

### Using Fetch API

```javascript
// Step 1: Get authorization URL
const response = await fetch('http://localhost:8090/user/audible/oauth/authorize', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    redirect_uri: 'https://yourdomain.com/audible/callback'
  })
});

const { auth_url, state } = await response.json();

// Save state for verification
sessionStorage.setItem('audible_state', state);

// Redirect user to authorization URL
window.location.href = auth_url;

// Step 2: Handle callback (in your callback page)
const params = new URLSearchParams(window.location.search);
const code = params.get('code');
const returnedState = params.get('state');

// Verify state matches
if (returnedState !== sessionStorage.getItem('audible_state')) {
  console.error('CSRF attack detected');
  return;
}

// Exchange code for tokens
const callbackResponse = await fetch('http://localhost:8090/user/audible/oauth/callback', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: code,
    state: returnedState
  })
});

const { status, audible_user_id } = await callbackResponse.json();
console.log(`Connected: ${audible_user_id}`);

// Step 3: Sync library
const syncResponse = await fetch('http://localhost:8090/user/audible/library/sync', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});

const { audiobooks_count, synced_at } = await syncResponse.json();
console.log(`Synced ${audiobooks_count} audiobooks at ${synced_at}`);

// Step 4: Fetch library
const libraryResponse = await fetch('http://localhost:8090/user/audible/library?skip=0&limit=20', {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});

const audiobooks = await libraryResponse.json();
console.log('User library:', audiobooks);
```

### Error Handling

```javascript
async function handleAudibleError(response) {
  if (!response.ok) {
    const error = await response.json();

    switch (error.detail) {
      case 'audible_requires_premium':
        throw new Error('User must be premium/family tier');
      case 'audible_integration_not_configured':
        throw new Error('Audible integration not configured');
      case 'audible_service_unavailable':
        throw new Error('Audible service unavailable, try again later');
      case 'audiobook_not_found':
        throw new Error('Audiobook not found');
      default:
        throw new Error(`API error: ${error.detail}`);
    }
  }
  return response;
}

// Usage
try {
  const response = await fetch(url, options);
  await handleAudibleError(response);
  const data = await response.json();
} catch (error) {
  console.error('Audible API error:', error.message);
  // Handle error in UI
}
```

---

## Troubleshooting

### OAuth Flow Not Working

**Check**:
1. Is user premium/family tier? (basic tier users get 403)
2. Is Audible integration configured? (check environment variables)
3. Does redirect_uri match your OAuth app settings?
4. Did you save the state token from step 1?

### Library Sync Fails

**Check**:
1. Is Audible account actually connected? (call /connected endpoint)
2. Is Audible service up? (check audible.com)
3. Are you premium/family? (sync also requires premium)
4. Check last_sync_error in /connected response

### Can't Find Audiobook

**Check**:
1. Is ASIN correct? (format: B followed by 9 alphanumeric characters)
2. Is audiobook available in your region?
3. Check /search endpoint - does book exist there?

### Getting 403 Forbidden

**Causes**:
- User is basic tier (not premium/family)
- JWT token expired
- User not logged in

**Solution**: Check subscription tier, refresh JWT token, request re-login

### Getting 503 Service Unavailable

**Causes**:
- Audible service is down
- Audible OAuth credentials not configured on server
- Network connectivity issue

**Solution**: Wait and retry, or contact system administrator

---

## Best Practices

1. **Always verify state token** - Prevents CSRF attacks in OAuth flow
2. **Check connection status first** - Before assuming user has linked account
3. **Handle rate limiting gracefully** - Add exponential backoff for retries
4. **Cache search results** - Don't re-search for same query
5. **Store sync timestamps** - Know when library was last updated
6. **Handle token refresh transparently** - Don't expose refresh logic to UI
7. **Log all Audible API errors** - Include user ID and timestamp for debugging

---

## Contact & Support

For API issues or questions:
1. Check `/docs` endpoint for OpenAPI/Swagger documentation
2. Review error responses and troubleshooting section
3. Check `last_sync_error` field for specific error messages
4. Contact system administrator for configuration issues
