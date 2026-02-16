package tv.bayit.plus.feature.player.live

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import tv.bayit.plus.core.model.TriviaFact
import tv.bayit.plus.core.network.NetworkConfig
import tv.bayit.plus.core.network.websocket.ChannelType
import tv.bayit.plus.core.network.websocket.WebSocketManager
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
private data class TriviaTopic(
    val topic: String? = null,
    val category: String? = null
)

@Serializable
private data class TriviaMessageWrapper(
    val type: String,
    val fact: TriviaFact? = null,
    val detectedTopic: TriviaTopic? = null,
    val message: String? = null
)

@Serializable
private data class TriviaFollowUpRequest(
    val type: String = "request_followup",
    val factId: String
)

/**
 * Manages live trivia WebSocket connection and state
 */
@Singleton
class LiveTriviaManager @Inject constructor(
    webSocketManager: WebSocketManager,
    networkConfig: NetworkConfig
) : LiveFeatureManager<LiveTriviaUiState>(
    webSocketManager,
    networkConfig,
    ChannelType.LIVE_TRIVIA
) {
    private val _progressFraction = MutableStateFlow(0f)
    val progressFraction: StateFlow<Float> = _progressFraction.asStateFlow()

    private var progressJob: Job? = null

    // Bounded set to prevent unbounded growth (LRU-like behavior)
    private val shownFactIds = object : LinkedHashSet<String>() {
        override fun add(element: String): Boolean {
            if (size >= MAX_SHOWN_FACTS) {
                val iterator = iterator()
                if (iterator.hasNext()) {
                    iterator.next()
                    iterator.remove()
                }
            }
            return super.add(element)
        }
    }

    override fun createInitialState() = LiveTriviaUiState()

    override fun buildWebSocketUrl(channelId: String, targetLanguage: String): String {
        return LiveAIConfig.buildTriviaWebSocketUrl(
            baseWsUrl = networkConfig.webSocketBaseUrl,
            channelId = channelId,
            targetLang = targetLanguage
        )
    }

    override fun isEnabled(state: LiveTriviaUiState) = state.isEnabled

    override fun isConnecting(state: LiveTriviaUiState) = state.isConnecting

    override suspend fun setConnecting(isConnecting: Boolean) {
        updateState { it.copy(isConnecting = isConnecting) }
    }

    override suspend fun setEnabled(isEnabled: Boolean, errorMessage: String?) {
        updateState {
            it.copy(
                isEnabled = isEnabled,
                isConnecting = false,
                errorMessage = errorMessage
            )
        }
    }

    override suspend fun stop() {
        progressJob?.cancel()
        shownFactIds.clear()
        _progressFraction.value = 0f
        super.stop()
    }

    override fun handleMessage(text: String, scope: CoroutineScope) {
        try {
            val msg = json.decodeFromString<TriviaMessageWrapper>(text)
            when (msg.type) {
                "trivia_fact" -> {
                    val fact = msg.fact ?: return
                    if (fact.id in shownFactIds) return

                    shownFactIds.add(fact.id)
                    showFact(fact, scope)
                }
                "connected" -> {
                    // Connection acknowledged
                }
                "error" -> {
                    scope.launch {
                        updateState {
                            it.copy(errorMessage = msg.message ?: "player.ai.errors.serviceError")
                        }
                    }
                }
            }
        } catch (e: Exception) {
            scope.launch {
                updateState {
                    it.copy(errorMessage = "player.ai.errors.parseError")
                }
            }
        }
    }

    /**
     * Dismiss the current trivia fact
     */
    suspend fun dismissFact() {
        autoDismissJob?.cancel()
        progressJob?.cancel()
        _progressFraction.value = 0f
        updateState { it.copy(activeFact = null) }
    }

    /**
     * Request a follow-up fact for the current topic
     */
    fun requestFollowUp() {
        // TODO: Implement proper WebSocket send after exposing connection in base class
    }

    private fun showFact(fact: TriviaFact, scope: CoroutineScope) {
        scope.launch {
            updateState { it.copy(activeFact = fact) }
        }
        _progressFraction.value = 0f

        val displayDuration = fact.displayDuration ?: LiveAIConfig.TRIVIA_DEFAULT_DISPLAY_DURATION_SEC
        startProgressAnimation(displayDuration, scope)
        scheduleAutoDismiss(displayDuration * 1000L, scope)
    }

    private fun startProgressAnimation(durationSec: Int, scope: CoroutineScope) {
        progressJob?.cancel()
        progressJob = scope.launch {
            val steps = (durationSec * 10)
            repeat(steps) { step ->
                _progressFraction.value = (step + 1) / steps.toFloat()
                delay(LiveAIConfig.PROGRESS_UPDATE_INTERVAL_MS)
            }
        }
    }

    private fun scheduleAutoDismiss(durationMs: Long, scope: CoroutineScope) {
        autoDismissJob?.cancel()
        autoDismissJob = scope.launch {
            delay(durationMs)
            dismissFact()
        }
    }

    companion object {
        private const val MAX_SHOWN_FACTS = 1000
    }
}
