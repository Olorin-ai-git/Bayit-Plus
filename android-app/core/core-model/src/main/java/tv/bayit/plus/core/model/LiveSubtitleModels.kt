package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Envelope for all live subtitle WebSocket messages.
 * Backend sends: {"type": "final_subtitle", "data": {...}} or {"type": "connected", ...}
 */
@Serializable
data class LiveSubtitleEnvelope(
    val type: String,
    val data: LiveSubtitleCueData? = null,
    val message: String? = null,
    val recoverable: Boolean? = null,
    @SerialName("source_lang") val sourceLang: String? = null,
    @SerialName("target_lang") val targetLang: String? = null,
    @SerialName("channel_id") val channelId: String? = null,
    @SerialName("stt_provider") val sttProvider: String? = null,
    @SerialName("translation_provider") val translationProvider: String? = null,
    @SerialName("enable_predictive") val enablePredictive: Boolean? = null,
    val timestamp: Double? = null,
)

/** Flat message model for live subtitle overlay display. */
@Serializable
data class LiveSubtitleMessage(
    val type: String? = null,
    @SerialName("is_final") val isFinal: Boolean = false,
    val text: String? = null,
    @SerialName("original_language") val originalLanguage: String? = null,
    @SerialName("translated_text") val translatedText: String? = null,
    @SerialName("target_language") val targetLanguage: String? = null,
)

/** Nested data payload for subtitle cues (final_subtitle / partial_subtitle). */
@Serializable
data class LiveSubtitleCueData(
    val text: String? = null,
    @SerialName("original_text") val originalText: String? = null,
    val timestamp: Double? = null,
    @SerialName("source_lang") val sourceLang: String? = null,
    @SerialName("target_lang") val targetLang: String? = null,
    val confidence: Double? = null,
    @SerialName("is_partial") val isPartial: Boolean? = null,
    @SerialName("subtitle_type") val subtitleType: String? = null,
)

/**
 * Envelope for all live dubbing WebSocket messages.
 * Backend sends: {"type": "dubbed_audio", "data": {...}} or {"type": "latency_report", ...}
 */
@Serializable
data class LiveDubbingEnvelope(
    val type: String,
    val data: DubbedAudioSegment? = null,
    val error: String? = null,
    val recoverable: Boolean? = null,
    @SerialName("session_id") val sessionId: String? = null,
    @SerialName("source_lang") val sourceLang: String? = null,
    @SerialName("target_lang") val targetLang: String? = null,
    @SerialName("voice_id") val voiceId: String? = null,
    @SerialName("sync_delay_ms") val syncDelayMs: Int? = null,
    @SerialName("avg_stt_ms") val avgSttMs: Double? = null,
    @SerialName("avg_translation_ms") val avgTranslationMs: Double? = null,
    @SerialName("avg_tts_ms") val avgTtsMs: Double? = null,
    @SerialName("avg_total_ms") val avgTotalMs: Double? = null,
    @SerialName("segments_processed") val segmentsProcessed: Int? = null,
    @SerialName("buffered_segments") val bufferedSegments: Int? = null,
    @SerialName("buffer_duration_ms") val bufferDurationMs: Long? = null,
    @SerialName("playback_position_ms") val playbackPositionMs: Long? = null,
    @SerialName("estimated_latency_ms") val estimatedLatencyMs: Long? = null,
)

/**
 * Envelope for all live trivia WebSocket messages.
 * Backend sends: {"type": "trivia_fact", "data": {...}} or {"type": "connected", ...}
 */
@Serializable
data class LiveTriviaEnvelope(
    val type: String,
    val data: LiveTriviaFactData? = null,
    val message: String? = null,
    val recoverable: Boolean? = null,
    @SerialName("channel_id") val channelId: String? = null,
    @SerialName("trivia_enabled") val triviaEnabled: Boolean? = null,
    @SerialName("source_language") val sourceLanguage: String? = null,
)

/** Nested data payload for trivia facts from WebSocket. */
@Serializable
data class LiveTriviaFactData(
    @SerialName("fact_id") val factId: String? = null,
    val text: String? = null,
    @SerialName("text_en") val textEn: String? = null,
    @SerialName("text_es") val textEs: String? = null,
    val category: String? = null,
    val source: String? = null,
    @SerialName("display_duration") val displayDuration: Int? = null,
    val priority: Int? = null,
    @SerialName("related_person") val relatedPerson: String? = null,
) {
    /** Convert to the shared TriviaFact model. */
    fun toTriviaFact(): TriviaFact = TriviaFact(
        id = factId ?: "",
        textHe = text,
        textEn = textEn,
        textEs = textEs,
        category = category,
        displayDuration = displayDuration,
        priority = priority,
        relatedPerson = relatedPerson,
    )
}

/** WebSocket authentication message sent as first message after connection. */
@Serializable
data class WebSocketAuthMessage(
    val type: String = "authenticate",
    val token: String,
)

/** WebSocket sync status message (client to server for dubbing). */
@Serializable
data class WebSocketSyncStatus(
    val type: String = "sync_status",
    @SerialName("current_video_time_ms") val currentVideoTimeMs: Long,
)

/** WebSocket transcript message (client to server for trivia). */
@Serializable
data class WebSocketTranscriptMessage(
    val type: String = "transcript",
    val text: String,
    val language: String,
)

/** WebSocket pong message (client to server in response to ping). */
@Serializable
data class WebSocketPongMessage(
    val type: String = "pong",
    val timestamp: Double,
)
