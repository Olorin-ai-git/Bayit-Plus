package tv.bayit.plus.core.model

import kotlinx.serialization.Serializable

/** Response from GET /api/v1/podcasts */
@Serializable
data class PodcastsResponse(
    val shows: List<PodcastShow> = emptyList(),
    val categories: List<PodcastCategory>? = null,
    val total: Int,
    val page: Int,
    val pages: Int,
)

/** A podcast show. */
@Serializable
data class PodcastShow(
    val id: String,
    val title: String? = null,
    val author: String? = null,
    val cover: String? = null,
    val category: String? = null,
    val cultureId: String? = null,
    val episodeCount: Int? = null,
    val latestEpisode: String? = null,
    val availableLanguages: List<String>? = null,
    val isSubscribed: Boolean? = null,
    val isUserAdded: Boolean? = null,
)

/** A podcast category. */
@Serializable
data class PodcastCategory(
    val id: String,
    val name: String,
)

/** Response from GET /api/v1/podcasts/{show_id} */
@Serializable
data class PodcastDetail(
    val id: String,
    val title: String? = null,
    val description: String? = null,
    val author: String? = null,
    val cover: String? = null,
    val category: String? = null,
    val website: String? = null,
    val episodeCount: Int? = null,
    val episodes: List<PodcastEpisodeItem>? = null,
    val latestEpisode: PodcastLatestEpisode? = null,
)

/** Latest episode reference. */
@Serializable
data class PodcastLatestEpisode(
    val audioUrl: String? = null,
)

/** A podcast episode. */
@Serializable
data class PodcastEpisodeItem(
    val id: String,
    val title: String? = null,
    val description: String? = null,
    val audioUrl: String? = null,
    val duration: String? = null,
    val episodeNumber: Int? = null,
    val seasonNumber: Int? = null,
    val publishedAt: String? = null,
    val thumbnail: String? = null,
)

/** Response from GET /api/v1/podcasts/{show_id}/episodes */
@Serializable
data class PodcastEpisodesResponse(
    val episodes: List<PodcastEpisodeItem> = emptyList(),
    val total: Int,
    val page: Int,
    val pages: Int,
)

/** Response from GET /api/v1/podcasts/categories */
@Serializable
data class PodcastCategoriesResponse(
    val categories: List<PodcastCategory> = emptyList(),
    val total: Int,
)

/** Response from POST /api/v1/podcasts/{show_id}/sync */
@Serializable
data class PodcastSyncResponse(
    val status: String,
    val message: String? = null,
    val episodesAdded: Int? = null,
)

/** Response from POST /api/v1/podcasts/refresh */
@Serializable
data class PodcastRefreshResponse(
    val status: String,
    val message: String? = null,
)
