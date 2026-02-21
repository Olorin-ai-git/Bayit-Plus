package tv.bayit.plus.core.voice

/** Configuration for wake word detection: sensitivity (0-1), cooldown, and phrase. */
data class WakeWordConfig(
    val sensitivity: Float = WakeWordDefaults.SENSITIVITY,
    val cooldownMs: Long = WakeWordDefaults.COOLDOWN_MS,
    val wakePhrase: String = WakeWordDefaults.WAKE_PHRASE,
)

internal object WakeWordDefaults {
    const val SENSITIVITY = 0.5f
    const val COOLDOWN_MS = 3000L
    const val WAKE_PHRASE = "hey bayit"
}
