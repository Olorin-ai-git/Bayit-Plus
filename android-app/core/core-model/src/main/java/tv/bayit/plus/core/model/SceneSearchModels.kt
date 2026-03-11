package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Single scene match from POST /api/v1/search/scene. */
@Serializable
data class SceneSearchResult(
    @SerialName("content_id") val contentId: String,
    @SerialName("content_type") val contentType: String,
    val title: String,
    @SerialName("title_en") val titleEn: String? = null,
    @SerialName("series_id") val seriesId: String? = null,
    @SerialName("series_title") val seriesTitle: String? = null,
    @SerialName("episode_info") val episodeInfo: String? = null,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    @SerialName("matched_text") val matchedText: String,
    @SerialName("context_text") val contextText: String? = null,
    @SerialName("relevance_score") val relevanceScore: Double,
    @SerialName("timestamp_seconds") val timestampSeconds: Double,
    @SerialName("timestamp_formatted") val timestampFormatted: String,
    @SerialName("deep_link") val deepLink: String,
) {
    /** Timestamp in milliseconds for player seek operations. */
    val timestampMs: Long
        get() = (timestampSeconds * MILLIS_PER_SECOND).toLong()
}

private const val MILLIS_PER_SECOND = 1000.0

/** Request body for POST /api/v1/search/scene. */
@Serializable
data class SceneSearchRequest(
    val query: String,
    @SerialName("content_id") val contentId: String? = null,
    @SerialName("series_id") val seriesId: String? = null,
    val language: String,
    val limit: Int,
    @SerialName("min_score") val minScore: Double,
)

/** Wrapper response from POST /api/v1/search/scene. */
@Serializable
data class SceneSearchResponse(
    val query: String,
    val results: List<SceneSearchResult>,
    @SerialName("total_results") val totalResults: Int,
)
