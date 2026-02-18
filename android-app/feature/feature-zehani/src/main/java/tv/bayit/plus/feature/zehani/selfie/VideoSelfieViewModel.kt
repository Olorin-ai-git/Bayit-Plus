package tv.bayit.plus.feature.zehani.selfie

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
import javax.inject.Inject

@HiltViewModel
class VideoSelfieViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val zehAniRepository: ZehAniRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val profileId: String = savedStateHandle["profileId"] ?: "current"

    private val _uiState = MutableStateFlow<VideoSelfieUiState>(VideoSelfieUiState.Ready)
    val uiState: StateFlow<VideoSelfieUiState> = _uiState.asStateFlow()

    private val _recordingDuration = MutableStateFlow(0L)
    val recordingDuration: StateFlow<Long> = _recordingDuration.asStateFlow()

    private val _pinInput = MutableStateFlow("")
    val pinInput: StateFlow<String> = _pinInput.asStateFlow()

    fun startRecording() {
        logger.info("Starting video selfie recording")
        _uiState.value = VideoSelfieUiState.Recording
        _recordingDuration.value = 0L
        startDurationTimer()
    }

    fun stopRecording() {
        logger.info("Stopping video selfie recording", mapOf("duration" to _recordingDuration.value.toString()))
        _pinInput.value = ""
        _uiState.value = VideoSelfieUiState.PinEntry
    }

    fun updatePin(pin: String) { _pinInput.value = pin }

    fun confirmWithPin() {
        val pin = _pinInput.value
        if (pin.isBlank()) return
        _uiState.value = VideoSelfieUiState.Processing
        generateAvatar(pin)
    }

    fun retake() {
        logger.info("Retaking video selfie")
        _pinInput.value = ""
        _uiState.value = VideoSelfieUiState.Ready
        _recordingDuration.value = 0L
    }

    fun retry() {
        logger.info("Retrying video selfie processing")
        retake()
    }

    private fun startDurationTimer() {
        viewModelScope.launch {
            while (_uiState.value is VideoSelfieUiState.Recording) {
                kotlinx.coroutines.delay(1000L)
                _recordingDuration.value += 1L
            }
        }
    }

    private fun generateAvatar(pin: String) {
        viewModelScope.launch {
            logger.debug("Generating avatar mesh", mapOf("profileId" to profileId))
            when (val result = zehAniRepository.generateMesh(profileId, pin)) {
                is BayitResult.Success -> {
                    val avatarUrl = result.data.avatarImageUrl.orEmpty()
                    logger.info("Avatar mesh generated", mapOf("avatarId" to result.data.id))
                    _uiState.value = VideoSelfieUiState.Complete(resultUrl = avatarUrl)
                }
                is BayitResult.Error -> {
                    logger.error("Avatar mesh generation failed", result.exception)
                    _uiState.value = VideoSelfieUiState.Error(result.message ?: result.exception.message.orEmpty())
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface VideoSelfieUiState {
    data object Ready : VideoSelfieUiState
    data object Recording : VideoSelfieUiState
    data object PinEntry : VideoSelfieUiState
    data object Processing : VideoSelfieUiState
    data class Complete(val resultUrl: String) : VideoSelfieUiState
    data class Error(val message: String) : VideoSelfieUiState
}
