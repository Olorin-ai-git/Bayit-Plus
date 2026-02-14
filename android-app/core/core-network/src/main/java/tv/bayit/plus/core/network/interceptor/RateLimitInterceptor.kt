package tv.bayit.plus.core.network.interceptor

import okhttp3.Interceptor
import okhttp3.Response
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.network.NetworkConfiguration
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Handles 429 Too Many Requests responses by respecting the Retry-After header.
 *
 * When the server responds with 429, this interceptor:
 * 1. Reads the Retry-After header (seconds) for the wait duration
 * 2. Sleeps for the specified duration
 * 3. Retries the request once
 *
 * If the retry also returns 429, it passes the response through so the
 * caller receives the [ApiException.RateLimited] error.
 *
 * Mirrors the iOS RetryPolicy 429 handling and the web api.js rate limit logic.
 */
@Singleton
class RateLimitInterceptor @Inject constructor(
    private val logger: BayitLogger,
    private val configuration: NetworkConfiguration,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val response = chain.proceed(request)

        if (response.code != HTTP_TOO_MANY_REQUESTS) {
            logRateLimitWarningIfNeeded(response)
            return response
        }

        val retryAfterHeader = response.header(RETRY_AFTER_HEADER)
        val retryAfterSeconds = retryAfterHeader?.toLongOrNull()
            ?: configuration.retryBaseDelay.inWholeSeconds

        logger.warning(
            "Rate limited (429), waiting before retry",
            mapOf(
                "retryAfterSeconds" to retryAfterSeconds.toString(),
                "retryAfterHeader" to (retryAfterHeader ?: "absent"),
                "url" to request.url.encodedPath,
            ),
        )

        response.close()
        Thread.sleep(retryAfterSeconds * MILLIS_PER_SECOND)

        val retryResponse = chain.proceed(request)

        if (retryResponse.code == HTTP_TOO_MANY_REQUESTS) {
            logger.error(
                "Still rate limited after retry, passing 429 through",
                metadata = mapOf("url" to request.url.encodedPath),
            )
        }

        return retryResponse
    }

    /**
     * Logs a warning when the X-RateLimit-Remaining header indicates
     * the client is approaching the rate limit threshold.
     * Mirrors iOS logRateLimitWarningIfNeeded.
     */
    private fun logRateLimitWarningIfNeeded(response: Response) {
        val remaining = response.header(RATE_LIMIT_REMAINING_HEADER)
            ?.toIntOrNull() ?: return
        if (remaining < RATE_LIMIT_WARNING_THRESHOLD) {
            val reset = response.header(RATE_LIMIT_RESET_HEADER) ?: "unknown"
            logger.warning(
                "API rate limit approaching",
                mapOf("remaining" to remaining.toString(), "reset" to reset),
            )
        }
    }

    companion object {
        private const val HTTP_TOO_MANY_REQUESTS = 429
        private const val RETRY_AFTER_HEADER = "Retry-After"
        private const val RATE_LIMIT_REMAINING_HEADER = "X-RateLimit-Remaining"
        private const val RATE_LIMIT_RESET_HEADER = "X-RateLimit-Reset"
        private const val RATE_LIMIT_WARNING_THRESHOLD = 10
        private const val MILLIS_PER_SECOND = 1000L
    }
}
