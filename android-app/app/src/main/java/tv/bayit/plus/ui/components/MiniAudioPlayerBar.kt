package tv.bayit.plus.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.media.AudioPlaybackState
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassProgressBar
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

private val ARTWORK_SIZE = 72.dp
private val ARTWORK_CORNER = 8.dp
private val BAR_ELEVATION = 8.dp

@Composable
fun MiniAudioPlayerBar(
    audioState: AudioPlaybackState,
    isVisible: Boolean,
    onTogglePlayPause: () -> Unit,
    onSkipBackward: () -> Unit,
    onSkipForward: () -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
) {
    AnimatedVisibility(
        visible = isVisible,
        enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
        exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
        modifier = modifier,
    ) {
        MiniPlayerContent(
            audioState = audioState,
            onTogglePlayPause = onTogglePlayPause,
            onSkipBackward = onSkipBackward,
            onSkipForward = onSkipForward,
            onClose = onClose,
        )
    }
}

@Composable
private fun MiniPlayerContent(
    audioState: AudioPlaybackState,
    onTogglePlayPause: () -> Unit,
    onSkipBackward: () -> Unit,
    onSkipForward: () -> Unit,
    onClose: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = DesignTokens.Spacing.sm)
            .shadow(BAR_ELEVATION, RoundedCornerShape(DesignTokens.Radius.lg))
            .glassMorphism(),
    ) {
        Column(modifier = Modifier.padding(DesignTokens.Spacing.md)) {
            MiniPlayerHeader(audioState = audioState, onClose = onClose)
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            MiniPlayerProgress(audioState = audioState)
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            MiniPlayerControls(
                isPlaying = audioState.isPlaying,
                isLoading = audioState.isLoading,
                onSkipBackward = onSkipBackward,
                onTogglePlayPause = onTogglePlayPause,
                onSkipForward = onSkipForward,
                modifier = Modifier.align(Alignment.CenterHorizontally),
            )
        }
    }
}

@Composable
private fun MiniPlayerHeader(audioState: AudioPlaybackState, onClose: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top,
    ) {
        IconButton(
            onClick = onClose,
            modifier = Modifier.size(DesignTokens.TouchTarget.minimum),
        ) {
            Icon(
                imageVector = Icons.Default.Close,
                contentDescription = bayitString("miniPlayer.closePlayer"),
                tint = DesignTokens.Colors.Text.muted,
            )
        }
        Spacer(modifier = Modifier.width(DesignTokens.Spacing.sm))
        CachedAsyncImage(
            url = audioState.artworkUrl,
            contentDescription = audioState.title,
            modifier = Modifier
                .size(ARTWORK_SIZE)
                .clip(RoundedCornerShape(ARTWORK_CORNER)),
        )
        Spacer(modifier = Modifier.width(DesignTokens.Spacing.md))
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.Center,
        ) {
            audioState.title?.let { title ->
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            audioState.subtitle?.let { subtitle ->
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.labelSmall,
                    color = DesignTokens.Colors.Text.muted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun MiniPlayerProgress(audioState: AudioPlaybackState) {
    val progress = if (audioState.durationMs > 0) {
        (audioState.currentPositionMs.toFloat() / audioState.durationMs.toFloat())
    } else {
        0f
    }

    GlassProgressBar(progress = progress)

    Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxs))

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text = formatDuration(audioState.currentPositionMs),
            style = MaterialTheme.typography.labelSmall,
            color = DesignTokens.Colors.Text.muted,
            fontFamily = FontFamily.Monospace,
        )
        val remaining = (audioState.durationMs - audioState.currentPositionMs).coerceAtLeast(0L)
        Text(
            text = "-${formatDuration(remaining)}",
            style = MaterialTheme.typography.labelSmall,
            color = DesignTokens.Colors.Text.muted,
            fontFamily = FontFamily.Monospace,
        )
    }
}

private fun formatDuration(ms: Long): String {
    val totalSeconds = ms / 1000
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) {
        "%d:%02d:%02d".format(hours, minutes, seconds)
    } else {
        "%d:%02d".format(minutes, seconds)
    }
}
