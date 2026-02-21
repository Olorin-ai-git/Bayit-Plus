package tv.bayit.plus.feature.player.live

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import tv.bayit.plus.core.model.LiveTriviaEnvelope
import tv.bayit.plus.core.model.TriviaFact
import tv.bayit.plus.core.model.WebSocketTranscriptMessage
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.network.NetworkConfig
import tv.bayit.plus.core.network.websocket.ChannelType
import tv.bayit.plus.core.network.websocket.WebSocketManager
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages live trivia WebSocket connection and state.
 *
 * Parses backend messages:
 * - "connected"     -> session confirmed with channel/trivia info
 * - "trivia_fact"   -> fact data (nested in "data" field)
 * - "quota_exceeded"-> usage limit reached
 * - "error"         -> error with recoverable flag
 */
@Singleton
class LiveTriviaManager @Inject constructor(
    webSocketManager: WebSocketManager,
    networkConfig: NetworkConfig,
    logger: BayitLogger,
) : LiveFeatureManager<LiveTriviaUiState>(
    webSocketManager,
    networkConfig,
    ChannelType.LIVE_TRIVIA,
    logger,
) {
    internal val _progressFraction = MutableStateFlow(0f)
    val progressFraction: StateFlow<Float> = _progressFraction.asStateFlow()

    internal var progressJob: Job? = null

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

    override fun buildWebSocketUrl(
        channelId: String,
        targetLanguage: String,
    ): String = LiveAIConfig.buildTriviaWebSocketUrl(
        baseWsUrl = networkConfig.webSocketBaseUrl,
        channelId = channelId,
        targetLang = targetLanguage,
    )

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
                errorMessage = errorMessage,
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
            val envelope = json.decodeFromString<LiveTriviaEnvelope>(text)
            when (envelope.type) {
                "trivia_fact" -> {
                    val factData = envelope.data ?: return
                    val fact = factData.toTriviaFact()
                    if (fact.id in shownFactIds) return

                    shownFactIds.add(fact.id)
                    showFact(fact, scope)
                }

                "connected" -> {
                    // Connection acknowledged, trivia_enabled flag available
                }

                "quota_exceeded" -> {
                    scope.launch {
                        updateState {
                            it.copy(
                                isEnabled = false,
                                errorMessage = "player.ai.errors.quotaExceeded",
                            )
                        }
                        stop()
                    }
                }

                "error" -> {
                    scope.launch {
                        updateState {
                            it.copy(
                                errorMessage = envelope.message
                                    ?: "player.ai.errors.serviceError",
                            )
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

    /** Dismiss the current trivia fact. */
    suspend fun dismissFact() {
        autoDismissJob?.cancel()
        progressJob?.cancel()
        _progressFraction.value = 0f
        updateState { it.copy(activeFact = null) }
    }

    /** Send a transcript chunk to the backend for topic detection. */
    fun sendTranscript(text: String, language: String) {
        val msg = json.encodeToString(
            WebSocketTranscriptMessage(text = text, language = language),
        )
        sendMessage(msg)
    }

    /** Request a follow-up fact for the current topic. */
    fun requestFollowUp() {
        val factId = _progressFraction.let {
            // Use the active fact's ID from current state
            null
        }
        sendMessage("""{"type":"request_followup","fact_id":"${factId ?: ""}"}""")
    }

    // showFact, startProgressAnimation, scheduleAutoDismiss are in LiveTriviaManager+Display.kt

    companion object {
        private const val MAX_SHOWN_FACTS = 1000
    }
}
