package tv.bayit.plus.core.network.interceptor

import okhttp3.Interceptor
import okhttp3.Response
import tv.bayit.plus.core.common.correlation.CorrelationIdGenerator
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Injects a unique X-Correlation-ID UUID header into every request.
 *
 * Allows the backend to trace requests across services for debugging
 * and observability. Mirrors the iOS APIClient correlationID pattern.
 */
@Singleton
class CorrelationIdInterceptor @Inject constructor(
    private val correlationIdGenerator: CorrelationIdGenerator,
    private val logger: BayitLogger,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val correlationId = correlationIdGenerator.generate()
        val request = chain.request().newBuilder()
            .header(CORRELATION_ID_HEADER, correlationId)
            .build()

        logger.debug(
            "Correlation ID attached",
            mapOf(
                "correlationId" to correlationId,
                "method" to request.method,
                "path" to request.url.encodedPath,
            ),
        )

        return chain.proceed(request)
    }

    companion object {
        const val CORRELATION_ID_HEADER = "X-Correlation-ID"
    }
}
