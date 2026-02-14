package tv.bayit.plus.core.common.correlation

import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Generates unique correlation IDs for request tracing.
 *
 * Mirrors the X-Correlation-ID pattern from iOS APIClient:
 * - Each HTTP request gets a UUID
 * - Sent as X-Correlation-ID header
 * - Allows backend to trace requests across services
 */
interface CorrelationIdGenerator {
    fun generate(): String
}

@Singleton
class UuidCorrelationIdGenerator @Inject constructor() : CorrelationIdGenerator {
    override fun generate(): String = UUID.randomUUID().toString()
}
