# Google Sign-In Implementation

## Overview

Google Sign-In is implemented using the **modern Credential Manager API** (androidx.credentials) instead of the deprecated GoogleSignInClient. This provides a unified authentication experience across Android devices and integrates with Firebase Authentication.

## Architecture

### Components

1. **GoogleSignInHelper** (`core-auth`)
   - Singleton service that handles Google Sign-In flow
   - Uses Credential Manager API for modern authentication
   - Generates secure nonces (SHA-256 hashed)
   - Returns BayitResult with ID token on success

2. **FirebaseAuthService** (`core-auth`)
   - Consumes Google ID token from GoogleSignInHelper
   - Authenticates with Firebase using GoogleAuthProvider
   - Manages auth state across the app

3. **LoginViewModel** (`feature-auth`)
   - Orchestrates authentication flow
   - Calls FirebaseAuthService.signInWithGoogle() with token
   - Updates UI state based on result

4. **BayitNavHost** (`app`)
   - Wires GoogleSignInHelper to LoginRoute
   - Launches coroutine for async sign-in flow
   - Passes BuildConfig.GOOGLE_CLIENT_ID to helper

## Configuration

### 1. Add Google Client ID

Add the following to `gradle.properties` (or use environment variable):

```properties
bayit.google.clientId=YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com
```

The client ID is loaded via BuildConfig in `app/build.gradle.kts`:

```kotlin
buildConfigField("String", "GOOGLE_CLIENT_ID", "\"${project.findProperty("bayit.google.clientId") ?: ""}\"")
```

### 2. Get Google OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client ID**
5. Select **Android** as application type
6. Enter package name: `tv.bayit.plus`
7. Get SHA-1 fingerprint:
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
8. Copy the **Client ID** (ends with `.apps.googleusercontent.com`)

### 3. Firebase Configuration

Ensure your Firebase project has Google Sign-In enabled:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication > Sign-in method**
4. Enable **Google** provider
5. Add the OAuth Client ID from step 2
6. Download updated `google-services.json` if needed

## Dependencies

### libs.versions.toml

```toml
[versions]
credential-manager = "1.3.0"
google-id = "1.1.1"

[libraries]
credential-manager = { module = "androidx.credentials:credentials", version.ref = "credential-manager" }
credential-manager-play = { module = "androidx.credentials:credentials-play-services-auth", version.ref = "credential-manager" }
google-id = { module = "com.google.android.libraries.identity.googleid:googleid", version.ref = "google-id" }
```

### app/build.gradle.kts

```kotlin
// Google Identity (Credential Manager)
implementation(libs.credential.manager)
implementation(libs.credential.manager.play)
implementation(libs.google.id)
```

## Usage Flow

### 1. User Taps "Sign in with Google" Button

```kotlin
// LoginScreen.kt
GlassButton(
    text = "Sign in with Google",
    onClick = onGoogleSignInClick,
    enabled = !isLoading,
    isPrimary = false,
)
```

### 2. LoginRoute Triggers Sign-In Request

```kotlin
// LoginRoute.kt
onRequestGoogleSignIn = { onTokenReceived ->
    coroutineScope.launch {
        val activity = context as? Activity
        when (val result = googleSignInHelper.signIn(activity, BuildConfig.GOOGLE_CLIENT_ID)) {
            is BayitResult.Success -> onTokenReceived(result.data)
            is BayitResult.Failure -> // Handle error
        }
    }
}
```

### 3. GoogleSignInHelper Gets Credential

```kotlin
// GoogleSignInHelper.kt
suspend fun signIn(context: Context, googleClientId: String): BayitResult<String> {
    val credentialManager = CredentialManager.create(context)

    // Generate secure nonce
    val rawNonce = UUID.randomUUID().toString()
    val hashedNonce = hashNonce(rawNonce)

    // Build Google ID option
    val googleIdOption = GetGoogleIdOption.Builder()
        .setFilterByAuthorizedAccounts(false)
        .setServerClientId(googleClientId)
        .setNonce(hashedNonce)
        .build()

    // Get credential
    val result = credentialManager.getCredential(request, context)
    return BayitResult.success(credential.idToken)
}
```

### 4. LoginViewModel Authenticates with Firebase

```kotlin
// LoginViewModel.kt
fun loginWithGoogle(idToken: String) {
    viewModelScope.launch {
        when (val result = firebaseAuthService.signInWithGoogle(idToken)) {
            is BayitResult.Success -> _uiState.value = LoginUiState.Success
            is BayitResult.Failure -> _uiState.value = LoginUiState.Error(result.error.message)
        }
    }
}
```

### 5. FirebaseAuthService Completes Sign-In

```kotlin
// FirebaseAuthService.kt
suspend fun signInWithGoogle(idToken: String): BayitResult<FirebaseUser> {
    val credential = GoogleAuthProvider.getCredential(idToken, null)
    val result = firebaseAuth.signInWithCredential(credential).await()
    return BayitResult.success(result.user!!)
}
```

## Error Handling

### Error Types

1. **Configuration** - Google Client ID not configured
2. **Cancelled** - User cancelled the sign-in flow
3. **Authentication** - No credentials available or sign-in failed
4. **Unknown** - Unexpected errors

### Example Error Handling

```kotlin
when (val result = googleSignInHelper.signIn(activity, clientId)) {
    is BayitResult.Success -> {
        // Success - proceed with token
    }
    is BayitResult.Failure -> {
        when (result.error) {
            is BayitError.Cancelled -> {
                // User cancelled - no action needed
            }
            is BayitError.Configuration -> {
                // Client ID not configured
                logger.error("Google Client ID not configured")
            }
            is BayitError.Authentication -> {
                // Show error to user
                showError(result.error.message)
            }
            else -> {
                // Generic error
                showError("Sign-in failed")
            }
        }
    }
}
```

## Security

### Nonce Generation

The helper generates a secure nonce to prevent replay attacks:

```kotlin
private fun hashNonce(nonce: String): String {
    val bytes = nonce.toByteArray()
    val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
    return digest.fold("") { str, byte -> str + "%02x".format(byte) }
}
```

### Benefits

- **Prevents replay attacks** - Each sign-in uses unique nonce
- **Server validation** - Backend can verify token authenticity
- **Modern API** - Uses latest Android Credential Manager
- **Type-safe** - Kotlin coroutines with sealed Result types

## Testing

### Manual Testing

1. Configure Google Client ID in `gradle.properties`
2. Build and install app: `./gradlew :app:installDebug`
3. Tap "Sign in with Google" button
4. Select Google account
5. Verify successful authentication
6. Check logs for "Google Sign-In credential received"

### Test Scenarios

- **Happy path** - User signs in successfully
- **User cancellation** - User clicks back/cancel
- **No accounts** - Device has no Google accounts
- **Network error** - Device offline during sign-in
- **Invalid Client ID** - Misconfigured credentials

## Troubleshooting

### "No Google account found on device"

- Add a Google account to the device/emulator
- Go to Settings > Accounts > Add account > Google

### "Google Sign-In failed: ApiException"

- Verify SHA-1 fingerprint matches in Google Cloud Console
- Check package name is correct (`tv.bayit.plus`)
- Ensure google-services.json is up to date

### "Google Client ID not configured"

- Add `bayit.google.clientId` to `gradle.properties`
- Rebuild the app to regenerate BuildConfig

### Sign-in works but Firebase auth fails

- Enable Google provider in Firebase Console
- Add OAuth Client ID to Firebase Google provider settings
- Verify Firebase project matches google-services.json

## Migration from GoogleSignInClient

This implementation replaces the deprecated GoogleSignInClient:

| Old (Deprecated) | New (Credential Manager) |
|-----------------|--------------------------|
| GoogleSignInClient | CredentialManager |
| GoogleSignInOptions | GetGoogleIdOption |
| GoogleSignInAccount | GoogleIdTokenCredential |
| signInIntent | getCredential() |
| ActivityResultLauncher | Coroutine suspend fun |

## References

- [Android Credential Manager Guide](https://developer.android.com/training/sign-in/credential-manager)
- [Google Identity Services](https://developers.google.com/identity/android-credential-manager)
- [Firebase Google Sign-In](https://firebase.google.com/docs/auth/android/google-signin)
