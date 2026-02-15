package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.DownloadItem

interface DownloadsRepository {
    suspend fun getDownloads(): BayitResult<List<DownloadItem>>
    suspend fun deleteDownload(downloadId: String): BayitResult<Unit>
}
