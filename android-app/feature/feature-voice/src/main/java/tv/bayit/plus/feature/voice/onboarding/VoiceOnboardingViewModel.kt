package tv.bayit.plus.feature.voice.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.VoiceRepository
import javax.inject.Inject

@HiltViewModel
class VoiceOnboardingViewModel @Inject constructor(
    private val voiceRepository: VoiceRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _currentStep = MutableStateFlow(0)
    val currentStep: StateFlow<Int> = _currentStep.asStateFlow()

    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording.asStateFlow()

    private val _isProcessing = MutableStateFlow(false)
    val isProcessing: StateFlow<Boolean> = _isProcessing.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _isCompleted = MutableStateFlow(false)
    val isCompleted: StateFlow<Boolean> = _isCompleted.asStateFlow()

    private val totalSteps = 3

    fun nextStep() {
        if (_currentStep.value < totalSteps - 1) {
            _currentStep.value += 1
            logger.debug("Voice onboarding step advanced", mapOf("step" to _currentStep.value.toString()))
        }
    }

    fun previousStep() {
        if (_currentStep.value > 0) {
            _currentStep.value -= 1
            logger.debug("Voice onboarding step back", mapOf("step" to _currentStep.value.toString()))
        }
    }

    fun startRecording() {
        _isRecording.value = true
        logger.debug("Voice recording started for onboarding")
    }

    fun stopRecording(audioData: ByteArray) {
        _isRecording.value = false
        logger.debug("Voice recording stopped, processing sample")
        processSample(audioData)
    }

    fun completeOnboarding() {
        viewModelScope.launch {
            _isProcessing.value = true
            logger.debug("Completing voice onboarding")

            when (val result = voiceRepository.completeVoiceSetup()) {
                is BayitResult.Success -> {
                    logger.info("Voice onboarding completed successfully")
                    _errorMessage.value = null
                    _isCompleted.value = true
                }
                is BayitResult.Error -> {
                    logger.error("Voice onboarding completion failed", result.exception)
                    _errorMessage.value = result.message ?: result.exception.message
                }
                is BayitResult.Loading -> Unit
            }

            _isProcessing.value = false
        }
    }

    fun dismissError() {
        _errorMessage.value = null
    }

    fun getTotalSteps(): Int = totalSteps

    private fun processSample(audioData: ByteArray) {
        viewModelScope.launch {
            _isProcessing.value = true
            logger.debug("Processing voice sample")

            when (val result = voiceRepository.trainVoiceModel(audioData)) {
                is BayitResult.Success -> {
                    logger.info("Voice sample processed successfully")
                    _errorMessage.value = null
                    nextStep()
                }
                is BayitResult.Error -> {
                    logger.error("Voice sample processing failed", result.exception)
                    _errorMessage.value = result.message ?: result.exception.message
                }
                is BayitResult.Loading -> Unit
            }

            _isProcessing.value = false
        }
    }
}
