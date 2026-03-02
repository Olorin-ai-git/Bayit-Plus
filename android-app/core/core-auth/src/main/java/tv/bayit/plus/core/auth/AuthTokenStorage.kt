package tv.bayit.plus.core.auth

/**
 * Contract for reading and writing authentication tokens.
 *
 * Decouples [OlorinAuthService] and [AuthTokenProviderImpl] from the Android-specific
 * [SecureStorageService], enabling unit testing without a device context.
 */
interface AuthTokenStorage {
    fun saveAccessToken(token: String, expiresAt: Long)
    fun getAccessToken(): String?
    fun saveRefreshToken(token: String, expiresAt: Long)
    fun getRefreshToken(): String?
    fun clearAuthTokens()
    fun saveUserId(userId: String)
    fun getUserId(): String?
}
