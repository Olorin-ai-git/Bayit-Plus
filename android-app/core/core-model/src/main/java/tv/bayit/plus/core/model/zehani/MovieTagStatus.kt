package tv.bayit.plus.core.model.zehani

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class MovieTagStatus(
    @SerialName("content_id") val contentId: String,
    val status: String,
    val characters: List<InteractiveCharacter> = emptyList(),
    val error: String? = null,
)
