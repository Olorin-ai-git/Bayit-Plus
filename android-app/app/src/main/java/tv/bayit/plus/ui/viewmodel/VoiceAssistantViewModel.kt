package tv.bayit.plus.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.VoiceRepository
import tv.bayit.plus.core.voice.VoiceAction
import tv.bayit.plus.core.voice.VoiceIntentType
import tv.bayit.plus.core.voice.VoiceOrchestrator
import tv.bayit.plus.core.voice.VoiceState
import tv.bayit.plus.core.voice.VoiceTrigger
import javax.inject.Inject

@HiltViewModel
class VoiceAssistantViewModel @Inject constructor(
    private val voiceRepository: VoiceRepository,
    private val orchestrator: VoiceOrchestrator,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _isOnboardingComplete = MutableStateFlow(false)
    val isOnboardingComplete: StateFlow<Boolean> = _isOnboardingComplete.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    val voiceState: StateFlow<VoiceState> = orchestrator.state
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(), VoiceState.IDLE)

    val transcript: StateFlow<String> = orchestrator.currentTranscript
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(), "")

    val responseText: StateFlow<String> = orchestrator.responseText
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(), "")

    val lastIntent: StateFlow<VoiceIntentType?> = orchestrator.lastIntent
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(), null)

    var onIntentAction: ((VoiceIntentType, VoiceAction) -> Unit)?
        get() = orchestrator.onIntentAction
        set(value) { orchestrator.onIntentAction = value }

    init {
        checkOnboardingStatus()
    }

    fun refreshOnboardingStatus() {
        checkOnboardingStatus()
    }

    fun startListening(trigger: VoiceTrigger = VoiceTrigger.MANUAL) {
        orchestrator.startInteraction(trigger)
    }

    fun commitTranscript() {
        orchestrator.commitTranscript()
    }

    fun interrupt() {
        orchestrator.interrupt()
    }

    fun endSession() {
        orchestrator.endSession()
    }

    private fun checkOnboardingStatus() {
        viewModelScope.launch {
            when (val result = voiceRepository.getVoiceSettings()) {
                is BayitResult.Success -> {
                    val settings = result.data as? Map<*, *>
                    _isOnboardingComplete.value = settings?.get("ai_onboarding_complete") == true
                    _isLoading.value = false
                    logger.debug("VoiceAssistant onboarding status checked", mapOf(
                        "isComplete" to _isOnboardingComplete.value.toString()
                    ))
                }
                is BayitResult.Error -> {
                    _isOnboardingComplete.value = false
                    _isLoading.value = false
                    logger.error("Failed to check onboarding status", result.exception)
                }
                else -> {
                    _isLoading.value = false
                }
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        orchestrator.endSession()
    }
}
