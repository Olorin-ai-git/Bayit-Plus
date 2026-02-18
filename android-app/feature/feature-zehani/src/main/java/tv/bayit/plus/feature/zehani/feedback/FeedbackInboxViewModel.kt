package tv.bayit.plus.feature.zehani.feedback

import androidx.lifecycle.SavedStateHandle
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
import tv.bayit.plus.core.model.zehani.FeedbackItem
import javax.inject.Inject

@HiltViewModel
class FeedbackInboxViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val zehAniRepository: ZehAniRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val profileId: String = savedStateHandle["profileId"] ?: "current"

    private val _uiState = MutableStateFlow<FeedbackInboxUiState>(FeedbackInboxUiState.Loading)
    val uiState: StateFlow<FeedbackInboxUiState> = _uiState.asStateFlow()

    private val _playingId = MutableStateFlow<String?>(null)
    val playingId: StateFlow<String?> = _playingId.asStateFlow()

    init {
        loadFeedback()
    }

    fun refresh() {
        loadFeedback()
    }

    fun toggleAudio(item: FeedbackItem) {
        _playingId.value = if (_playingId.value == item.id) null else item.id
        logger.debug("Audio playback toggled", mapOf("feedbackId" to item.id))
    }

    fun stopAudio() {
        _playingId.value = null
    }

    private fun loadFeedback() {
        viewModelScope.launch {
            logger.debug("Loading feedback inbox", mapOf("profileId" to profileId))
            when (val result = zehAniRepository.getFeedback(profileId)) {
                is BayitResult.Success -> {
                    logger.info("Feedback inbox loaded", mapOf("count" to result.data.size.toString()))
                    _uiState.value = FeedbackInboxUiState.Success(items = result.data)
                }
                is BayitResult.Error -> {
                    logger.error("Feedback inbox load failed", result.exception)
                    _uiState.value = FeedbackInboxUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface FeedbackInboxUiState {
    data object Loading : FeedbackInboxUiState
    data class Success(val items: List<FeedbackItem>) : FeedbackInboxUiState
    data class Error(val message: String) : FeedbackInboxUiState
}
