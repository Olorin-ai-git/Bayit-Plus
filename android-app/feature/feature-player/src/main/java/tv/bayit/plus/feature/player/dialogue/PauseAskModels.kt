package tv.bayit.plus.feature.player.dialogue

/**
 * Phases of the Pause-to-Ask dialogue flow.
 *
 * Mirrors the iOS `PauseAskPhase` enum for feature parity.
 * The user progresses through these phases sequentially:
 * character selection, question input, server processing,
 * avatar lip-sync playback, transition, character response, and idle.
 */
enum class PauseAskPhase {
    SELECTING,
    INPUT,
    POLISHING,
    USER_SPEAKING,
    TRANSITION,
    CHARACTER_SPEAKING,
    IDLE,
}
