package tv.bayit.plus.core.network.interceptor

import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.network.AuthTokenProvider
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Injects the Bearer token from [AuthTokenProvider] into every request.
 *
 * On a 401 response, attempts a single token refresh and retries
 * the request transparently -- mirroring the iOS APIClient auth flow.
 *
 * Must be added as the first application interceptor so that all
 * subsequent interceptors and the network layer see the Authorization header.
 */
@Singleton
class AuthInterceptor @Inject constructor(
    private val authTokenProvider: AuthTokenProvider,
    private val logger: BayitLogger,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        val token = runBlocking { authTokenProvider.getToken() }
        val authenticatedRequest = if (token != null) {
            logger.debug(
                "Auth token attached",
                mapOf("hasToken" to "true", "url" to originalRequest.url.encodedPath),
            )
            originalRequest.newBuilder()
                .header(AUTHORIZATION_HEADER, "$BEARER_PREFIX$token")
                .build()
        } else {
            originalRequest
        }

        val response = chain.proceed(authenticatedRequest)

        if (response.code == HTTP_UNAUTHORIZED && token != null) {
            logger.info(
                "Received 401, attempting token refresh",
                mapOf("url" to originalRequest.url.encodedPath),
            )
            val refreshedToken = runBlocking { authTokenProvider.refreshToken() }

            if (refreshedToken != null) {
                response.close()
                val retryRequest = originalRequest.newBuilder()
                    .header(AUTHORIZATION_HEADER, "$BEARER_PREFIX$refreshedToken")
                    .build()
                logger.debug(
                    "Retrying request with refreshed token",
                    mapOf("url" to originalRequest.url.encodedPath),
                )
                return chain.proceed(retryRequest)
            }

            logger.warning(
                "Token refresh returned null, returning 401 response",
                mapOf("url" to originalRequest.url.encodedPath),
            )
        }

        return response
    }

    companion object {
        private const val AUTHORIZATION_HEADER = "Authorization"
        private const val BEARER_PREFIX = "Bearer "
        private const val HTTP_UNAUTHORIZED = 401
    }
}
