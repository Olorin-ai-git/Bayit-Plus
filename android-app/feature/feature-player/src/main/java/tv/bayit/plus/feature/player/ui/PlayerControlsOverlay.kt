package tv.bayit.plus.feature.player.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.FiberManualRecord
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Glassmorphic transport controls displayed at the bottom of the video surface.
 *
 * For VOD content: seek slider, play/pause, time display.
 * For live content: play/pause with a LIVE indicator (no seek bar).
 */
@Composable
fun PlayerControlsOverlay(
    isPlaying: Boolean,
    currentPositionMs: Long,
    totalDurationMs: Long,
    isLiveContent: Boolean,
    onPlayPause: () -> Unit,
    onSeek: (Float) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.lg,
                backgroundColor = DesignTokens.Colors.Glass.bgMedium,
            )
            .padding(
                horizontal = DesignTokens.Spacing.base,
                vertical = DesignTokens.Spacing.sm,
            ),
    ) {
        if (!isLiveContent) {
            VodSeekBar(
                currentPositionMs = currentPositionMs,
                totalDurationMs = totalDurationMs,
                onSeek = onSeek,
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onPlayPause) {
                    Icon(
                        imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                        contentDescription = if (isPlaying) bayitString("player.controls.pause") else bayitString("player.controls.play"),
                        tint = DesignTokens.Colors.Text.primary,
                        modifier = Modifier.size(32.dp),
                    )
                }

                Spacer(modifier = Modifier.width(DesignTokens.Spacing.sm))

                if (isLiveContent) {
                    LiveIndicator()
                } else {
                    TimeDisplay(
                        currentPositionMs = currentPositionMs,
                        totalDurationMs = totalDurationMs,
                    )
                }
            }
        }
    }
}

@Composable
private fun VodSeekBar(
    currentPositionMs: Long,
    totalDurationMs: Long,
    onSeek: (Float) -> Unit,
) {
    val progress = if (totalDurationMs > 0) {
        (currentPositionMs.toFloat() / totalDurationMs.toFloat()).coerceIn(0f, 1f)
    } else {
        0f
    }

    Slider(
        value = progress,
        onValueChange = onSeek,
        modifier = Modifier.fillMaxWidth(),
        colors = SliderDefaults.colors(
            thumbColor = DesignTokens.Colors.Primary.light,
            activeTrackColor = DesignTokens.Colors.Primary.light,
            inactiveTrackColor = DesignTokens.Colors.Glass.border,
        ),
    )
}

@Composable
private fun TimeDisplay(currentPositionMs: Long, totalDurationMs: Long) {
    Text(
        text = formatTimestamp(currentPositionMs),
        color = DesignTokens.Colors.Text.primary,
        fontSize = DesignTokens.FontSize.sm,
    )
    Text(
        text = " / ",
        color = DesignTokens.Colors.Text.muted,
        fontSize = DesignTokens.FontSize.sm,
    )
    Text(
        text = formatTimestamp(totalDurationMs),
        color = DesignTokens.Colors.Text.secondary,
        fontSize = DesignTokens.FontSize.sm,
    )
}

@Composable
private fun LiveIndicator() {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = Icons.Default.FiberManualRecord,
            contentDescription = null,
            tint = DesignTokens.Colors.live,
            modifier = Modifier.size(12.dp),
        )
        Spacer(modifier = Modifier.width(DesignTokens.Spacing.xs))
        Text(
            text = bayitString("player.liveBadge"),
            color = DesignTokens.Colors.live,
            fontSize = DesignTokens.FontSize.sm,
        )
    }
}

internal fun formatTimestamp(ms: Long): String {
    val totalSeconds = ms / 1000
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) {
        String.format("%d:%02d:%02d", hours, minutes, seconds)
    } else {
        String.format("%d:%02d", minutes, seconds)
    }
}
