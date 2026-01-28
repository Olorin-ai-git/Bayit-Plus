package com.bayitplus.modules

import com.facebook.react.bridge.ReactApplicationContext
import android.content.Context
import android.util.Log
import kotlin.math.min

/**
 * BiometricSessionManager.kt - Session and Token Management
 * Handles authentication session lifecycle, token refresh, and expiration
 * Features:
 * - Session token generation and storage
 * - Automatic token refresh before expiration
 * - Lockout penalty management
 * - Session validation
 * - Callback event emission
 *
 * Used by: BiometricAuthModule for session management
 */
class BiometricSessionManager(private val reactContext: ReactApplicationContext) {

    companion object {
        private const val MODULE_TAG = "BiometricSessionManager"
        private const val PREF_NAME = "bayit_biometric_sessions"
        private const val KEY_SESSION_TOKEN = "session_token"
        private const val KEY_TOKEN_EXPIRES = "token_expires_at"
        private const val KEY_FAILED_ATTEMPTS = "failed_attempts"
        private const val KEY_LOCKOUT_UNTIL = "lockout_until"
        private const val KEY_LAST_AUTH_TIME = "last_auth_time"
        private const val TOKEN_EXPIRY_SECONDS = 3600L // 1 hour
        private const val REFRESH_BEFORE_SECONDS = 300L // Refresh 5 minutes before expiry
        private const val LOCKOUT_INCREMENT_MS = 1000L // 1 second per failed attempt
        private const val MAX_FAILED_ATTEMPTS = 5
    }

    private val prefs = reactContext.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    /**
     * Generate new session token after successful authentication
     * @param authenticator Type of authentication (biometric/device_credential)
     * @return SessionToken with token string and expiration time
     */
    fun generateSessionToken(authenticator: String): SessionToken {
        val now = System.currentTimeMillis()
        val expiresAt = now + (TOKEN_EXPIRY_SECONDS * 1000)
        val token = generateRandomToken()

        prefs.edit().apply {
            putString(KEY_SESSION_TOKEN, token)
            putLong(KEY_TOKEN_EXPIRES, expiresAt)
            putLong(KEY_LAST_AUTH_TIME, now)
            putInt(KEY_FAILED_ATTEMPTS, 0)
            putLong(KEY_LOCKOUT_UNTIL, 0)
            apply()
        }

        Log.d(MODULE_TAG, "Generated session token, expires in ${TOKEN_EXPIRY_SECONDS}s")
        return SessionToken(token, expiresAt, authenticator)
    }

    /**
     * Validate if current session token is still valid
     * @return true if token exists and hasn't expired
     */
    fun isSessionValid(): Boolean {
        val token = prefs.getString(KEY_SESSION_TOKEN, null) ?: return false
        val expiresAt = prefs.getLong(KEY_TOKEN_EXPIRES, 0)
        val now = System.currentTimeMillis()

        return token.isNotEmpty() && now < expiresAt
    }

    /**
     * Check if token needs refresh (expiring within REFRESH_BEFORE_SECONDS)
     * @return true if token should be refreshed
     */
    fun shouldRefreshToken(): Boolean {
        val expiresAt = prefs.getLong(KEY_TOKEN_EXPIRES, 0)
        val now = System.currentTimeMillis()
        val timeUntilExpiry = (expiresAt - now) / 1000

        return timeUntilExpiry in 1..(REFRESH_BEFORE_SECONDS)
    }

    /**
     * Get current session token
     * @return Token string or null if no valid session
     */
    fun getSessionToken(): String? {
        if (!isSessionValid()) return null
        return prefs.getString(KEY_SESSION_TOKEN, null)
    }

    /**
     * Get time until token expiration in seconds
     * @return Seconds until expiration, or 0 if expired/no token
     */
    fun getTimeUntilExpiration(): Long {
        val expiresAt = prefs.getLong(KEY_TOKEN_EXPIRES, 0)
        val now = System.currentTimeMillis()
        val secondsRemaining = (expiresAt - now) / 1000
        return if (secondsRemaining > 0) secondsRemaining else 0
    }

    /**
     * Record failed authentication attempt for lockout management
     * Implements exponential backoff: 1s, 2s, 4s, 8s, 16s
     */
    fun recordFailedAttempt() {
        val attempts = prefs.getInt(KEY_FAILED_ATTEMPTS, 0) + 1
        val lockoutDurationMs = min(LOCKOUT_INCREMENT_MS * (1 shl (attempts - 1)), 60000L)
        val lockoutUntil = System.currentTimeMillis() + lockoutDurationMs

        prefs.edit().apply {
            putInt(KEY_FAILED_ATTEMPTS, attempts)
            putLong(KEY_LOCKOUT_UNTIL, lockoutUntil)
            apply()
        }

        Log.w(MODULE_TAG, "Failed attempt $attempts, lockout for ${lockoutDurationMs}ms")
    }

    /**
     * Get lockout status
     * @return LockoutStatus with isLocked and timeRemainingMs
     */
    fun getLockoutStatus(): LockoutStatus {
        val lockoutUntil = prefs.getLong(KEY_LOCKOUT_UNTIL, 0)
        val now = System.currentTimeMillis()

        if (now >= lockoutUntil) {
            return LockoutStatus(false, 0)
        }

        return LockoutStatus(true, lockoutUntil - now)
    }

    /**
     * Clear failed attempts when authentication succeeds
     */
    fun clearFailedAttempts() {
        prefs.edit().apply {
            putInt(KEY_FAILED_ATTEMPTS, 0)
            putLong(KEY_LOCKOUT_UNTIL, 0)
            apply()
        }
    }

    /**
     * Logout - clear all session data
     */
    fun logout() {
        prefs.edit().clear().apply()
        Log.d(MODULE_TAG, "Session cleared on logout")
    }

    /**
     * Get all session metadata
     */
    fun getSessionMetadata(): Map<String, Any> {
        return mapOf(
            "hasSession" to isSessionValid(),
            "tokenExpiresIn" to getTimeUntilExpiration(),
            "shouldRefresh" to shouldRefreshToken(),
            "lastAuthTime" to prefs.getLong(KEY_LAST_AUTH_TIME, 0),
            "failedAttempts" to prefs.getInt(KEY_FAILED_ATTEMPTS, 0),
            "lockoutStatus" to getLockoutStatus().isLocked
        )
    }

    /**
     * Generate random token (base64 encoded)
     */
    private fun generateRandomToken(): String {
        return android.util.Base64.encodeToString(
            ByteArray(32).apply { java.security.SecureRandom().nextBytes(this) },
            android.util.Base64.NO_WRAP
        )
    }

    data class SessionToken(
        val token: String,
        val expiresAt: Long,
        val authenticator: String
    )

    data class LockoutStatus(
        val isLocked: Boolean,
        val timeRemainingMs: Long
    )
}
