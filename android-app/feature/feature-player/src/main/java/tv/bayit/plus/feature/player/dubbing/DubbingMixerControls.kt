package tv.bayit.plus.feature.player.dubbing

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Icon
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun DubbingMixerControls(
    originalVolume: Float,
    dubbingVolume: Float,
    latencyMs: Long?,
    onOriginalVolumeChange: (Float) -> Unit,
    onDubbingVolumeChange: (Float) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.md,
                backgroundColor = DesignTokens.Colors.Glass.bgStrong,
            )
            .padding(DesignTokens.Spacing.md),
    ) {
        Text(
            text = bayitString("dubbing.mixer.title"),
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.base,
            fontWeight = FontWeight.Bold,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        VolumeSlider(
            label = bayitString("dubbing.mixer.originalAudio"),
            icon = Icons.Default.VolumeUp,
            value = originalVolume,
            onValueChange = onOriginalVolumeChange,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

        VolumeSlider(
            label = bayitString("dubbing.mixer.dubbedAudio"),
            icon = Icons.Default.Translate,
            value = dubbingVolume,
            onValueChange = onDubbingVolumeChange,
        )

        if (latencyMs != null) {
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            Text(
                text = bayitString("dubbing.mixer.latency", mapOf("ms" to latencyMs.toString())),
                color = DesignTokens.Colors.Text.muted,
                fontSize = DesignTokens.FontSize.xs,
            )
        }
    }
}

@Composable
private fun VolumeSlider(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    value: Float,
    onValueChange: (Float) -> Unit,
) {
    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = DesignTokens.Colors.Text.secondary,
                modifier = Modifier.size(16.dp),
            )
            Spacer(modifier = Modifier.width(DesignTokens.Spacing.sm))
            Text(
                text = label,
                color = DesignTokens.Colors.Text.secondary,
                fontSize = DesignTokens.FontSize.sm,
            )
            Spacer(modifier = Modifier.weight(1f))
            Text(
                text = "${(value * 100).toInt()}%",
                color = DesignTokens.Colors.Text.muted,
                fontSize = DesignTokens.FontSize.xs,
            )
        }
        Slider(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            colors = SliderDefaults.colors(
                thumbColor = DesignTokens.Colors.Primary.light,
                activeTrackColor = DesignTokens.Colors.Primary.light,
                inactiveTrackColor = DesignTokens.Colors.Glass.border,
            ),
        )
    }
}
