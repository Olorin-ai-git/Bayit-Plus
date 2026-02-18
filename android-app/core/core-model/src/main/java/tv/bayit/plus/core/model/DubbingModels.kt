package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Response from GET /api/v1/live-dubbing/availability/{channelId} */
@Serializable
data class DubbingAvailability(
    @SerialName("channel_id") val channelId: String? = null,
    @SerialName("supported_languages") val supportedLanguages: List<String>? = null,
    @SerialName("is_available") val isAvailable: Boolean? = null,
    @SerialName("default_voice_id") val defaultVoiceId: String? = null,
    @SerialName("default_sync_delay_ms") val defaultSyncDelayMs: Int? = null,
    @SerialName("available_voices") val availableVoices: List<DubbingVoice>? = null,
)

/** A dubbing voice option. */
@Serializable
data class DubbingVoice(
    val id: String,
    val name: String,
    val language: String,
    val description: String? = null,
)

/** Response from GET /api/v1/live/dubbing/voices */
@Serializable
data class VoicesResponse(
    val voices: List<DubbingVoice> = emptyList(),
)

/** Dubbing connection status for tracking UI state. */
enum class DubbingStatus {
    UNAVAILABLE,
    LOADING,
    ACTIVE,
    ERROR,
}

/** Latency report from live dubbing WebSocket. */
@Serializable
data class DubbingLatencyReport(
    @SerialName("avg_stt_ms") val avgSttMs: Double? = null,
    @SerialName("avg_translation_ms") val avgTranslationMs: Double? = null,
    @SerialName("avg_tts_ms") val avgTtsMs: Double? = null,
    @SerialName("avg_total_ms") val avgTotalMs: Double? = null,
    @SerialName("segments_processed") val segmentsProcessed: Int? = null,
    @SerialName("p50_stt_ms") val p50SttMs: Double? = null,
    @SerialName("p95_stt_ms") val p95SttMs: Double? = null,
    @SerialName("p99_stt_ms") val p99SttMs: Double? = null,
    @SerialName("avg_network_roundtrip_ms") val avgNetworkRoundtripMs: Double? = null,
    @SerialName("translation_cache_hit_rate") val translationCacheHitRate: Double? = null,
)

/** Buffer status from live dubbing WebSocket (continuous flow mode). */
@Serializable
data class DubbingBufferStatus(
    @SerialName("buffered_segments") val bufferedSegments: Int? = null,
    @SerialName("buffer_duration_ms") val bufferDurationMs: Long? = null,
    @SerialName("playback_position_ms") val playbackPositionMs: Long? = null,
    @SerialName("estimated_latency_ms") val estimatedLatencyMs: Long? = null,
)

/** Dubbed audio segment received via WebSocket. */
@Serializable
data class DubbedAudioSegment(
    val data: String? = null,
    @SerialName("original_text") val originalText: String? = null,
    @SerialName("translated_text") val translatedText: String? = null,
    val sequence: Int? = null,
    @SerialName("timestamp_ms") val timestampMs: Long? = null,
    @SerialName("latency_ms") val latencyMs: Long? = null,
    @SerialName("video_timestamp_ms") val videoTimestampMs: Long? = null,
    @SerialName("duration_ms") val durationMs: Long? = null,
    @SerialName("processing_time_ms") val processingTimeMs: Long? = null,
)

/** WebSocket connection info sent on successful dubbing connection. */
@Serializable
data class DubbingConnectionInfo(
    @SerialName("session_id") val sessionId: String? = null,
    @SerialName("source_lang") val sourceLang: String? = null,
    @SerialName("target_lang") val targetLang: String? = null,
    @SerialName("voice_id") val voiceId: String? = null,
    @SerialName("sync_delay_ms") val syncDelayMs: Int? = null,
)
