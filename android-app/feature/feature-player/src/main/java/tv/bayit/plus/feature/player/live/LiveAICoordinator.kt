package tv.bayit.plus.feature.player.live

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import tv.bayit.plus.feature.player.di.ApplicationScope
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Coordinates all live AI features with mutual exclusivity enforcement
 * and aggregated panel state
 */
@Singleton
class LiveAICoordinator @Inject constructor(
    private val subtitlesManager: LiveSubtitlesManager,
    private val dubbingManager: LiveDubbingManager,
    private val triviaManager: LiveTriviaManager,
    @ApplicationScope private val applicationScope: CoroutineScope
) {
    private val _selectedLanguage = MutableStateFlow("en")
    val selectedLanguage: StateFlow<String> = _selectedLanguage.asStateFlow()

    private val _isPanelExpanded = MutableStateFlow(false)
    val isPanelExpanded: StateFlow<Boolean> = _isPanelExpanded.asStateFlow()

    // Expose state flows directly from coordinator (not through managers)
    val subtitleState: StateFlow<LiveSubtitleUiState> = subtitlesManager.state
    val dubbingState: StateFlow<LiveDubbingUiState> = dubbingManager.state
    val triviaState: StateFlow<LiveTriviaUiState> = triviaManager.state
    val triviaProgress: StateFlow<Float> = triviaManager.progressFraction

    /**
     * Aggregated panel state combining all feature states
     */
    val panelState: StateFlow<AIFeaturesPanelState> = combine(
        _isPanelExpanded,
        _selectedLanguage,
        subtitlesManager.state,
        dubbingManager.state,
        triviaManager.state
    ) { expanded, language, subtitles, dubbing, trivia ->
        AIFeaturesPanelState(
            isExpanded = expanded,
            selectedLanguage = language,
            subtitlesState = subtitles,
            dubbingState = dubbing,
            triviaState = trivia
        )
    }.stateIn(
        scope = applicationScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = AIFeaturesPanelState(selectedLanguage = _selectedLanguage.value)
    )

    /**
     * Initialize with user's preferred language
     */
    fun setInitialLanguage(language: String) {
        _selectedLanguage.value = language
    }

    /**
     * Toggle AI features panel expanded/collapsed
     */
    fun togglePanel() {
        _isPanelExpanded.value = !_isPanelExpanded.value
    }

    /**
     * Expand the AI features panel
     */
    fun expandPanel() {
        _isPanelExpanded.value = true
    }

    /**
     * Collapse the AI features panel
     */
    fun collapsePanel() {
        _isPanelExpanded.value = false
    }

    /**
     * Toggle live subtitles (enforces mutual exclusivity with dubbing)
     */
    suspend fun toggleSubtitles(channelId: String, scope: CoroutineScope) {
        if (subtitlesManager.state.value.isEnabled) {
            subtitlesManager.stop()
        } else {
            dubbingManager.stop()
            subtitlesManager.start(channelId, _selectedLanguage.value, scope)
        }
    }

    /**
     * Toggle live dubbing (enforces mutual exclusivity with subtitles)
     */
    suspend fun toggleDubbing(channelId: String, scope: CoroutineScope) {
        if (dubbingManager.state.value.isEnabled) {
            dubbingManager.stop()
        } else {
            subtitlesManager.stop()
            dubbingManager.start(channelId, _selectedLanguage.value, scope)
        }
    }

    /**
     * Toggle live trivia (independent of subtitles/dubbing)
     */
    suspend fun toggleTrivia(channelId: String, scope: CoroutineScope) {
        if (triviaManager.state.value.isEnabled) {
            triviaManager.stop()
        } else {
            triviaManager.start(channelId, _selectedLanguage.value, scope)
        }
    }

    /**
     * Select a new language and reconnect active features
     */
    suspend fun selectLanguage(
        language: String,
        channelId: String,
        scope: CoroutineScope
    ) {
        val wasSubtitlesEnabled = subtitlesManager.state.value.isEnabled
        val wasDubbingEnabled = dubbingManager.state.value.isEnabled
        val wasTriviaEnabled = triviaManager.state.value.isEnabled

        _selectedLanguage.value = language

        if (wasSubtitlesEnabled) {
            subtitlesManager.stop()
            subtitlesManager.start(channelId, language, scope)
        }
        if (wasDubbingEnabled) {
            dubbingManager.stop()
            dubbingManager.start(channelId, language, scope)
        }
        if (wasTriviaEnabled) {
            triviaManager.stop()
            triviaManager.start(channelId, language, scope)
        }
    }

    /**
     * Dismiss the current trivia fact
     */
    suspend fun dismissTrivia() {
        triviaManager.dismissFact()
    }

    /**
     * Request a follow-up trivia fact
     */
    fun requestTriviaFollowUp() {
        triviaManager.requestFollowUp()
    }

    /**
     * Clean up all connections (call on player exit)
     */
    suspend fun cleanupAll() {
        subtitlesManager.stop()
        dubbingManager.stop()
        triviaManager.stop()
        _isPanelExpanded.value = false
    }
}
