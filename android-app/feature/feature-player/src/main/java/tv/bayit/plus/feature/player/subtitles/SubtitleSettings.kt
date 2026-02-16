package tv.bayit.plus.feature.player.subtitles

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Subtitle settings panel for font size and background toggle.
 */
@Composable
fun SubtitleSettings(
    fontSize: Float,
    showBackground: Boolean,
    onFontSizeChange: (Float) -> Unit,
    onBackgroundToggle: (Boolean) -> Unit,
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
            text = bayitString("subtitles.settingsTitle"),
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.base,
            fontWeight = FontWeight.SemiBold,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        Text(
            text = bayitString("subtitles.fontSize"),
            color = DesignTokens.Colors.Text.secondary,
            fontSize = DesignTokens.FontSize.sm,
        )
        Slider(
            value = fontSize,
            onValueChange = onFontSizeChange,
            valueRange = FONT_SIZE_MIN..FONT_SIZE_MAX,
            modifier = Modifier.fillMaxWidth(),
            colors = SliderDefaults.colors(
                thumbColor = DesignTokens.Colors.Primary.light,
                activeTrackColor = DesignTokens.Colors.Primary.light,
                inactiveTrackColor = DesignTokens.Colors.Glass.border,
            ),
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                text = bayitString("subtitles.showBackground"),
                color = DesignTokens.Colors.Text.secondary,
                fontSize = DesignTokens.FontSize.sm,
            )
            Switch(
                checked = showBackground,
                onCheckedChange = onBackgroundToggle,
                colors = SwitchDefaults.colors(
                    checkedThumbColor = DesignTokens.Colors.Primary.light,
                    checkedTrackColor = DesignTokens.Colors.Primary.dark,
                ),
            )
        }
    }
}

private const val FONT_SIZE_MIN = 0.5f
private const val FONT_SIZE_MAX = 2.0f
