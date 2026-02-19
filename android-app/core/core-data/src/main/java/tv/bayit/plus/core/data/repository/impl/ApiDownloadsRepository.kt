package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.DownloadsRepository
import tv.bayit.plus.core.model.DownloadItem
import tv.bayit.plus.core.model.DownloadStartRequest
import tv.bayit.plus.core.model.DownloadStartResponse
import tv.bayit.plus.core.model.DownloadsResponse
import tv.bayit.plus.core.network.api.BayitApiClient

class ApiDownloadsRepository(
    private val client: BayitApiClient,
) : DownloadsRepository {

    private val service: DownloadsService = client.createService()

    override suspend fun getDownloads(): BayitResult<List<DownloadItem>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getDownloads() }
            response.items
        }

    override suspend fun deleteDownload(downloadId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.deleteDownload(downloadId) }
            Unit
        }

    override suspend fun startDownload(request: DownloadStartRequest): BayitResult<DownloadStartResponse> =
        runCatchingResult {
            client.safeApiCall { service.startDownload(request) }
        }
}

private interface DownloadsService {
    @GET("api/v1/user/downloads")
    suspend fun getDownloads(): DownloadsResponse

    @DELETE("api/v1/user/downloads/{download_id}")
    suspend fun deleteDownload(@Path("download_id") downloadId: String): DeleteDownloadResponse

    @POST("api/v1/user/downloads")
    suspend fun startDownload(@Body request: DownloadStartRequest): DownloadStartResponse
}

@Serializable
private data class DeleteDownloadResponse(
    val status: String? = null,
    val message: String? = null,
)
