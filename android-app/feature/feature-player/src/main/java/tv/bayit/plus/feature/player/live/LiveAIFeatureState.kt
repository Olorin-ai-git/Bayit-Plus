package tv.bayit.plus.feature.player.live

import android.net.Uri
import tv.bayit.plus.core.model.TriviaFact

/** UI state for live subtitle feature. */
data class LiveSubtitleUiState(
    val isEnabled: Boolean = false,
    val isConnecting: Boolean = false,
    val showOverlay: Boolean = false,
    val translatedText: String = "",
    val originalText: String = "",
    val confidence: Double? = null,
    val sourceLang: String? = null,
    val targetLang: String? = null,
    val isQuotaExceeded: Boolean = false,
    val errorMessage: String? = null,
)

/** UI state for live dubbing feature. */
data class LiveDubbingUiState(
    val isEnabled: Boolean = false,
    val isConnecting: Boolean = false,
    val isAvailable: Boolean = false,
    val showOverlay: Boolean = false,
    val transcriptText: String = "",
    val originalText: String = "",
    val latencyMs: Long? = null,
    val avgLatencyMs: Long? = null,
    val dubbedVolume: Float = 0.8f,
    val originalVolume: Float = 0.3f,
    val voiceId: String? = null,
    val voiceName: String? = null,
    val bufferedSegments: Int? = null,
    val estimatedLatencyMs: Long? = null,
    val errorMessage: String? = null,
)

/** UI state for live trivia feature. */
data class LiveTriviaUiState(
    val isEnabled: Boolean = false,
    val isConnecting: Boolean = false,
    val activeFact: TriviaFact? = null,
    val progressFraction: Float = 0f,
    val errorMessage: String? = null,
)

/**
 * Aggregated state for AI features panel.
 * Note: selectedLanguage should be initialized from user preferences, not hardcoded.
 */
data class AIFeaturesPanelState(
    val isExpanded: Boolean = false,
    val selectedLanguage: String,
    val subtitlesState: LiveSubtitleUiState = LiveSubtitleUiState(),
    val dubbingState: LiveDubbingUiState = LiveDubbingUiState(),
    val triviaState: LiveTriviaUiState = LiveTriviaUiState(),
) {
    val hasAnyActiveFeature: Boolean
        get() = subtitlesState.isEnabled ||
            dubbingState.isEnabled ||
            triviaState.isEnabled
}

/** Configuration and URL builders for live AI features. */
object LiveAIConfig {
    const val SUBTITLE_DISMISS_DURATION_MS = 5000L
    const val DUBBING_OVERLAY_DISMISS_DURATION_MS = 4000L
    const val TRIVIA_DEFAULT_DISPLAY_DURATION_SEC = 15
    const val PROGRESS_UPDATE_INTERVAL_MS = 100L

    private val SUPPORTED_LANGUAGE_CODES = setOf(
        "en", "he", "es", "fr", "de", "ru", "ar", "pt",
    )

    val SUPPORTED_LANGUAGES = listOf(
        "en" to "English",
        "he" to "\u05E2\u05D1\u05E8\u05D9\u05EA",
        "es" to "Espa\u00F1ol",
        "fr" to "Fran\u00E7ais",
        "de" to "Deutsch",
        "ru" to "\u0420\u0443\u0441\u0441\u043A\u0438\u0439",
        "ar" to "\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
        "pt" to "Portugu\u00EAs",
    )

    fun validateLanguageCode(languageCode: String): String {
        val sanitized = languageCode.trim().lowercase()
        require(sanitized in SUPPORTED_LANGUAGE_CODES) {
            "Invalid language code: $languageCode. Supported: $SUPPORTED_LANGUAGE_CODES"
        }
        return sanitized
    }

    private fun validateSecureWebSocketUrl(url: String) {
        require(url.startsWith("wss://")) {
            "WebSocket URL must use secure wss:// protocol, got: ${url.substringBefore("://")}"
        }
    }

    fun buildSubtitlesWebSocketUrl(
        baseWsUrl: String,
        channelId: String,
        sourceLang: String,
        targetLang: String,
    ): String {
        validateSecureWebSocketUrl(baseWsUrl)
        val validatedSource = validateLanguageCode(sourceLang)
        val validatedTarget = validateLanguageCode(targetLang)
        val encodedChannelId = Uri.encode(channelId)
        return "$baseWsUrl/api/v1/ws/live/$encodedChannelId/subtitles?" +
            "source_lang=$validatedSource&target_lang=$validatedTarget&platform=android"
    }

    fun buildDubbingWebSocketUrl(
        baseWsUrl: String,
        channelId: String,
        targetLang: String,
        voiceId: String? = null,
    ): String {
        validateSecureWebSocketUrl(baseWsUrl)
        val validatedTarget = validateLanguageCode(targetLang)
        val encodedChannelId = Uri.encode(channelId)
        val base = "$baseWsUrl/api/v1/ws/live/$encodedChannelId/dubbing?" +
            "target_lang=$validatedTarget&platform=android&continuous_flow=true"
        return if (voiceId != null) "$base&voice_id=${Uri.encode(voiceId)}" else base
    }

    fun buildTriviaWebSocketUrl(
        baseWsUrl: String,
        channelId: String,
        targetLang: String,
    ): String {
        validateSecureWebSocketUrl(baseWsUrl)
        val validatedTarget = validateLanguageCode(targetLang)
        val encodedChannelId = Uri.encode(channelId)
        return "$baseWsUrl/api/v1/ws/live/$encodedChannelId/trivia?" +
            "target_language=$validatedTarget&platform=android"
    }

    fun getLanguageCode(languageCode: String): String = languageCode.uppercase()

    fun getLanguageName(languageCode: String): String =
        SUPPORTED_LANGUAGES.find { it.first == languageCode }?.second
            ?: languageCode.uppercase()
}
