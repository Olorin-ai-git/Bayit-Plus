package tv.bayit.plus.core.network.authenticator

import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.network.AuthTokenProvider
import javax.inject.Inject
import javax.inject.Singleton

/**
 * OkHttp Authenticator that handles 401 responses by refreshing the access token
 * and retrying the original request.
 *
 * This is the correct approach for 401 handling instead of using an Interceptor:
 * - Built-in retry mechanism prevents infinite loops via priorResponse chain
 * - Cleaner separation: AuthInterceptor adds token, TokenAuthenticator refreshes
 * - Automatic retry coordination by OkHttp
 *
 * Should be wired into OkHttpClient BEFORE interceptors in NetworkModule.
 */
@Singleton
class TokenAuthenticator @Inject constructor(
    private val authTokenProvider: AuthTokenProvider,
    private val logger: BayitLogger,
) : Authenticator {

    override fun authenticate(route: Route?, response: Response): Request? {
        val url = response.request.url.encodedPath

        // Check retry count to prevent infinite loops
        // OkHttp tracks attempts via priorResponse chain
        val retryCount = responseCount(response)
        if (retryCount >= MAX_RETRY_ATTEMPTS) {
            logger.warning("Multiple 401s, giving up", mapOf(
                "url" to url,
                "retryCount" to retryCount.toString()
            ))
            return null
        }

        logger.info("Authenticating 401 response", mapOf(
            "url" to url,
            "attempt" to retryCount.toString()
        ))

        // Authenticator requires synchronous execution
        // Use runBlocking to bridge suspend function to blocking context
        val newToken = runBlocking {
            try {
                authTokenProvider.refreshToken()
            } catch (e: Exception) {
                logger.error("Token refresh failed", mapOf(
                    "url" to url,
                    "error" to (e.message ?: "Unknown error")
                ))
                null
            }
        }

        return if (newToken != null) {
            logger.debug("Retrying with refreshed token", mapOf("url" to url))
            response.request.newBuilder()
                .header(AUTHORIZATION_HEADER, "$BEARER_PREFIX$newToken")
                .build()
        } else {
            logger.warning("Token refresh returned null", mapOf("url" to url))
            null  // Give up - triggers logout in caller
        }
    }

    /**
     * Counts the number of 401 responses in the chain.
     * OkHttp links retries via priorResponse.
     */
    private fun responseCount(response: Response): Int {
        var count = 1
        var priorResponse = response.priorResponse
        while (priorResponse != null) {
            count++
            priorResponse = priorResponse.priorResponse
        }
        return count
    }

    companion object {
        private const val AUTHORIZATION_HEADER = "Authorization"
        private const val BEARER_PREFIX = "Bearer "
        private const val MAX_RETRY_ATTEMPTS = 2
    }
}
