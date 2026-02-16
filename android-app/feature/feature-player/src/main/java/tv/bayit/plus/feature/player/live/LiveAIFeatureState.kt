package tv.bayit.plus.feature.player.live

import tv.bayit.plus.core.model.TriviaFact

/**
 * UI state for live subtitle feature
 */
data class LiveSubtitleUiState(
    val isEnabled: Boolean = false,
    val isConnecting: Boolean = false,
    val showOverlay: Boolean = false,
    val translatedText: String = "",
    val originalText: String = "",
    val isQuotaExceeded: Boolean = false,
    val errorMessage: String? = null
)

/**
 * UI state for live dubbing feature
 */
data class LiveDubbingUiState(
    val isEnabled: Boolean = false,
    val isConnecting: Boolean = false,
    val isAvailable: Boolean = false,
    val showOverlay: Boolean = false,
    val transcriptText: String = "",
    val audioUrl: String? = null,
    val errorMessage: String? = null
)

/**
 * UI state for live trivia feature
 */
data class LiveTriviaUiState(
    val isEnabled: Boolean = false,
    val isConnecting: Boolean = false,
    val activeFact: TriviaFact? = null,
    val progressFraction: Float = 0f,
    val errorMessage: String? = null
)

/**
 * Aggregated state for AI features panel
 */
data class AIFeaturesPanelState(
    val isExpanded: Boolean = false,
    val selectedLanguage: String = "en",
    val subtitlesState: LiveSubtitleUiState = LiveSubtitleUiState(),
    val dubbingState: LiveDubbingUiState = LiveDubbingUiState(),
    val triviaState: LiveTriviaUiState = LiveTriviaUiState()
) {
    val hasAnyActiveFeature: Boolean
        get() = subtitlesState.isEnabled || dubbingState.isEnabled || triviaState.isEnabled
}

/**
 * Configuration and URL builders for live AI features
 */
object LiveAIConfig {
    // Auto-dismiss timers
    const val SUBTITLE_DISMISS_DURATION_MS = 5000L
    const val DUBBING_OVERLAY_DISMISS_DURATION_MS = 4000L
    const val TRIVIA_DEFAULT_DISPLAY_DURATION_SEC = 15

    // Progress tracking
    const val PROGRESS_UPDATE_INTERVAL_MS = 100L

    // Supported languages
    val SUPPORTED_LANGUAGES = listOf(
        "en" to "English",
        "he" to "עברית",
        "es" to "Español",
        "fr" to "Français",
        "de" to "Deutsch",
        "ru" to "Русский",
        "ar" to "العربية",
        "pt" to "Português"
    )

    /**
     * Build WebSocket URL for live subtitles
     */
    fun buildSubtitlesWebSocketUrl(
        baseWsUrl: String,
        channelId: String,
        sourceLang: String = "he",
        targetLang: String
    ): String {
        return "$baseWsUrl/api/v1/ws/live/$channelId/subtitles?source_lang=$sourceLang&target_lang=$targetLang"
    }

    /**
     * Build WebSocket URL for live dubbing
     */
    fun buildDubbingWebSocketUrl(
        baseWsUrl: String,
        channelId: String,
        targetLang: String
    ): String {
        return "$baseWsUrl/live-dubbing/stream?channel_id=$channelId&target_language=$targetLang&platform=android"
    }

    /**
     * Build WebSocket URL for live trivia
     */
    fun buildTriviaWebSocketUrl(
        baseWsUrl: String,
        channelId: String,
        targetLang: String
    ): String {
        return "$baseWsUrl/ws/live/$channelId/trivia?target_language=$targetLang"
    }

    /**
     * Get language flag emoji for display
     */
    fun getLanguageFlag(languageCode: String): String {
        return when (languageCode) {
            "en" -> "🇺🇸"
            "he" -> "🇮🇱"
            "es" -> "🇪🇸"
            "fr" -> "🇫🇷"
            "de" -> "🇩🇪"
            "ru" -> "🇷🇺"
            "ar" -> "🇸🇦"
            "pt" -> "🇵🇹"
            else -> "🌐"
        }
    }

    /**
     * Get language display name
     */
    fun getLanguageName(languageCode: String): String {
        return SUPPORTED_LANGUAGES.find { it.first == languageCode }?.second ?: languageCode.uppercase()
    }
}
