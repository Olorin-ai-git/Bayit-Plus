package tv.bayit.plus.feature.tv.player

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.compose.material3.LinearProgressIndicator
import androidx.tv.material3.Text
import tv.bayit.plus.designsystem.component.GlassTVButton
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.tv.design.TVDesignTokens

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TVPlayerControls(
    isPlaying: Boolean,
    currentPositionMs: Long,
    durationMs: Long,
    title: String,
    onPlayPause: () -> Unit,
    onSeekBack: () -> Unit,
    onSeekForward: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val progress = if (durationMs > 0) {
        (currentPositionMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f)
    } else {
        0f
    }

    Box(
        modifier = modifier.fillMaxSize(),
    ) {
        TitleOverlay(
            title = title,
            modifier = Modifier.align(Alignment.TopStart),
        )

        BottomControlsPanel(
            isPlaying = isPlaying,
            progress = progress,
            currentPositionMs = currentPositionMs,
            durationMs = durationMs,
            onPlayPause = onPlayPause,
            onSeekBack = onSeekBack,
            onSeekForward = onSeekForward,
            modifier = Modifier.align(Alignment.BottomCenter),
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TitleOverlay(
    title: String,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        DesignTokens.Colors.Glass.bg.copy(alpha = 0.8f),
                        Color.Transparent,
                    ),
                ),
            )
            .padding(
                horizontal = TVDesignTokens.Player.overlayPaddingHorizontal,
                vertical = TVDesignTokens.Player.overlayPaddingVertical,
            ),
    ) {
        Text(
            text = title,
            color = DesignTokens.Colors.Text.primary,
            style = androidx.tv.material3.MaterialTheme.typography.headlineMedium,
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun BottomControlsPanel(
    isPlaying: Boolean,
    progress: Float,
    currentPositionMs: Long,
    durationMs: Long,
    onPlayPause: () -> Unit,
    onSeekBack: () -> Unit,
    onSeekForward: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color.Transparent,
                        DesignTokens.Colors.Glass.bg.copy(alpha = 0.85f),
                    ),
                ),
            )
            .padding(
                horizontal = TVDesignTokens.Player.overlayPaddingHorizontal,
                vertical = TVDesignTokens.Player.overlayPaddingVertical,
            ),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier
                .fillMaxWidth()
                .height(4.dp),
            color = DesignTokens.Colors.Primary.base,
            trackColor = DesignTokens.Colors.Glass.bg.copy(alpha = 0.4f),
        )

        Spacer(modifier = Modifier.height(12.dp))

        TransportButtons(
            isPlaying = isPlaying,
            onPlayPause = onPlayPause,
            onSeekBack = onSeekBack,
            onSeekForward = onSeekForward,
        )

        Spacer(modifier = Modifier.height(8.dp))

        TimeDisplay(
            currentPositionMs = currentPositionMs,
            durationMs = durationMs,
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TransportButtons(
    isPlaying: Boolean,
    onPlayPause: () -> Unit,
    onSeekBack: () -> Unit,
    onSeekForward: () -> Unit,
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(24.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth(),
    ) {
        GlassTVButton(onClick = onSeekBack, text = bayitString("player.controls.seekBack"))
        GlassTVButton(
            onClick = onPlayPause,
            text = if (isPlaying) bayitString("player.controls.pause") else bayitString("player.controls.play"),
        )
        GlassTVButton(onClick = onSeekForward, text = bayitString("player.controls.seekForward"))
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TimeDisplay(
    currentPositionMs: Long,
    durationMs: Long,
) {
    Text(
        text = "${formatDuration(currentPositionMs)} / ${formatDuration(durationMs)}",
        color = DesignTokens.Colors.Text.primary,
        style = androidx.tv.material3.MaterialTheme.typography.bodySmall,
    )
}

internal fun formatDuration(ms: Long): String {
    val totalSeconds = (ms / 1000).coerceAtLeast(0)
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return "%02d:%02d".format(minutes, seconds)
}
