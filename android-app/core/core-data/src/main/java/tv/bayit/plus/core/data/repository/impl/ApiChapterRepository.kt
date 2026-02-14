package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.ChapterRepository
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [ChapterRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIChapterRepository and web api.js.
 */
@Singleton
class ApiChapterRepository @Inject constructor(
    private val client: BayitApiClient,
) : ChapterRepository {

    private val service: ChapterService = client.createService()

    override suspend fun getChapters(
        mediaId: String,
    ): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall {
            service.getChapters(mediaId)
        }
        response.chapters
    }

    override suspend fun getChapter(
        mediaId: String,
        chapterIndex: Int,
    ): BayitResult<Any> = runCatchingResult {
        val response = client.safeApiCall {
            service.getChapters(mediaId)
        }
        response.chapters.getOrElse(chapterIndex) {
            throw IndexOutOfBoundsException(
                "Chapter index $chapterIndex out of range for ${response.chapters.size} chapters",
            )
        }
    }

    override suspend fun skipToChapter(
        mediaId: String,
        chapterIndex: Int,
    ): BayitResult<Unit> = runCatchingResult {
        val body = ChapterSkipBody(chapterIndex = chapterIndex)
        client.safeApiCall { service.skipToChapter(mediaId, body) }
        Unit
    }

    override suspend fun getChapterThumbnails(
        mediaId: String,
    ): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall {
            service.getChapterThumbnails(mediaId)
        }
        response.thumbnails
    }
}

private interface ChapterService {

    @GET("api/v1/chapters/{contentId}")
    suspend fun getChapters(
        @Path("contentId") contentId: String,
    ): ChaptersResponse

    @POST("api/v1/chapters/{contentId}/skip")
    suspend fun skipToChapter(
        @Path("contentId") contentId: String,
        @Body body: ChapterSkipBody,
    ): ChapterSkipResponse

    @GET("api/v1/chapters/{contentId}/thumbnails")
    suspend fun getChapterThumbnails(
        @Path("contentId") contentId: String,
    ): ChapterThumbnailsResponse
}

/** Response from the chapters endpoint. */
@Serializable
private data class ChaptersResponse(
    @SerialName("content_id") val contentId: String? = null,
    @SerialName("content_title") val contentTitle: String? = null,
    @SerialName("total_duration") val totalDuration: Double? = null,
    val source: String? = null,
    @SerialName("generated_at") val generatedAt: String? = null,
    @SerialName("is_approved") val isApproved: Boolean? = null,
    val chapters: List<ChapterItem> = emptyList(),
)

/** A single chapter within content. */
@Serializable
private data class ChapterItem(
    @SerialName("start_time") val startTime: Double,
    @SerialName("end_time") val endTime: Double,
    val title: String? = null,
    @SerialName("title_en") val titleEn: String? = null,
    val category: String? = null,
    @SerialName("category_info") val categoryInfo: ChapterCategoryInfo? = null,
    val summary: String? = null,
    val keywords: List<String>? = null,
    @SerialName("formatted_start") val formattedStart: String? = null,
    @SerialName("formatted_end") val formattedEnd: String? = null,
)

/** Category metadata for a chapter. */
@Serializable
private data class ChapterCategoryInfo(
    val he: String? = null,
    val en: String? = null,
    val icon: String? = null,
)

/** Request body for skipping to a specific chapter. */
@Serializable
private data class ChapterSkipBody(
    @SerialName("chapter_index") val chapterIndex: Int,
)

/** Response from the chapter skip endpoint. */
@Serializable
private data class ChapterSkipResponse(
    val success: Boolean = true,
    @SerialName("seek_position") val seekPosition: Double? = null,
)

/** Response from the chapter thumbnails endpoint. */
@Serializable
private data class ChapterThumbnailsResponse(
    val thumbnails: List<ChapterThumbnail> = emptyList(),
)

/** A thumbnail associated with a chapter. */
@Serializable
private data class ChapterThumbnail(
    @SerialName("chapter_index") val chapterIndex: Int,
    val url: String,
    @SerialName("start_time") val startTime: Double? = null,
    val width: Int? = null,
    val height: Int? = null,
)
