package tv.bayit.plus.core.model.zehani

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class MovieTagRequest(
    @SerialName("content_id") val contentId: String,
    @SerialName("profile_id") val profileId: String,
)
