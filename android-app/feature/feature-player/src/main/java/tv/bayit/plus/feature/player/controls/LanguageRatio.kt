package tv.bayit.plus.feature.player.controls

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Language learning ratio slider for dubbing mix control.
 *
 * Adjusts the balance between original audio and translated dubbing
 * for progressive language learning (100% original to 100% translated).
 */
@Composable
fun LanguageRatio(
    ratio: Float,
    originalLanguage: String,
    targetLanguage: String,
    onRatioChanged: (Float) -> Unit,
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
            text = bayitString("player.language_ratio"),
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.base,
            fontWeight = FontWeight.SemiBold,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

        Slider(
            value = ratio,
            onValueChange = onRatioChanged,
            modifier = Modifier.fillMaxWidth(),
            colors = SliderDefaults.colors(
                thumbColor = DesignTokens.Colors.Primary.light,
                activeTrackColor = DesignTokens.Colors.Primary.light,
                inactiveTrackColor = DesignTokens.Colors.Glass.border,
            ),
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = originalLanguage,
                color = DesignTokens.Colors.Text.secondary,
                fontSize = DesignTokens.FontSize.xs,
            )
            Spacer(modifier = Modifier.weight(1f))
            Text(
                text = "${(ratio * 100).toInt()}%",
                color = DesignTokens.Colors.Primary.light,
                fontSize = DesignTokens.FontSize.sm,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(modifier = Modifier.weight(1f))
            Text(
                text = targetLanguage,
                color = DesignTokens.Colors.Text.secondary,
                fontSize = DesignTokens.FontSize.xs,
            )
        }
    }
}
