package tv.bayit.plus.core.byoc.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class BYOCEnrichmentResult(
    @SerialName("content_id") val contentId: String,
    @SerialName("available_subtitle_languages") val availableSubtitleLanguages: List<String> = emptyList(),
    @SerialName("enrichment_status") val enrichmentStatus: String,
    @SerialName("subtitle_details") val subtitleDetails: Map<String, SubtitleDetail> = emptyMap(),
)

@Serializable
data class SubtitleDetail(
    val language: String = "",
    val status: String = "",
    val source: String? = null,
)
