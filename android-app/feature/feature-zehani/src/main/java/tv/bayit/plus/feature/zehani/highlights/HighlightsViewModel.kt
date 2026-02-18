package tv.bayit.plus.feature.zehani.highlights

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ZehAniRepository
import tv.bayit.plus.core.model.zehani.HighlightReel
import javax.inject.Inject

@HiltViewModel
class HighlightsViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val zehAniRepository: ZehAniRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val profileId: String = savedStateHandle["profileId"] ?: "current"

    private val _uiState = MutableStateFlow<HighlightsUiState>(HighlightsUiState.Loading)
    val uiState: StateFlow<HighlightsUiState> = _uiState.asStateFlow()

    private val _shareEvents = MutableSharedFlow<String>()
    val shareEvents: SharedFlow<String> = _shareEvents.asSharedFlow()

    private val _sendResult = MutableSharedFlow<SendResult>()
    val sendResult: SharedFlow<SendResult> = _sendResult.asSharedFlow()

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

    fun generateReel() {
        viewModelScope.launch {
            logger.debug("Generating highlight reel", mapOf("profileId" to profileId))
            when (val result = zehAniRepository.generateHighlightReel("default", profileId)) {
                is BayitResult.Success -> {
                    logger.info("Highlight reel generation started", mapOf("status" to result.data.status))
                    loadHighlights()
                }
                is BayitResult.Error -> logger.error("Highlight reel generation failed", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun shareReel(reel: HighlightReel) {
        val token = reel.shareToken ?: return
        viewModelScope.launch {
            logger.info("Sending reel to family contacts", mapOf("reelId" to reel.id))
            when (val result = zehAniRepository.sendHighlightReelToContacts(reel.id)) {
                is BayitResult.Success -> {
                    logger.info("Reel sent to contacts", mapOf("count" to result.data.toString()))
                    _sendResult.emit(SendResult.Success(result.data))
                }
                is BayitResult.Error -> {
                    logger.error("Reel send failed, falling back to share sheet", result.exception)
                    _shareEvents.emit(token)
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
            logger.debug("Loading highlight reels", mapOf("profileId" to profileId))
            when (val result = zehAniRepository.listHighlightReels(profileId)) {
                is BayitResult.Success -> {
                    val reels = result.data
                    logger.info("Highlights loaded", mapOf("count" to reels.size.toString()))
                    _uiState.value = HighlightsUiState.Success(highlights = reels, isRefreshing = false)
                }
                is BayitResult.Error -> {
                    logger.error("Highlights load failed", result.exception)
                    _uiState.value = HighlightsUiState.Error(result.message ?: result.exception.message.orEmpty())
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface HighlightsUiState {
    data object Loading : HighlightsUiState
    data class Success(val highlights: List<HighlightReel>, val isRefreshing: Boolean) : HighlightsUiState
    data class Error(val message: String) : HighlightsUiState
}

sealed interface SendResult {
    data class Success(val sentCount: Int) : SendResult
}
