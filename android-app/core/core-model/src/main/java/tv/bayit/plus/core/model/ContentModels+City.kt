package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Response from location-based content endpoints (Israelis in City). */
@Serializable
data class IsraelisInCityResponse(
    val content: LocationContent? = null,
    val coverage: String? = null,
)

/** Response from Israeli businesses endpoint. */
@Serializable
data class IsraeliBusinessesResponse(
    val content: LocationContent? = null,
    val coverage: String? = null,
)

/** Location-based content container. */
@Serializable
data class LocationContent(
    @SerialName("news_articles") val newsArticles: List<SectionContentItem>? = null,
    @SerialName("community_events") val communityEvents: List<SectionContentItem>? = null,
)

/** Response from city-specific content endpoints (Jerusalem, Tel Aviv). */
@Serializable
data class CityContentResponse(
    val featured: List<CityFeaturedItem> = emptyList(),
    @SerialName("kotel_live") val kotelLive: CityWebcam? = null,
    @SerialName("beach_webcam") val beachWebcam: CityWebcam? = null,
    @SerialName("upcoming_events") val upcomingEvents: List<CityFeaturedItem> = emptyList(),
    @SerialName("last_updated") val lastUpdated: String? = null,
) {
    /** Flattened items for UI display. */
    val items: List<SectionContentItem>
        get() = featured.map { it.toSectionContentItem() }
}

/** A featured item from a city endpoint (Jerusalem/Tel Aviv). */
@Serializable
data class CityFeaturedItem(
    val id: String,
    val title: String? = null,
    @SerialName("title_he") val titleHe: String? = null,
    @SerialName("title_en") val titleEn: String? = null,
    val url: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    val category: String? = null,
    @SerialName("category_label") val categoryLabel: LocalizedLabel? = null,
    val summary: String? = null,
    @SerialName("summary_he") val summaryHe: String? = null,
    @SerialName("summary_en") val summaryEn: String? = null,
    @SerialName("source_name") val sourceName: String? = null,
    @SerialName("published_at") val publishedAt: String? = null,
    @SerialName("relevance_score") val relevanceScore: Double? = null,
    val tags: List<String> = emptyList(),
) {
    fun toSectionContentItem(): SectionContentItem = SectionContentItem(
        id = id,
        title = titleHe ?: title ?: titleEn,
        thumbnail = imageUrl,
        type = category,
    )
}

/** Webcam / live stream link within city responses. */
@Serializable
data class CityWebcam(
    val name: String? = null,
    @SerialName("name_he") val nameHe: String? = null,
    val url: String? = null,
    val icon: String? = null,
)
