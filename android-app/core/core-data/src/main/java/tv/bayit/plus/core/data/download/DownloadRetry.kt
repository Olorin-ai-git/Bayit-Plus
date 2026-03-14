package tv.bayit.plus.core.data.download

import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.model.DownloadStatus
import tv.bayit.plus.core.model.LocalDownload
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Automatic retry logic for failed downloads with exponential backoff.
 * Retries up to [MAX_RETRIES] times with delays of 2s, 4s, 8s.
 */
@Singleton
class DownloadRetry @Inject constructor(
    private val logger: BayitLogger,
) {

    fun shouldRetry(currentRetryCount: Int): Boolean =
        currentRetryCount < MAX_RETRIES

    fun scheduleRetry(download: LocalDownload, manager: BayitDownloadManager) {
        val attempt = download.retryCount
        val delayMs = BASE_DELAY_MS * (1L shl (attempt - 1))
        logger.info(
            "Scheduling download retry",
            mapOf(
                "id" to download.id,
                "attempt" to attempt.toString(),
                "delayMs" to delayMs.toString(),
            ),
        )
        manager.scope.launch {
            delay(delayMs)
            val current = manager.findById(download.id) ?: return@launch
            if (current.status == DownloadStatus.FAILED ||
                current.status == DownloadStatus.PAUSED
            ) {
                return@launch
            }
            val retrying = current.copy(
                status = DownloadStatus.QUEUED,
                error = null,
            )
            manager.store.upsert(retrying)
            manager.emitState()
            manager.downloadQueue.enqueue(retrying, manager)
        }
    }

    companion object {
        private const val MAX_RETRIES = 3
        private const val BASE_DELAY_MS = 2_000L
    }
}
