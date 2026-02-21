package tv.bayit.plus.feature.player.ui

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FiberManualRecord
import androidx.compose.material.icons.filled.Forward30
import androidx.compose.material.icons.filled.RecordVoiceOver
import androidx.compose.material.icons.filled.Replay
import androidx.compose.material.icons.filled.Replay30
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material.icons.filled.VolumeOff
import androidx.compose.material.icons.filled.VolumeUp
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
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun VodSeekBar(
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
internal fun VolumeSlider(volume: Float, onVolumeChange: (Float) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = DesignTokens.Spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = Icons.Default.VolumeOff,
            contentDescription = null,
            tint = DesignTokens.Colors.Text.muted,
            modifier = Modifier.size(18.dp),
        )
        Slider(
            value = volume,
            onValueChange = onVolumeChange,
            modifier = Modifier.weight(1f).padding(horizontal = DesignTokens.Spacing.sm),
            colors = SliderDefaults.colors(
                thumbColor = DesignTokens.Colors.Primary.light,
                activeTrackColor = DesignTokens.Colors.Primary.light,
                inactiveTrackColor = DesignTokens.Colors.Glass.border,
            ),
        )
        Icon(
            imageVector = Icons.Default.VolumeUp,
            contentDescription = null,
            tint = DesignTokens.Colors.Text.muted,
            modifier = Modifier.size(18.dp),
        )
    }
}

@Composable
internal fun TimeDisplay(currentPositionMs: Long, totalDurationMs: Long) {
    Row(verticalAlignment = Alignment.CenterVertically) {
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
}

@Composable
internal fun LiveIndicator() {
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

/** VOD-only transport buttons: restart, interactive moment navigation, and skip-backward. */
@Composable
internal fun VodTransportButtons(
    hasInteractiveMoments: Boolean,
    onRestart: () -> Unit,
    onSkipBackward: () -> Unit,
    onInteract: (() -> Unit)?,
    onPreviousInteraction: (() -> Unit)?,
    onNextInteraction: (() -> Unit)?,
) {
    IconButton(onClick = onRestart) {
        Icon(
            imageVector = Icons.Default.Replay,
            contentDescription = bayitString("player.controls.restart"),
            tint = DesignTokens.Colors.Text.secondary,
            modifier = Modifier.size(24.dp),
        )
    }
    if (hasInteractiveMoments) {
        onPreviousInteraction?.let { action ->
            IconButton(onClick = action) {
                Icon(
                    imageVector = Icons.Default.SkipPrevious,
                    contentDescription = bayitString("player.interaction.previous"),
                    tint = DesignTokens.Colors.Text.primary,
                    modifier = Modifier.size(24.dp),
                )
            }
        }
        onInteract?.let { action ->
            IconButton(onClick = action) {
                Icon(
                    imageVector = Icons.Default.RecordVoiceOver,
                    contentDescription = bayitString("player.pauseAsk.title"),
                    tint = DesignTokens.Colors.Text.primary,
                    modifier = Modifier.size(24.dp),
                )
            }
        }
        onNextInteraction?.let { action ->
            IconButton(onClick = action) {
                Icon(
                    imageVector = Icons.Default.SkipNext,
                    contentDescription = bayitString("player.interaction.next"),
                    tint = DesignTokens.Colors.Text.primary,
                    modifier = Modifier.size(24.dp),
                )
            }
        }
    }
    IconButton(onClick = onSkipBackward) {
        Icon(
            imageVector = Icons.Default.Replay30,
            contentDescription = bayitString("player.controls.skipBackward"),
            tint = DesignTokens.Colors.Text.primary,
            modifier = Modifier.size(28.dp),
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

internal fun formatSpeed(speed: Float): String = if (speed == 1.0f) "1x" else "${speed}x"
