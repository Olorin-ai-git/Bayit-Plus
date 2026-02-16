package tv.bayit.plus.feature.player.subtitles

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.SubtitleLanguages
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
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
    layout: tv.bayit.plus.core.model.SplitSubtitleLayout,
    onPrimarySelected: (String) -> Unit,
    onSecondarySelected: (String) -> Unit,
    onLayoutSelected: (tv.bayit.plus.core.model.SplitSubtitleLayout) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(DesignTokens.Spacing.base),
    ) {
        // Header with close button
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = bayitString("subtitles.splitMode"),
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.lg,
                fontWeight = FontWeight.Bold,
            )
            IconButton(onClick = onDismiss) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = bayitString("player.controls.close"),
                    tint = DesignTokens.Colors.Text.secondary,
                )
            }
        }

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        // Layout mode toggle
        Text(
            text = bayitString("subtitles.layout_mode"),
            color = DesignTokens.Colors.Text.secondary,
            fontSize = DesignTokens.FontSize.sm,
            fontWeight = FontWeight.SemiBold,
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = DesignTokens.Spacing.sm),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            tv.bayit.plus.core.model.SplitSubtitleLayout.values().forEach { layoutMode ->
                tv.bayit.plus.designsystem.component.GlassChip(
                    label = layoutMode.label,
                    isSelected = layout == layoutMode,
                    onClick = { onLayoutSelected(layoutMode) },
                )
            }
        }

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))

        // Two-column layout for primary and secondary languages
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            // Primary language column
            LanguageColumn(
                title = bayitString("subtitles.primary_language"),
                selectedLanguage = primaryLanguage,
                availableLanguages = availableLanguages,
                onSelected = onPrimarySelected,
                modifier = Modifier.weight(1f),
            )

            // Secondary language column
            LanguageColumn(
                title = bayitString("subtitles.secondary_language"),
                selectedLanguage = secondaryLanguage,
                availableLanguages = availableLanguages.filter { it != primaryLanguage },
                onSelected = onSecondarySelected,
                modifier = Modifier.weight(1f),
            )
        }

        // OK button (only show when both languages selected)
        if (primaryLanguage.isNotEmpty() && secondaryLanguage.isNotEmpty()) {
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
            tv.bayit.plus.designsystem.component.GlassButton(
                text = bayitString("common.ok"),
                onClick = onDismiss,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun LanguageColumn(
    title: String,
    selectedLanguage: String,
    availableLanguages: List<String>,
    onSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val scrollState = rememberScrollState()

    Column(modifier = modifier) {
        Text(
            text = title,
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.base,
            fontWeight = FontWeight.SemiBold,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

        Column(
            modifier = Modifier
                .fillMaxHeight()
                .verticalScroll(scrollState),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
        ) {
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
                            fontSize = DesignTokens.FontSize.sm,
                        )
                        if (langCode == selectedLanguage) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = "Selected",
                                tint = DesignTokens.Colors.Semantic.success,
                                modifier = Modifier.height(16.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}
