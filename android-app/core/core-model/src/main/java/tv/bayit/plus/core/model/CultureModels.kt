package tv.bayit.plus.core.model

import kotlinx.serialization.Serializable

@Serializable
data class CultureContent(
    val id: String,
    val title: String,
    val description: String? = null,
    val thumbnailUrl: String? = null,
    val category: String? = null,
    val city: String? = null,
)
