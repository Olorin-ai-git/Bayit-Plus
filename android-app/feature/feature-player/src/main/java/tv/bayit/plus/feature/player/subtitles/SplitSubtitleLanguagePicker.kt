package tv.bayit.plus.feature.player.subtitles

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.SubtitleLanguages
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Dual language picker for split subtitle mode.
 *
 * Allows selecting a primary and secondary language for the split
 * subtitle overlay. Shows both selections with visual indicators.
 */
@Composable
fun SplitSubtitleLanguagePicker(
    primaryLanguage: String,
    secondaryLanguage: String,
    availableLanguages: List<String>,
    onPrimarySelected: (String) -> Unit,
    onSecondarySelected: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(DesignTokens.Spacing.base),
    ) {
        LanguageSection(
            title = "Primary Language",
            selectedLanguage = primaryLanguage,
            availableLanguages = availableLanguages,
            onSelected = onPrimarySelected,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        LanguageSection(
            title = "Secondary Language",
            selectedLanguage = secondaryLanguage,
            availableLanguages = availableLanguages.filter { it != primaryLanguage },
            onSelected = onSecondarySelected,
        )
    }
}

@Composable
private fun LanguageSection(
    title: String,
    selectedLanguage: String,
    availableLanguages: List<String>,
    onSelected: (String) -> Unit,
) {
    Column {
        Text(
            text = title,
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.base,
            fontWeight = FontWeight.SemiBold,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

        availableLanguages.forEach { langCode ->
            val info = SubtitleLanguages.info(langCode)
            GlassCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onSelected(langCode) },
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = info?.name ?: langCode,
                        color = DesignTokens.Colors.Text.primary,
                        fontSize = DesignTokens.FontSize.base,
                    )
                    if (langCode == selectedLanguage) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = "Selected",
                            tint = DesignTokens.Colors.Semantic.success,
                            modifier = Modifier.height(20.dp),
                        )
                    }
                }
            }
        }
    }
}
