package tv.bayit.plus.feature.byoc

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.logging.BayitLogger
import javax.inject.Inject

private const val DISMISS_THRESHOLD_FOR_PERMANENT = 3
private const val SESSION_GAP_BEFORE_RESHOW = 2

@HiltViewModel
class AIGatewayViewModel @Inject constructor(
    private val gatewayDataStore: AIGatewayDataStore,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _state = MutableStateFlow(AIGatewayState())
    val state: StateFlow<AIGatewayState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val loaded = gatewayDataStore.load()
            _state.value = loaded
        }
    }

    fun incrementSession() {
        viewModelScope.launch {
            gatewayDataStore.incrementSession()
            _state.value = gatewayDataStore.load()
        }
    }

    fun dismiss() {
        viewModelScope.launch {
            val current = _state.value
            gatewayDataStore.dismiss(current.sessionCount)
            _state.value = gatewayDataStore.load()
            logger.debug(
                "AI Gateway card dismissed",
                mapOf("dismissCount" to (current.dismissCount + 1).toString()),
            )
        }
    }

    fun permanentlyDismiss() {
        viewModelScope.launch {
            gatewayDataStore.permanentlyDismiss()
            _state.value = gatewayDataStore.load()
            logger.info("AI Gateway card permanently dismissed")
        }
    }

    fun markFirstBYOCPlay() {
        viewModelScope.launch {
            gatewayDataStore.markFirstBYOCPlay()
            _state.value = gatewayDataStore.load()
        }
    }

    fun markFirstAIFeatureUsed() {
        viewModelScope.launch {
            gatewayDataStore.markFirstAIFeatureUsed()
            _state.value = gatewayDataStore.load()
        }
    }

    fun dismissMoreContent() {
        viewModelScope.launch {
            gatewayDataStore.dismissMoreContent()
            _state.value = gatewayDataStore.load()
        }
    }

    fun shouldShowCard(gatewayState: AIGatewayState, hasYouTubeSource: Boolean): Boolean {
        if (hasYouTubeSource) return false
        if (gatewayState.permanentlyDismissed) return false
        if (gatewayState.dismissCount == 0) return true
        val sessionsSinceDismiss = gatewayState.sessionCount - gatewayState.lastDismissSession
        return sessionsSinceDismiss >= SESSION_GAP_BEFORE_RESHOW
    }

    fun showDontShowAgain(gatewayState: AIGatewayState): Boolean {
        return gatewayState.dismissCount >= DISMISS_THRESHOLD_FOR_PERMANENT
    }

    fun shouldShowMoreContentCard(gatewayState: AIGatewayState, hasYouTubeSource: Boolean): Boolean {
        if (!hasYouTubeSource) return false
        if (gatewayState.moreContentDismissed) return false
        return gatewayState.firstBYOCPlayCompleted && gatewayState.firstAIFeatureUsed
    }
}
