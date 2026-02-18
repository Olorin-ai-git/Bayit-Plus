package tv.bayit.plus.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Forward30
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Replay10
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

private val CONTROL_ICON_SIZE = 28.dp
private val PLAY_PAUSE_ICON_SIZE = 36.dp

@Composable
fun MiniPlayerControls(
    isPlaying: Boolean,
    isLoading: Boolean,
    onSkipBackward: () -> Unit,
    onTogglePlayPause: () -> Unit,
    onSkipForward: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onSkipBackward) {
            Icon(
                imageVector = Icons.Default.Replay10,
                contentDescription = bayitString("miniPlayer.skipBackward"),
                tint = DesignTokens.Colors.Text.primary,
                modifier = Modifier.size(CONTROL_ICON_SIZE),
            )
        }
        if (isLoading) {
            GlassSpinner(size = SpinnerSize.SMALL)
        } else {
            IconButton(onClick = onTogglePlayPause) {
                Icon(
                    imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                    contentDescription = if (isPlaying) {
                        bayitString("player.controls.pause")
                    } else {
                        bayitString("player.controls.play")
                    },
                    tint = DesignTokens.Colors.Text.primary,
                    modifier = Modifier.size(PLAY_PAUSE_ICON_SIZE),
                )
            }
        }
        IconButton(onClick = onSkipForward) {
            Icon(
                imageVector = Icons.Default.Forward30,
                contentDescription = bayitString("miniPlayer.skipForward"),
                tint = DesignTokens.Colors.Text.primary,
                modifier = Modifier.size(CONTROL_ICON_SIZE),
            )
        }
    }
}
