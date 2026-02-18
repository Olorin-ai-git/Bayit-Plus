package tv.bayit.plus.core.media

/**
 * Immutable snapshot of the audio playback state exposed by [AudioPlaybackManager].
 *
 * Collected by UI layers (mini player, podcast screens) to render controls and progress.
 */
data class AudioPlaybackState(
    val isActive: Boolean = false,
    val isLoading: Boolean = false,
    val isPlaying: Boolean = false,
    val title: String? = null,
    val subtitle: String? = null,
    val artworkUrl: String? = null,
    val contentId: String? = null,
    val currentPositionMs: Long = 0L,
    val durationMs: Long = 0L,
)
