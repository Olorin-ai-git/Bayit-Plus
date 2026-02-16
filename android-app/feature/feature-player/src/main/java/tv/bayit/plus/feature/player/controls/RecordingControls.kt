package tv.bayit.plus.feature.player.controls

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FiberManualRecord
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Live stream recording start/stop controls with recording indicator.
 */
@Composable
fun RecordingControls(
    isRecording: Boolean,
    recordingDuration: String?,
    onToggleRecording: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val indicatorColor by animateColorAsState(
        targetValue = if (isRecording) DesignTokens.Colors.live else DesignTokens.Colors.Text.muted,
        label = "recordingColor",
    )

    Row(
        modifier = modifier
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.full,
                backgroundColor = DesignTokens.Colors.Glass.bg,
            )
            .padding(
                horizontal = DesignTokens.Spacing.md,
                vertical = DesignTokens.Spacing.xs,
            ),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        IconButton(
            onClick = onToggleRecording,
            modifier = Modifier.size(32.dp),
        ) {
            Icon(
                imageVector = if (isRecording) Icons.Default.Stop else Icons.Default.FiberManualRecord,
                contentDescription = if (isRecording) bayitString("recording.stop") else bayitString("recording.start"),
                tint = indicatorColor,
                modifier = Modifier.size(20.dp),
            )
        }

        if (isRecording) {
            recordingDuration?.let { duration ->
                Text(
                    text = duration,
                    color = DesignTokens.Colors.live,
                    fontSize = DesignTokens.FontSize.sm,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}
