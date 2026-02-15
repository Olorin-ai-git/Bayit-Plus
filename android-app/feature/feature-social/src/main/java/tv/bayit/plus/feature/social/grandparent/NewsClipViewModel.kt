package tv.bayit.plus.feature.social.grandparent

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.NewsRepository
import javax.inject.Inject

@HiltViewModel
class NewsClipViewModel @Inject constructor(
    private val newsRepository: NewsRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<NewsClipUiState>(NewsClipUiState.Loading)
    val uiState: StateFlow<NewsClipUiState> = _uiState.asStateFlow()

    init {
        loadNewsClips()
    }

    fun refresh() {
        val current = _uiState.value
        if (current is NewsClipUiState.Success) {
            _uiState.value = current.copy(isRefreshing = true)
        }
        loadNewsClips()
    }

    fun shareClip(clipId: String) {
        logger.info("Sharing news clip", mapOf("clipId" to clipId))
    }

    fun retry() {
        _uiState.value = NewsClipUiState.Loading
        loadNewsClips()
    }

    private fun loadNewsClips() {
        viewModelScope.launch {
            logger.debug("Loading news clips for Grandparent Bridge")

            when (val result = newsRepository.getNewsHeadlines()) {
                is BayitResult.Success -> {
                    val clips = result.data.mapIndexed { index, item ->
                        NewsClipItem(
                            id = "clip_$index",
                            title = "News Clip ${index + 1}",
                            thumbnailUrl = "https://placeholder.com/150",
                            duration = "2:30",
                            source = "Bayit+ News",
                            publishedAt = "2 hours ago",
                        )
                    }
                    logger.info("News clips loaded", mapOf("count" to clips.size.toString()))

                    if (clips.isEmpty()) {
                        _uiState.value = NewsClipUiState.Empty
                    } else {
                        _uiState.value = NewsClipUiState.Success(clips = clips, isRefreshing = false)
                    }
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load news clips", result.exception)
                    _uiState.value = NewsClipUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

data class NewsClipItem(
    val id: String,
    val title: String,
    val thumbnailUrl: String,
    val duration: String,
    val source: String,
    val publishedAt: String,
)

sealed interface NewsClipUiState {
    data object Loading : NewsClipUiState
    data class Success(val clips: List<NewsClipItem>, val isRefreshing: Boolean = false) : NewsClipUiState
    data object Empty : NewsClipUiState
    data class Error(val message: String) : NewsClipUiState
}
