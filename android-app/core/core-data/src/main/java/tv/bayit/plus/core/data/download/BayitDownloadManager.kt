package tv.bayit.plus.core.data.download

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import tv.bayit.plus.core.common.NetworkMonitor
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.DownloadsRepository
import tv.bayit.plus.core.model.DownloadStatus
import tv.bayit.plus.core.model.LocalDownload
import tv.bayit.plus.core.model.LocalDownloadRequest
import java.io.File
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BayitDownloadManager @Inject constructor(
    @ApplicationContext internal val context: Context,
    @DownloadClient internal val downloadClient: OkHttpClient,
    internal val authClient: OkHttpClient,
    internal val downloadsRepository: DownloadsRepository,
    internal val store: DownloadStore,
    internal val logger: BayitLogger,
    internal val downloadQueue: DownloadQueue,
    internal val downloadRetry: DownloadRetry,
    internal val storageMonitor: StorageMonitor,
    internal val downloadPreferences: DownloadPreferences,
    internal val networkMonitor: NetworkMonitor,
) {
    internal val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    internal val activeJobs = mutableMapOf<String, Job>()

    internal val _downloads = MutableStateFlow<List<LocalDownload>>(emptyList())
    val downloads: StateFlow<List<LocalDownload>> = _downloads.asStateFlow()

    internal val downloadsDir: File
        get() = File(context.filesDir, DOWNLOADS_DIR).also { it.mkdirs() }

    fun initialize() {
        scope.launch {
            val persisted = store.load().map { download ->
                if (download.status == DownloadStatus.DOWNLOADING ||
                    download.status == DownloadStatus.QUEUED
                ) {
                    download.copy(status = DownloadStatus.PAUSED)
                } else {
                    download
                }
            }
            persisted.forEach { store.upsert(it) }
            _downloads.value = persisted
            logger.info(
                "Download manager initialized",
                mapOf("count" to persisted.size.toString()),
            )
        }
    }

    fun startDownload(request: LocalDownloadRequest) {
        scope.launch {
            if (_downloads.value.any { it.contentId == request.contentId }) {
                logger.warning(
                    "Download already exists",
                    mapOf("contentId" to request.contentId),
                )
                return@launch
            }

            val storageStatus = storageMonitor.checkStorage()
            if (storageStatus == StorageStatus.CRITICAL) {
                logger.warning("Storage critical, blocking download")
                return@launch
            }

            val id = UUID.randomUUID().toString()
            val download = LocalDownload(
                id = id,
                contentId = request.contentId,
                title = request.title,
                thumbnail = request.thumbnail,
                contentType = request.contentType,
                status = DownloadStatus.QUEUED,
                createdAt = System.currentTimeMillis(),
                sourceUrl = request.streamUrl,
            )

            store.upsert(download)
            emitState()
            registerWithServer(request)
            downloadQueue.enqueue(download, this@BayitDownloadManager)
        }
    }

    fun pauseDownload(id: String) {
        activeJobs[id]?.cancel()
        activeJobs.remove(id)
        logger.info("Download paused", mapOf("id" to id))
    }

    fun cancelDownload(id: String) {
        activeJobs[id]?.cancel()
        activeJobs.remove(id)
        scope.launch {
            val download = findById(id) ?: return@launch
            deleteFile(download)
            store.remove(id)
            emitState()
            logger.info("Download cancelled", mapOf("id" to id))
        }
    }

    fun retryDownload(id: String) {
        scope.launch {
            val download = findById(id) ?: return@launch
            if (download.status != DownloadStatus.FAILED &&
                download.status != DownloadStatus.PAUSED
            ) return@launch

            val resumable = download.bytesDownloaded > 0 &&
                download.status == DownloadStatus.PAUSED
            val retrying = if (resumable) {
                download.copy(status = DownloadStatus.QUEUED, error = null)
            } else {
                download.copy(
                    status = DownloadStatus.QUEUED,
                    progress = 0f,
                    error = null,
                    bytesDownloaded = 0L,
                )
            }
            store.upsert(retrying)
            emitState()
            downloadQueue.enqueue(retrying, this@BayitDownloadManager)
        }
    }

    fun deleteDownload(id: String) {
        activeJobs[id]?.cancel()
        activeJobs.remove(id)
        scope.launch {
            val download = findById(id) ?: return@launch
            deleteFile(download)
            download.serverDownloadId?.let { serverId ->
                downloadsRepository.deleteDownload(serverId)
            }
            store.remove(id)
            emitState()
            logger.info("Download deleted", mapOf("id" to id))
        }
    }

    fun clearAll() {
        activeJobs.values.forEach { it.cancel() }
        activeJobs.clear()
        scope.launch {
            _downloads.value.forEach { deleteFile(it) }
            store.clear()
            emitState()
            logger.info("All downloads cleared")
        }
    }

    fun localDownload(contentId: String): LocalDownload? =
        _downloads.value.firstOrNull {
            it.contentId == contentId && it.status == DownloadStatus.COMPLETED
        }

    companion object {
        private const val DOWNLOADS_DIR = "BayitDownloads"
    }
}
