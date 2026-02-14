package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.MediaRepository
import tv.bayit.plus.core.model.ContinueWatchingResponse
import tv.bayit.plus.core.model.StreamInfo
import tv.bayit.plus.core.model.WatchHistoryResponse
import tv.bayit.plus.core.model.WatchProgressResponse
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [MediaRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIMediaRepository and web api.js.
 */
class ApiMediaRepository(
    private val client: BayitApiClient,
) : MediaRepository {

    private val service: MediaService = client.createService()

    override suspend fun getPlaybackUrl(mediaId: String): BayitResult<String> =
        runCatchingResult {
            val response = client.safeApiCall { service.getStream(mediaId) }
            response.resolvedUrl
                ?: throw IllegalStateException("No playback URL available for media $mediaId")
        }

    override suspend fun reportProgress(
        mediaId: String,
        positionMs: Long,
    ): BayitResult<Unit> = runCatchingResult {
        val request = ProgressReportBody(
            contentId = mediaId,
            position = positionMs.toDouble() / MS_PER_SECOND,
        )
        client.safeApiCall { service.reportProgress(request) }
        Unit
    }

    override suspend fun getWatchHistory(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getWatchHistory() }
        response.items
    }

    override suspend fun getContinueWatching(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getContinueWatching() }
        response.items
    }

    override suspend fun getMediaMetadata(mediaId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getStream(mediaId) }
        }
}

private interface MediaService {

    @GET("api/v1/content/{mediaId}/stream")
    suspend fun getStream(@Path("mediaId") mediaId: String): StreamInfo

    @POST("api/v1/history/progress")
    suspend fun reportProgress(@Body request: ProgressReportBody): WatchProgressResponse

    @GET("api/v1/history")
    suspend fun getWatchHistory(): WatchHistoryResponse

    @GET("api/v1/history/continue")
    suspend fun getContinueWatching(): ContinueWatchingResponse
}

/**
 * Request body for reporting playback progress.
 * Position is in seconds (converted from milliseconds by the repository).
 */
@Serializable
private data class ProgressReportBody(
    @SerialName("content_id") val contentId: String,
    val position: Double,
)

/** Conversion factor from milliseconds to seconds. */
private const val MS_PER_SECOND = 1000.0
