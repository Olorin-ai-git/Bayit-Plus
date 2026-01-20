# Authentication

The Bayit+ API uses JWT (JSON Web Tokens) for authentication. This guide covers obtaining tokens, OAuth 2.0 flows, and token refresh procedures.

## Authentication Methods

| Method | Use Case |
|--------|----------|
| OAuth 2.0 | User-facing applications |
| API Keys | Server-to-server integration |
| Service Accounts | Backend automation |

## OAuth 2.0 Authorization Code Flow

For applications accessing user data:

**Step 1**: Redirect user to authorization endpoint:

```
GET https://auth.bayit.plus/oauth/authorize
  ?client_id={client_id}
  &redirect_uri={redirect_uri}
  &response_type=code
  &scope=read:content read:profile
  &state={random_state}
```

**Step 2**: Exchange authorization code for tokens:

```
POST https://auth.bayit.plus/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={authorization_code}
&redirect_uri={redirect_uri}
&client_id={client_id}
&client_secret={client_secret}
```

**Step 3**: Receive access and refresh tokens:

```json
{
  "access_token": "eyJ...",
  "refresh_token": "dGhp...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read:content read:profile"
}
```

## Using Access Tokens

Include the access token in the Authorization header:

```
GET /v1/content/movies
Authorization: Bearer eyJ...
```

## Token Refresh

Access tokens expire after one hour. Use the refresh token to obtain new tokens:

```
POST https://auth.bayit.plus/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token={refresh_token}
&client_id={client_id}
&client_secret={client_secret}
```

Refresh tokens are valid for 30 days and are single-use. Each refresh returns a new refresh token.

## API Key Authentication

For server-to-server requests, use API key authentication:

```
GET /v1/content/movies
X-API-Key: sk_live_abc123...
```

Generate API keys in the developer portal under **Settings** > **API Keys**.

## Scopes

| Scope | Access Level |
|-------|--------------|
| `read:content` | Browse content catalog |
| `read:profile` | Access user profiles |
| `write:profile` | Modify user preferences |
| `read:history` | View watch history |
| `admin` | Full administrative access |

## Token Security

- Store tokens securely; never expose in client-side code
- Use HTTPS for all token exchanges
- Implement token rotation for long-running sessions
- Revoke compromised tokens immediately via the API
