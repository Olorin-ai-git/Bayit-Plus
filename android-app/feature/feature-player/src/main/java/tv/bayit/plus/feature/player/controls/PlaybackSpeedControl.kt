package tv.bayit.plus.feature.player.controls

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Playback speed selection control (0.5x - 2.0x).
 */
@Composable
fun PlaybackSpeedControl(
    currentSpeed: Float,
    onSpeedSelected: (Float) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.md,
                backgroundColor = DesignTokens.Colors.Glass.bg,
            )
            .padding(DesignTokens.Spacing.md),
    ) {
        Text(
            text = bayitString("player.playbackSpeed"),
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.base,
            fontWeight = FontWeight.SemiBold,
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = DesignTokens.Spacing.sm),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            SPEED_OPTIONS.forEach { speed ->
                GlassChip(
                    label = formatSpeed(speed),
                    isSelected = speed == currentSpeed,
                    onClick = { onSpeedSelected(speed) },
                )
            }
        }
    }
}

private val SPEED_OPTIONS = listOf(0.5f, 0.75f, 1.0f, 1.25f, 1.5f, 2.0f)

private fun formatSpeed(speed: Float): String =
    if (speed == 1.0f) "1x" else "${speed}x"
