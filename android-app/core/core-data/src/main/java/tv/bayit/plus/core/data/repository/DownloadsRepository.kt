package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.DownloadItem
import tv.bayit.plus.core.model.DownloadStartRequest
import tv.bayit.plus.core.model.DownloadStartResponse

interface DownloadsRepository {
    suspend fun getDownloads(): BayitResult<List<DownloadItem>>
    suspend fun deleteDownload(downloadId: String): BayitResult<Unit>
    suspend fun startDownload(request: DownloadStartRequest): BayitResult<DownloadStartResponse>
}
