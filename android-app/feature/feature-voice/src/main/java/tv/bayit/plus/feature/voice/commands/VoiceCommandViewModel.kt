package tv.bayit.plus.feature.voice.commands

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.voice.VoiceCommandMatch
import tv.bayit.plus.core.voice.VoiceCommandRegistry
import tv.bayit.plus.core.voice.VoiceIntentType
import tv.bayit.plus.core.voice.VoiceOrchestrator
import tv.bayit.plus.core.voice.VoiceState
import javax.inject.Inject

@HiltViewModel
class VoiceCommandViewModel @Inject constructor(
    private val orchestrator: VoiceOrchestrator,
    private val commandRegistry: VoiceCommandRegistry,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _voiceState = MutableStateFlow(VoiceState.IDLE)
    val voiceState: StateFlow<VoiceState> = _voiceState.asStateFlow()

    private val _recognizedCommand = MutableStateFlow<String?>(null)
    val recognizedCommand: StateFlow<String?> = _recognizedCommand.asStateFlow()

    private val _commandConfidence = MutableStateFlow<Float?>(null)
    val commandConfidence: StateFlow<Float?> = _commandConfidence.asStateFlow()

    private val _lastExecutedAction = MutableStateFlow<String?>(null)
    val lastExecutedAction: StateFlow<String?> = _lastExecutedAction.asStateFlow()

    private val _transcript = MutableStateFlow("")
    val transcript: StateFlow<String> = _transcript.asStateFlow()

    var onPlaybackAction: ((String, Map<String, String>) -> Unit)? = null
    var onNavigationAction: ((String, Map<String, String>) -> Unit)? = null

    private var lastMatchedTranscript: String = ""

    init {
        collectOrchestratorFlows()
    }

    private fun collectOrchestratorFlows() {
        viewModelScope.launch {
            orchestrator.state.collect { state ->
                _voiceState.value = state
                if (state == VoiceState.IDLE) {
                    resetCommandState()
                }
            }
        }
        viewModelScope.launch {
            orchestrator.currentTranscript.collect { text ->
                _transcript.value = text
                if (text.isNotBlank() && text != lastMatchedTranscript) {
                    attemptCommandMatch(text)
                }
            }
        }
    }

    private fun attemptCommandMatch(transcript: String) {
        val match = commandRegistry.match(transcript, orchestrator.language)
        if (match != null) {
            lastMatchedTranscript = transcript
            _recognizedCommand.value = match.pattern.actionType
            _commandConfidence.value = match.confidence
            logger.info(
                "Voice command recognized",
                mapOf(
                    "action" to match.pattern.actionType,
                    "intent" to match.pattern.intentType.name,
                    "confidence" to match.confidence.toString(),
                ),
            )
        } else {
            _recognizedCommand.value = null
            _commandConfidence.value = null
        }
    }

    fun executeCommand(match: VoiceCommandMatch) {
        val actionType = match.pattern.actionType
        val intentType = match.pattern.intentType
        val params = match.extractedParams

        logger.info(
            "Executing voice command",
            mapOf("action" to actionType, "intent" to intentType.name),
        )

        _lastExecutedAction.value = actionType

        when (intentType) {
            VoiceIntentType.PLAYBACK -> dispatchPlaybackAction(actionType, params)
            VoiceIntentType.NAVIGATION -> dispatchNavigationAction(actionType, params)
            VoiceIntentType.SEARCH -> dispatchNavigationAction(actionType, params)
            VoiceIntentType.CHANNEL -> dispatchPlaybackAction(actionType, params)
            VoiceIntentType.DUBBING -> dispatchPlaybackAction(actionType, params)
            VoiceIntentType.SUBTITLE -> dispatchPlaybackAction(actionType, params)
            VoiceIntentType.SETTINGS -> dispatchNavigationAction(actionType, params)
            else -> {
                logger.warning(
                    "Unhandled voice intent type for command execution",
                    mapOf("intent" to intentType.name, "action" to actionType),
                )
            }
        }
    }

    fun executeCurrentCommand() {
        val currentTranscript = _transcript.value
        if (currentTranscript.isBlank()) return

        val match = commandRegistry.match(currentTranscript, orchestrator.language) ?: run {
            logger.warning(
                "No matching command for execution",
                mapOf("transcript" to currentTranscript),
            )
            return
        }
        executeCommand(match)
    }

    private fun dispatchPlaybackAction(actionType: String, params: Map<String, String>) {
        onPlaybackAction?.invoke(actionType, params) ?: logger.warning(
            "Playback action callback not set",
            mapOf("action" to actionType),
        )
    }

    private fun dispatchNavigationAction(actionType: String, params: Map<String, String>) {
        onNavigationAction?.invoke(actionType, params) ?: logger.warning(
            "Navigation action callback not set",
            mapOf("action" to actionType),
        )
    }

    private fun resetCommandState() {
        _recognizedCommand.value = null
        _commandConfidence.value = null
        _lastExecutedAction.value = null
        lastMatchedTranscript = ""
    }
}
