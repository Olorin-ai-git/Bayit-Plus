package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Item from GET /api/v1/history or /api/v1/history/continue */
@Serializable
data class WatchHistoryItem(
    val id: String,
    val title: String? = null,
    val thumbnail: String? = null,
    val duration: Double? = null,
    val type: String? = null,
    val progress: Double? = null,
    val position: Double? = null,
    val completed: Boolean? = null,
    @SerialName("last_watched") val lastWatched: String? = null,
)

/** Response from GET /api/v1/history */
@Serializable
data class WatchHistoryResponse(
    val items: List<WatchHistoryItem> = emptyList(),
    val total: Int? = null,
    val page: Int? = null,
    val pages: Int? = null,
)

/** Response from GET /api/v1/history/continue */
@Serializable
data class ContinueWatchingResponse(
    val items: List<WatchHistoryItem> = emptyList(),
)

/** Request body for POST /api/v1/history/progress */
@Serializable
data class WatchProgressRequest(
    @SerialName("content_id") val contentId: String,
    @SerialName("content_type") val contentType: String,
    val position: Double,
    val duration: Double,
)

/** Response from POST /api/v1/history/progress */
@Serializable
data class WatchProgressResponse(
    val message: String? = null,
    val progress: Double? = null,
    val completed: Boolean? = null,
)

/** Response from PATCH /api/v1/history/{id}/restart */
@Serializable
data class RestartResponse(
    val message: String? = null,
    val position: Double? = null,
    val progress: Double? = null,
)
