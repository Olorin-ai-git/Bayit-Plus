package tv.bayit.plus.core.cast.models

data class CastPlaybackState(
    val currentTime: Long,
    val isPlaying: Boolean,
    val volume: Float,
)
