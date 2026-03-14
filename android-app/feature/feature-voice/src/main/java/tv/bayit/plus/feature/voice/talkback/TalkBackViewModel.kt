package tv.bayit.plus.feature.voice.talkback

import androidx.lifecycle.SavedStateHandle
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
import tv.bayit.plus.core.data.repository.TalkBackRepository
import tv.bayit.plus.core.voice.SpeechRecognitionException
import tv.bayit.plus.core.voice.SpeechRecognitionService
import tv.bayit.plus.core.voice.SpeechResult
import tv.bayit.plus.core.voice.TTSService
import javax.inject.Inject

@HiltViewModel
class TalkBackViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val speechRecognitionService: SpeechRecognitionService,
    private val ttsService: TTSService,
    private val talkBackRepository: TalkBackRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val contentId: String = savedStateHandle["contentId"] ?: ""

    private val _uiState = MutableStateFlow(TalkBackUiState())
    val uiState: StateFlow<TalkBackUiState> = _uiState.asStateFlow()

    private var sessionId: String? = null
    private var recognitionStopHandle: (() -> Unit)? = null
    private var listeningJob: Job? = null

    init {
        initSession()
    }

    private fun initSession() {
        if (contentId.isBlank()) {
            _uiState.value = _uiState.value.copy(
                error = "talkback.error.missingContent",
            )
            return
        }
        viewModelScope.launch {
            logger.debug("Starting TalkBack session", mapOf("contentId" to contentId))
            when (val result = talkBackRepository.startSession(contentId)) {
                is BayitResult.Success -> {
                    val data = result.data as? Map<*, *>
                    sessionId = data?.get("id")?.toString()
                    val character = data?.get("character_name")?.toString().orEmpty()
                    _uiState.value = _uiState.value.copy(characterName = character)
                    logger.info(
                        "TalkBack session started",
                        mapOf("sessionId" to sessionId.orEmpty()),
                    )
                }
                is BayitResult.Error -> {
                    logger.error("TalkBack session start failed", result.exception)
                    _uiState.value = _uiState.value.copy(
                        error = result.message ?: result.exception.message,
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun startInteraction() {
        val currentState = _uiState.value
        if (currentState.isListening || currentState.isProcessing) return

        _uiState.value = currentState.copy(
            isListening = true,
            error = null,
            userTranscript = "",
        )
        ttsService.stop()

        try {
            val (flow, stop) = speechRecognitionService.startRecognition("en")
            recognitionStopHandle = stop
            listeningJob = viewModelScope.launch {
                flow.collect { result -> handleSpeechResult(result) }
            }
            logger.info("TalkBack listening started", mapOf("contentId" to contentId))
        } catch (e: SpeechRecognitionException) {
            logger.error("Speech recognition failed to start", e)
            _uiState.value = _uiState.value.copy(
                isListening = false,
                error = e.kind.message,
            )
        }
    }

    fun stopInteraction() {
        recognitionStopHandle?.invoke()
        recognitionStopHandle = null
        listeningJob?.cancel()
        listeningJob = null
        ttsService.stop()
        _uiState.value = _uiState.value.copy(
            isListening = false,
            isProcessing = false,
            isSpeaking = false,
        )
        logger.info("TalkBack interaction stopped", mapOf("contentId" to contentId))
    }

    fun clearConversation() {
        stopInteraction()
        _uiState.value = TalkBackUiState(characterName = _uiState.value.characterName)
        logger.debug("TalkBack conversation cleared")
    }

    private fun handleSpeechResult(result: SpeechResult) {
        _uiState.value = _uiState.value.copy(userTranscript = result.transcription)
        if (result.isFinal) {
            recognitionStopHandle = null
            listeningJob = null
            _uiState.value = _uiState.value.copy(isListening = false)
            processTranscript(result.transcription)
        }
    }

    private fun processTranscript(text: String) {
        if (text.isBlank()) return
        val sid = sessionId ?: return
        _uiState.value = _uiState.value.copy(isProcessing = true, error = null)
        logger.debug("Processing TalkBack transcript", mapOf("length" to text.length.toString()))

        viewModelScope.launch {
            val audioData = text.toByteArray(Charsets.UTF_8)
            when (val result = talkBackRepository.sendAudioChunk(sid, audioData)) {
                is BayitResult.Success -> {
                    logger.info("TalkBack response received")
                    val response = extractCharacterResponse(result)
                    _uiState.value = _uiState.value.copy(
                        isProcessing = false,
                        characterResponse = response,
                    )
                    speakResponse(response)
                }
                is BayitResult.Error -> {
                    logger.error("TalkBack processing failed", result.exception)
                    _uiState.value = _uiState.value.copy(
                        isProcessing = false,
                        error = result.message ?: result.exception.message,
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun speakResponse(text: String) {
        if (text.isBlank()) return
        _uiState.value = _uiState.value.copy(isSpeaking = true)
        ttsService.speak(text, "en")
        viewModelScope.launch {
            ttsService.isSpeaking.collect { speaking ->
                if (!speaking && _uiState.value.isSpeaking) {
                    _uiState.value = _uiState.value.copy(isSpeaking = false)
                }
            }
        }
        logger.debug("TalkBack speaking response", mapOf("length" to text.length.toString()))
    }

    private fun extractCharacterResponse(result: BayitResult.Success<Unit>): String {
        return _uiState.value.characterResponse
    }

    override fun onCleared() {
        super.onCleared()
        stopInteraction()
        sessionId?.let { sid ->
            viewModelScope.launch {
                talkBackRepository.endSession(sid)
                logger.info("TalkBack session ended", mapOf("sessionId" to sid))
            }
        }
    }
}

data class TalkBackUiState(
    val isListening: Boolean = false,
    val isProcessing: Boolean = false,
    val isSpeaking: Boolean = false,
    val userTranscript: String = "",
    val characterResponse: String = "",
    val characterName: String = "",
    val error: String? = null,
)
