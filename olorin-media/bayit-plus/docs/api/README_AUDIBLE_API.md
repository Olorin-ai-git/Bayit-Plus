# Audible API Documentation Hub

**Last Updated**: 2026-01-27
**API Version**: v1
**Status**: ✅ Production Ready

---

## Overview

The Audible API enables users to link their Audible accounts and access their library within Bayit+. This documentation hub provides comprehensive guides, examples, and references for integration.

**Quick Facts**:
- 9 endpoints covering OAuth, library management, and catalog search
- Premium tier only (basic tier blocked with 403 Forbidden)
- Secure OAuth flow with PKCE (RFC 7636) and CSRF protection
- Token encryption at rest
- Automatic token refresh for seamless experience

---

## Documentation by Role

### 👨‍💻 For Developers (Getting Started)

**Start here**:
1. Read [Quick Reference Card](./AUDIBLE_API_QUICK_REFERENCE.md) (5 min read)
2. Review [Examples & Walkthrough](./AUDIBLE_API_EXAMPLES.md) (15 min read)
3. Test in [Swagger UI](/docs) (interactive)

**Then reference**:
- Error code lookup: Quick Reference (error codes section)
- Implementation details: Examples (JavaScript section)
- Technical specs: OpenAPI Specification

### 🔧 For Integration Engineers

**Resources**:
- [Complete Examples & Walkthrough](./AUDIBLE_API_EXAMPLES.md) - Full OAuth flow
- [OpenAPI Specification](./AUDIBLE_API_OPENAPI_SPECIFICATION.md) - Schema definitions
- [Quick Reference Card](./AUDIBLE_API_QUICK_REFERENCE.md) - Endpoint summary

**Tools**:
- Swagger UI: `/docs` (test endpoints)
- ReDoc: `/redoc` (view documentation)
- OpenAPI JSON: `/api/v1/openapi.json` (for code generation)

### 🔒 For Security Reviews

**Documentation**:
- [API Review & Approval](../reviews/AUDIBLE_API_DOCUMENTATION_APPROVAL_2026-01-27.md) - Security findings

**Key Security Features**:
- PKCE (RFC 7636) - Prevents authorization code interception
- CSRF Protection - State token validation
- Token Encryption - Fernet at-rest encryption
- Error Sanitization - No stack trace leakage
- Premium Tier Gating - Subscription validation

### 📊 For API Analytics

**Monitoring Points**:
- Token refresh failures: Check `last_sync_error` field
- Premium tier violations: 403 Forbidden responses
- Configuration issues: 503 Service Unavailable errors
- CSRF failures: 400 Invalid state parameter

### 📚 For Documentation Maintainers

**Files to Update**:
- Quick Reference: `/docs/api/AUDIBLE_API_QUICK_REFERENCE.md`
- Examples: `/docs/api/AUDIBLE_API_EXAMPLES.md`
- Specs: `/docs/api/AUDIBLE_API_OPENAPI_SPECIFICATION.md`

**Auto-Generated**:
- Swagger UI: `/docs` (from code docstrings)
- ReDoc: `/redoc` (from code docstrings)
- OpenAPI JSON: `/api/v1/openapi.json` (from Pydantic models)

---

## All Documentation Files

### Quick Start Guides

| File | Purpose | Best For | Read Time |
|------|---------|----------|-----------|
| [Quick Reference Card](./AUDIBLE_API_QUICK_REFERENCE.md) | One-page endpoint summary | Experienced developers | 5 min |
| [Examples & Walkthrough](./AUDIBLE_API_EXAMPLES.md) | Step-by-step OAuth flow | New integrators | 20 min |
| [OpenAPI Specification](./AUDIBLE_API_OPENAPI_SPECIFICATION.md) | Technical OpenAPI 3.0 spec | Code generation, IDE integration | 15 min |

### Review Documents

| File | Purpose | For |
|------|---------|-----|
| [API Approval Review](../reviews/AUDIBLE_API_DOCUMENTATION_APPROVAL_2026-01-27.md) | Complete review findings | Auditing, compliance |

### Executive Summary

| File | Purpose |
|------|---------|
| [Documentation Summary](../../AUDIBLE_API_DOCUMENTATION_SUMMARY.md) | High-level overview and status |

---

## API Quick Links

### Endpoints Summary

```
POST   /user/audible/oauth/authorize           Get OAuth authorization URL
POST   /user/audible/oauth/callback            Exchange code for tokens
GET    /user/audible/connected                 Check connection status
POST   /user/audible/disconnect                Remove connection
POST   /user/audible/library/sync              Sync audiobooks from Audible
GET    /user/audible/library                   Get synced audiobooks
GET    /user/audible/search                    Search Audible catalog
GET    /user/audible/{asin}/details            Get audiobook details
GET    /user/audible/{asin}/play-url           Get deep link URL
```

### Interactive Testing

- **Swagger UI**: `http://localhost:8090/docs`
- **ReDoc**: `http://localhost:8090/redoc`
- **OpenAPI JSON**: `http://localhost:8090/api/v1/openapi.json`

### Requirements

- **Subscription**: Premium or Family tier (basic tier blocked)
- **Authentication**: Bearer JWT token
- **Configuration**: Audible OAuth credentials required

---

## Common Tasks

### How to...

**Authenticate**:
1. Get JWT token from authentication system
2. Include in all requests: `Authorization: Bearer {token}`

**Connect Audible Account**:
1. Call `/oauth/authorize` with redirect URI
2. Redirect user to returned `auth_url`
3. User logs in to Audible.com and approves
4. User redirected back with code and state
5. Call `/oauth/callback` with code and state
6. Account connected

**Sync Library**:
1. Call `/library/sync` (auto-refreshes token if expired)
2. Audiobooks synced to database
3. Call `/library` to view books

**Search Audible**:
1. Call `/search?q=query&limit=20`
2. Returns matching audiobooks

**Open in Audible App**:
1. Call `/{asin}/play-url`
2. Redirect user to returned URL

---

## Error Codes Reference

| Code | Status | Meaning | Solution |
|------|--------|---------|----------|
| `audible_requires_premium` | 403 | User not premium/family | Check subscription tier |
| `audible_integration_not_configured` | 503 | OAuth credentials missing | Contact admin |
| `audible_service_unavailable` | 503 | Audible API down | Retry later |
| `audiobook_not_found` | 404 | ASIN doesn't exist | Verify ASIN |
| `invalid_state_parameter` | 400 | CSRF state mismatch | Restart flow |

**Full reference**: See Quick Reference Card (Error Codes Reference section)

---

## Security Features

### PKCE (RFC 7636)
Prevents authorization code interception. Uses S256 (SHA-256) method.

### CSRF Protection
State tokens prevent cross-site request forgery. One-time use only.

### Token Encryption
Tokens encrypted at rest in database using Fernet symmetric encryption.

### Error Sanitization
No stack traces in responses. Full context logged server-side.

**Details**: See API Approval Review

---

## Code Examples

### Quick OAuth Flow (JavaScript)

```javascript
// Step 1: Get authorization URL
const response = await fetch('/user/audible/oauth/authorize', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ redirect_uri: 'https://yourdomain.com/callback' })
});
const { auth_url, state } = await response.json();
sessionStorage.setItem('audible_state', state);

// Step 2: Redirect user to auth_url
window.location.href = auth_url;

// Step 3: Handle callback (in your callback page)
const code = new URLSearchParams(window.location.search).get('code');
const returnedState = new URLSearchParams(window.location.search).get('state');

// Step 4: Exchange code
const callbackResponse = await fetch('/user/audible/oauth/callback', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ code, state: returnedState })
});
const { status } = await callbackResponse.json();
console.log(`Connected: ${status}`);
```

**Full example with error handling**: See [Examples & Walkthrough](./AUDIBLE_API_EXAMPLES.md)

### Quick cURL Examples

```bash
# Get authorization URL
curl -X POST http://localhost:8090/user/audible/oauth/authorize \
  -H "Authorization: Bearer TOKEN" \
  -d '{"redirect_uri":"..."}'

# Check connection
curl http://localhost:8090/user/audible/connected \
  -H "Authorization: Bearer TOKEN"

# Sync library
curl -X POST http://localhost:8090/user/audible/library/sync \
  -H "Authorization: Bearer TOKEN"

# Get library (with pagination)
curl "http://localhost:8090/user/audible/library?skip=0&limit=20" \
  -H "Authorization: Bearer TOKEN"
```

**All endpoints**: See [Examples & Walkthrough](./AUDIBLE_API_EXAMPLES.md)

---

## Configuration Requirements

### Environment Variables

Before deploying:

```bash
# OAuth Credentials (from Audible)
AUDIBLE_CLIENT_ID=your_client_id
AUDIBLE_CLIENT_SECRET=your_client_secret
AUDIBLE_REDIRECT_URI=https://yourdomain.com/audible/callback

# API Endpoints
AUDIBLE_API_BASE_URL=https://api.audible.com
AUDIBLE_AUTH_URL=https://www.audible.com/auth/oauth2

# Timeouts (optional, has defaults)
AUDIBLE_HTTP_TIMEOUT_SECONDS=30
AUDIBLE_HTTP_CONNECT_TIMEOUT_SECONDS=10
```

**Configuration checklist**: See Quick Reference Card (Configuration Checklist section)

---

## Testing Checklist

**Manual Testing**:
- [ ] Login with premium user
- [ ] Login with basic user (should get 403)
- [ ] Start OAuth flow
- [ ] Complete OAuth flow
- [ ] Sync library
- [ ] View library with pagination
- [ ] Search catalog
- [ ] Get audiobook details
- [ ] Get play URL
- [ ] Disconnect account

**Test with**:
- Swagger UI (`/docs`) - click "Try it out"
- cURL examples from documentation
- JavaScript fetch examples

---

## Troubleshooting

### Common Issues

**Getting 403 Forbidden?**
- Check user is premium or family tier
- Verify JWT token is valid and not expired

**Getting 503 Service Unavailable?**
- Check Audible service is up (audible.com)
- Verify Audible OAuth credentials configured

**OAuth flow failing?**
- Verify redirect URI matches your OAuth app settings
- Save and verify state token
- Ensure authorization code is fresh

**Library sync not working?**
- Check account connected (`/connected` endpoint)
- Look at `last_sync_error` field for details

**Full troubleshooting guide**: See [Examples & Walkthrough](./AUDIBLE_API_EXAMPLES.md) (Troubleshooting section)

---

## Best Practices

1. **Always verify state token** - Prevents CSRF attacks
2. **Check connection status first** - Before assuming user linked account
3. **Handle errors gracefully** - Show user-friendly messages
4. **Cache search results** - Don't re-search unnecessarily
5. **Handle token refresh transparently** - Don't expose to UI
6. **Log API errors** - Include user ID and timestamp
7. **Test with both premium and basic users** - Verify tier gating

---

## Support & Resources

### Documentation
- Quick Reference: This page (you are here)
- Examples: [Complete walkthrough with examples](./AUDIBLE_API_EXAMPLES.md)
- Specs: [OpenAPI 3.0 specification](./AUDIBLE_API_OPENAPI_SPECIFICATION.md)

### Live Testing
- Swagger UI: `/docs`
- ReDoc: `/redoc`

### Review
- Full approval review: [API Documentation Approval](../reviews/AUDIBLE_API_DOCUMENTATION_APPROVAL_2026-01-27.md)

### Reporting Issues
Report API issues or documentation improvements via:
1. Check troubleshooting guide
2. Review error code reference
3. Check endpoint documentation
4. Contact system administrator

---

## API Status

**Last Checked**: 2026-01-27
**Status**: ✅ Fully Operational
**Uptime**: 99.9% SLA
**Version**: v1
**Deprecation**: None

**Roadmap**:
- Rate limiting (Q2 2026)
- Webhook events (Q3 2026)
- Batch operations (Q4 2026)

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 1.0.0 | 2026-01-27 | Initial release with OAuth, library management, catalog search |

---

## Quick Navigation

**Start here**:
1. [Quick Reference Card](./AUDIBLE_API_QUICK_REFERENCE.md) - 5 minute overview
2. [Examples & Walkthrough](./AUDIBLE_API_EXAMPLES.md) - Detailed guide with examples
3. [Swagger UI](/docs) - Interactive testing

**Reference**:
- [OpenAPI Specification](./AUDIBLE_API_OPENAPI_SPECIFICATION.md)
- [API Approval Review](../reviews/AUDIBLE_API_DOCUMENTATION_APPROVAL_2026-01-27.md)
- [Documentation Summary](../../AUDIBLE_API_DOCUMENTATION_SUMMARY.md)

**Test**:
- Swagger UI: `/docs`
- ReDoc: `/redoc`
- OpenAPI JSON: `/api/v1/openapi.json`

---

**Last Updated**: 2026-01-27
**Next Review**: After major feature additions
**Maintainer**: API Documentation Team
