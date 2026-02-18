package tv.bayit.plus.core.voice

/** Configuration for voice pipeline timeouts, injectable for testing. */
data class VoiceConfig(
    val speakingTimeoutMs: Long,
    val errorRecoveryMs: Long,
    val platform: String,
    val defaultLanguage: String,
)
