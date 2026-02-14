package tv.bayit.plus.feature.zehani.v2v

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
import tv.bayit.plus.core.data.repository.PhoneticMirrorRepository
import javax.inject.Inject

@HiltViewModel
class V2VPracticeViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val phoneticMirrorRepository: PhoneticMirrorRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    val avatarId: String = checkNotNull(savedStateHandle["avatarId"])
    val profileId: String = checkNotNull(savedStateHandle["profileId"])

    private val _uiState = MutableStateFlow<V2VPracticeUiState>(V2VPracticeUiState.Ready)
    val uiState: StateFlow<V2VPracticeUiState> = _uiState.asStateFlow()

    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording.asStateFlow()

    fun startRecording() {
        _isRecording.value = true
        logger.debug("Voice recording started", mapOf("profileId" to profileId))
    }

    fun stopRecording(audioData: ByteArray, practiceText: String) {
        _isRecording.value = false
        logger.debug("Voice recording stopped, submitting attempt", mapOf("profileId" to profileId))
        submitAttempt(practiceText, audioData)
    }

    fun loadPhoneticGuide(text: String, languageCode: String) {
        viewModelScope.launch {
            _uiState.value = V2VPracticeUiState.LoadingGuide
            logger.debug("Loading phonetic guide", mapOf("text" to text, "language" to languageCode))

            when (val result = phoneticMirrorRepository.getPhoneticGuide(text, languageCode)) {
                is BayitResult.Success -> {
                    logger.info("Phonetic guide loaded")
                    _uiState.value = V2VPracticeUiState.GuideLoaded(result.data)
                }
                is BayitResult.Error -> {
                    logger.error("Phonetic guide load failed", result.exception)
                    _uiState.value = V2VPracticeUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun loadProgress() {
        viewModelScope.launch {
            logger.debug("Loading V2V progress", mapOf("profileId" to profileId))
            when (val result = phoneticMirrorRepository.getProgress()) {
                is BayitResult.Success -> {
                    logger.info("V2V progress loaded")
                    _uiState.value = V2VPracticeUiState.ProgressLoaded(result.data)
                }
                is BayitResult.Error -> {
                    logger.error("V2V progress load failed", result.exception)
                    _uiState.value = V2VPracticeUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun resetToReady() {
        _uiState.value = V2VPracticeUiState.Ready
    }

    private fun submitAttempt(text: String, audioData: ByteArray) {
        viewModelScope.launch {
            _uiState.value = V2VPracticeUiState.Analyzing
            logger.debug("Submitting pronunciation attempt")

            when (val result = phoneticMirrorRepository.submitPronunciationAttempt(text, audioData)) {
                is BayitResult.Success -> {
                    logger.info("Pronunciation feedback received")
                    _uiState.value = V2VPracticeUiState.FeedbackReady(result.data)
                }
                is BayitResult.Error -> {
                    logger.error("Pronunciation attempt submission failed", result.exception)
                    _uiState.value = V2VPracticeUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface V2VPracticeUiState {
    data object Ready : V2VPracticeUiState
    data object LoadingGuide : V2VPracticeUiState
    data object Analyzing : V2VPracticeUiState
    data class GuideLoaded(val guide: Any) : V2VPracticeUiState
    data class FeedbackReady(val feedback: Any) : V2VPracticeUiState
    data class ProgressLoaded(val progress: Any) : V2VPracticeUiState
    data class Error(val message: String) : V2VPracticeUiState
}
