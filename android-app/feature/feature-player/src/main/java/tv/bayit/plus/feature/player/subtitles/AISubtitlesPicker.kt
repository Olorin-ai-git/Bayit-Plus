package tv.bayit.plus.feature.player.subtitles

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.SubtitleHebrewMode
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * AI subtitle mode picker for Hebrew subtitles.
 *
 * Shows AI-generated subtitle modes (Heblish, Nikud, Shoresh) with
 * an AI badge indicator and triggers generation when selected.
 */
@Composable
fun AISubtitlesPicker(
    selectedMode: SubtitleHebrewMode,
    onModeSelected: (SubtitleHebrewMode) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.md,
                backgroundColor = DesignTokens.Colors.Glass.purpleLight,
            )
            .padding(DesignTokens.Spacing.md),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            Icon(
                imageVector = Icons.Default.AutoAwesome,
                contentDescription = null,
                tint = DesignTokens.Colors.Primary.light,
                modifier = Modifier.height(18.dp),
            )
            Text(
                text = bayitString("subtitles.aiModesTitle"),
                color = DesignTokens.Colors.Primary.light,
                fontSize = DesignTokens.FontSize.sm,
                fontWeight = FontWeight.SemiBold,
            )
        }

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            AI_MODES.forEach { mode ->
                GlassChip(
                    label = aiModeLabel(mode),
                    isSelected = mode == selectedMode,
                    onClick = { onModeSelected(mode) },
                )
            }
        }
    }
}

private val AI_MODES = listOf(
    SubtitleHebrewMode.HEBLISH,
    SubtitleHebrewMode.NIKUD,
    SubtitleHebrewMode.SHORESH,
)

@Composable
private fun aiModeLabel(mode: SubtitleHebrewMode): String = when (mode) {
    SubtitleHebrewMode.HEBLISH -> bayitString("subtitles.mode.heblish")
    SubtitleHebrewMode.NIKUD -> bayitString("subtitles.nikud")
    SubtitleHebrewMode.SHORESH -> bayitString("subtitles.mode.shoresh")
    SubtitleHebrewMode.STANDARD -> bayitString("subtitles.mode.standard")
}
