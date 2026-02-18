package tv.bayit.plus.feature.voice.wizard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.VoiceRepository
import tv.bayit.plus.core.voice.SpeechRecognitionException
import tv.bayit.plus.core.voice.SpeechRecognitionService
import tv.bayit.plus.core.voice.SpeechResult
import javax.inject.Inject

private const val STEP_PERMISSION = 0
private const val STEP_LANGUAGE = 1
private const val STEP_CALIBRATION = 2
private const val STEP_COMPLETE = 3
private const val TOTAL_STEPS = 4

@HiltViewModel
class VoiceWizardViewModel @Inject constructor(
    private val speechRecognitionService: SpeechRecognitionService,
    private val voiceRepository: VoiceRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _currentStep = MutableStateFlow(STEP_PERMISSION)
    val currentStep: StateFlow<Int> = _currentStep.asStateFlow()
    private val _selectedLanguage = MutableStateFlow("he")
    val selectedLanguage: StateFlow<String> = _selectedLanguage.asStateFlow()
    private val _calibrationResult = MutableStateFlow<Float?>(null)
    val calibrationResult: StateFlow<Float?> = _calibrationResult.asStateFlow()
    private val _isCalibrating = MutableStateFlow(false)
    val isCalibrating: StateFlow<Boolean> = _isCalibrating.asStateFlow()
    private val _permissionsGranted = MutableStateFlow(false)
    val permissionsGranted: StateFlow<Boolean> = _permissionsGranted.asStateFlow()
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    private val _isCompleted = MutableStateFlow(false)
    val isCompleted: StateFlow<Boolean> = _isCompleted.asStateFlow()
    private var calibrationJob: Job? = null
    private var stopRecognition: (() -> Unit)? = null

    init { checkCurrentPermissions() }

    fun getTotalSteps(): Int = TOTAL_STEPS

    fun onPermissionsResult(granted: Boolean) {
        _permissionsGranted.value = granted
        if (granted) logger.info("Voice wizard mic permission granted")
        else logger.warning("Voice wizard mic permission denied")
    }

    fun selectLanguage(language: String) {
        _selectedLanguage.value = language
        logger.debug("Voice wizard language selected", mapOf("language" to language))
    }

    fun startCalibration() {
        if (_isCalibrating.value) return
        _isCalibrating.value = true
        _calibrationResult.value = null
        _error.value = null
        calibrationJob = viewModelScope.launch {
            logger.info("Calibration started", mapOf("language" to _selectedLanguage.value))
            try {
                val (flow, stop) = speechRecognitionService.startRecognition(_selectedLanguage.value)
                stopRecognition = stop
                var confidenceSum = 0f
                var sampleCount = 0
                flow.collect { result: SpeechResult ->
                    if (result.isFinal && result.confidence > 0f) {
                        confidenceSum += result.confidence
                        sampleCount++
                    }
                }
                val avg = if (sampleCount > 0) confidenceSum / sampleCount else 0f
                _calibrationResult.value = avg
                _isCalibrating.value = false
                stopRecognition = null
                logger.info("Calibration complete", mapOf("confidence" to avg.toString()))
            } catch (e: SpeechRecognitionException) {
                logger.error("Calibration failed", e, mapOf("kind" to e.kind.name))
                _error.value = e.kind.message
                _isCalibrating.value = false
            }
        }
    }

    fun stopCalibration() {
        stopRecognition?.invoke()
        stopRecognition = null
    }

    fun completeWizard() {
        viewModelScope.launch {
            logger.info("Completing voice wizard", mapOf(
                "language" to _selectedLanguage.value,
                "confidence" to (_calibrationResult.value?.toString() ?: "none"),
            ))
            val settings = mapOf<String, Any>(
                "language" to _selectedLanguage.value,
                "calibrationConfidence" to (_calibrationResult.value ?: 0f),
                "wizardCompleted" to true,
            )
            when (val result = voiceRepository.updateVoiceSettings(settings)) {
                is BayitResult.Success -> finalizeSetup()
                is BayitResult.Error -> {
                    logger.error("Wizard settings save failed", result.exception)
                    _error.value = result.message ?: result.exception.message
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun nextStep() {
        if (_currentStep.value < STEP_COMPLETE) {
            _currentStep.value += 1
            _error.value = null
            logger.debug("Wizard step advanced", mapOf("step" to _currentStep.value.toString()))
        }
    }

    fun previousStep() {
        if (_currentStep.value > STEP_PERMISSION) {
            _currentStep.value -= 1
            _error.value = null
            logger.debug("Wizard step back", mapOf("step" to _currentStep.value.toString()))
        }
    }

    fun dismissError() { _error.value = null }

    private fun checkCurrentPermissions() {
        val p = speechRecognitionService.checkPermissions()
        _permissionsGranted.value = p.allGranted
        logger.debug("Wizard permissions", mapOf(
            "mic" to p.microphone.toString(), "recognition" to p.speechRecognition.toString(),
        ))
    }

    private suspend fun finalizeSetup() {
        when (val r = voiceRepository.completeVoiceSetup()) {
            is BayitResult.Success -> {
                logger.info("Voice wizard completed successfully")
                _isCompleted.value = true
            }
            is BayitResult.Error -> {
                logger.error("Wizard finalization failed", r.exception)
                _error.value = r.message ?: r.exception.message
            }
            is BayitResult.Loading -> Unit
        }
    }

    override fun onCleared() {
        super.onCleared()
        stopCalibration()
        calibrationJob?.cancel()
    }
}
