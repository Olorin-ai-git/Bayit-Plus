package tv.bayit.plus.feature.zehani.selfie

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ZehAniRepository
import javax.inject.Inject

@HiltViewModel
class VideoSelfieViewModel @Inject constructor(
    private val zehAniRepository: ZehAniRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<VideoSelfieUiState>(VideoSelfieUiState.Ready)
    val uiState: StateFlow<VideoSelfieUiState> = _uiState.asStateFlow()

    private val _recordingDuration = MutableStateFlow(0L)
    val recordingDuration: StateFlow<Long> = _recordingDuration.asStateFlow()

    fun startRecording() {
        logger.info("Starting video selfie recording")
        _uiState.value = VideoSelfieUiState.Recording
        _recordingDuration.value = 0L
        startDurationTimer()
    }

    fun stopRecording() {
        logger.info("Stopping video selfie recording", mapOf("duration" to _recordingDuration.value.toString()))
        _uiState.value = VideoSelfieUiState.Processing
        processVideoSelfie()
    }

    fun retake() {
        logger.info("Retaking video selfie")
        _uiState.value = VideoSelfieUiState.Ready
        _recordingDuration.value = 0L
    }

    fun confirm() {
        val currentState = _uiState.value
        if (currentState is VideoSelfieUiState.Complete) {
            logger.info("Video selfie confirmed", mapOf("resultUrl" to currentState.resultUrl))
        }
    }

    fun retry() {
        logger.info("Retrying video selfie processing")
        retake()
    }

    private fun startDurationTimer() {
        viewModelScope.launch {
            while (_uiState.value is VideoSelfieUiState.Recording) {
                delay(1000L)
                _recordingDuration.value += 1L
            }
        }
    }

    private fun processVideoSelfie() {
        viewModelScope.launch {
            logger.debug("Processing video selfie")

            delay(2000L)

            val mockResult = BayitResult.Success("https://example.com/avatar-preview.jpg")
            when (mockResult) {
                is BayitResult.Success -> {
                    logger.info("Video selfie processed successfully")
                    _uiState.value = VideoSelfieUiState.Complete(resultUrl = mockResult.data)
                }
                is BayitResult.Error -> {
                    logger.error("Video selfie processing failed", mockResult.exception)
                    _uiState.value = VideoSelfieUiState.Error(
                        message = mockResult.message ?: mockResult.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface VideoSelfieUiState {
    data object Ready : VideoSelfieUiState
    data object Recording : VideoSelfieUiState
    data object Processing : VideoSelfieUiState
    data class Complete(val resultUrl: String) : VideoSelfieUiState
    data class Error(val message: String) : VideoSelfieUiState
}
