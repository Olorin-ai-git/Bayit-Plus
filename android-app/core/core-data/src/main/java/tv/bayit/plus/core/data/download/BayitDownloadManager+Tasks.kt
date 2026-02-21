package tv.bayit.plus.core.data.download

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.DownloadStartRequest
import tv.bayit.plus.core.model.DownloadStatus
import tv.bayit.plus.core.model.LocalDownload
import tv.bayit.plus.core.model.LocalDownloadRequest
import java.io.File

internal fun BayitDownloadManager.executeDownload(download: LocalDownload) {
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

            val request = okhttp3.Request.Builder()
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

internal suspend fun BayitDownloadManager.registerWithServer(request: LocalDownloadRequest) {
    val serverRequest = DownloadStartRequest(
        contentId = request.contentId,
        contentType = request.contentType,
    )
    when (val result = downloadsRepository.startDownload(serverRequest)) {
        is BayitResult.Success -> {
            val serverId = result.data.downloadId
            if (serverId != null) {
                val download = downloads.value.firstOrNull {
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

internal fun BayitDownloadManager.extractExtension(url: String): String {
    val path = url.substringBefore("?").substringAfterLast("/")
    val ext = path.substringAfterLast(".", "")
    return ext.ifEmpty { DEFAULT_EXTENSION }
}

internal const val DEFAULT_EXTENSION = "mp4"
