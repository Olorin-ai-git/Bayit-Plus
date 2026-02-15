package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.AudiobookRepository
import tv.bayit.plus.core.model.Audiobook
import tv.bayit.plus.core.model.AudiobookListResponse
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [AudiobookRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIAudiobookRepository and web api.js.
 */
class ApiAudiobookRepository(
    private val client: BayitApiClient,
) : AudiobookRepository {

    private val service: AudiobookService = client.createService()

    override suspend fun getAudiobooks(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getAudiobooks() }
        response.items ?: emptyList()
    }

    override suspend fun getAudiobook(audiobookId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getAudiobook(audiobookId) }
        }

    override suspend fun getChapters(audiobookId: String): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall {
                service.getAudiobookWithChapters(audiobookId)
            }
            response.chapters
        }

    override suspend fun getPlaybackPosition(audiobookId: String): BayitResult<Long> =
        runCatchingResult {
            val response = client.safeApiCall {
                service.getPlaybackPosition(audiobookId)
            }
            response.positionMs
        }

    override suspend fun updatePlaybackPosition(
        audiobookId: String,
        positionMs: Long,
    ): BayitResult<Unit> = runCatchingResult {
        val request = PositionUpdateBody(positionMs = positionMs)
        client.safeApiCall { service.updatePlaybackPosition(audiobookId, request) }
        Unit
    }

    override suspend fun getBookmarks(audiobookId: String): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall {
                service.getBookmarks(audiobookId)
            }
            response.bookmarks
        }

    override suspend fun addBookmark(
        audiobookId: String,
        positionMs: Long,
        note: String?,
    ): BayitResult<Any> = runCatchingResult {
        val request = BookmarkCreateBody(positionMs = positionMs, note = note)
        client.safeApiCall { service.addBookmark(audiobookId, request) }
    }
}

private interface AudiobookService {

    @GET("api/v1/audiobooks")
    suspend fun getAudiobooks(): AudiobookListResponse

    @GET("api/v1/audiobooks/{audiobookId}")
    suspend fun getAudiobook(
        @Path("audiobookId") audiobookId: String,
    ): Audiobook

    @GET("api/v1/audiobooks/{audiobookId}/chapters")
    suspend fun getAudiobookWithChapters(
        @Path("audiobookId") audiobookId: String,
    ): AudiobookWithChaptersServiceResponse

    @GET("api/v1/audiobooks/{audiobookId}/position")
    suspend fun getPlaybackPosition(
        @Path("audiobookId") audiobookId: String,
    ): PlaybackPositionResponse

    @PUT("api/v1/audiobooks/{audiobookId}/position")
    suspend fun updatePlaybackPosition(
        @Path("audiobookId") audiobookId: String,
        @Body request: PositionUpdateBody,
    ): MessageResponse

    @GET("api/v1/audiobooks/{audiobookId}/bookmarks")
    suspend fun getBookmarks(
        @Path("audiobookId") audiobookId: String,
    ): BookmarksResponse

    @POST("api/v1/audiobooks/{audiobookId}/bookmark")
    suspend fun addBookmark(
        @Path("audiobookId") audiobookId: String,
        @Body request: BookmarkCreateBody,
    ): BookmarkItem
}

/** Response from the chapters endpoint containing audiobook metadata and chapter list. */
@Serializable
private data class AudiobookWithChaptersServiceResponse(
    val id: String,
    val title: String? = null,
    val chapters: List<AudiobookChapterItem> = emptyList(),
    @SerialName("total_chapters") val totalChapters: Int? = null,
)

/** A chapter item returned by the chapters endpoint. */
@Serializable
private data class AudiobookAudiobookChapterItem(
    val id: String,
    val title: String? = null,
    @SerialName("chapter_number") val chapterNumber: Int? = null,
    val duration: String? = null,
    val progress: Double? = null,
    val thumbnail: String? = null,
    @SerialName("stream_url") val streamUrl: String? = null,
    @SerialName("stream_type") val streamType: String? = null,
)

/** Response from the playback position endpoint. */
@Serializable
private data class PlaybackPositionResponse(
    @SerialName("position_ms") val positionMs: Long = 0L,
    @SerialName("audiobook_id") val audiobookId: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)

/** Request body for updating playback position. */
@Serializable
private data class PositionUpdateBody(
    @SerialName("position_ms") val positionMs: Long,
)

/** Response from the bookmarks list endpoint. */
@Serializable
private data class BookmarksResponse(
    val bookmarks: List<BookmarkItem> = emptyList(),
)

/** A single bookmark entry. */
@Serializable
private data class BookmarkItem(
    val id: String? = null,
    @SerialName("position_ms") val positionMs: Long? = null,
    val note: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

/** Request body for creating a bookmark. */
@Serializable
private data class BookmarkCreateBody(
    @SerialName("position_ms") val positionMs: Long,
    val note: String? = null,
)
