package tv.bayit.plus.feature.player.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Forward30
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.VolumeOff
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.player.controls.PlaybackSpeedControl

/**
 * Glassmorphic transport controls at the bottom of the video surface.
 *
 * VOD: seek slider · time display · speed chip · restart · ±30 s · play/pause · volume
 * Live: play/pause · live badge · volume
 * Volume and speed panels expand/collapse in-place via AnimatedVisibility.
 */
@Composable
fun PlayerControlsOverlay(
    isPlaying: Boolean,
    currentPositionMs: Long,
    totalDurationMs: Long,
    isLiveContent: Boolean,
    volume: Float,
    playbackSpeed: Float,
    isFullscreen: Boolean,
    onPlayPause: () -> Unit,
    onSeek: (Float) -> Unit,
    onSkipBackward: () -> Unit,
    onSkipForward: () -> Unit,
    onRestart: () -> Unit,
    onVolumeChange: (Float) -> Unit,
    onSpeedChange: (Float) -> Unit,
    onToggleFullscreen: () -> Unit,
    onInteract: (() -> Unit)? = null,
    onPreviousInteraction: (() -> Unit)? = null,
    onNextInteraction: (() -> Unit)? = null,
    hasInteractiveMoments: Boolean = false,
    modifier: Modifier = Modifier,
) {
    var showVolume by remember { mutableStateOf(false) }
    var showSpeed by remember { mutableStateOf(false) }

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
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TimeDisplay(
                    currentPositionMs = currentPositionMs,
                    totalDurationMs = totalDurationMs,
                )
                GlassChip(
                    label = formatSpeed(playbackSpeed),
                    isSelected = playbackSpeed != 1.0f,
                    onClick = { showSpeed = !showSpeed },
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (!isLiveContent) {
                VodTransportButtons(
                    hasInteractiveMoments = hasInteractiveMoments,
                    onRestart = onRestart,
                    onSkipBackward = onSkipBackward,
                    onInteract = onInteract,
                    onPreviousInteraction = onPreviousInteraction,
                    onNextInteraction = onNextInteraction,
                )
            }

            IconButton(onClick = onPlayPause) {
                Icon(
                    imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                    contentDescription = if (isPlaying) bayitString("player.controls.pause")
                    else bayitString("player.controls.play"),
                    tint = DesignTokens.Colors.Text.primary,
                    modifier = Modifier.size(40.dp),
                )
            }

            if (!isLiveContent) {
                IconButton(onClick = onSkipForward) {
                    Icon(
                        imageVector = Icons.Default.Forward30,
                        contentDescription = bayitString("player.controls.skipForward"),
                        tint = DesignTokens.Colors.Text.primary,
                        modifier = Modifier.size(28.dp),
                    )
                }
            }

            if (isLiveContent) {
                Spacer(modifier = Modifier.width(DesignTokens.Spacing.sm))
                LiveIndicator()
                Spacer(modifier = Modifier.weight(1f))
            }

            IconButton(onClick = { showVolume = !showVolume }) {
                Icon(
                    imageVector = if (volume < 0.01f) Icons.Default.VolumeOff else Icons.Default.VolumeUp,
                    contentDescription = bayitString("player.controls.volume"),
                    tint = if (showVolume) DesignTokens.Colors.Primary.light
                    else DesignTokens.Colors.Text.primary,
                    modifier = Modifier.size(24.dp),
                )
            }

            IconButton(onClick = onToggleFullscreen) {
                Icon(
                    imageVector = if (isFullscreen) Icons.Default.FullscreenExit else Icons.Default.Fullscreen,
                    contentDescription = if (isFullscreen) bayitString("player.controls.exitFullscreen")
                    else bayitString("player.controls.fullscreen"),
                    tint = DesignTokens.Colors.Text.primary,
                    modifier = Modifier.size(24.dp),
                )
            }
        }

        AnimatedVisibility(
            visible = showVolume,
            enter = expandVertically(),
            exit = shrinkVertically(),
        ) {
            VolumeSlider(volume = volume, onVolumeChange = onVolumeChange)
        }

        if (!isLiveContent) {
            AnimatedVisibility(
                visible = showSpeed,
                enter = expandVertically(),
                exit = shrinkVertically(),
            ) {
                PlaybackSpeedControl(
                    currentSpeed = playbackSpeed,
                    onSpeedSelected = { speed ->
                        onSpeedChange(speed)
                        showSpeed = false
                    },
                    modifier = Modifier.padding(top = DesignTokens.Spacing.xs),
                )
            }
        }
    }
}
