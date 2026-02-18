package tv.bayit.plus.feature.podcasts.detail

data class PodcastSleepTimerState(
    val isActive: Boolean = false,
    val remainingSeconds: Int = 0,
    val durationMinutes: Int? = null,
)
