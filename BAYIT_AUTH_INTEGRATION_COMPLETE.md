# Bayit+ Complete Auth Integration Guide

Complete guide for integrating all Bayit+ platforms with Olorin Auth Service.

---

## Overview

**What's Being Integrated**:
- ✅ Backend (FastAPI) - Dual-mode verification
- 🔄 Web App (React/Vite)
- 🔄 iOS App (Swift/SwiftUI)
- 🔄 Android App (Kotlin)
- 🔄 tvOS App (Swift/SwiftUI)

**Auth Service URL**: `https://auth.olorin.ai` (or `http://localhost:8080` for local)
**Tenant ID**: `bayit_plus`
**Token Type**: RS256 JWT (15 min access, 7 day refresh)

---

## Backend Integration ✅ COMPLETE

**Status**: Dual-mode auth active (accepts both HS256 and RS256)

**Files Modified**:
- ✅ `backend/app/core/auth_client.py` - Created
- ✅ `backend/app/core/security.py` - Updated
- ✅ `backend/app/core/config.py` - Updated
- ✅ `backend/.env` - AUTH_SERVICE_URL added

**How It Works**:
1. Backend receives token in Authorization header
2. Checks JWT algorithm (alg: RS256 or HS256)
3. RS256: Fetches JWKS from auth.olorin.ai, verifies signature
4. HS256: Uses existing SECRET_KEY (backward compatible)
5. Both paths return user info to endpoints

**No changes needed** - backend is ready!

---

## Web App Integration

### Step 1: Add Auth Service Client ✅

**Created**: `shared/services/api/olorinAuthService.ts`

Provides:
- `register(email, name, password)`
- `login(email, password)`
- `loginWithGoogle(idToken)`
- `loginWithApple(idToken)`
- `refreshToken(refreshToken)`
- `logout(accessToken, refreshToken)`
- `getProfile(accessToken)`

### Step 2: Update Environment Variables

**File**: `web/.env.local` (create if doesn't exist)

```env
VITE_AUTH_SERVICE_URL=http://localhost:8080
# Or for production:
# VITE_AUTH_SERVICE_URL=https://auth.olorin.ai
```

### Step 3: Update Auth Store

**File**: `shared/stores/authStore.ts`

```typescript
// Add this import at the top
import { olorinAuthService } from '../services/api/olorinAuthService';

// Update the login method:
login: async (email: string, password: string) => {
  set({ isLoading: true, error: null });
  try {
    // NEW: Call auth service
    const response = await olorinAuthService.login({
      email,
      password,
      tenant_id: 'bayit_plus',
    });

    // Map response to store format
    set({
      user: {
        id: response.user_id,
        email: response.email,
        name: response.name,
        avatar: response.avatar,
        role: response.role as Role,
        permissions: response.permissions as Permission[],
        is_active: true,
      },
      token: response.access_token,
      refreshToken: response.refresh_token,
      isAuthenticated: true,
      isLoading: false,
    });

    get().scheduleTokenRefresh();
  } catch (error: any) {
    set({
      error: error.response?.data?.detail || error.message || 'Login failed',
      isLoading: false,
    });
    throw error;
  }
},

// Update register method similarly:
register: async (data: RegisterData) => {
  set({ isLoading: true, error: null });
  try {
    const response = await olorinAuthService.register({
      email: data.email,
      name: data.name,
      password: data.password,
      tenant_id: 'bayit_plus',
    });

    set({
      user: {
        id: response.user_id,
        email: response.email,
        name: response.name,
        avatar: response.avatar,
        role: response.role as Role,
        permissions: response.permissions as Permission[],
        is_active: true,
      },
      token: response.access_token,
      refreshToken: response.refresh_token,
      isAuthenticated: true,
      isLoading: false,
    });

    get().scheduleTokenRefresh();
  } catch (error: any) {
    set({
      error: error.response?.data?.detail || error.message || 'Registration failed',
      isLoading: false,
    });
    throw error;
  }
},

// Update refreshAccessToken:
refreshAccessToken: async () => {
  const { refreshToken } = get();
  if (!refreshToken) return false;

  try {
    const response = await olorinAuthService.refreshToken(refreshToken);

    set({
      token: response.access_token,
      refreshToken: response.refresh_token,
    });

    get().scheduleTokenRefresh();
    return true;
  } catch (error) {
    get().logout();
    return false;
  }
},
```

### Step 4: Update Google OAuth Flow

**For Web** (using @react-oauth/google):

```typescript
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

// In your component:
const googleLogin = useGoogleLogin({
  onSuccess: async (response) => {
    try {
      const authResponse = await olorinAuthService.loginWithGoogle(
        response.credential || response.access_token
      );

      // Update auth store
      authStore.setUser({
        id: authResponse.user_id,
        email: authResponse.email,
        name: authResponse.name,
        avatar: authResponse.avatar,
        role: authResponse.role,
        permissions: authResponse.permissions,
      });
      authStore.setToken(authResponse.access_token, authResponse.refresh_token);

      navigate('/home');
    } catch (error) {
      console.error('Google login failed:', error);
    }
  },
});
```

### Step 5: Test

```bash
# Start auth service locally
cd /Users/olorin/Documents/Projects/olorin/scripts
./auth-start.sh

# Start web app
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/web
npm start

# Test at http://localhost:3000
# Try: Register, Login, Google OAuth
```

---

## iOS App Integration

### Step 1: Add Configuration

**File**: `ios-app/BayitPlusApp/Config.swift` (or Info.plist)

```swift
struct AuthConfig {
    static let authServiceURL = "https://auth.olorin.ai"
    // For local: "http://localhost:8080"

    static let tenantID = "bayit_plus"

    static let googleClientID = "715823240703-f5cps287b6h4chi42mjqktac6235c1el.apps.googleusercontent.com"
}
```

### Step 2: Create Auth Service Client

**Create**: `ios-app/BayitPlusApp/Services/OlorinAuthService.swift`

```swift
import Foundation

struct OlorinAuthResponse: Codable {
    let user_id: String
    let email: String
    let name: String
    let avatar: String?
    let role: String
    let permissions: [String]
    let tenant_id: String
    let access_token: String
    let refresh_token: String
    let token_type: String
    let expires_in: Int
}

struct LoginRequest: Codable {
    let email: String
    let password: String
    let tenant_id: String
    let device_id: String?
    let device_name: String?
}

struct GoogleAuthRequest: Codable {
    let provider: String = "google"
    let id_token: String
    let tenant_id: String
    let device_id: String?
    let device_name: String?
}

class OlorinAuthService {
    static let shared = OlorinAuthService()

    private let baseURL: String
    private let tenantID: String

    init(baseURL: String = AuthConfig.authServiceURL,
         tenantID: String = AuthConfig.tenantID) {
        self.baseURL = baseURL
        self.tenantID = tenantID
    }

    func login(email: String, password: String) async throws -> OlorinAuthResponse {
        let url = URL(string: "\(baseURL)/api/v1/auth/login")!

        let request = LoginRequest(
            email: email,
            password: password,
            tenant_id: tenantID,
            device_id: UIDevice.current.identifierForVendor?.uuidString,
            device_name: UIDevice.current.name
        )

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONEncoder().encode(request)

        let (data, response) = try await URLSession.shared.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw AuthError.loginFailed
        }

        return try JSONDecoder().decode(OlorinAuthResponse.self, from: data)
    }

    func loginWithGoogle(idToken: String) async throws -> OlorinAuthResponse {
        let url = URL(string: "\(baseURL)/api/v1/auth/login/google")!

        let request = GoogleAuthRequest(
            id_token: idToken,
            tenant_id: tenantID,
            device_id: UIDevice.current.identifierForVendor?.uuidString,
            device_name: UIDevice.current.name
        )

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONEncoder().encode(request)

        let (data, response) = try await URLSession.shared.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw AuthError.loginFailed
        }

        return try JSONDecoder().decode(OlorinAuthResponse.self, from: data)
    }

    func refreshToken(_ refreshToken: String) async throws -> OlorinAuthResponse {
        let url = URL(string: "\(baseURL)/api/v1/token/refresh")!

        let body = ["refresh_token": refreshToken, "tenant_id": tenantID]

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, _) = try await URLSession.shared.data(for: urlRequest)

        return try JSONDecoder().decode(OlorinAuthResponse.self, from: data)
    }
}

enum AuthError: Error {
    case loginFailed
    case registrationFailed
    case tokenRefreshFailed
}
```

### Step 3: Update Google Sign-In

**File**: Update your Google Sign-In implementation

```swift
import GoogleSignIn

// Configure Google Sign-In
GIDSignIn.sharedInstance.configuration = GIDConfiguration(
    clientID: AuthConfig.googleClientID
)

// Sign in
GIDSignIn.sharedInstance.signIn(withPresenting: self) { result, error in
    guard let user = result?.user,
          let idToken = user.idToken?.tokenString else {
        return
    }

    // Send to auth service
    Task {
        do {
            let response = try await OlorinAuthService.shared.loginWithGoogle(idToken: idToken)

            // Save tokens
            KeychainHelper.saveToken(response.access_token, key: "access_token")
            KeychainHelper.saveToken(response.refresh_token, key: "refresh_token")

            // Navigate to home
            await MainActor.run {
                self.navigateToHome()
            }
        } catch {
            print("Auth service login failed: \(error)")
        }
    }
}
```

### Step 4: Token Storage

Use Keychain for secure storage:

```swift
import Security

class KeychainHelper {
    static func saveToken(_ token: String, key: String) {
        let data = token.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]

        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    static func getToken(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        SecItemCopyMatching(query as CFDictionary, &result)

        guard let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func deleteToken(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}
```

---

## Android App Integration

### Step 1: Add Configuration

**File**: `android-app/core/core-auth/build.gradle.kts`

```kotlin
android {
    defaultConfig {
        buildConfigField("String", "AUTH_SERVICE_URL", "\"https://auth.olorin.ai\"")
        buildConfigField("String", "TENANT_ID", "\"bayit_plus\"")
        buildConfigField("String", "GOOGLE_CLIENT_ID", "\"715823240703-r11v6gn0fo88ojfacfffdp8r3n05bp3v.apps.googleusercontent.com\"")
    }
}
```

### Step 2: Create Auth Service Client

**Create**: `android-app/core/core-auth/src/main/java/tv/bayit/plus/core/auth/OlorinAuthService.kt`

```kotlin
package tv.bayit.plus.core.auth

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*

data class LoginRequest(
    val email: String,
    val password: String,
    val tenant_id: String,
    val device_id: String? = null,
    val device_name: String? = null
)

data class GoogleAuthRequest(
    val provider: String = "google",
    val id_token: String,
    val tenant_id: String,
    val device_id: String? = null,
    val device_name: String? = null
)

data class RefreshRequest(
    val refresh_token: String,
    val tenant_id: String
)

data class AuthResponse(
    val user_id: String,
    val email: String,
    val name: String,
    val avatar: String?,
    val role: String,
    val permissions: List<String>,
    val tenant_id: String,
    val access_token: String,
    val refresh_token: String,
    val token_type: String,
    val expires_in: Int
)

interface OlorinAuthApi {
    @POST("/api/v1/auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @POST("/api/v1/auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthResponse

    @POST("/api/v1/auth/login/google")
    suspend fun loginWithGoogle(@Body request: GoogleAuthRequest): AuthResponse

    @POST("/api/v1/token/refresh")
    suspend fun refreshToken(@Body request: RefreshRequest): AuthResponse

    @POST("/api/v1/auth/logout")
    suspend fun logout(
        @Header("Authorization") token: String,
        @Body request: LogoutRequest
    )

    @GET("/api/v1/account/me")
    suspend fun getProfile(@Header("Authorization") token: String): UserProfile
}

class OlorinAuthService(
    private val authServiceUrl: String = BuildConfig.AUTH_SERVICE_URL,
    private val tenantId: String = BuildConfig.TENANT_ID
) {
    private val api: OlorinAuthApi = Retrofit.Builder()
        .baseUrl(authServiceUrl)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(OlorinAuthApi::class.java)

    suspend fun login(email: String, password: String, deviceId: String? = null): AuthResponse =
        withContext(Dispatchers.IO) {
            api.login(
                LoginRequest(
                    email = email,
                    password = password,
                    tenant_id = tenantId,
                    device_id = deviceId,
                    device_name = android.os.Build.MODEL
                )
            )
        }

    suspend fun loginWithGoogle(idToken: String, deviceId: String? = null): AuthResponse =
        withContext(Dispatchers.IO) {
            api.loginWithGoogle(
                GoogleAuthRequest(
                    id_token = idToken,
                    tenant_id = tenantId,
                    device_id = deviceId,
                    device_name = android.os.Build.MODEL
                )
            )
        }

    suspend fun refreshToken(refreshToken: String): AuthResponse =
        withContext(Dispatchers.IO) {
            api.refreshToken(
                RefreshRequest(
                    refresh_token = refreshToken,
                    tenant_id = tenantId
                )
            )
        }

    companion object {
        @Volatile
        private var instance: OlorinAuthService? = null

        fun getInstance(): OlorinAuthService =
            instance ?: synchronized(this) {
                instance ?: OlorinAuthService().also { instance = it }
            }
    }
}
```

### Step 3: Update Google Sign-In Integration

**File**: `android-app/feature/feature-auth/src/main/java/tv/bayit/plus/feature/auth/GoogleAuthHelper.kt`

```kotlin
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import tv.bayit.plus.core.auth.OlorinAuthService

class GoogleAuthHelper(private val activity: Activity) {
    private val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
        .requestIdToken(BuildConfig.GOOGLE_CLIENT_ID)
        .requestEmail()
        .build()

    private val googleSignInClient = GoogleSignIn.getClient(activity, gso)
    private val authService = OlorinAuthService.getInstance()

    fun startSignIn() {
        val signInIntent = googleSignInClient.signInIntent
        activity.startActivityForResult(signInIntent, RC_SIGN_IN)
    }

    suspend fun handleSignInResult(data: Intent?): AuthResponse? {
        val task = GoogleSignIn.getSignedInAccountFromIntent(data)
        val account = task.getResult(ApiException::class.java)
        val idToken = account.idToken ?: return null

        // Send to auth service
        return authService.loginWithGoogle(idToken, account.id)
    }

    companion object {
        const val RC_SIGN_IN = 9001
    }
}
```

### Step 4: Secure Token Storage

Use EncryptedSharedPreferences:

```kotlin
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class TokenManager(context: Context) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "auth_tokens",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveTokens(accessToken: String, refreshToken: String) {
        prefs.edit()
            .putString("access_token", accessToken)
            .putString("refresh_token", refreshToken)
            .apply()
    }

    fun getAccessToken(): String? = prefs.getString("access_token", null)
    fun getRefreshToken(): String? = prefs.getString("refresh_token", null)

    fun clearTokens() {
        prefs.edit().clear().apply()
    }
}
```

---

## tvOS App Integration

### QR Code Pairing Flow

tvOS uses QR code pairing (already implemented in auth service):

**Step 1**: Initialize pairing session

```swift
// Call auth service device pairing endpoint
let url = URL(string: "\(authServiceURL)/api/v1/device-pairing/init")!
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("application/json", forHTTPHeaderField: "Content-Type")

let body = ["tenant_id": "bayit_plus", "device_type": "tv"]
request.httpBody = try JSONSerialization.data(withJSONObject: body)

let (data, _) = try await URLSession.shared.data(for: request)
let pairing = try JSONDecoder().decode(PairingSession.self, from: data)

// pairing.qr_code_url - display QR code on TV
// pairing.session_id - use for WebSocket
```

**Step 2**: WebSocket for real-time status

```swift
import Starscream

let socket = WebSocket(request: URLRequest(url: URL(string: "wss://auth.olorin.ai/api/v1/device-pairing/ws/\(sessionId)")!))

socket.onEvent = { event in
    switch event {
    case .text(let text):
        if let data = text.data(using: .utf8),
           let status = try? JSONDecoder().decode(PairingStatus.self, from: data),
           status.status == "completed" {
            // Pairing complete!
            let accessToken = status.access_token
            let refreshToken = status.refresh_token
            // Save tokens and navigate
        }
    default:
        break
    }
}

socket.connect()
```

---

## Common Integration Points

### All Platforms

**1. Environment Configuration**:
- Web: `VITE_AUTH_SERVICE_URL`
- iOS: `AuthConfig.authServiceURL`
- Android: `BuildConfig.AUTH_SERVICE_URL`
- tvOS: Same as iOS

**2. Google OAuth Client IDs**:
- Web: `715823240703-efe2sc0raa1l3sdrgicdpmaje2rdkbg6`
- Android: `715823240703-r11v6gn0fo88ojfacfffdp8r3n05bp3v`
- iOS/tvOS: `715823240703-f5cps287b6h4chi42mjqktac6235c1el`

**3. Token Format**:
All platforms receive the same response:
```json
{
  "user_id": "...",
  "email": "user@example.com",
  "access_token": "eyJ...",  // RS256, 15 min
  "refresh_token": "eyJ...",  // RS256, 7 days
  "role": "premium",
  "permissions": ["stream", "download"]
}
```

**4. Token Refresh**:
All platforms should refresh when access token expires (15 min):
- Check exp claim in JWT
- Refresh 5 minutes before expiration
- Use refresh token to get new access token
- Update stored tokens

**5. Error Handling**:
Auth service returns:
```json
{
  "detail": "Error message here"
}
```

Extract with: `error.response.data.detail || error.message`

---

## Testing Checklist

### Backend
- [x] Dual-mode auth working
- [x] RS256 tokens verified correctly
- [x] HS256 tokens still work (backward compatible)
- [x] API endpoints accept both token types

### Web App
- [ ] Auth service client created ✅
- [ ] Environment variable added
- [ ] Auth store updated to use new service
- [ ] Google OAuth updated
- [ ] Registration tested
- [ ] Login tested
- [ ] Token refresh tested

### iOS App
- [ ] Auth service client created (Swift)
- [ ] Google Sign-In SDK integrated
- [ ] Keychain storage implemented
- [ ] Token refresh implemented
- [ ] Full flow tested

### Android App
- [ ] Auth service client created (Kotlin)
- [ ] Google Sign-In SDK integrated
- [ ] Encrypted storage implemented
- [ ] Token refresh implemented
- [ ] Full flow tested

### tvOS App
- [ ] QR code pairing implemented
- [ ] WebSocket connection working
- [ ] Token storage implemented
- [ ] Tested end-to-end

---

## Migration Timeline

**Immediate** (Today):
- ✅ Backend dual-mode active
- ✅ Auth service client created (TypeScript)
- 🔄 Web app integration (next)

**This Week**:
- Web app fully migrated
- iOS app integration started
- Android app integration started

**Next Week**:
- All apps using auth service
- Legacy auth code removed
- Full migration complete

**The integration code is ready - just need to implement in each platform!**
