package tv.bayit.plus.core.auth

import dagger.Lazy
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.common.result.BayitResult
import tv.bayit.plus.core.network.AuthTokenProvider
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Provides access tokens from secure storage for API Bearer header injection.
 * Uses Lazy<OlorinAuthService> to break the circular dependency:
 * OlorinAuthService -> BayitApiClient -> TokenAuthenticator -> AuthTokenProviderImpl -> OlorinAuthService.
 */
@Singleton
class AuthTokenProviderImpl @Inject constructor(
    private val secureStorage: AuthTokenStorage,
    private val olorinAuthService: Lazy<OlorinAuthService>,
    private val logger: BayitLogger,
) : AuthTokenProvider {

    override fun getToken(): String? = secureStorage.getAccessToken()

    override suspend fun refreshToken(): String? {
        val refreshToken = secureStorage.getRefreshToken() ?: run {
            logger.warning("No refresh token available — re-auth required")
            return null
        }
        return when (val result = olorinAuthService.get().refreshAccessToken(refreshToken)) {
            is BayitResult.Success -> result.data
            is BayitResult.Failure -> {
                logger.warning("Token refresh returned failure — clearing tokens")
                secureStorage.clearAuthTokens()
                null
            }
        }
    }

    override suspend fun clearToken() = secureStorage.clearAuthTokens()
}
