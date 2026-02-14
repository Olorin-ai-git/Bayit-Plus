package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Response from GET /api/v1/favorites */
@Serializable
data class FavoritesResponse(
    val items: List<FavoriteItem> = emptyList(),
    val total: Int? = null,
    val page: Int? = null,
    val pages: Int? = null,
)

/** A favorited content item. */
@Serializable
data class FavoriteItem(
    val id: String,
    @SerialName("content_id") val contentId: String? = null,
    val title: String? = null,
    val thumbnail: String? = null,
    val type: String? = null,
    val duration: String? = null,
    val year: Int? = null,
    @SerialName("added_at") val addedAt: String? = null,
)

/** Response from POST /api/v1/favorites/toggle */
@Serializable
data class FavoriteToggleResponse(
    @SerialName("is_favorite") val isFavorite: Boolean? = null,
    val message: String? = null,
)

/** Response from GET /api/v1/favorites/check/{content_id} */
@Serializable
data class FavoriteCheckResponse(
    @SerialName("is_favorite") val isFavorite: Boolean? = null,
)

/** Request body for POST /api/v1/favorites/toggle */
@Serializable
data class FavoriteToggleRequest(
    @SerialName("content_id") val contentId: String,
    @SerialName("content_type") val contentType: String? = null,
)
