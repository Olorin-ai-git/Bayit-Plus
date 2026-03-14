package tv.bayit.plus.core.data.download

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withLock
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.model.LocalDownload
import java.util.LinkedList
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Concurrency-limited download queue. Allows at most [MAX_CONCURRENT]
 * simultaneous downloads; additional requests are queued and started
 * when a slot becomes available.
 */
@Singleton
class DownloadQueue @Inject constructor(
    private val logger: BayitLogger,
) {
    private val semaphore = Semaphore(MAX_CONCURRENT)
    private val mutex = Mutex()
    private val pending = LinkedList<QueuedItem>()

    suspend fun enqueue(download: LocalDownload, manager: BayitDownloadManager) {
        if (semaphore.tryAcquire()) {
            logger.debug(
                "Download slot available, starting immediately",
                mapOf("id" to download.id),
            )
            manager.executeDownload(download)
        } else {
            mutex.withLock {
                pending.add(QueuedItem(download, manager))
            }
            logger.debug(
                "Download queued, waiting for slot",
                mapOf("id" to download.id, "queueSize" to pending.size.toString()),
            )
        }
    }

    suspend fun onDownloadFinished() {
        semaphore.release()
        processNext()
    }

    private suspend fun processNext() {
        val next = mutex.withLock { pending.poll() } ?: return
        if (semaphore.tryAcquire()) {
            logger.debug(
                "Processing queued download",
                mapOf("id" to next.download.id),
            )
            next.manager.executeDownload(next.download)
        } else {
            mutex.withLock { pending.addFirst(next) }
        }
    }

    private data class QueuedItem(
        val download: LocalDownload,
        val manager: BayitDownloadManager,
    )

    companion object {
        private const val MAX_CONCURRENT = 3
    }
}
