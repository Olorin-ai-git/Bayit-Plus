# Auth Migration Implementation Guide

**Date:** 2026-02-15
**Status:** Tasks #1, #2 Complete, Tasks #3-7, #9 Pending

---

## Completed

### ✅ Task #1: Enable Public Access

**What Was Done:**
1. Configured organization policy `iam.allowedPolicyMemberDomains` to "Allowed: All" (permits public access)
2. Granted `allUsers` role `roles/run.invoker` on Cloud Run service `olorin-auth` in `us-east1`
3. Verified JWKS endpoint publicly accessible at `https://auth.olorin.ai/.well-known/jwks.json`

**Verification:**
```bash
# JWKS endpoint - HTTP 200
curl https://auth.olorin.ai/.well-known/jwks.json

# Health endpoint - HTTP 200
curl https://auth.olorin.ai/health
```

**IAM Policy:**
```
bindings:
- members:
  - allUsers
  - serviceAccount:1003941207756-compute@developer.gserviceaccount.com  # Fraud
  - serviceAccount:439487217694-compute@developer.gserviceaccount.com   # CVPlus
  - serviceAccount:715823240703-compute@developer.gserviceaccount.com   # Bayit+
  role: roles/run.invoker
```

---

### ✅ Task #2: Bayit+ Auth Proxy

**Endpoints Created:**
- `POST /api/v1/auth/v2/register`
- `POST /api/v1/auth/v2/login`

**How It Works:**
1. Client sends auth request to Bayit+ backend `/v2` endpoints
2. Backend forwards to auth.olorin.ai using service account credentials
3. Auth service authenticates and returns RS256 tokens
4. Backend syncs user to Bayit+ MongoDB with app-specific fields
5. Returns tokens to client with Bayit+ metadata (payment_pending, etc.)

---

## Task #3: Migrate iOS Apps

### Implementation Steps

**1. Update AuthManager to use new endpoints**

File: `ios-app/Packages/BayitAuth/Sources/BayitAuth/AuthManager.swift`

```swift
// Add new auth service endpoints
enum AuthEndpoint {
    case register
    case login
    case refresh

    var path: String {
        switch self {
        case .register: return "/api/v1/auth/v2/register"
        case .login: return "/api/v1/auth/v2/login"
        case .refresh: return "/api/v1/token/refresh"
        }
    }
}

// Update register method
func register(email: String, password: String, name: String) async throws -> AuthResponse {
    let endpoint = baseURL + AuthEndpoint.register.path

    let body: [String: String] = [
        "email": email,
        "password": password,
        "name": name
    ]

    var request = URLRequest(url: URL(string: endpoint)!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(body)

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw AuthError.registrationFailed
    }

    return try JSONDecoder().decode(AuthResponse.struct, from: data)
}

// Update login method similarly
func login(email: String, password: String) async throws -> AuthResponse {
    let endpoint = baseURL + AuthEndpoint.login.path

    let body: [String: String] = [
        "email": email,
        "password": password
    ]

    var request = URLRequest(url: URL(string: endpoint)!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(body)

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw AuthError.loginFailed
    }

    return try JSONDecoder().decode(AuthResponse.self, from: data)
}
```

**2. Update token storage to use RS256 tokens**

The tokens from v2 endpoints are RS256 JWTs from auth.olorin.ai. No changes needed to KeychainService since tokens are opaque strings.

**3. Test on iOS simulator**

```bash
cd ios-app
xcodebuild -workspace BayitPlus.xcworkspace \
  -scheme BayitPlus \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

---

## Task #4: Migrate Android Apps

### Implementation Steps

**1. Update AuthRepository**

File: `android-app/feature-auth/src/main/kotlin/tv/bayit/plus/feature/auth/data/AuthRepository.kt`

```kotlin
// Add new endpoints
object AuthEndpoints {
    const val REGISTER = "/api/v1/auth/v2/register"
    const val LOGIN = "/api/v1/auth/v2/login"
    const val REFRESH = "/api/v1/token/refresh"
}

// Update register function
suspend fun register(
    email: String,
    password: String,
    name: String
): Result<AuthResponse> = withContext(Dispatchers.IO) {
    try {
        val request = RegisterRequest(
            email = email,
            password = password,
            name = name
        )

        val response = apiService.register(AuthEndpoints.REGISTER, request)

        // Store tokens
        tokenStorage.saveAccessToken(response.accessToken)
        tokenStorage.saveRefreshToken(response.refreshToken)

        Result.success(response)
    } catch (e: Exception) {
        Result.failure(e)
    }
}

// Update login function similarly
suspend fun login(
    email: String,
    password: String
): Result<AuthResponse> = withContext(Dispatchers.IO) {
    try {
        val request = LoginRequest(
            email = email,
            password = password
        )

        val response = apiService.login(AuthEndpoints.LOGIN, request)

        tokenStorage.saveAccessToken(response.accessToken)
        tokenStorage.saveRefreshToken(response.refreshToken)

        Result.success(response)
    } catch (e: Exception) {
        Result.failure(e)
    }
}
```

**2. Update API service interface**

File: `android-app/core/core-network/src/main/kotlin/tv/bayit/plus/core/network/BayitApiService.kt`

```kotlin
@POST
suspend fun register(
    @Url url: String,
    @Body request: RegisterRequest
): AuthResponse

@POST
suspend fun login(
    @Url url: String,
    @Body request: LoginRequest
): AuthResponse
```

**3. Test on Android emulator**

```bash
cd android-app
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## Task #5: Switch Bayit+ to RS256-Only

**When:** After iOS and Android apps are using v2 endpoints

**Implementation:**

1. Update `backend/app/core/security.py`:

```python
async def decode_token(token: str) -> Optional[dict]:
    """Decode RS256 token only - HS256 support removed."""
    auth_client = get_auth_client()

    # Only verify RS256 tokens
    try:
        header = jwt.get_unverified_header(token)
        if header.get("alg") != "RS256":
            logger.warning("rejected_non_rs256_token", alg=header.get("alg"))
            return None

        return await auth_client.verify_token(token)
    except Exception as e:
        logger.warning("token_verification_failed", error=str(e))
        return None
```

2. Test all clients can still authenticate

3. Monitor logs for any HS256 token rejections

---

## Task #6: Remove HS256 Support

**When:** After Task #5 is stable (1 week minimum)

**Files to Remove:**
- `backend/app/api/routes/auth.py` (old register/login endpoints)
- Remove HS256 secret from GCloud Secret Manager
- Remove `SECRET_KEY_OLD` from config

**Files to Update:**
- `backend/app/core/auth_client.py` - Remove `_verify_hs256` method
- `backend/app/core/security.py` - Remove dual-mode logic

**Migration Script:**

```python
# scripts/cleanup_legacy_auth.py
"""Remove legacy HS256 auth code."""

import os
from pathlib import Path

# Remove old auth endpoints
old_auth_file = Path("backend/app/api/routes/auth.py")
if old_auth_file.exists():
    # Archive first
    os.rename(old_auth_file, "backend/app/api/routes/auth.py.deprecated")
    print(f"Archived {old_auth_file}")

# Update router registry to remove old auth imports
# ... (implementation details)
```

---

## Task #7: Clean Up Orphaned OAuth Clients

**Manual Steps in Google Cloud Console:**

1. Go to https://console.cloud.google.com/apis/credentials?project=bayit-plus

2. **Delete Orphaned OAuth Client IDs:**
   - `-7j5p...` (Web client - not referenced)
   - `-pcpr...` (Web client - oldest, not referenced)
   - `-47ae...` (iOS client - not referenced)

3. **Delete Orphaned API Keys:**
   - "Bayit+ iOS OAuth" (not referenced in code)

4. **Keep Active Credentials:**
   - `-7p34...` (Web type - used by backend)
   - `-21du...` (iOS type - used by iOS/tvOS)
   - `-pp6d...` (Android type - used by Android)
   - `-9u8u...` (iOS/tvOS type - used by tvOS)

---

## Task #9: Migrate CVPlus

### Implementation Steps

**1. Install dependencies**

```bash
cd ../../../olorin-cv/cvplus
npm install jsonwebtoken jwks-rsa
```

**2. Create auth middleware**

File: `functions/src/middleware/auth.ts`

```typescript
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: 'https://auth.olorin.ai/.well-known/jwks.json',
  cache: true,
  cacheMaxAge: 3600000, // 1 hour
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export async function verifyToken(token: string): Promise<jwt.JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        issuer: 'https://auth.olorin.ai',
        audience: 'olorin',
      },
      (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          // Verify tenant
          const payload = decoded as jwt.JwtPayload;
          if (payload.tenant !== 'cvplus') {
            reject(new Error('Invalid tenant'));
          } else {
            resolve(payload);
          }
        }
      }
    );
  });
}

export async function authMiddleware(
  req: functions.https.Request,
  res: functions.Response,
  next: Function
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = await verifyToken(token);
    (req as any).user = payload;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

**3. Update protected routes**

```typescript
import { authMiddleware } from './middleware/auth';

export const createCV = functions.https.onRequest(async (req, res) => {
  await authMiddleware(req, res, async () => {
    const user = (req as any).user;
    console.log('User:', user.sub, user.email);

    // Your function logic here
    res.json({ success: true });
  });
});
```

**4. Test deployment**

```bash
firebase deploy --only functions
```

---

## Verification Checklist

### After Each Task

- [ ] All clients can register new users
- [ ] All clients can login existing users
- [ ] Tokens are valid and contain correct claims
- [ ] Protected endpoints accept tokens
- [ ] Token refresh works correctly
- [ ] Bayit+ specific features still work (payment flow, beta users, etc.)
- [ ] No errors in logs related to authentication
- [ ] Monitoring shows successful auth rate >99%

### Final Verification

- [ ] All legacy HS256 code removed
- [ ] No orphaned OAuth credentials in GCloud
- [ ] All platforms using RS256 tokens from auth.olorin.ai
- [ ] Documentation updated
- [ ] Team trained on new auth flow

---

## Rollback Plan

If issues arise during migration:

1. **Immediate:** Revert router registry to remove v2 endpoints
2. **Quick:** Roll back client apps to use old `/register` and `/login` endpoints
3. **Full:** Restore HS256 dual-mode support in `security.py`

Rollback scripts available in: `backend/scripts/rollback/`

---

## Support

For questions or issues during migration:
- Check logs: `gcloud logging read --project=bayit-plus`
- Test auth: `curl https://bayit-backend-production.run.app/api/v1/auth/v2/health`
- Verify tokens: Use https://jwt.io to decode and inspect

**Contact:** See deployment team for assistance
