package tv.bayit.plus.feature.voice.mission

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
import tv.bayit.plus.core.data.repository.SettingsRepository
import tv.bayit.plus.core.voice.SpeechRecognitionException
import tv.bayit.plus.core.voice.SpeechRecognitionService
import javax.inject.Inject

data class VoiceDecisionState(
    val decisionPrompt: String = "",
    val options: List<String> = emptyList(),
    val isListening: Boolean = false,
    val selectedOption: String? = null,
    val confidence: Float? = null,
    val transcript: String = "",
    val hasDecided: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class VoiceDecisionViewModel @Inject constructor(
    private val speechService: SpeechRecognitionService,
    private val settingsRepository: SettingsRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _state = MutableStateFlow(VoiceDecisionState())
    val state: StateFlow<VoiceDecisionState> = _state.asStateFlow()

    private var recognitionJob: Job? = null
    private var stopRecognition: (() -> Unit)? = null

    fun setDecision(prompt: String, options: List<String>) {
        _state.value = VoiceDecisionState(decisionPrompt = prompt, options = options)
        logger.info(
            "Voice decision set",
            mapOf("prompt" to prompt, "optionCount" to options.size.toString()),
        )
    }

    fun startListening() {
        val current = _state.value
        if (current.isListening || current.options.isEmpty()) return
        _state.value = current.copy(
            isListening = true, transcript = "", selectedOption = null,
            confidence = null, hasDecided = false, error = null,
        )

        viewModelScope.launch {
            val language = resolveLanguage()
            logger.info("Voice decision: starting recognition", mapOf("language" to language))
            try {
                val (flow, stop) = speechService.startRecognition(language)
                stopRecognition = stop
                recognitionJob = viewModelScope.launch {
                    try {
                        flow.collect { result ->
                            _state.value = _state.value.copy(transcript = result.transcription)
                            if (result.isFinal) {
                                _state.value = _state.value.copy(isListening = false)
                                processTranscript(result.transcription, result.confidence)
                            }
                        }
                    } catch (e: SpeechRecognitionException) {
                        logger.error("Voice decision: recognition stream error", e)
                        _state.value = _state.value.copy(
                            isListening = false, error = e.kind.message,
                        )
                    } finally {
                        stopRecognition = null
                    }
                }
            } catch (e: SpeechRecognitionException) {
                logger.error("Voice decision: failed to start recognition", e)
                _state.value = _state.value.copy(
                    isListening = false, error = e.kind.message,
                )
            }
        }
    }

    fun stopListening() {
        stopRecognition?.invoke()
        stopRecognition = null
        recognitionJob?.cancel()
        recognitionJob = null
        _state.value = _state.value.copy(isListening = false)
    }

    fun selectOption(option: String) {
        if (option in _state.value.options) {
            _state.value = _state.value.copy(selectedOption = option, confidence = null)
            logger.debug("Voice decision: manual selection", mapOf("option" to option))
        }
    }

    fun confirmSelection() {
        val selected = _state.value.selectedOption ?: return
        _state.value = _state.value.copy(hasDecided = true)
        logger.info("Voice decision confirmed", mapOf("option" to selected))
    }

    fun reset() {
        stopListening()
        _state.value = VoiceDecisionState()
        logger.debug("Voice decision state reset")
    }

    private fun processTranscript(transcript: String, speechConfidence: Float) {
        val current = _state.value
        val normalizedTranscript = transcript.lowercase().trim()
        var bestMatch: String? = null
        var bestScore = 0f

        for (option in current.options) {
            val score = fuzzyScore(normalizedTranscript, option.lowercase().trim())
            if (score > bestScore) {
                bestScore = score
                bestMatch = option
            }
        }

        val matchConfidence = bestScore * speechConfidence.coerceIn(0f, 1f)
        logger.info(
            "Voice decision: transcript processed",
            mapOf(
                "transcript" to transcript,
                "bestMatch" to (bestMatch ?: "none"),
                "score" to bestScore.toString(),
                "matchConfidence" to matchConfidence.toString(),
            ),
        )

        if (bestMatch != null && bestScore >= FUZZY_MATCH_THRESHOLD) {
            _state.value = current.copy(
                selectedOption = bestMatch, confidence = matchConfidence,
            )
        }
    }

    private suspend fun resolveLanguage(): String =
        when (val result = settingsRepository.getLanguage()) {
            is BayitResult.Success -> result.data
            else -> "en"
        }

    override fun onCleared() {
        super.onCleared()
        stopListening()
    }

    companion object {
        private const val FUZZY_MATCH_THRESHOLD = 0.4f
        internal const val AUTO_CONFIRM_THRESHOLD = 0.75f

        internal fun fuzzyScore(input: String, target: String): Float {
            if (input == target) return 1f
            if (input.isBlank() || target.isBlank()) return 0f
            if (target.contains(input) || input.contains(target)) return 0.9f
            val inputWords = input.split("\\s+".toRegex()).toSet()
            val targetWords = target.split("\\s+".toRegex()).toSet()
            val overlap = inputWords.intersect(targetWords).size
            val total = inputWords.union(targetWords).size
            return if (total > 0) overlap.toFloat() / total.toFloat() else 0f
        }
    }
}
