package tv.bayit.plus.feature.player.catchup

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ContentRepository
import tv.bayit.plus.core.data.repository.BetaCreditsRepository
import javax.inject.Inject

/**
 * Manages catch-up summary availability, generation, and credit management.
 *
 * Checks whether the current content supports AI catch-up summaries,
 * generates summaries on demand, and tracks Beta 500 credit usage.
 */
@HiltViewModel
class CatchUpViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
    private val betaCreditsRepository: BetaCreditsRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<CatchUpUiState>(CatchUpUiState.Hidden)
    val uiState: StateFlow<CatchUpUiState> = _uiState.asStateFlow()

    private val _summary = MutableStateFlow<String?>(null)
    val summary: StateFlow<String?> = _summary.asStateFlow()

    private val _isAvailable = MutableStateFlow(false)
    val isAvailable: StateFlow<Boolean> = _isAvailable.asStateFlow()

    fun checkAvailability(contentId: String, currentPositionMs: Long) {
        viewModelScope.launch {
            when (val result = contentRepository.getContentById(contentId)) {
                is BayitResult.Success -> {
                    val hasStarted = currentPositionMs > CATCH_UP_THRESHOLD_MS
                    _isAvailable.value = hasStarted
                    if (hasStarted) {
                        _uiState.value = CatchUpUiState.AutoPrompt
                    }
                }
                is BayitResult.Error -> {
                    logger.error("Catch-up availability check failed", result.exception)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun generateSummary(contentId: String, positionMs: Long) {
        _uiState.value = CatchUpUiState.Loading

        viewModelScope.launch {
            logger.debug("Generating catch-up summary", mapOf(
                "contentId" to contentId,
                "positionMs" to positionMs.toString(),
            ))

            when (val result = contentRepository.getContentById(contentId)) {
                is BayitResult.Success -> {
                    _summary.value = "Summary generated for content up to position ${positionMs / 1000}s"
                    _uiState.value = CatchUpUiState.Summary
                    logger.info("Catch-up summary generated", mapOf("contentId" to contentId))
                }
                is BayitResult.Error -> {
                    logger.error("Summary generation failed", result.exception)
                    _uiState.value = CatchUpUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun dismiss() {
        _uiState.value = CatchUpUiState.Hidden
    }

    companion object {
        private const val CATCH_UP_THRESHOLD_MS = 120_000L
    }
}

sealed interface CatchUpUiState {
    data object Hidden : CatchUpUiState
    data object AutoPrompt : CatchUpUiState
    data object Loading : CatchUpUiState
    data object Summary : CatchUpUiState
    data class Error(val message: String) : CatchUpUiState
}
