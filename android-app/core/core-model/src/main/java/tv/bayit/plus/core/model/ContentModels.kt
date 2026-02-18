package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Localized label used by trending topics and city endpoints. */
@Serializable
data class LocalizedLabel(
    val he: String? = null,
    val en: String? = null,
    val es: String? = null,
)

/** Response from GET /api/v1/content/featured */
@Serializable
data class FeaturedResponse(
    val hero: HeroContent? = null,
    val spotlight: List<SpotlightItem> = emptyList(),
    val categories: List<ContentCategory> = emptyList(),
)

/** Hero content displayed at the top of the home screen. */
@Serializable
data class HeroContent(
    val id: String? = null,
    val title: String? = null,
    val description: String? = null,
    val backdrop: String? = null,
    val thumbnail: String? = null,
    val category: String? = null,
    val year: Int? = null,
    val duration: String? = null,
    val rating: FlexibleRating? = null,
)

/** Spotlight carousel item. */
@Serializable
data class SpotlightItem(
    val id: String,
    val title: String? = null,
    val description: String? = null,
    val backdrop: String? = null,
    val thumbnail: String? = null,
    val category: String? = null,
    val type: String? = null,
    val year: Int? = null,
    val duration: String? = null,
    val rating: FlexibleRating? = null,
    @SerialName("is_series") val isSeries: Boolean? = null,
    @SerialName("total_episodes") val totalEpisodes: Int? = null,
    @SerialName("available_subtitle_languages")
    val availableSubtitleLanguages: List<String>? = null,
    @SerialName("has_subtitles") val hasSubtitles: Boolean? = null,
)

/** A content category row (movies, series, podcasts, etc.). */
@Serializable
data class ContentCategory(
    val id: String,
    val name: String,
    @SerialName("name_key") val nameKey: String? = null,
    @SerialName("name_en") val nameEn: String? = null,
    @SerialName("name_es") val nameEs: String? = null,
    val items: List<ContentItem> = emptyList(),
)

/** A content item within a category row or search results. */
@Serializable
data class ContentItem(
    val id: String,
    val title: String? = null,
    val description: String? = null,
    val thumbnail: String? = null,
    val backdrop: String? = null,
    val duration: String? = null,
    val year: Int? = null,
    val category: String? = null,
    @SerialName("category_slug") val categorySlug: String? = null,
    @SerialName("category_name_key") val categoryNameKey: String? = null,
    @SerialName("category_name_en") val categoryNameEn: String? = null,
    @SerialName("category_name_es") val categoryNameEs: String? = null,
    val type: String? = null,
    @SerialName("is_series") val isSeries: Boolean? = null,
    @SerialName("total_episodes") val totalEpisodes: Int? = null,
    @SerialName("available_subtitle_languages")
    val availableSubtitleLanguages: List<String>? = null,
    @SerialName("has_subtitles") val hasSubtitles: Boolean? = null,
    val author: String? = null,
    val narrator: String? = null,
    @SerialName("is_collection_parent") val isCollectionParent: Boolean? = null,
    @SerialName("available_movies") val availableMovies: Int? = null,
    @SerialName("total_movies") val totalMovies: Int? = null,
)

/** Paginated response from GET /api/v1/content/all */
@Serializable
data class ContentListResponse(
    val items: List<ContentItem> = emptyList(),
    val total: Int,
    val page: Int,
    val limit: Int,
)

/** Response from GET /api/v1/content/{content_id} */
@Serializable
data class ContentDetail(
    val id: String,
    val title: String? = null,
    val description: String? = null,
    val thumbnail: String? = null,
    val backdrop: String? = null,
    val category: String? = null,
    val duration: String? = null,
    val year: Int? = null,
    val rating: FlexibleRating? = null,
    val genre: String? = null,
    val cast: List<String>? = null,
    val director: String? = null,
    @SerialName("is_series") val isSeries: Boolean? = null,
    val type: String? = null,
    @SerialName("available_subtitle_languages")
    val availableSubtitleLanguages: List<String>? = null,
    @SerialName("has_subtitles") val hasSubtitles: Boolean? = null,
    val related: List<RelatedItem>? = null,
    @SerialName("stream_url") val streamUrl: String? = null,
    @SerialName("direct_url") val directUrl: String? = null,
    @SerialName("stream_type") val streamType: String? = null,
    @SerialName("preview_url") val previewUrl: String? = null,
    @SerialName("trailer_url") val trailerUrl: String? = null,
    @SerialName("is_transcoded") val isTranscoded: Boolean? = null,
)

/** Related content item shown on detail pages. */
@Serializable
data class RelatedItem(
    val id: String,
    val title: String? = null,
    val thumbnail: String? = null,
    val duration: String? = null,
    val year: Int? = null,
    val type: String? = null,
)

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
) {
    /** Stable identifier derived from title for LazyColumn keys. */
    val id: String get() = title ?: titleEn ?: hashCode().toString()
    val type: String? get() = category
    val thumbnail: String? get() = null
}

/** Generic section content item (used for youngsters, city content, etc.). */
@Serializable
data class SectionContentItem(
    val id: String,
    val title: String? = null,
    val thumbnail: String? = null,
    val duration: String? = null,
    val type: String? = null,
)

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
