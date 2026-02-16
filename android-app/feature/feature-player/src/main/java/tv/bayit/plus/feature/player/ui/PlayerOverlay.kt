package tv.bayit.plus.feature.player.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import tv.bayit.plus.core.media.PlayerState
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize

/**
 * Full-screen overlay container that layers controls, subtitles, and trivia
 * on top of the video surface. Mirrors the iOS PlayerView ZStack layout.
 *
 * Tapping the overlay area toggles controls visibility. The top bar and
 * transport bar fade in/out together, while subtitle and trivia overlays
 * render independently based on their own state.
 */
@Composable
fun PlayerOverlay(
    title: String,
    isControlsVisible: Boolean,
    playerState: PlayerState,
    isPlaying: Boolean,
    currentPositionMs: Long,
    totalDurationMs: Long,
    isLiveContent: Boolean,
    onToggleControls: () -> Unit,
    onBack: () -> Unit,
    onPlayPause: () -> Unit,
    onSeek: (Float) -> Unit,
    modifier: Modifier = Modifier,
    selectedSubtitleLanguage: String? = null,
    isSplitSubtitleMode: Boolean = false,
    primarySubtitleLanguage: String? = null,
    secondarySubtitleLanguage: String? = null,
    onSubtitlePickerClick: (() -> Unit)? = null,
    onAIFeaturesClick: (() -> Unit)? = null,
    subtitleOverlay: @Composable (() -> Unit)? = null,
    triviaOverlay: @Composable (() -> Unit)? = null,
    aiFeaturesPanel: @Composable (() -> Unit)? = null,
) {
    val interactionSource = remember { MutableInteractionSource() }

    Box(
        modifier = modifier
            .fillMaxSize()
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onToggleControls,
            ),
    ) {
        if (playerState is PlayerState.Buffering) {
            GlassSpinner(
                size = SpinnerSize.LARGE,
                modifier = Modifier.align(Alignment.Center),
            )
        }

        subtitleOverlay?.invoke()
        triviaOverlay?.invoke()
        aiFeaturesPanel?.invoke()

        AnimatedVisibility(
            visible = isControlsVisible,
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                PlayerTopBar(
                    title = title,
                    isLiveContent = isLiveContent,
                    onBack = onBack,
                    selectedSubtitleLanguage = selectedSubtitleLanguage,
                    isSplitSubtitleMode = isSplitSubtitleMode,
                    primarySubtitleLanguage = primarySubtitleLanguage,
                    secondarySubtitleLanguage = secondarySubtitleLanguage,
                    onSubtitlePickerClick = onSubtitlePickerClick,
                    onAIFeaturesClick = onAIFeaturesClick,
                    modifier = Modifier.align(Alignment.TopCenter),
                )

                PlayerControlsOverlay(
                    isPlaying = isPlaying,
                    currentPositionMs = currentPositionMs,
                    totalDurationMs = totalDurationMs,
                    isLiveContent = isLiveContent,
                    onPlayPause = onPlayPause,
                    onSeek = onSeek,
                    modifier = Modifier.align(Alignment.BottomCenter),
                )
            }
        }
    }
}
