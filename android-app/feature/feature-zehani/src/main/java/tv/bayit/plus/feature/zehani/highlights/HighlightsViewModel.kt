package tv.bayit.plus.feature.zehani.highlights

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ZehAniRepository
import javax.inject.Inject

@HiltViewModel
class HighlightsViewModel @Inject constructor(
    private val zehAniRepository: ZehAniRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<HighlightsUiState>(HighlightsUiState.Loading)
    val uiState: StateFlow<HighlightsUiState> = _uiState.asStateFlow()

    init {
        loadHighlights()
    }

    fun refresh() {
        val current = _uiState.value
        if (current is HighlightsUiState.Success) {
            _uiState.value = current.copy(isRefreshing = true)
        }
        loadHighlights()
    }

    fun shareHighlight(highlightId: String) {
        viewModelScope.launch {
            logger.debug("Sharing highlight", mapOf("highlightId" to highlightId))
            when (val result = zehAniRepository.shareIdentification(highlightId)) {
                is BayitResult.Success -> {
                    logger.info("Highlight shared", mapOf("highlightId" to highlightId))
                }
                is BayitResult.Error -> {
                    logger.error("Share highlight failed", result.exception)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = HighlightsUiState.Loading
        loadHighlights()
    }

    private fun loadHighlights() {
        viewModelScope.launch {
            logger.debug("Loading Zeh Ani highlights")
            when (val result = zehAniRepository.getIdentificationHistory()) {
                is BayitResult.Success -> {
                    val highlights = result.data
                    logger.info("Highlights loaded", mapOf("count" to highlights.size.toString()))
                    _uiState.value = HighlightsUiState.Success(
                        highlights = highlights,
                        isRefreshing = false,
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Highlights load failed", result.exception)
                    _uiState.value = HighlightsUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface HighlightsUiState {
    data object Loading : HighlightsUiState

    data class Success(
        val highlights: List<Any>,
        val isRefreshing: Boolean,
    ) : HighlightsUiState

    data class Error(val message: String) : HighlightsUiState
}
