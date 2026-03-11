package tv.bayit.plus.feature.player.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.SceneSearchRepository
import tv.bayit.plus.core.model.SceneSearchResult
import javax.inject.Inject

@HiltViewModel
class SceneSearchViewModel @Inject constructor(
    private val sceneSearchRepository: SceneSearchRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState =
        MutableStateFlow<SceneSearchUiState>(SceneSearchUiState.Idle)
    val uiState: StateFlow<SceneSearchUiState> = _uiState.asStateFlow()

    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    private var searchJob: Job? = null
    private var currentChannelId: String? = null

    fun setChannelId(channelId: String) {
        currentChannelId = channelId
    }

    fun onQueryChanged(newQuery: String) {
        _query.value = newQuery
        searchJob?.cancel()

        if (newQuery.length < MIN_QUERY_LENGTH) {
            _uiState.value = SceneSearchUiState.Idle
            return
        }

        searchJob = viewModelScope.launch {
            delay(DEBOUNCE_DELAY_MS)
            executeSearch(newQuery)
        }
    }

    private suspend fun executeSearch(searchQuery: String) {
        val channelId = currentChannelId ?: run {
            logger.warning("Scene search attempted without channelId")
            _uiState.value = SceneSearchUiState.Error(
                "No content selected for search",
            )
            return
        }

        _uiState.value = SceneSearchUiState.Loading

        logger.debug(
            "Searching scenes",
            mapOf("channelId" to channelId, "query" to searchQuery),
        )

        when (val result = sceneSearchRepository.searchScenes(
            channelId = channelId,
            query = searchQuery,
        )) {
            is BayitResult.Success -> {
                _uiState.value = SceneSearchUiState.Results(result.data)
                logger.info(
                    "Scene search completed",
                    mapOf(
                        "channelId" to channelId,
                        "resultCount" to result.data.size.toString(),
                    ),
                )
            }
            is BayitResult.Error -> {
                logger.error(
                    "Scene search failed",
                    result.exception,
                    mapOf("channelId" to channelId),
                )
                _uiState.value = SceneSearchUiState.Error(
                    result.message ?: result.exception.message.orEmpty(),
                )
            }
            is BayitResult.Loading -> Unit
        }
    }

    fun clearSearch() {
        searchJob?.cancel()
        _query.value = ""
        _uiState.value = SceneSearchUiState.Idle
    }
}

sealed interface SceneSearchUiState {
    data object Idle : SceneSearchUiState
    data object Loading : SceneSearchUiState
    data class Results(val items: List<SceneSearchResult>) : SceneSearchUiState
    data class Error(val message: String) : SceneSearchUiState
}

private const val DEBOUNCE_DELAY_MS = 400L
private const val MIN_QUERY_LENGTH = 2
