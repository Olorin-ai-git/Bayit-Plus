package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** An audiobook with metadata and chapter information. */
@Serializable
data class Audiobook(
    val id: String,
    val title: String? = null,
    val author: String? = null,
    val narrator: String? = null,
    val description: String? = null,
    val thumbnail: String? = null,
    val backdrop: String? = null,
    val duration: String? = null,
    val chapters: List<AudiobookChapter>? = null,
    @SerialName("genre_ids") val genreIds: List<String>? = null,
    @SerialName("audio_quality") val audioQuality: String? = null,
    @SerialName("requires_subscription") val requiresSubscription: String? = null,
    @SerialName("content_format") val contentFormat: String? = null,
    @SerialName("view_count") val viewCount: Int? = null,
    @SerialName("avg_rating") val avgRating: Double? = null,
    @SerialName("is_featured") val isFeatured: Boolean? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)

/** A chapter within an audiobook. */
@Serializable
data class AudiobookChapter(
    val id: String? = null,
    val title: String? = null,
    @SerialName("start_time") val startTime: Double? = null,
    @SerialName("end_time") val endTime: Double? = null,
) {
    val stableId: String get() = id ?: "${startTime ?: 0.0}"
}

/** Paginated response from GET /api/v1/audiobooks */
@Serializable
data class AudiobookListResponse(
    val items: List<Audiobook>? = null,
    val total: Int? = null,
    val page: Int? = null,
    @SerialName("page_size") val pageSize: Int? = null,
    @SerialName("total_pages") val totalPages: Int? = null,
)
