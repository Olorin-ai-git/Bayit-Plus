package tv.bayit.plus.core.auth

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.common.result.BayitError
import tv.bayit.plus.core.common.result.BayitResult
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Encrypted secure storage service for Bayit+ Android.
 *
 * Stores sensitive data using Android Keystore-backed EncryptedSharedPreferences
 * (AES-256-GCM values, AES-256-SIV keys). Provides token lifecycle management
 * including expiration detection, key rotation tracking, and breach flagging.
 */
@Singleton
class SecureStorageService @Inject constructor(
    @ApplicationContext private val context: Context,
    private val logger: BayitLogger,
) : AuthTokenStorage {
    private val masterKey: MasterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val storagePrefs: SharedPreferences = EncryptedSharedPreferences.create(
        context, STORAGE_PREF_NAME, masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    private val tokenPrefs: SharedPreferences = EncryptedSharedPreferences.create(
        context, TOKEN_PREF_NAME, masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )
    fun setItem(key: String, value: String): BayitResult<Unit> {
        if (key.isBlank() || value.isBlank()) {
            return BayitResult.failure(BayitError.Validation("Key and value cannot be empty", field = "key"))
        }
        return runSafe("store secure item", mapOf("key" to key)) {
            storagePrefs.edit().putString(key, value).apply()
        }
    }

    fun getItem(key: String): BayitResult<String?> = try {
        BayitResult.success(storagePrefs.getString(key, null))
    } catch (e: Exception) {
        logger.error("Failed to retrieve secure item", error = e, metadata = mapOf("key" to key))
        BayitResult.failure(BayitError.Unknown("Failed to retrieve value: ${e.message}", e))
    }

    fun removeItem(key: String): BayitResult<Unit> = runSafe("remove secure item", mapOf("key" to key)) {
        storagePrefs.edit().remove(key).apply()
    }

    fun clearStorage(): BayitResult<Unit> = runSafe("clear secure storage") {
        storagePrefs.edit().clear().apply()
    }

    fun storeToken(tokenId: String, token: String, expiresAt: Long): BayitResult<Unit> =
        runSafe("store token", mapOf("tokenId" to tokenId)) {
            tokenPrefs.edit()
                .putString("$TOKEN_PREFIX$tokenId", token)
                .putLong("$EXPIRY_PREFIX$tokenId", expiresAt)
                .putString("$METADATA_PREFIX$tokenId",
                    "{\"id\":\"$tokenId\",\"storedAt\":${System.currentTimeMillis()},\"expiresAt\":$expiresAt}")
                .apply()
        }

    fun getToken(tokenId: String): BayitResult<String?> = try {
        val token = tokenPrefs.getString("$TOKEN_PREFIX$tokenId", null)
            ?: return BayitResult.success(null)
        val expiresAt = tokenPrefs.getLong("$EXPIRY_PREFIX$tokenId", 0)
        if (System.currentTimeMillis() >= expiresAt) {
            removeToken(tokenId)
            logger.warning("Token expired on retrieval", mapOf("tokenId" to tokenId))
            BayitResult.success(null)
        } else {
            BayitResult.success(token)
        }
    } catch (e: Exception) {
        logger.error("Failed to retrieve token", error = e, metadata = mapOf("tokenId" to tokenId))
        BayitResult.failure(BayitError.Unknown("Failed to retrieve token: ${e.message}", e))
    }

    fun refreshToken(tokenId: String, newToken: String, newExpiresAt: Long): BayitResult<Boolean> = try {
        if (tokenPrefs.getString("$TOKEN_PREFIX$tokenId", null) == null) {
            BayitResult.success(false)
        } else {
            trackKeyRotation(tokenId)
            storeToken(tokenId, newToken, newExpiresAt)
            logger.info("Token refreshed", mapOf("tokenId" to tokenId))
            BayitResult.success(true)
        }
    } catch (e: Exception) {
        logger.error("Failed to refresh token", error = e, metadata = mapOf("tokenId" to tokenId))
        BayitResult.failure(BayitError.Unknown("Failed to refresh token: ${e.message}", e))
    }
    fun shouldRefreshToken(tokenId: String): Boolean {
        val secondsRemaining = (tokenPrefs.getLong("$EXPIRY_PREFIX$tokenId", 0) -
            System.currentTimeMillis()) / MS_PER_SEC
        return secondsRemaining in 1..REFRESH_WINDOW_SECONDS
    }

    fun isTokenBreached(tokenId: String): Boolean = tokenPrefs.contains("$BREACH_PREFIX$tokenId")

    fun flagTokenBreach(tokenId: String, reason: String): BayitResult<Unit> =
        runSafe("flag token breach", mapOf("tokenId" to tokenId, "reason" to reason)) {
            val data = "{\"flaggedAt\":${System.currentTimeMillis()},\"reason\":\"$reason\"}"
            tokenPrefs.edit().putString("$BREACH_PREFIX$tokenId", data).apply()
        }

    fun getKeyRotationCount(tokenId: String): Int = tokenPrefs.getInt("$ROTATION_PREFIX$tokenId", 0)

    fun removeToken(tokenId: String): BayitResult<Unit> = runSafe("remove token", mapOf("tokenId" to tokenId)) {
        tokenPrefs.edit()
            .remove("$TOKEN_PREFIX$tokenId")
            .remove("$EXPIRY_PREFIX$tokenId")
            .remove("$METADATA_PREFIX$tokenId")
            .apply()
    }

    fun clearAllTokens(): BayitResult<Unit> = runSafe("clear all tokens") {
        tokenPrefs.edit().clear().apply()
    }

    private fun trackKeyRotation(tokenId: String) {
        val count = tokenPrefs.getInt("$ROTATION_PREFIX$tokenId", 0)
        tokenPrefs.edit().putInt("$ROTATION_PREFIX$tokenId", count + 1).apply()
    }

    private fun runSafe(
        operation: String,
        metadata: Map<String, String> = emptyMap(),
        block: () -> Unit,
    ): BayitResult<Unit> = try {
        block()
        logger.debug("Secure storage: $operation", metadata)
        BayitResult.success(Unit)
    } catch (e: Exception) {
        logger.error("Failed to $operation", error = e, metadata = metadata)
        BayitResult.failure(BayitError.Unknown("Failed to $operation: ${e.message}", e))
    }

    private fun getStoredToken(key: String, expiryKey: String, label: String): String? {
        val token = storagePrefs.getString(key, null) ?: return null
        val exp = storagePrefs.getLong(expiryKey, 0L)
        if (exp > 0L && System.currentTimeMillis() >= exp) {
            storagePrefs.edit().remove(key).remove(expiryKey).apply()
            logger.warning("$label expired on retrieval — cleared")
            return null
        }
        return token
    }

    override fun saveAccessToken(token: String, expiresAt: Long) {
        storagePrefs.edit().putString(ACCESS_TOKEN_KEY, token)
            .putLong(ACCESS_TOKEN_EXPIRY_KEY, expiresAt).apply()
    }

    override fun getAccessToken(): String? = getStoredToken(ACCESS_TOKEN_KEY, ACCESS_TOKEN_EXPIRY_KEY, "Access token")

    override fun saveRefreshToken(token: String, expiresAt: Long) {
        storagePrefs.edit().putString(REFRESH_TOKEN_KEY, token)
            .putLong(REFRESH_TOKEN_EXPIRY_KEY, expiresAt).apply()
    }

    override fun getRefreshToken(): String? = getStoredToken(REFRESH_TOKEN_KEY, REFRESH_TOKEN_EXPIRY_KEY, "Refresh token")

    override fun clearAuthTokens() {
        storagePrefs.edit().remove(ACCESS_TOKEN_KEY).remove(ACCESS_TOKEN_EXPIRY_KEY)
            .remove(REFRESH_TOKEN_KEY).remove(REFRESH_TOKEN_EXPIRY_KEY).remove(USER_ID_KEY).apply()
    }

    override fun saveUserId(userId: String) { storagePrefs.edit().putString(USER_ID_KEY, userId).apply() }
    override fun getUserId(): String? = storagePrefs.getString(USER_ID_KEY, null)

    companion object {
        private const val STORAGE_PREF_NAME = "bayit_plus_secure_storage"
        private const val TOKEN_PREF_NAME = "bayit_token_manager"
        private const val TOKEN_PREFIX = "token_"
        private const val EXPIRY_PREFIX = "expiry_"
        private const val ROTATION_PREFIX = "rotation_"
        private const val BREACH_PREFIX = "breach_"
        private const val METADATA_PREFIX = "metadata_"
        private const val REFRESH_WINDOW_SECONDS = 300L
        private const val MS_PER_SEC = 1000L
        private const val ACCESS_TOKEN_KEY = "bayit_access_token"
        private const val ACCESS_TOKEN_EXPIRY_KEY = "bayit_access_token_expiry"
        private const val REFRESH_TOKEN_KEY = "bayit_refresh_token"
        private const val REFRESH_TOKEN_EXPIRY_KEY = "bayit_refresh_token_expiry"
        private const val USER_ID_KEY = "bayit_user_id"
    }
}
