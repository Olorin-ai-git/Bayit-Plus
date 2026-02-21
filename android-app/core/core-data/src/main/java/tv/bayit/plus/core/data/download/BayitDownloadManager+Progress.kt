package tv.bayit.plus.core.data.download

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
    val failed = current.copy(
        status = DownloadStatus.FAILED,
        error = error,
    )
    store.upsert(failed)
    emitState()
    logger.error("Download failed", metadata = mapOf("id" to id, "error" to error))
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
