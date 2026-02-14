package tv.bayit.plus.core.common.logging

import timber.log.Timber

/**
 * Centralized logging interface for Bayit+ Android app.
 * Wraps Timber with structured logging metadata support.
 *
 * Mirrors the APILogger pattern from iOS BayitNetworking package.
 */
interface BayitLogger {
    fun debug(message: String, metadata: Map<String, String> = emptyMap())
    fun info(message: String, metadata: Map<String, String> = emptyMap())
    fun warning(message: String, metadata: Map<String, String> = emptyMap())
    fun error(message: String, error: Throwable? = null, metadata: Map<String, String> = emptyMap())
}

/**
 * Production implementation of BayitLogger using Timber.
 */
class TimberBayitLogger : BayitLogger {

    override fun debug(message: String, metadata: Map<String, String>) {
        Timber.tag(TAG).d(formatMessage(message, metadata))
    }

    override fun info(message: String, metadata: Map<String, String>) {
        Timber.tag(TAG).i(formatMessage(message, metadata))
    }

    override fun warning(message: String, metadata: Map<String, String>) {
        Timber.tag(TAG).w(formatMessage(message, metadata))
    }

    override fun error(message: String, error: Throwable?, metadata: Map<String, String>) {
        val formattedMessage = formatMessage(message, metadata)
        if (error != null) {
            Timber.tag(TAG).e(error, formattedMessage)
        } else {
            Timber.tag(TAG).e(formattedMessage)
        }
    }

    private fun formatMessage(message: String, metadata: Map<String, String>): String {
        if (metadata.isEmpty()) return message
        val metadataString = metadata.entries.joinToString(", ") { "${it.key}=${it.value}" }
        return "$message [$metadataString]"
    }

    companion object {
        private const val TAG = "Bayit+"
    }
}

/**
 * Test/Mock implementation that does nothing.
 */
class NoOpBayitLogger : BayitLogger {
    override fun debug(message: String, metadata: Map<String, String>) {}
    override fun info(message: String, metadata: Map<String, String>) {}
    override fun warning(message: String, metadata: Map<String, String>) {}
    override fun error(message: String, error: Throwable?, metadata: Map<String, String>) {}
}
