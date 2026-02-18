package tv.bayit.plus.core.voice

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/** State machine for the voice interaction pipeline. */
enum class VoiceState {
    IDLE,
    LISTENING,
    PROCESSING,
    SPEAKING,
    ERROR,
}

/** What triggered the voice interaction. */
@Serializable
enum class VoiceTrigger {
    @SerialName("manual") MANUAL,
    @SerialName("wake-word") WAKE_WORD,
}

/** Intent types recognized by the backend voice/unified endpoint. */
@Serializable
enum class VoiceIntentType {
    @SerialName("CHAT") CHAT,
    @SerialName("SEARCH") SEARCH,
    @SerialName("NAVIGATION") NAVIGATION,
    @SerialName("PLAYLIST") PLAYLIST,
    @SerialName("CHANNEL") CHANNEL,
    @SerialName("PLAYBACK") PLAYBACK,
    @SerialName("DUBBING") DUBBING,
    @SerialName("SUBTITLE") SUBTITLE,
    @SerialName("SETTINGS") SETTINGS,
    @SerialName("WIDGET") WIDGET,
    @SerialName("UNKNOWN") UNKNOWN,
}

/** Action payload returned by the voice backend. */
@Serializable
data class VoiceAction(
    val type: String,
    val payload: Map<String, JsonElement>? = null,
)

/** Gesture animation hint from the backend. */
@Serializable
data class GestureState(
    val gesture: String,
    val duration: Int? = null,
)

/** Request body for POST /api/v1/voice/unified. */
@Serializable
data class VoiceRequest(
    val transcript: String,
    val language: String,
    @SerialName("conversation_id") val conversationId: String? = null,
    val platform: String,
    @SerialName("trigger_type") val triggerType: String,
)

/** Response body from POST /api/v1/voice/unified. */
@Serializable
data class VoiceResponse(
    val intent: VoiceIntentType,
    @SerialName("spoken_response") val spokenResponse: String? = null,
    val action: VoiceAction? = null,
    @SerialName("conversation_id") val conversationId: String? = null,
    val confidence: Double? = null,
    val gesture: GestureState? = null,
)

/** Messages received from the voice WebSocket server. */
sealed class VoiceWSIncoming {
    data class TranscriptPartial(val text: String) : VoiceWSIncoming()
    data class TranscriptFinal(val text: String) : VoiceWSIncoming()
    data class LlmChunk(val text: String) : VoiceWSIncoming()
    data class TtsAudio(val data: ByteArray) : VoiceWSIncoming()
    data class IntentAction(
        val intent: VoiceIntentType,
        val text: String,
        val action: VoiceAction,
        val confidence: Double? = null,
        val gesture: GestureState? = null,
    ) : VoiceWSIncoming()
    data class Complete(val conversationId: String?) : VoiceWSIncoming()
    data object Cancelled : VoiceWSIncoming()
    data class Error(val message: String) : VoiceWSIncoming()
    data object Pong : VoiceWSIncoming()
}

/** Result from on-device speech recognition. */
data class SpeechResult(
    val transcription: String,
    val isFinal: Boolean,
    val confidence: Float,
)

/** Permission status for voice features. */
data class VoicePermissions(
    val microphone: Boolean,
    val speechRecognition: Boolean,
) {
    val allGranted: Boolean get() = microphone && speechRecognition
}

/** Metadata about an available TTS voice. */
data class TTSVoiceInfo(
    val id: String,
    val name: String,
    val language: String,
    val quality: TTSVoiceQuality,
)

/** TTS voice quality tier. */
@Serializable
enum class TTSVoiceQuality {
    @SerialName("default") STANDARD,
    @SerialName("enhanced") ENHANCED,
    @SerialName("premium") PREMIUM,
}
