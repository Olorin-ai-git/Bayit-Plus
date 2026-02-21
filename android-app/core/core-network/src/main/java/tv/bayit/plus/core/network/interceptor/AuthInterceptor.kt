package tv.bayit.plus.core.network.interceptor

import okhttp3.Interceptor
import okhttp3.Response
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.network.AuthTokenProvider
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Injects the Bearer token from [AuthTokenProvider] into every request.
 *
 * 401 handling is now done by [tv.bayit.plus.core.network.authenticator.TokenAuthenticator]
 * for cleaner separation and proper retry coordination via OkHttp's built-in
 * Authenticator mechanism.
 *
 * Must be added as the first application interceptor so that all subsequent
 * interceptors and the network layer see the Authorization header.
 */
@Singleton
class AuthInterceptor @Inject constructor(
    private val authTokenProvider: AuthTokenProvider,
    private val logger: BayitLogger,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        val token = authTokenProvider.getToken()
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

        return chain.proceed(authenticatedRequest)
    }

    companion object {
        private const val AUTHORIZATION_HEADER = "Authorization"
        private const val BEARER_PREFIX = "Bearer "
    }
}
