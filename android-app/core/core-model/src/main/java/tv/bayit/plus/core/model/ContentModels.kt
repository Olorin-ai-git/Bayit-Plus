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
    @SerialName("content_type") val contentType: String? = null,
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

private val SERIES_KEYWORDS = listOf("series", "סדרות")

/**
 * Resolves the navigation content type from a [ContentItem].
 *
 * Priority: contentType (search API) > type > category name fallback.
 * Matches iOS SearchResultsGridView.routeForResult + CategoryRow.navigateToItem.
 */
fun resolveContentType(item: ContentItem): String {
    val explicit = item.contentType?.lowercase()
    if (!explicit.isNullOrEmpty() && explicit != "vod") return explicit
    return resolveFromFields(type = item.type, category = item.category, isCollectionParent = item.isCollectionParent)
}

fun resolveContentType(item: SpotlightItem): String =
    resolveFromFields(type = item.type, category = item.category, isCollectionParent = null)

private fun resolveFromFields(type: String?, category: String?, isCollectionParent: Boolean?): String {
    val ct = type?.lowercase() ?: ""
    if (ct.isNotEmpty() && ct != "vod") return ct
    val cat = category?.lowercase() ?: ""
    if (SERIES_KEYWORDS.any { cat.contains(it) }) return "series"
    if (isCollectionParent == true) return "collection"
    if (cat.contains("podcast")) return "podcast"
    if (cat.contains("audiobook")) return "audiobook"
    if (ct == "vod" || cat.contains("movie") || cat.contains("film")) return "movie"
    return ct.ifEmpty { "movie" }
}

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
    @SerialName("trailer_stream_url") val trailerStreamUrl: String? = null,
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

// CultureTrendingItem is in ContentModels+Trending.kt

/** Generic section content item (used for youngsters, city content, etc.). */
@Serializable
data class SectionContentItem(
    val id: String,
    val title: String? = null,
    val thumbnail: String? = null,
    val duration: String? = null,
    val type: String? = null,
)

// City-specific models are in ContentModels+City.kt
