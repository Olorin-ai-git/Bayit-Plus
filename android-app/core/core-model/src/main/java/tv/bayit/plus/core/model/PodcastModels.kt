package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
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
    @SerialName("culture_id") val cultureId: String? = null,
    @SerialName("episode_count") val episodeCount: Int? = null,
    @SerialName("latest_episode") val latestEpisode: String? = null,
    @SerialName("available_languages") val availableLanguages: List<String>? = null,
    @SerialName("is_subscribed") val isSubscribed: Boolean? = null,
    @SerialName("is_user_added") val isUserAdded: Boolean? = null,
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
    @SerialName("episode_count") val episodeCount: Int? = null,
    val episodes: List<PodcastEpisodeItem>? = null,
    @SerialName("latest_episode") val latestEpisode: PodcastLatestEpisode? = null,
)

/** Latest episode reference. */
@Serializable
data class PodcastLatestEpisode(
    @SerialName("audio_url") val audioUrl: String? = null,
)

/** A podcast episode. */
@Serializable
data class PodcastEpisodeItem(
    val id: String,
    val title: String? = null,
    val description: String? = null,
    @SerialName("audio_url") val audioUrl: String? = null,
    val duration: String? = null,
    @SerialName("episode_number") val episodeNumber: Int? = null,
    @SerialName("season_number") val seasonNumber: Int? = null,
    @SerialName("published_at") val publishedAt: String? = null,
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
    @SerialName("episodes_added") val episodesAdded: Int? = null,
)

/** Response from POST /api/v1/podcasts/refresh */
@Serializable
data class PodcastRefreshResponse(
    val status: String,
    val message: String? = null,
)
