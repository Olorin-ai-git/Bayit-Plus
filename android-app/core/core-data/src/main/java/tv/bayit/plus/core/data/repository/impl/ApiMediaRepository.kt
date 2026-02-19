package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.MediaRepository
import tv.bayit.plus.core.model.ContinueWatchingResponse
import tv.bayit.plus.core.model.RestartResponse
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

    override suspend fun getDownloadUrl(mediaId: String): BayitResult<String> =
        runCatchingResult {
            val response = client.safeApiCall { service.getStream(mediaId) }
            val directUrl = response.directUrl
            if (!directUrl.isNullOrEmpty() && !directUrl.contains(".m3u8")) {
                directUrl
            } else {
                "${client.retrofit.baseUrl()}api/proxy/transcode/$mediaId"
            }
        }

    override suspend fun reportProgress(
        mediaId: String,
        contentType: String,
        positionMs: Long,
        durationMs: Long,
    ): BayitResult<Unit> = runCatchingResult {
        val request = ProgressReportBody(
            contentId = mediaId,
            contentType = contentType,
            position = positionMs.toDouble() / MS_PER_SECOND,
            duration = durationMs.toDouble() / MS_PER_SECOND,
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

    override suspend fun restartContent(contentId: String): BayitResult<RestartResponse> =
        runCatchingResult {
            client.safeApiCall { service.restartContent(contentId) }
        }

    override suspend fun removeFromHistory(contentId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.removeFromHistory(contentId) }
            Unit
        }

    override suspend fun clearHistory(): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.clearHistory() }
            Unit
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

    @PATCH("api/v1/history/{contentId}/restart")
    suspend fun restartContent(@Path("contentId") contentId: String): RestartResponse

    @DELETE("api/v1/history/{contentId}")
    suspend fun removeFromHistory(@Path("contentId") contentId: String): MessageResponse

    @DELETE("api/v1/history")
    suspend fun clearHistory(): MessageResponse
}

/**
 * Request body for reporting playback progress.
 * Position is in seconds (converted from milliseconds by the repository).
 */
@Serializable
private data class ProgressReportBody(
    @SerialName("content_id") val contentId: String,
    @SerialName("content_type") val contentType: String,
    val position: Double,
    val duration: Double,
)

@Serializable
private data class MessageResponse(
    val message: String? = null,
)

/** Conversion factor from milliseconds to seconds. */
private const val MS_PER_SECOND = 1000.0
