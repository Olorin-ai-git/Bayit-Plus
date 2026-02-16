package tv.bayit.plus.feature.player

import androidx.media3.exoplayer.ExoPlayer

/**
 * UI state for the Player screen, pattern-matched in the Compose layer.
 */
sealed interface PlayerUiState {
    data object Loading : PlayerUiState

    data class Ready(
        val contentId: String,
        val title: String,
        val description: String?,
        val exoPlayer: ExoPlayer?,
        val isLiveContent: Boolean = false,
        val channelId: String? = null,
    ) : PlayerUiState

    data class Error(val message: String) : PlayerUiState
}
