package com.bayitplus.modules

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import android.util.Log
import java.time.Instant

/**
 * SecureStorageTokenManager.kt - Token Lifecycle Management
 * Handles OAuth tokens, session tokens, token refresh, key rotation
 * Features:
 * - Token storage and retrieval
 * - Automatic expiration detection
 * - Key rotation tracking
 * - Breach detection flags
 * - Token metadata management
 */
class SecureStorageTokenManager(private val context: Context) {

    companion object {
        private const val MODULE_TAG = "SecureStorageTokenManager"
        private const val PREF_NAME = "bayit_token_manager"
        private const val KEY_TOKEN_PREFIX = "token_"
        private const val KEY_EXPIRY_PREFIX = "expiry_"
        private const val KEY_ROTATION_PREFIX = "rotation_"
        private const val KEY_BREACH_PREFIX = "breach_"
        private const val KEY_METADATA_PREFIX = "metadata_"
    }

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val encryptedPreferences = EncryptedSharedPreferences.create(
        context,
        PREF_NAME,
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    /**
     * Store token with expiration metadata
     * @param tokenId Unique identifier for token
     * @param token Token value
     * @param expiresAt Timestamp when token expires
     */
    fun storeToken(tokenId: String, token: String, expiresAt: Long) {
        try {
            val tokenKey = "$KEY_TOKEN_PREFIX$tokenId"
            val expiryKey = "$KEY_EXPIRY_PREFIX$tokenId"
            val metadataKey = "$KEY_METADATA_PREFIX$tokenId"

            encryptedPreferences.edit().apply {
                putString(tokenKey, token)
                putLong(expiryKey, expiresAt)
                putString(metadataKey, buildTokenMetadata(tokenId, expiresAt))
                apply()
            }

            Log.d(MODULE_TAG, "Token stored: $tokenId, expires at $expiresAt")
        } catch (e: Exception) {
            Log.e(MODULE_TAG, "Failed to store token: ${e.message}", e)
        }
    }

    /**
     * Retrieve token if valid (not expired)
     * @param tokenId Token identifier
     * @return Token value or null if expired/not found
     */
    fun getToken(tokenId: String): String? {
        try {
            val tokenKey = "$KEY_TOKEN_PREFIX$tokenId"
            val expiryKey = "$KEY_EXPIRY_PREFIX$tokenId"

            val token = encryptedPreferences.getString(tokenKey, null) ?: return null
            val expiresAt = encryptedPreferences.getLong(expiryKey, 0)

            // Check if expired
            if (System.currentTimeMillis() >= expiresAt) {
                Log.w(MODULE_TAG, "Token expired: $tokenId")
                removeToken(tokenId)
                return null
            }

            return token
        } catch (e: Exception) {
            Log.e(MODULE_TAG, "Failed to retrieve token: ${e.message}", e)
            return null
        }
    }

    /**
     * Check if token needs refresh (expiring within 5 minutes)
     * @param tokenId Token identifier
     * @return true if token should be refreshed
     */
    fun shouldRefreshToken(tokenId: String): Boolean {
        try {
            val expiryKey = "$KEY_EXPIRY_PREFIX$tokenId"
            val expiresAt = encryptedPreferences.getLong(expiryKey, 0)
            val now = System.currentTimeMillis()
            val timeRemaining = (expiresAt - now) / 1000

            // Refresh if token expires within 5 minutes (300 seconds)
            return timeRemaining in 1..300
        } catch (e: Exception) {
            Log.e(MODULE_TAG, "Failed to check refresh status: ${e.message}", e)
            return false
        }
    }

    /**
     * Refresh token with new value and expiration
     * @param tokenId Token identifier
     * @param newToken New token value
     * @param newExpiresAt New expiration timestamp
     * @return true if refresh successful
     */
    fun refreshToken(tokenId: String, newToken: String, newExpiresAt: Long): Boolean {
        try {
            val oldToken = getToken(tokenId)
            if (oldToken != null) {
                // Track key rotation
                trackKeyRotation(tokenId)
                storeToken(tokenId, newToken, newExpiresAt)
                Log.d(MODULE_TAG, "Token refreshed: $tokenId")
                return true
            }
            return false
        } catch (e: Exception) {
            Log.e(MODULE_TAG, "Failed to refresh token: ${e.message}", e)
            return false
        }
    }

    /**
     * Track key rotation event
     * @param tokenId Token that was rotated
     */
    private fun trackKeyRotation(tokenId: String) {
        try {
            val rotationKey = "$KEY_ROTATION_PREFIX$tokenId"
            val currentCount = encryptedPreferences.getInt(rotationKey, 0)
            encryptedPreferences.edit().putInt(rotationKey, currentCount + 1).apply()
        } catch (e: Exception) {
            Log.e(MODULE_TAG, "Failed to track key rotation: ${e.message}", e)
        }
    }

    /**
     * Get key rotation count for token
     * @param tokenId Token identifier
     * @return Number of times token has been rotated
     */
    fun getKeyRotationCount(tokenId: String): Int {
        return try {
            val rotationKey = "$KEY_ROTATION_PREFIX$tokenId"
            encryptedPreferences.getInt(rotationKey, 0)
        } catch (e: Exception) {
            Log.e(MODULE_TAG, "Failed to get rotation count: ${e.message}", e)
            0
        }
    }

    /**
     * Mark token as breached
     * @param tokenId Token identifier
     * @param reason Reason for breach flag
     */
    fun flagAsBreach(tokenId: String, reason: String) {
        try {
            val breachKey = "$KEY_BREACH_PREFIX$tokenId"
            val breachData = mapOf(
                "flaggedAt" to System.currentTimeMillis(),
                "reason" to reason
            ).toString()
            encryptedPreferences.edit().putString(breachKey, breachData).apply()
            Log.w(MODULE_TAG, "Token flagged as breach: $tokenId, reason: $reason")
        } catch (e: Exception) {
            Log.e(MODULE_TAG, "Failed to flag breach: ${e.message}", e)
        }
    }

    /**
     * Check if token is flagged as breached
     * @param tokenId Token identifier
     * @return true if token is flagged as breached
     */
    fun isTokenBreach(tokenId: String): Boolean {
        return try {
            val breachKey = "$KEY_BREACH_PREFIX$tokenId"
            encryptedPreferences.contains(breachKey)
        } catch (e: Exception) {
            Log.e(MODULE_TAG, "Failed to check breach status: ${e.message}", e)
            false
        }
    }

    /**
     * Remove token
     * @param tokenId Token identifier
     */
    fun removeToken(tokenId: String) {
        try {
            encryptedPreferences.edit().apply {
                remove("$KEY_TOKEN_PREFIX$tokenId")
                remove("$KEY_EXPIRY_PREFIX$tokenId")
                remove("$KEY_METADATA_PREFIX$tokenId")
                apply()
            }
            Log.d(MODULE_TAG, "Token removed: $tokenId")
        } catch (e: Exception) {
            Log.e(MODULE_TAG, "Failed to remove token: ${e.message}", e)
        }
    }

    /**
     * Get token metadata
     * @param tokenId Token identifier
     * @return Token metadata including expiration and rotation info
     */
    fun getTokenMetadata(tokenId: String): Map<String, Any> {
        return try {
            mapOf(
                "tokenId" to tokenId,
                "exists" to (getToken(tokenId) != null),
                "isExpired" to isTokenExpired(tokenId),
                "shouldRefresh" to shouldRefreshToken(tokenId),
                "isBreach" to isTokenBreach(tokenId),
                "rotationCount" to getKeyRotationCount(tokenId),
                "expiresAt" to getTokenExpiration(tokenId)
            )
        } catch (e: Exception) {
            Log.e(MODULE_TAG, "Failed to get metadata: ${e.message}", e)
            mapOf("error" to "Failed to retrieve metadata")
        }
    }

    /**
     * Check if token is expired
     * @param tokenId Token identifier
     * @return true if token is expired
     */
    private fun isTokenExpired(tokenId: String): Boolean {
        return try {
            val expiryKey = "$KEY_EXPIRY_PREFIX$tokenId"
            val expiresAt = encryptedPreferences.getLong(expiryKey, 0)
            System.currentTimeMillis() >= expiresAt
        } catch (e: Exception) {
            true
        }
    }

    /**
     * Get token expiration timestamp
     * @param tokenId Token identifier
     * @return Expiration timestamp in milliseconds (0 if not found)
     */
    private fun getTokenExpiration(tokenId: String): Long {
        return try {
            val expiryKey = "$KEY_EXPIRY_PREFIX$tokenId"
            encryptedPreferences.getLong(expiryKey, 0)
        } catch (e: Exception) {
            0
        }
    }

    /**
     * Build token metadata string
     */
    private fun buildTokenMetadata(tokenId: String, expiresAt: Long): String {
        return "{\"id\":\"$tokenId\",\"storedAt\":${System.currentTimeMillis()},\"expiresAt\":$expiresAt}"
    }

    /**
     * Clear all tokens
     */
    fun clearAllTokens() {
        try {
            encryptedPreferences.edit().clear().apply()
            Log.d(MODULE_TAG, "All tokens cleared")
        } catch (e: Exception) {
            Log.e(MODULE_TAG, "Failed to clear tokens: ${e.message}", e)
        }
    }
}
