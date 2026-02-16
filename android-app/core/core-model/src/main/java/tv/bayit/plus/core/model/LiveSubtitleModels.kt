package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** WebSocket message for live subtitle translation. */
@Serializable
data class LiveSubtitleMessage(
    val type: String,
    val text: String? = null,
    @SerialName("translated_text") val translatedText: String? = null,
    @SerialName("original_language") val originalLanguage: String? = null,
    @SerialName("target_language") val targetLanguage: String? = null,
    val timestamp: Double? = null,
    @SerialName("is_final") val isFinal: Boolean = true,
    @SerialName("segment_id") val segmentId: String? = null,
)

/** WebSocket message for live dubbing audio. */
@Serializable
data class LiveDubbingMessage(
    val type: String,
    @SerialName("audio_url") val audioUrl: String? = null,
    @SerialName("original_text") val originalText: String? = null,
    @SerialName("translated_text") val translatedText: String? = null,
    @SerialName("source_language") val sourceLanguage: String? = null,
    @SerialName("target_language") val targetLanguage: String? = null,
    val timestamp: Double? = null,
    @SerialName("voice_id") val voiceId: String? = null,
)

/** WebSocket message for live trivia facts. */
@Serializable
data class LiveTriviaMessage(
    val type: String,
    val fact: TriviaFact? = null,
    @SerialName("channel_id") val channelId: String? = null,
    val timestamp: Double? = null,
)
