package tv.bayit.plus.feature.player.subtitles

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.core.model.SubtitleEnglishMode
import tv.bayit.plus.core.model.SubtitleHebrewMode
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Picker for Hebrew subtitle display modes: Standard, Nikud, Shoresh, Heblish.
 */
@Composable
fun HebrewModePicker(
    selectedMode: SubtitleHebrewMode,
    onModeSelected: (SubtitleHebrewMode) -> Unit,
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
            text = "Hebrew Mode",
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.sm,
            fontWeight = FontWeight.SemiBold,
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = DesignTokens.Spacing.sm),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            SubtitleHebrewMode.entries.forEach { mode ->
                GlassChip(
                    label = hebrewModeLabel(mode),
                    isSelected = mode == selectedMode,
                    onClick = { onModeSelected(mode) },
                )
            }
        }
    }
}

/**
 * Picker for English subtitle display modes: Standard, Engrew.
 */
@Composable
fun EnglishModePicker(
    selectedMode: SubtitleEnglishMode,
    onModeSelected: (SubtitleEnglishMode) -> Unit,
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
            text = "English Mode",
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.sm,
            fontWeight = FontWeight.SemiBold,
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = DesignTokens.Spacing.sm),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            SubtitleEnglishMode.entries.forEach { mode ->
                GlassChip(
                    label = englishModeLabel(mode),
                    isSelected = mode == selectedMode,
                    onClick = { onModeSelected(mode) },
                )
            }
        }
    }
}

private fun hebrewModeLabel(mode: SubtitleHebrewMode): String = when (mode) {
    SubtitleHebrewMode.STANDARD -> "Standard"
    SubtitleHebrewMode.NIKUD -> "Nikud"
    SubtitleHebrewMode.SHORESH -> "Shoresh"
    SubtitleHebrewMode.HEBLISH -> "Heblish"
}

private fun englishModeLabel(mode: SubtitleEnglishMode): String = when (mode) {
    SubtitleEnglishMode.STANDARD -> "Standard"
    SubtitleEnglishMode.ENGREW -> "Engrew"
}
