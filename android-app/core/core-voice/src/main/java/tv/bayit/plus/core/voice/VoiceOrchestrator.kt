package tv.bayit.plus.core.voice

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject
import javax.inject.Singleton

/** Network interface for POST /api/v1/voice/unified. */
interface VoiceApiService {
    suspend fun processVoice(request: VoiceRequest): VoiceResponse
}

/**
 * Central voice state machine: idle -> listening -> processing -> speaking -> idle.
 * Android port of iOS VoiceOrchestrator.swift.
 */
@Singleton
class VoiceOrchestrator @Inject constructor(
    private val speechService: SpeechRecognitionService,
    private val ttsService: TTSService,
    private val webSocketClient: VoiceWebSocketClient,
    private val voiceApiService: VoiceApiService,
    private val logger: BayitLogger,
    private val scope: CoroutineScope,
    private val config: VoiceConfig,
) {
    private val _state = MutableStateFlow(VoiceState.IDLE)
    private val _currentTranscript = MutableStateFlow("")
    private val _responseText = MutableStateFlow("")
    private val _lastIntent = MutableStateFlow<VoiceIntentType?>(null)
    private val _lastAction = MutableStateFlow<VoiceAction?>(null)
    private val _lastGesture = MutableStateFlow<GestureState?>(null)
    private val _conversationId = MutableStateFlow<String?>(null)
    private val _error = MutableStateFlow<String?>(null)

    val state: StateFlow<VoiceState> = _state.asStateFlow()
    val currentTranscript: StateFlow<String> = _currentTranscript.asStateFlow()
    val responseText: StateFlow<String> = _responseText.asStateFlow()
    val lastIntent: StateFlow<VoiceIntentType?> = _lastIntent.asStateFlow()
    val lastAction: StateFlow<VoiceAction?> = _lastAction.asStateFlow()
    val lastGesture: StateFlow<GestureState?> = _lastGesture.asStateFlow()
    val conversationId: StateFlow<String?> = _conversationId.asStateFlow()
    val error: StateFlow<String?> = _error.asStateFlow()

    var language: String = config.defaultLanguage
    var onIntentAction: ((VoiceIntentType, VoiceAction) -> Unit)? = null

    private var recognitionStop: (() -> Unit)? = null
    private var recognitionJob: Job? = null
    private var safetyTimeoutJob: Job? = null

    fun startInteraction(trigger: VoiceTrigger = VoiceTrigger.MANUAL) {
        if (_state.value != VoiceState.IDLE && _state.value != VoiceState.ERROR) {
            logger.warning("Cannot start interaction in state: ${_state.value}")
            return
        }
        _error.value = null
        _currentTranscript.value = ""
        _responseText.value = ""
        transition(VoiceState.LISTENING)
        startListening(trigger)
        logger.info("Voice interaction started", mapOf("trigger" to trigger.name, "language" to language))
    }

    fun commitTranscript() {
        if (_state.value != VoiceState.LISTENING) return
        recognitionStop?.invoke()
        recognitionStop = null
        val transcript = _currentTranscript.value
        if (transcript.isEmpty()) { transition(VoiceState.IDLE); return }
        transition(VoiceState.PROCESSING)
        processTranscript(transcript)
    }

    fun interrupt() {
        logger.info("Voice interaction interrupted")
        cancelAll()
        transition(VoiceState.IDLE)
    }

    fun endSession() {
        cancelAll()
        _conversationId.value = null
        transition(VoiceState.IDLE)
        logger.info("Voice session ended")
    }

    private fun startListening(trigger: VoiceTrigger) {
        val (flow, stop) = speechService.startRecognition(language)
        recognitionStop = stop
        recognitionJob = scope.launch(Dispatchers.Main) {
            try {
                flow.collect { result ->
                    _currentTranscript.value = result.transcription
                    if (result.isFinal) commitTranscript()
                }
            } catch (e: Exception) {
                handleError(e.message ?: "Speech recognition failed")
            }
        }
    }

    private fun processTranscript(transcript: String) {
        scope.launch(Dispatchers.Main) {
            try {
                val request = VoiceRequest(
                    transcript = transcript, language = language,
                    conversationId = _conversationId.value,
                    platform = config.platform,
                    triggerType = VoiceTrigger.MANUAL.name.lowercase(),
                )
                val response = voiceApiService.processVoice(request)
                _conversationId.value = response.conversationId
                _lastIntent.value = response.intent
                _lastAction.value = response.action
                _lastGesture.value = response.gesture
                val spoken = response.spokenResponse
                if (!spoken.isNullOrEmpty()) {
                    _responseText.value = spoken
                    speakResponse(spoken)
                } else {
                    transition(VoiceState.IDLE)
                }
                if (response.intent != null && response.action != null) {
                    onIntentAction?.invoke(response.intent, response.action)
                }
            } catch (e: Exception) {
                handleError(e.message ?: "Processing failed")
            }
        }
    }

    private fun speakResponse(text: String) {
        transition(VoiceState.SPEAKING)
        ttsService.speak(text, language)
        safetyTimeoutJob?.cancel()
        safetyTimeoutJob = scope.launch(Dispatchers.Main) {
            delay(config.speakingTimeoutMs)
            if (_state.value == VoiceState.SPEAKING) {
                logger.warning("Speaking safety timeout reached")
                ttsService.stop()
                transition(VoiceState.IDLE)
            }
        }
    }

    private fun transition(newState: VoiceState) {
        val oldState = _state.value
        if (!isValidTransition(oldState, newState)) {
            logger.warning("Invalid transition", mapOf("from" to oldState.name, "to" to newState.name))
            return
        }
        _state.value = newState
        logger.debug("State transition", mapOf("from" to oldState.name, "to" to newState.name))
    }

    private fun handleError(message: String) {
        _error.value = message
        transition(VoiceState.ERROR)
        logger.error("Voice error: $message")
        scope.launch(Dispatchers.Main) {
            delay(config.errorRecoveryMs)
            if (_state.value == VoiceState.ERROR) transition(VoiceState.IDLE)
        }
    }

    private fun cancelAll() {
        recognitionStop?.invoke()
        recognitionStop = null
        recognitionJob?.cancel()
        recognitionJob = null
        safetyTimeoutJob?.cancel()
        safetyTimeoutJob = null
        ttsService.stop()
    }

    companion object {
        fun isValidTransition(from: VoiceState, to: VoiceState): Boolean = when {
            to == VoiceState.ERROR -> true
            to == VoiceState.IDLE -> true
            from == VoiceState.IDLE && to == VoiceState.LISTENING -> true
            from == VoiceState.LISTENING && to == VoiceState.PROCESSING -> true
            from == VoiceState.PROCESSING && to == VoiceState.SPEAKING -> true
            from == VoiceState.SPEAKING && to == VoiceState.LISTENING -> true
            from == VoiceState.ERROR && to == VoiceState.LISTENING -> true
            else -> false
        }
    }
}
