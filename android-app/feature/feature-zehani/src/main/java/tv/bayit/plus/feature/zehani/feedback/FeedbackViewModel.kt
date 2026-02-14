package tv.bayit.plus.feature.zehani.feedback

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
class FeedbackViewModel @Inject constructor(
    private val zehAniRepository: ZehAniRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _feedbackText = MutableStateFlow("")
    val feedbackText: StateFlow<String> = _feedbackText.asStateFlow()

    private val _rating = MutableStateFlow(0)
    val rating: StateFlow<Int> = _rating.asStateFlow()

    private val _uiState = MutableStateFlow<FeedbackUiState>(FeedbackUiState.Idle)
    val uiState: StateFlow<FeedbackUiState> = _uiState.asStateFlow()

    fun updateFeedbackText(text: String) {
        _feedbackText.value = text
    }

    fun updateRating(stars: Int) {
        _rating.value = stars.coerceIn(0, 5)
    }

    fun submitFeedback() {
        if (_feedbackText.value.isBlank()) {
            _uiState.value = FeedbackUiState.Error("Please enter your feedback")
            return
        }

        viewModelScope.launch {
            _uiState.value = FeedbackUiState.Submitting
            logger.debug("Submitting Zeh Ani feedback", mapOf("rating" to _rating.value.toString()))

            when (val result = zehAniRepository.submitFeedback(_feedbackText.value, _rating.value)) {
                is BayitResult.Success -> {
                    logger.info("Feedback submitted successfully")
                    _uiState.value = FeedbackUiState.Success
                    _feedbackText.value = ""
                    _rating.value = 0
                }
                is BayitResult.Error -> {
                    logger.error("Feedback submission failed", result.exception)
                    _uiState.value = FeedbackUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun resetToIdle() {
        _uiState.value = FeedbackUiState.Idle
    }
}

sealed interface FeedbackUiState {
    data object Idle : FeedbackUiState
    data object Submitting : FeedbackUiState
    data object Success : FeedbackUiState
    data class Error(val message: String) : FeedbackUiState
}
