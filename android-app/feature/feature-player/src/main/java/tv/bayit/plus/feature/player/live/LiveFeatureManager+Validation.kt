package tv.bayit.plus.feature.player.live

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

internal fun <S> LiveFeatureManager<S>.validateMessage(text: String, scope: CoroutineScope): Boolean {
    if (!checkMessageSize(text, scope)) {
        return false
    }
    if (!checkRateLimit(scope)) {
        return false
    }
    return true
}

internal fun <S> LiveFeatureManager<S>.checkMessageSize(text: String, scope: CoroutineScope): Boolean {
    val sizeBytes = text.toByteArray(Charsets.UTF_8).size
    if (sizeBytes > LiveFeatureManager.MAX_MESSAGE_SIZE_BYTES) {
        logger.warning(
            "WebSocket message exceeds size limit",
            mapOf(
                "sizeBytes" to sizeBytes.toString(),
                "maxBytes" to LiveFeatureManager.MAX_MESSAGE_SIZE_BYTES.toString(),
                "channelType" to channelType.name,
            ),
        )
        scope.launch {
            setEnabled(
                isEnabled = false,
                errorMessage = "player.ai.errors.messageSizeLimitExceeded",
            )
        }
        scope.launch {
            stop()
        }
        return false
    }
    return true
}

internal fun <S> LiveFeatureManager<S>.checkRateLimit(scope: CoroutineScope): Boolean {
    val now = System.currentTimeMillis()
    val windowStart = rateLimitWindowStart.get()

    if (now - windowStart > LiveFeatureManager.RATE_LIMIT_WINDOW_MS) {
        rateLimitWindowStart.set(now)
        messageCount.set(1)
        return true
    }

    val count = messageCount.incrementAndGet()
    if (count > LiveFeatureManager.MAX_MESSAGES_PER_SECOND) {
        logger.warning(
            "WebSocket rate limit exceeded",
            mapOf(
                "messagesPerSecond" to count.toString(),
                "maxPerSecond" to LiveFeatureManager.MAX_MESSAGES_PER_SECOND.toString(),
                "channelType" to channelType.name,
            ),
        )
        scope.launch {
            setEnabled(
                isEnabled = false,
                errorMessage = "player.ai.errors.rateLimitExceeded",
            )
        }
        return false
    }

    return true
}
