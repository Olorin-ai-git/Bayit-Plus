package tv.bayit.plus.core.data.download

import android.net.Uri
import tv.bayit.plus.core.model.DownloadStatus
import tv.bayit.plus.core.model.LocalDownload

internal fun BayitDownloadManager.updateProgressInMemory(id: String, progress: Float) {
    val current = downloads.value.toMutableList()
    val index = current.indexOfFirst { it.id == id }
    if (index < 0) return
    val item = current[index]
    if (item.status != DownloadStatus.DOWNLOADING) return
    current[index] = item.copy(progress = progress)
    _downloads.value = current
}

internal suspend fun BayitDownloadManager.markFailed(id: String, error: String) {
    val current = findById(id) ?: return
    val shouldRetry = downloadRetry.shouldRetry(current.retryCount)
    if (shouldRetry) {
        val retrying = current.copy(retryCount = current.retryCount + 1)
        store.upsert(retrying)
        emitState()
        downloadRetry.scheduleRetry(retrying, this)
        return
    }
    val failed = current.copy(
        status = DownloadStatus.FAILED,
        error = error,
    )
    store.upsert(failed)
    emitState()
    downloadQueue.onDownloadFinished()
    logger.error("Download failed", metadata = mapOf("id" to id, "error" to error))
}

internal suspend fun BayitDownloadManager.savePauseState(id: String, bytesWritten: Long) {
    val current = findById(id) ?: return
    val paused = current.copy(
        status = DownloadStatus.PAUSED,
        bytesDownloaded = bytesWritten,
    )
    store.upsert(paused)
    emitState()
    downloadQueue.onDownloadFinished()
    logger.info("Download paused", mapOf("id" to id, "bytes" to bytesWritten.toString()))
}

internal suspend fun BayitDownloadManager.emitState() {
    _downloads.value = store.load()
}

internal fun BayitDownloadManager.findById(id: String): LocalDownload? =
    downloads.value.firstOrNull { it.id == id }

internal fun BayitDownloadManager.deleteFile(download: LocalDownload) {
    download.filePath?.let { path ->
        java.io.File(path).takeIf { it.exists() }?.delete()
    }
}

fun BayitDownloadManager.localFileUri(contentId: String): String? {
    val download = localDownload(contentId)
    if (download == null) {
        logger.debug("No completed download for offline playback", mapOf("contentId" to contentId))
        return null
    }
    val path = download.filePath ?: run {
        logger.warning("Completed download has no file path", mapOf("contentId" to contentId))
        return null
    }
    val file = java.io.File(path)
    if (!file.exists()) {
        logger.warning("Download file missing from disk", mapOf("contentId" to contentId, "path" to path))
        return null
    }
    val uri = Uri.fromFile(file).toString()
    logger.debug("Resolved local file for offline playback", mapOf("contentId" to contentId, "uri" to uri))
    return uri
}

fun BayitDownloadManager.isDownloaded(contentId: String): Boolean =
    localDownload(contentId) != null
