package tv.bayit.plus.feature.player.trivia

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.GlassModal
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun TriviaSettingsSheet(
    isEnabled: Boolean,
    selectedLanguage: String,
    availableLanguages: List<String>,
    onToggle: (Boolean) -> Unit,
    onLanguageSelected: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    GlassModal(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(DesignTokens.Spacing.lg),
        ) {
            Text(
                text = bayitString("trivia.settings.title"),
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.xl,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .glassMorphism(
                        cornerRadius = DesignTokens.Radius.md,
                        backgroundColor = DesignTokens.Colors.Glass.bg,
                    )
                    .padding(DesignTokens.Spacing.md),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column {
                    Text(
                        text = bayitString("trivia.settings.enableTrivia"),
                        color = DesignTokens.Colors.Text.primary,
                        fontSize = DesignTokens.FontSize.base,
                        fontWeight = FontWeight.Medium,
                    )
                    Text(
                        text = bayitString("trivia.settings.enableDescription"),
                        color = DesignTokens.Colors.Text.secondary,
                        fontSize = DesignTokens.FontSize.xs,
                    )
                }
                Switch(
                    checked = isEnabled,
                    onCheckedChange = onToggle,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = DesignTokens.Colors.Primary.light,
                        checkedTrackColor = DesignTokens.Colors.Primary.light.copy(alpha = 0.4f),
                        uncheckedThumbColor = DesignTokens.Colors.Text.muted,
                        uncheckedTrackColor = DesignTokens.Colors.Glass.border,
                    ),
                )
            }

            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

            Text(
                text = bayitString("trivia.settings.language"),
                color = DesignTokens.Colors.Text.secondary,
                fontSize = DesignTokens.FontSize.sm,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

            Column(
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
            ) {
                availableLanguages.forEach { lang ->
                    LanguageRow(
                        language = lang,
                        isSelected = lang == selectedLanguage,
                        onClick = { onLanguageSelected(lang) },
                    )
                }
            }

            Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))
        }
    }
}

@Composable
private fun LanguageRow(
    language: String,
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.sm,
                backgroundColor = if (isSelected) {
                    DesignTokens.Colors.Glass.purpleLight
                } else {
                    DesignTokens.Colors.Glass.bg
                },
            )
            .clickable(onClick = onClick)
            .padding(
                horizontal = DesignTokens.Spacing.md,
                vertical = DesignTokens.Spacing.sm,
            ),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text = language,
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.base,
        )
        if (isSelected) {
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = null,
                tint = DesignTokens.Colors.Primary.light,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}
