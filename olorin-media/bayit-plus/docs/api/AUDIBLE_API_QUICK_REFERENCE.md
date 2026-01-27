# Audible API - Quick Reference Card

**Last Updated**: 2026-01-27

---

## All Endpoints at a Glance

```
POST   /user/audible/oauth/authorize           Get authorization URL
POST   /user/audible/oauth/callback            Handle OAuth callback
GET    /user/audible/connected                 Check connection status
POST   /user/audible/disconnect                Disconnect account
POST   /user/audible/library/sync              Sync library from Audible
GET    /user/audible/library                   Get synced audiobooks (paginated)
GET    /user/audible/search                    Search Audible catalog
GET    /user/audible/{asin}/details            Get audiobook details
GET    /user/audible/{asin}/play-url           Get playback redirect URL
```

---

## Authentication

All requests require:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

---

## Subscription Requirements

All endpoints require one of:
- `subscription_tier: "premium"`
- `subscription_tier: "family"`

Basic tier users get:
```
HTTP 403 Forbidden
{
  "detail": "audible_requires_premium"
}
```

---

## Configuration Requirements

Some endpoints require Audible OAuth configured:
- `AUDIBLE_CLIENT_ID`
- `AUDIBLE_CLIENT_SECRET`
- `AUDIBLE_REDIRECT_URI`

If missing:
```
HTTP 503 Service Unavailable
{
  "detail": "audible_integration_not_configured"
}
```

**Endpoints Requiring Config**:
- POST /oauth/authorize
- POST /oauth/callback
- POST /library/sync
- GET /search

---

## OAuth Flow Sequence

```
1. POST /oauth/authorize
   ↓ (Get auth_url and state token)

2. Redirect user to auth_url
   ↓ (User logs in to Audible.com and approves)

3. User redirected to your redirect_uri with code & state
   ↓ (Verify state matches, extract code)

4. POST /oauth/callback
   ↓ (Exchange code for tokens, tokens stored in DB)

5. POST /library/sync
   ↓ (Fetch user's audiobooks from Audible)

6. GET /connected
   ↓ (Check connection status anytime)

7. GET /library
   ↓ (View user's synced audiobooks)
```

---

## Response Status Codes

| Code | Meaning | Examples |
|------|---------|----------|
| 200 | Success | All working endpoints |
| 400 | Bad Request | Invalid search query, missing fields |
| 403 | Forbidden | User not premium, invalid CSRF state |
| 404 | Not Found | Audiobook ASIN doesn't exist |
| 503 | Service Unavailable | Audible API down, config missing |
| 500 | Server Error | Unexpected error |

---

## Error Codes Reference

| Error Code | Meaning | HTTP | Solution |
|-----------|---------|------|----------|
| `audible_requires_premium` | User not premium/family | 403 | Check subscription tier |
| `audible_integration_not_configured` | OAuth creds missing | 503 | Contact admin |
| `audible_service_unavailable` | Audible API down or token refresh failed | 503 | Retry later |
| `audible_callback_failed` | OAuth token exchange failed | 400 | Re-start OAuth flow |
| `audiobook_not_found` | ASIN doesn't exist in catalog | 404 | Verify ASIN format |

---

## Request/Response Models

### AudibleOAuthRequest
```json
{
  "redirect_uri": "string (required)"
}
```

### AudibleOAuthCallback
```json
{
  "code": "string (required)",
  "state": "string (required)"
}
```

### AudibleAudiobookResponse
```json
{
  "asin": "B0ABCDEF1234",
  "title": "string",
  "author": "string",
  "narrator": "string or null",
  "image": "string (URL) or null",
  "description": "string or null",
  "duration_minutes": "integer or null",
  "rating": "float (0-5) or null",
  "is_owned": "boolean",
  "source": "audible"
}
```

### AudibleConnectionResponse
```json
{
  "connected": "boolean",
  "audible_user_id": "string or null",
  "synced_at": "ISO8601 datetime or null",
  "last_sync_error": "string or null"
}
```

---

## Common Request Examples

### Get Auth URL
```bash
curl -X POST http://localhost:8090/user/audible/oauth/authorize \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"redirect_uri":"https://example.com/callback"}'
```

### Check Connection
```bash
curl http://localhost:8090/user/audible/connected \
  -H "Authorization: Bearer TOKEN"
```

### Sync Library
```bash
curl -X POST http://localhost:8090/user/audible/library/sync \
  -H "Authorization: Bearer TOKEN"
```

### Get Library (with pagination)
```bash
curl "http://localhost:8090/user/audible/library?skip=0&limit=20" \
  -H "Authorization: Bearer TOKEN"
```

### Search
```bash
curl "http://localhost:8090/user/audible/search?q=harry+potter&limit=10" \
  -H "Authorization: Bearer TOKEN"
```

### Get Details
```bash
curl "http://localhost:8090/user/audible/B0ABCDEF1234/details" \
  -H "Authorization: Bearer TOKEN"
```

### Get Play URL
```bash
curl "http://localhost:8090/user/audible/B0ABCDEF1234/play-url" \
  -H "Authorization: Bearer TOKEN"
```

### Disconnect
```bash
curl -X POST http://localhost:8090/user/audible/disconnect \
  -H "Authorization: Bearer TOKEN"
```

---

## Auto-Behavior (You Don't Need to Implement)

✅ Token refresh happens automatically
- If token expired when syncing, it refreshes transparently
- If token expired when getting library, it refreshes transparently
- No manual refresh needed

✅ Errors are logged with context
- User ID included in all error logs
- Last sync error stored in UserAudibleAccount model
- Check `last_sync_error` field for details

✅ CSRF protection is automatic
- State token required for OAuth flow
- Mismatch is validated server-side

---

## Pagination Parameters

Used by: **GET /user/audible/library**

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `skip` | int | 0 | No limit | Results to skip (offset) |
| `limit` | int | 20 | 100 | Results per page |

**Example**:
```bash
# Get first 50 results
?skip=0&limit=50

# Get results 50-100
?skip=50&limit=50

# Get results 100-120
?skip=100&limit=20
```

---

## Search Parameters

Used by: **GET /user/audible/search**

| Parameter | Type | Required | Min Length | Max | Description |
|-----------|------|----------|-----------|-----|-------------|
| `q` | string | Yes | 2 | - | Search query (title, author, narrator) |
| `limit` | int | No | - | 50 | Results per page |

**Example**:
```bash
# Search for books
?q=harry+potter&limit=10

# Too short (error)
?q=a  # Returns 400 Bad Request
```

---

## Deep Link Formats

For **GET /{asin}/play-url**:

| Platform | Format |
|----------|--------|
| iOS | `audible://www.audible.com/pd/{asin}` |
| Android | `audible://www.audible.com/pd/{asin}` |
| Web | `https://www.audible.com/pd/{asin}` |

Server returns web URL; client determines platform.

---

## Key API Characteristics

✅ **Async**: All operations are async (may take a few seconds)
✅ **Authenticated**: All endpoints require JWT token
✅ **Paginated**: Library endpoint supports pagination
✅ **Rate-Limited**: Check for rate limit headers if implemented
✅ **Logged**: All operations logged with user context
✅ **Secure**: CSRF tokens, bearer auth, encrypted storage
✅ **Type-Safe**: Pydantic models enforce schema validation

---

## Connection Lifecycle

```
No Account Connected
  ↓
  POST /oauth/authorize (get auth_url)
  ↓
  User authorizes on Audible.com
  ↓
  POST /oauth/callback (exchange code for tokens)
  ↓
Account Connected (no audiobooks yet)
  ↓
  POST /library/sync (fetch audiobooks from Audible)
  ↓
Account Connected + Library Synced
  ↓
  GET /library (view audiobooks)
  GET /search (search catalog)
  POST /library/sync (re-sync anytime)
  ↓
  POST /disconnect (remove connection)
  ↓
No Account Connected
```

---

## Troubleshooting Checklist

**Getting 403 Forbidden**?
- [ ] User is premium or family tier?
- [ ] JWT token is valid and not expired?

**Getting 503 Service Unavailable**?
- [ ] Audible service is up? (check audible.com)
- [ ] Audible OAuth configured? (check env vars)

**OAuth flow failing**?
- [ ] Redirect URI matches OAuth app settings?
- [ ] State token saved and verified?
- [ ] Authorization code is fresh (not expired)?

**Can't find audiobook**?
- [ ] ASIN format correct? (B + 9 alphanumeric)
- [ ] Book available in your region?
- [ ] Try searching first (/search endpoint)

**Library sync not working**?
- [ ] Account connected? (check /connected)
- [ ] User has Audible account with books?
- [ ] Account permissions still valid?
- [ ] Check last_sync_error field for details

---

## Auto-Refresh Behavior

**You don't need to do this**:
```javascript
// DON'T DO THIS - it's automatic
if (token.isExpired()) {
  token = refreshToken();
}
```

**Just call the endpoint**:
```bash
# Token auto-refreshes if needed
curl -X POST http://localhost:8090/user/audible/library/sync \
  -H "Authorization: Bearer TOKEN"
```

The API handles token refresh transparently.

---

## Common Workflows

### Workflow 1: Connect Account & Sync
```bash
# 1. Get auth URL
curl -X POST /oauth/authorize \
  -d '{"redirect_uri":"..."}'
→ Get auth_url, show to user

# 2. (User authorizes on audible.com, you get code)

# 3. Exchange code
curl -X POST /oauth/callback \
  -d '{"code":"...","state":"..."}'
→ Account connected

# 4. Sync library
curl -X POST /library/sync
→ Audiobooks synced

# 5. Display library
curl /library
→ Show audiobooks to user
```

### Workflow 2: Search & View Details
```bash
# 1. Search catalog
curl "/search?q=harry+potter"
→ List of books

# 2. Get details
curl "/{asin}/details"
→ Full book info

# 3. Open in Audible
curl "/{asin}/play-url"
→ Redirect to Audible app
```

### Workflow 3: Manage Connection
```bash
# 1. Check connection status
curl /connected
→ See if connected, when last synced, any errors

# 2. Re-sync library
curl -X POST /library/sync
→ Update audiobooks

# 3. Disconnect if needed
curl -X POST /disconnect
→ Remove connection
```

---

## Configuration Checklist

Before going to production:

- [ ] `AUDIBLE_CLIENT_ID` set in environment
- [ ] `AUDIBLE_CLIENT_SECRET` set in secret manager
- [ ] `AUDIBLE_REDIRECT_URI` matches OAuth app settings
- [ ] JWT tokens properly validated
- [ ] Premium tier validation working
- [ ] CORS configured if needed
- [ ] SSL/TLS enabled in production
- [ ] Rate limiting configured (if applicable)
- [ ] Monitoring & alerting set up
- [ ] Database backups working
- [ ] Logging aggregation working

---

## Testing Checklist

- [ ] Premium user can authorize
- [ ] Basic user gets 403 Forbidden
- [ ] Library syncs successfully
- [ ] Pagination works (skip/limit)
- [ ] Search query validation works
- [ ] ASIN details lookup works
- [ ] Disconnect works
- [ ] Error messages are clear
- [ ] Logs contain user context
- [ ] Token refresh works transparently

---

## Support Resources

For more details:
- **Full Documentation**: `/docs/reviews/AUDIBLE_API_DOCUMENTATION_REVIEW_2026-01-27.md`
- **Examples & Walkthrough**: `/docs/api/AUDIBLE_API_EXAMPLES.md`
- **OpenAPI Spec**: `http://localhost:8090/docs` (auto-generated)
- **Implementation**: `backend/app/api/routes/audible_integration.py`
- **Service Layer**: `backend/app/services/audible_service.py`
