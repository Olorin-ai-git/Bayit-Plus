package tv.bayit.plus.core.byoc.models

import kotlinx.serialization.Serializable

@Serializable
data class BYOCContentItem(
    val id: String,
    val title: String,
    val description: String?,
    val thumbnailUrl: String?,
    val backdropUrl: String?,
    val duration: Int?,
    val year: Int?,
    val genre: String?,
    val sourceType: BYOCSourceType,
    val sourceId: String,
    val streamUrl: String?,
    val contentType: BYOCContentType,
)

enum class BYOCContentType {
    MOVIE, SERIES, EPISODE, VIDEO, LIVE_CHANNEL
}
