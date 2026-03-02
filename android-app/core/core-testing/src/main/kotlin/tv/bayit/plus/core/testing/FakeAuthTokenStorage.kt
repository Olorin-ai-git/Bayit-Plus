package tv.bayit.plus.core.testing

import tv.bayit.plus.core.auth.AuthTokenStorage

/**
 * In-memory fake implementation of [AuthTokenStorage] for unit tests.
 * Replaces [tv.bayit.plus.core.auth.SecureStorageService] in test environments.
 */
class FakeAuthTokenStorage : AuthTokenStorage {

    private var accessToken: String? = null
    private var accessTokenExpiresAt: Long = 0L
    private var refreshToken: String? = null
    private var refreshTokenExpiresAt: Long = 0L
    private var userId: String? = null

    var currentTimeMillis: Long = System.currentTimeMillis()

    override fun saveAccessToken(token: String, expiresAt: Long) {
        accessToken = token
        accessTokenExpiresAt = expiresAt
    }

    override fun getAccessToken(): String? {
        if (currentTimeMillis >= accessTokenExpiresAt) {
            accessToken = null
        }
        return accessToken
    }

    override fun saveRefreshToken(token: String, expiresAt: Long) {
        refreshToken = token
        refreshTokenExpiresAt = expiresAt
    }

    override fun getRefreshToken(): String? {
        if (currentTimeMillis >= refreshTokenExpiresAt) {
            refreshToken = null
        }
        return refreshToken
    }

    override fun saveUserId(userId: String) {
        this.userId = userId
    }

    override fun getUserId(): String? = userId

    override fun clearAuthTokens() {
        accessToken = null
        accessTokenExpiresAt = 0L
        refreshToken = null
        refreshTokenExpiresAt = 0L
        userId = null
    }

    fun hasAccessToken(): Boolean = accessToken != null
    fun hasRefreshToken(): Boolean = refreshToken != null
    fun getStoredAccessExpiresAt(): Long = accessTokenExpiresAt
    fun getStoredRefreshExpiresAt(): Long = refreshTokenExpiresAt
}
