package tv.bayit.plus.core.voice

import kotlinx.coroutines.flow.Flow

/** Configuration for voice pipeline timeouts, injectable for testing. */
data class VoiceConfig(
    val speakingTimeoutMs: Long,
    val errorRecoveryMs: Long,
    val platform: String,
    val defaultLanguage: String,
)

/** On-device speech recognition abstraction. */
interface SpeechRecognitionService {
    fun startRecognition(language: String): Pair<Flow<SpeechResult>, () -> Unit>
}

/** Text-to-speech playback abstraction. */
interface TTSService {
    fun speak(text: String, language: String)
    fun stop()
}

/** WebSocket client for streaming voice interactions. */
interface VoiceWebSocketClient {
    fun connect(conversationId: String?)
    fun disconnect()
}
