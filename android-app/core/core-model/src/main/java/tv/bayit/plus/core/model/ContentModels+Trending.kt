package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Trending content item (What's Hot in Israel). */
@Serializable
data class CultureTrendingItem(
    val title: String? = null,
    @SerialName("title_en") val titleEn: String? = null,
    val category: String? = null,
    @SerialName("category_label") val categoryLabel: LocalizedLabel? = null,
    val sentiment: String? = null,
    val importance: Int? = null,
    val summary: String? = null,
    val keywords: List<String> = emptyList(),
    val url: String? = null,
    @SerialName("source_name") val sourceName: String? = null,
    @SerialName("relevance_score") val relevanceScore: Double? = null,
) {
    /** Stable identifier derived from title for LazyColumn keys. */
    val id: String get() = title ?: titleEn ?: hashCode().toString()
    val type: String? get() = category
    val thumbnail: String? get() = null
}
