package tv.bayit.plus.feature.podcasts.detail

import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.PodcastDetail
import tv.bayit.plus.core.model.PodcastEpisodeItem

internal fun PodcastDetailViewModel.loadPodcastDetail() {
    viewModelScope.launch {
        logger.debug("Loading podcast detail", mapOf("showId" to showId))

        when (val result = podcastRepository.getPodcast(showId)) {
            is BayitResult.Success -> {
                val detail = result.data as? PodcastDetail
                if (detail == null) {
                    _uiState.value = PodcastDetailUiState.Error(stringProvider.string("error.podcasts.notFound"))
                    return@launch
                }
                logger.info(
                    "Podcast detail loaded",
                    mapOf("showId" to showId, "title" to detail.title.orEmpty()),
                )
                _uiState.value = PodcastDetailUiState.Success(
                    showId = detail.id,
                    title = detail.title.orEmpty(),
                    author = detail.author,
                    description = detail.description,
                    cover = detail.cover,
                    category = detail.category,
                    episodeCount = detail.episodeCount,
                    episodes = detail.episodes.orEmpty(),
                    isLoadingEpisodes = detail.episodes.isNullOrEmpty(),
                )
                if (detail.episodes.isNullOrEmpty()) {
                    loadEpisodes()
                }
            }
            is BayitResult.Error -> {
                logger.error("Podcast detail load failed", result.exception, mapOf("showId" to showId))
                _uiState.value = PodcastDetailUiState.Error(
                    result.message ?: result.exception.message.orEmpty(),
                )
            }
            is BayitResult.Loading -> Unit
        }
    }
}

private fun PodcastDetailViewModel.loadEpisodes() {
    viewModelScope.launch {
        logger.debug("Loading podcast episodes", mapOf("showId" to showId))

        when (val result = podcastRepository.getEpisodes(showId)) {
            is BayitResult.Success -> {
                @Suppress("UNCHECKED_CAST")
                val episodes = (result.data as List<Any>).filterIsInstance<PodcastEpisodeItem>()
                logger.info(
                    "Podcast episodes loaded",
                    mapOf("showId" to showId, "episodeCount" to episodes.size.toString()),
                )
                val current = _uiState.value as? PodcastDetailUiState.Success ?: return@launch
                _uiState.value = current.copy(episodes = episodes, isLoadingEpisodes = false)
            }
            is BayitResult.Error -> {
                logger.error("Podcast episodes load failed", result.exception, mapOf("showId" to showId))
                val current = _uiState.value as? PodcastDetailUiState.Success ?: return@launch
                _uiState.value = current.copy(isLoadingEpisodes = false)
            }
            is BayitResult.Loading -> Unit
        }
    }
}
