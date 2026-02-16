package tv.bayit.plus.feature.player.ai

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
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * AI language picker for live features.
 *
 * Allows selecting primary and optional secondary language for live
 * translation, dubbing, and subtitle features.
 */
@Composable
fun AILanguagePicker(
    primaryLanguage: String,
    secondaryLanguage: String?,
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
        Text(
            text = bayitString("player.ai.languageTitle"),
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.lg,
            fontWeight = FontWeight.Bold,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

        Text(
            text = bayitString("player.ai.languagePrimary"),
            color = DesignTokens.Colors.Text.secondary,
            fontSize = DesignTokens.FontSize.sm,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))

        availableLanguages.forEach { langCode ->
            val info = SubtitleLanguages.info(langCode)
            AILanguageRow(
                name = info?.name ?: langCode,
                badge = info?.badge ?: langCode.uppercase(),
                isSelected = langCode == primaryLanguage,
                onClick = { onPrimarySelected(langCode) },
            )
        }

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        Text(
            text = bayitString("player.ai.languageSecondary"),
            color = DesignTokens.Colors.Text.secondary,
            fontSize = DesignTokens.FontSize.sm,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))

        availableLanguages
            .filter { it != primaryLanguage }
            .forEach { langCode ->
                val info = SubtitleLanguages.info(langCode)
                AILanguageRow(
                    name = info?.name ?: langCode,
                    badge = info?.badge ?: langCode.uppercase(),
                    isSelected = langCode == secondaryLanguage,
                    onClick = { onSecondarySelected(langCode) },
                )
            }
    }
}

@Composable
private fun AILanguageRow(
    name: String,
    badge: String,
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
            ) {
                Text(
                    text = badge,
                    color = DesignTokens.Colors.Primary.light,
                    fontSize = DesignTokens.FontSize.xs,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = name,
                    color = DesignTokens.Colors.Text.primary,
                    fontSize = DesignTokens.FontSize.base,
                )
            }
            if (isSelected) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = bayitString("player.controls.selected"),
                    tint = DesignTokens.Colors.Semantic.success,
                    modifier = Modifier.height(20.dp),
                )
            }
        }
    }
}
