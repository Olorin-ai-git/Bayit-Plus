package tv.bayit.plus.core.data.download

import android.content.Context
import android.net.Uri
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.DownloadsRepository
import tv.bayit.plus.core.model.DownloadStartRequest
import tv.bayit.plus.core.model.DownloadStatus
import tv.bayit.plus.core.model.LocalDownload
import tv.bayit.plus.core.model.LocalDownloadRequest
import java.io.File
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Singleton download engine that manages file downloads to local storage.
 * Mirrors the iOS DownloadManager pattern with coroutine-based progress tracking.
 */
@Singleton
class BayitDownloadManager @Inject constructor(
    @ApplicationContext private val context: Context,
    @DownloadClient private val downloadClient: OkHttpClient,
    private val authClient: OkHttpClient,
    private val downloadsRepository: DownloadsRepository,
    private val store: DownloadStore,
    private val logger: BayitLogger,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val activeJobs = mutableMapOf<String, Job>()

    private val _downloads = MutableStateFlow<List<LocalDownload>>(emptyList())
    val downloads: StateFlow<List<LocalDownload>> = _downloads.asStateFlow()

    private val downloadsDir: File
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
            executeDownload(download)
        }
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
            if (download.status != DownloadStatus.FAILED && download.status != DownloadStatus.PAUSED) return@launch

            val retrying = download.copy(
                status = DownloadStatus.QUEUED,
                progress = 0f,
                error = null,
            )
            store.upsert(retrying)
            emitState()
            executeDownload(retrying)
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

    fun localFileUri(contentId: String): String? {
        val download = localDownload(contentId)
        if (download == null) {
            logger.debug(
                "No completed download found for offline playback",
                mapOf("contentId" to contentId),
            )
            return null
        }
        val path = download.filePath
        if (path == null) {
            logger.warning(
                "Completed download has no file path",
                mapOf("contentId" to contentId, "downloadId" to download.id),
            )
            return null
        }
        val file = File(path)
        if (!file.exists()) {
            logger.warning(
                "Download file missing from disk",
                mapOf("contentId" to contentId, "path" to path),
            )
            return null
        }
        val uri = Uri.fromFile(file).toString()
        logger.debug(
            "Resolved local file for offline playback",
            mapOf("contentId" to contentId, "uri" to uri),
        )
        return uri
    }

    private fun executeDownload(download: LocalDownload) {
        val job = scope.launch {
            val downloading = download.copy(status = DownloadStatus.DOWNLOADING)
            store.upsert(downloading)
            emitState()

            try {
                logger.debug(
                    "Executing download",
                    mapOf("id" to download.id, "url" to download.sourceUrl),
                )
                val extension = extractExtension(download.sourceUrl)
                val targetFile = File(downloadsDir, "${download.id}.$extension")

                val request = Request.Builder()
                    .url(download.sourceUrl)
                    .build()

                val client = if (download.sourceUrl.contains("/api/proxy/")) {
                    authClient
                } else {
                    downloadClient
                }

                val response = withContext(Dispatchers.IO) {
                    client.newCall(request).execute()
                }

                if (!response.isSuccessful) {
                    markFailed(download.id, "HTTP ${response.code}")
                    response.close()
                    return@launch
                }

                val body = response.body ?: run {
                    markFailed(download.id, "Empty response body")
                    return@launch
                }

                val progressBody = ProgressResponseBody(body) { progress ->
                    updateProgressInMemory(download.id, progress)
                }

                withContext(Dispatchers.IO) {
                    targetFile.outputStream().use { output ->
                        progressBody.source().inputStream().use { input ->
                            input.copyTo(output)
                        }
                    }
                }

                val completed = download.copy(
                    status = DownloadStatus.COMPLETED,
                    progress = 1f,
                    filePath = targetFile.absolutePath,
                    fileSize = targetFile.length(),
                )
                store.upsert(completed)
                emitState()
                activeJobs.remove(download.id)
                logger.info(
                    "Download completed",
                    mapOf(
                        "id" to download.id,
                        "size" to targetFile.length().toString(),
                    ),
                )
            } catch (e: Exception) {
                markFailed(download.id, e.message ?: "Download failed")
            }
        }
        activeJobs[download.id] = job
    }

    private fun updateProgressInMemory(id: String, progress: Float) {
        val current = _downloads.value.toMutableList()
        val index = current.indexOfFirst { it.id == id }
        if (index < 0) return
        val item = current[index]
        if (item.status != DownloadStatus.DOWNLOADING) return
        current[index] = item.copy(progress = progress)
        _downloads.value = current
    }

    private suspend fun markFailed(id: String, error: String) {
        val current = findById(id) ?: return
        val failed = current.copy(
            status = DownloadStatus.FAILED,
            error = error,
        )
        store.upsert(failed)
        emitState()
        logger.error("Download failed", metadata = mapOf("id" to id, "error" to error))
    }

    private suspend fun registerWithServer(request: LocalDownloadRequest) {
        val serverRequest = DownloadStartRequest(
            contentId = request.contentId,
            contentType = request.contentType,
        )
        when (val result = downloadsRepository.startDownload(serverRequest)) {
            is BayitResult.Success -> {
                val serverId = result.data.downloadId
                if (serverId != null) {
                    val download = _downloads.value.firstOrNull {
                        it.contentId == request.contentId
                    }
                    if (download != null) {
                        store.upsert(download.copy(serverDownloadId = serverId))
                        emitState()
                    }
                }
            }
            is BayitResult.Error -> logger.warning(
                "Server download registration failed",
                mapOf("contentId" to request.contentId),
            )
            is BayitResult.Loading -> Unit
        }
    }

    private suspend fun emitState() {
        _downloads.value = store.load()
    }

    private fun findById(id: String): LocalDownload? =
        _downloads.value.firstOrNull { it.id == id }

    private fun deleteFile(download: LocalDownload) {
        download.filePath?.let { path ->
            File(path).takeIf { it.exists() }?.delete()
        }
    }

    private fun extractExtension(url: String): String {
        val path = url.substringBefore("?").substringAfterLast("/")
        val ext = path.substringAfterLast(".", "")
        return ext.ifEmpty { DEFAULT_EXTENSION }
    }

    companion object {
        private const val DOWNLOADS_DIR = "BayitDownloads"
        private const val DEFAULT_EXTENSION = "mp4"
    }
}
