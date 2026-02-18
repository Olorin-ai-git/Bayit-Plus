package tv.bayit.plus.feature.voice.avatar

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.voice.VoiceOrchestrator
import tv.bayit.plus.core.voice.VoiceState
import javax.inject.Inject

/** Visual state driving avatar animations in the overlay. */
enum class AvatarAnimationState {
    IDLE,
    LISTENING,
    THINKING,
    SPEAKING,
}

@HiltViewModel
class AvatarViewModel @Inject constructor(
    private val orchestrator: VoiceOrchestrator,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _avatarState = MutableStateFlow(AvatarAnimationState.IDLE)
    val avatarState: StateFlow<AvatarAnimationState> = _avatarState.asStateFlow()

    private val _dialogueText = MutableStateFlow("")
    val dialogueText: StateFlow<String> = _dialogueText.asStateFlow()

    private val _isSessionActive = MutableStateFlow(false)
    val isSessionActive: StateFlow<Boolean> = _isSessionActive.asStateFlow()

    private val _gestureHint = MutableStateFlow<String?>(null)
    val gestureHint: StateFlow<String?> = _gestureHint.asStateFlow()

    init {
        observeOrchestratorState()
        observeOrchestratorOutputs()
    }

    fun startSession() {
        logger.info("Avatar session starting")
        _isSessionActive.value = true
        orchestrator.startInteraction()
    }

    fun endSession() {
        logger.info("Avatar session ending")
        orchestrator.endSession()
        _isSessionActive.value = false
        _dialogueText.value = ""
        _gestureHint.value = null
    }

    fun toggleListening() {
        when (_avatarState.value) {
            AvatarAnimationState.IDLE -> {
                logger.debug("Avatar toggle: starting interaction")
                orchestrator.startInteraction()
            }
            AvatarAnimationState.LISTENING -> {
                logger.debug("Avatar toggle: committing transcript")
                orchestrator.commitTranscript()
            }
            AvatarAnimationState.SPEAKING -> {
                logger.debug("Avatar toggle: interrupting to re-listen")
                orchestrator.interrupt()
                orchestrator.startInteraction()
            }
            AvatarAnimationState.THINKING -> {
                logger.debug("Avatar toggle ignored during thinking state")
            }
        }
    }

    private fun observeOrchestratorState() {
        orchestrator.state
            .onEach { voiceState ->
                val mapped = mapToAnimationState(voiceState)
                _avatarState.value = mapped
                logger.debug(
                    "Avatar animation state updated",
                    mapOf("voiceState" to voiceState.name, "avatarState" to mapped.name),
                )
            }
            .launchIn(viewModelScope)
    }

    private fun observeOrchestratorOutputs() {
        orchestrator.responseText
            .onEach { text -> _dialogueText.value = text }
            .launchIn(viewModelScope)

        orchestrator.lastGesture
            .onEach { gesture -> _gestureHint.value = gesture?.gesture }
            .launchIn(viewModelScope)
    }

    private fun mapToAnimationState(voiceState: VoiceState): AvatarAnimationState =
        when (voiceState) {
            VoiceState.IDLE -> AvatarAnimationState.IDLE
            VoiceState.LISTENING -> AvatarAnimationState.LISTENING
            VoiceState.PROCESSING -> AvatarAnimationState.THINKING
            VoiceState.SPEAKING -> AvatarAnimationState.SPEAKING
            VoiceState.ERROR -> AvatarAnimationState.IDLE
        }
}
