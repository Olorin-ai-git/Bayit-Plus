package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Response from GET /api/v1/playlist */
@Serializable
data class PlaylistResponse(
    val items: List<PlaylistItem> = emptyList(),
    @SerialName("item_count") val itemCount: Int? = null,
    val message: String? = null,
)

/** A playlist content item returned by the backend. */
@Serializable
data class PlaylistItem(
    @SerialName("content_id") val contentId: String,
    @SerialName("content_type") val contentType: String? = null,
    val title: String? = null,
    val thumbnail: String? = null,
    val duration: String? = null,
    val position: Int? = null,
    @SerialName("added_at") val addedAt: String? = null,
)

/** Response from POST /api/v1/playlist/toggle */
@Serializable
data class PlaylistToggleResponse(
    @SerialName("in_playlist") val inPlaylist: Boolean? = null,
    val message: String? = null,
)

/** Response from GET /api/v1/playlist/check/{content_id} */
@Serializable
data class PlaylistCheckResponse(
    @SerialName("in_playlist") val inPlaylist: Boolean? = null,
)

/** Request body for POST /api/v1/playlist/toggle/{content_id} */
@Serializable
data class PlaylistToggleRequest(
    @SerialName("content_type") val contentType: String? = null,
)

/** Request body for PUT /api/v1/playlist/items/reorder */
@Serializable
data class PlaylistReorderRequest(
    @SerialName("content_id") val contentId: String,
    @SerialName("new_position") val newPosition: Int,
)
