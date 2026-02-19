package tv.bayit.plus.core.model.zehani

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class InteractableMovie(
    @SerialName("content_id") val contentId: String,
    val title: String,
    @SerialName("poster_url") val posterUrl: String? = null,
    @SerialName("character_count") val characterCount: Int = 0,
    val status: String = "ready",
)
