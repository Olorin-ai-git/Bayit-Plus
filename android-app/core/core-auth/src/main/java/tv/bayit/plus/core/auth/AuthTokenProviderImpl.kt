package tv.bayit.plus.core.auth

import tv.bayit.plus.core.network.AuthTokenProvider
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Provides RS256 backend tokens from secure storage for API Bearer header injection.
 *
 * RS256 tokens from auth.olorin.ai cannot be refreshed client-side.
 * When a token expires, users must re-authenticate.
 */
@Singleton
class AuthTokenProviderImpl @Inject constructor(
    private val secureStorage: SecureStorageService,
) : AuthTokenProvider {

    override suspend fun getToken(): String? = secureStorage.getAccessToken()

    override suspend fun refreshToken(): String? {
        // RS256 tokens from auth.olorin.ai cannot be refreshed client-side.
        // Return null to signal that re-authentication is required.
        return null
    }

    override suspend fun clearToken() {
        secureStorage.clearAuthTokens()
    }
}
