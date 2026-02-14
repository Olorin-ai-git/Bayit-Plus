package tv.bayit.plus.feature.vod.trending

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.TrendingRepository
import tv.bayit.plus.core.model.ContentItem
import javax.inject.Inject

private const val DEFAULT_TIME_WINDOW = "day"

@HiltViewModel
class TrendingViewModel @Inject constructor(
    private val trendingRepository: TrendingRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<TrendingUiState>(TrendingUiState.Loading)
    val uiState: StateFlow<TrendingUiState> = _uiState.asStateFlow()

    init {
        loadContent()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is TrendingUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadContent()
    }

    private fun loadContent() {
        viewModelScope.launch {
            logger.debug("Loading trending content")

            when (val trendingResult = trendingRepository.getTrending(DEFAULT_TIME_WINDOW)) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val trendingTopics = trendingResult.data as List<Any>

                    when (val mostWatchedResult = trendingRepository.getMostWatched()) {
                        is BayitResult.Success -> {
                            @Suppress("UNCHECKED_CAST")
                            val mostWatched = (mostWatchedResult.data as List<Any>)
                                .filterIsInstance<ContentItem>()

                            logger.info(
                                "Trending content loaded",
                                mapOf(
                                    "topicCount" to trendingTopics.size.toString(),
                                    "mostWatchedCount" to mostWatched.size.toString(),
                                ),
                            )

                            _uiState.value = TrendingUiState.Success(
                                topics = trendingTopics,
                                mostWatched = mostWatched,
                                isRefreshing = false,
                            )
                        }
                        is BayitResult.Error -> {
                            _uiState.value = TrendingUiState.Success(
                                topics = trendingTopics,
                                mostWatched = emptyList(),
                                isRefreshing = false,
                            )
                        }
                        is BayitResult.Loading -> Unit
                    }
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Trending content load failed",
                        trendingResult.exception,
                        mapOf("errorMessage" to trendingResult.message.orEmpty()),
                    )
                    _uiState.value = TrendingUiState.Error(
                        message = trendingResult.message
                            ?: trendingResult.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface TrendingUiState {
    data object Loading : TrendingUiState

    data class Success(
        val topics: List<Any>,
        val mostWatched: List<ContentItem>,
        val isRefreshing: Boolean = false,
    ) : TrendingUiState

    data class Error(
        val message: String,
    ) : TrendingUiState
}
