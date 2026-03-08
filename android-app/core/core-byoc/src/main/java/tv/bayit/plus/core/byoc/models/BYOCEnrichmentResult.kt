package tv.bayit.plus.core.byoc.models

import kotlinx.serialization.Serializable

@Serializable
data class BYOCEnrichmentResult(
    val contentId: String,
    val availableSubtitleLanguages: List<String> = emptyList(),
    val enrichmentStatus: String,
    val subtitleDetails: Map<String, SubtitleDetail> = emptyMap(),
)

@Serializable
data class SubtitleDetail(
    val source: String,
    val cueCount: Int,
)
