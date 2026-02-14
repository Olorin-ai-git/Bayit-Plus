package tv.bayit.plus.core.network.interceptor

import okhttp3.Interceptor
import okhttp3.Response
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.network.NetworkConfiguration
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.min
import kotlin.random.Random

/**
 * Exponential backoff retry interceptor for transient failures.
 *
 * Retries on:
 * - 5xx server errors (500, 502, 503, 504)
 * - 408 Request Timeout
 * - Network I/O errors (IOException) -- connection reset, timeout, etc.
 *
 * Backoff formula: min(baseDelay * 2^attempt, MAX_DELAY_MS) + jitter
 *
 * Mirrors the iOS RetryPolicy and the web api.js retry algorithm.
 * Note: 429 is handled separately by [RateLimitInterceptor].
 */
@Singleton
class RetryInterceptor @Inject constructor(
    private val configuration: NetworkConfiguration,
    private val logger: BayitLogger,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        var lastException: IOException? = null

        for (attempt in 0..configuration.maxRetries) {
            try {
                val response = chain.proceed(request)

                if (response.isSuccessful || !isRetryableStatusCode(response.code)) {
                    return response
                }

                if (attempt >= configuration.maxRetries) {
                    return response
                }

                val statusCode = response.code
                response.close()

                val delay = calculateDelay(attempt)
                logger.info(
                    "Retrying request after HTTP $statusCode",
                    mapOf(
                        "attempt" to "${attempt + 1}/${configuration.maxRetries}",
                        "delayMs" to delay.toString(),
                        "url" to request.url.encodedPath,
                        "statusCode" to statusCode.toString(),
                    ),
                )
                Thread.sleep(delay)
            } catch (e: IOException) {
                lastException = e

                if (attempt >= configuration.maxRetries) {
                    throw e
                }

                val delay = calculateDelay(attempt)
                logger.info(
                    "Retrying request after network error",
                    mapOf(
                        "attempt" to "${attempt + 1}/${configuration.maxRetries}",
                        "delayMs" to delay.toString(),
                        "url" to request.url.encodedPath,
                        "error" to (e.message ?: "unknown"),
                    ),
                )
                Thread.sleep(delay)
            }
        }

        throw lastException ?: IOException("Retry exhausted with no response")
    }

    private fun isRetryableStatusCode(code: Int): Boolean =
        code in configuration.retryableStatusCodes

    /**
     * Calculates delay with exponential backoff and jitter.
     * Formula: min(baseDelay * 2^attempt, MAX_DELAY_MS) + random(0..delay/2)
     */
    private fun calculateDelay(attempt: Int): Long {
        val exponentialDelay = configuration.retryBaseDelayMillis * (1L shl attempt)
        val cappedDelay = min(exponentialDelay, MAX_DELAY_MS)
        val jitter = if (cappedDelay > 1) Random.nextLong(0, cappedDelay / 2) else 0
        return cappedDelay + jitter
    }

    companion object {
        private const val MAX_DELAY_MS = 30_000L
    }
}
