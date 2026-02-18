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
import tv.bayit.plus.core.data.repository.CatchupRepository
import tv.bayit.plus.core.model.CatchUpProgramInfo
import tv.bayit.plus.core.model.TranscriptSegment
import javax.inject.Inject

@HiltViewModel
class CatchUpViewModel @Inject constructor(
    private val catchupRepository: CatchupRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<CatchUpUiState>(CatchUpUiState.Hidden)
    val uiState: StateFlow<CatchUpUiState> = _uiState.asStateFlow()

    private val _summary = MutableStateFlow<CatchUpSummaryUi?>(null)
    val summary: StateFlow<CatchUpSummaryUi?> = _summary.asStateFlow()

    private val _transcript = MutableStateFlow<List<TranscriptSegment>>(emptyList())
    val transcript: StateFlow<List<TranscriptSegment>> = _transcript.asStateFlow()

    private val _isAvailable = MutableStateFlow(false)
    val isAvailable: StateFlow<Boolean> = _isAvailable.asStateFlow()

    private val _remainingCredits = MutableStateFlow<Int?>(null)
    val remainingCredits: StateFlow<Int?> = _remainingCredits.asStateFlow()

    fun checkAvailability(channelId: String) {
        viewModelScope.launch {
            when (val result = catchupRepository.checkAvailability(channelId)) {
                is BayitResult.Success -> {
                    val data = result.data
                    _isAvailable.value = data.available
                    _remainingCredits.value = data.balance
                    if (data.available) {
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

    fun generateSummary(channelId: String, windowMinutes: Int?, targetLanguage: String?) {
        _uiState.value = CatchUpUiState.Loading

        viewModelScope.launch {
            logger.debug("Generating catch-up summary", mapOf(
                "channelId" to channelId,
            ))

            when (val result = catchupRepository.getSummary(
                channelId = channelId,
                windowMinutes = windowMinutes,
                targetLanguage = targetLanguage,
            )) {
                is BayitResult.Success -> {
                    val data = result.data
                    _summary.value = CatchUpSummaryUi(
                        text = data.summary.orEmpty(),
                        keyPoints = data.keyPoints.orEmpty(),
                        programInfo = data.programInfo,
                        creditsUsed = data.creditsUsed,
                        remainingCredits = data.remainingCredits,
                        cached = data.cached == true,
                    )
                    _remainingCredits.value = data.remainingCredits
                    _uiState.value = CatchUpUiState.Summary
                    logger.info("Catch-up summary generated", mapOf("channelId" to channelId))
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

    fun loadTranscriptTimeline(channelId: String, windowMinutes: Int? = null) {
        viewModelScope.launch {
            when (val result = catchupRepository.getTranscriptTimeline(
                channelId = channelId,
                windowMinutes = windowMinutes,
            )) {
                is BayitResult.Success -> {
                    _transcript.value = result.data.segments
                }
                is BayitResult.Error -> {
                    logger.error("Transcript timeline load failed", result.exception)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun dismiss() {
        _uiState.value = CatchUpUiState.Hidden
    }
}

data class CatchUpSummaryUi(
    val text: String,
    val keyPoints: List<String>,
    val programInfo: CatchUpProgramInfo?,
    val creditsUsed: Int?,
    val remainingCredits: Int?,
    val cached: Boolean,
)

sealed interface CatchUpUiState {
    data object Hidden : CatchUpUiState
    data object AutoPrompt : CatchUpUiState
    data object Loading : CatchUpUiState
    data object Summary : CatchUpUiState
    data class Error(val message: String) : CatchUpUiState
}
