package tv.bayit.plus.core.byoc.models

import kotlinx.serialization.Serializable

@Serializable
data class BYOCChannel(
    val id: String,
    val name: String,
    val logoUrl: String?,
    val group: String,
    val streamUrl: String,
    val sourceId: String,
    val attributes: Map<String, String> = emptyMap(),
)
