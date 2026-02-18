package tv.bayit.plus.feature.podcasts.detail

import tv.bayit.plus.core.model.PodcastEpisodeItem

sealed interface PodcastDetailUiState {
    data object Loading : PodcastDetailUiState

    data class Success(
        val showId: String,
        val title: String,
        val author: String?,
        val description: String?,
        val cover: String?,
        val category: String?,
        val episodeCount: Int?,
        val episodes: List<PodcastEpisodeItem>,
        val isLoadingEpisodes: Boolean,
        val isRefreshing: Boolean = false,
    ) : PodcastDetailUiState

    data class Error(val message: String) : PodcastDetailUiState
}
