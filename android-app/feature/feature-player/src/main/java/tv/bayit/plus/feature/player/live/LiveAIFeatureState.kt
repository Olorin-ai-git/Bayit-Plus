package tv.bayit.plus.feature.player.live

import android.net.Uri
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
 * Note: selectedLanguage should be initialized from user preferences, not hardcoded
 */
data class AIFeaturesPanelState(
    val isExpanded: Boolean = false,
    val selectedLanguage: String, // No default - must be provided from config/preferences
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
    // TODO: Move these to remote config for runtime adjustability
    const val SUBTITLE_DISMISS_DURATION_MS = 5000L
    const val DUBBING_OVERLAY_DISMISS_DURATION_MS = 4000L
    const val TRIVIA_DEFAULT_DISPLAY_DURATION_SEC = 15
    const val PROGRESS_UPDATE_INTERVAL_MS = 100L

    // Whitelist of supported language codes for validation
    private val SUPPORTED_LANGUAGE_CODES = setOf(
        "en", "he", "es", "fr", "de", "ru", "ar", "pt"
    )

    /**
     * Supported languages with display names
     */
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
     * Validate and sanitize language code against whitelist
     * @throws IllegalArgumentException if language code is invalid
     */
    fun validateLanguageCode(languageCode: String): String {
        val sanitized = languageCode.trim().lowercase()
        require(sanitized in SUPPORTED_LANGUAGE_CODES) {
            "Invalid language code: $languageCode. Supported: $SUPPORTED_LANGUAGE_CODES"
        }
        return sanitized
    }

    /**
     * Validate WebSocket URL to ensure it uses secure wss:// protocol
     * @throws IllegalArgumentException if URL doesn't use wss://
     */
    private fun validateSecureWebSocketUrl(url: String) {
        require(url.startsWith("wss://")) {
            "WebSocket URL must use secure wss:// protocol, got: ${url.substringBefore("://")}"
        }
    }

    /**
     * Build WebSocket URL for live subtitles with validation and encoding
     */
    fun buildSubtitlesWebSocketUrl(
        baseWsUrl: String,
        channelId: String,
        sourceLang: String,
        targetLang: String
    ): String {
        validateSecureWebSocketUrl(baseWsUrl)
        val validatedSource = validateLanguageCode(sourceLang)
        val validatedTarget = validateLanguageCode(targetLang)

        val encodedChannelId = Uri.encode(channelId)
        val url = "$baseWsUrl/api/v1/ws/live/$encodedChannelId/subtitles?" +
                "source_lang=$validatedSource&target_lang=$validatedTarget"

        return url
    }

    /**
     * Build WebSocket URL for live dubbing with validation and encoding
     */
    fun buildDubbingWebSocketUrl(
        baseWsUrl: String,
        channelId: String,
        targetLang: String
    ): String {
        validateSecureWebSocketUrl(baseWsUrl)
        val validatedTarget = validateLanguageCode(targetLang)

        val encodedChannelId = Uri.encode(channelId)
        val url = "$baseWsUrl/live-dubbing/stream?" +
                "channel_id=$encodedChannelId&target_language=$validatedTarget&platform=android"

        return url
    }

    /**
     * Build WebSocket URL for live trivia with validation and encoding
     */
    fun buildTriviaWebSocketUrl(
        baseWsUrl: String,
        channelId: String,
        targetLang: String
    ): String {
        validateSecureWebSocketUrl(baseWsUrl)
        val validatedTarget = validateLanguageCode(targetLang)

        val encodedChannelId = Uri.encode(channelId)
        val url = "$baseWsUrl/ws/live/$encodedChannelId/trivia?" +
                "target_language=$validatedTarget"

        return url
    }

    /**
     * Get language code abbreviation for display (removed emoji flags per Bayit+ rules)
     */
    fun getLanguageCode(languageCode: String): String {
        return languageCode.uppercase()
    }

    /**
     * Get language display name
     */
    fun getLanguageName(languageCode: String): String {
        return SUPPORTED_LANGUAGES.find { it.first == languageCode }?.second
            ?: languageCode.uppercase()
    }
}
