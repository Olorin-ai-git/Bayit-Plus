package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Response from GET /api/v1/content/series/{series_id} */
@Serializable
data class SeriesDetail(
    val id: String,
    val title: String? = null,
    val description: String? = null,
    val thumbnail: String? = null,
    val backdrop: String? = null,
    val category: String? = null,
    val year: Int? = null,
    val rating: String? = null,
    val genre: String? = null,
    val cast: List<String>? = null,
    val director: String? = null,
    @SerialName("total_seasons") val totalSeasons: Int? = null,
    @SerialName("total_episodes") val totalEpisodes: Int? = null,
    @SerialName("trailer_url") val trailerUrl: String? = null,
    @SerialName("preview_url") val previewUrl: String? = null,
    @SerialName("tmdb_id") val tmdbId: String? = null,
    @SerialName("imdb_id") val imdbId: String? = null,
    @SerialName("available_subtitle_languages")
    val availableSubtitleLanguages: List<String>? = null,
    @SerialName("has_subtitles") val hasSubtitles: Boolean? = null,
    @SerialName("is_kids_content") val isKidsContent: Boolean? = null,
    @SerialName("age_rating") val ageRating: String? = null,
    val seasons: List<SeasonSummary>? = null,
    val related: List<RelatedItem>? = null,
)

/** Summary of a season within a series. */
@Serializable
data class SeasonSummary(
    @SerialName("season_number") val seasonNumber: Int,
    @SerialName("episode_count") val episodeCount: Int,
    @SerialName("first_episode_id") val firstEpisodeId: String? = null,
    @SerialName("first_episode_thumbnail") val firstEpisodeThumbnail: String? = null,
)

/** Response from GET /api/v1/content/series/{series_id}/season/{season_num}/episodes */
@Serializable
data class SeasonEpisodesResponse(
    @SerialName("series_id") val seriesId: String,
    @SerialName("season_number") val seasonNumber: Int,
    val episodes: List<EpisodeItem> = emptyList(),
)

/** An episode within a season. */
@Serializable
data class EpisodeItem(
    val id: String,
    val title: String? = null,
    val description: String? = null,
    val thumbnail: String? = null,
    @SerialName("episode_number") val episodeNumber: Int? = null,
    val duration: String? = null,
    @SerialName("preview_url") val previewUrl: String? = null,
    @SerialName("stream_url") val streamUrl: String? = null,
    @SerialName("direct_url") val directUrl: String? = null,
    @SerialName("is_transcoded") val isTranscoded: Boolean? = null,
)

/** Response from GET /api/v1/content/series */
@Serializable
data class SeriesListResponse(
    val items: List<ContentItem> = emptyList(),
    val total: Int,
    val page: Int,
    val limit: Int,
)
