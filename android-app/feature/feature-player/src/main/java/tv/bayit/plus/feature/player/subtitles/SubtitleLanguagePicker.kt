package tv.bayit.plus.feature.player.subtitles

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.SubtitleLanguageInfo
import tv.bayit.plus.core.model.SubtitleLanguages
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Bottom sheet language picker for subtitle selection.
 *
 * Lists available languages with flags, AI mode badges, and
 * selection indicators. Includes toggle for split/dual subtitle mode
 * and an OpenSubtitles download trigger.
 */
@Composable
fun SubtitleLanguagePicker(
    selectedLanguage: String,
    availableLanguages: List<String>,
    isSplitMode: Boolean,
    onLanguageSelected: (String) -> Unit,
    onSplitToggle: () -> Unit,
    onOpenSubtitlesClick: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(DesignTokens.Spacing.base),
    ) {
        Text(
            text = bayitString("subtitles.selectLanguage"),
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.lg,
            fontWeight = FontWeight.Bold,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
            modifier = Modifier.weight(1f, fill = false),
        ) {
            items(availableLanguages) { langCode ->
                val info = SubtitleLanguages.info(langCode)
                LanguageRow(
                    code = langCode,
                    info = info,
                    isSelected = langCode == selectedLanguage,
                    onClick = { onLanguageSelected(langCode) },
                )
            }
        }

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            val hasSplitCapableLanguages = availableLanguages.size >= 2
            GlassButton(
                text = if (isSplitMode) bayitString("subtitles.singleMode") else bayitString("subtitles.splitMode"),
                onClick = onSplitToggle,
                enabled = hasSplitCapableLanguages,
            )
            GlassButton(
                text = bayitString("subtitles.opensubtitles"),
                onClick = onOpenSubtitlesClick,
            )
        }
    }
}

@Composable
private fun LanguageRow(
    code: String,
    info: SubtitleLanguageInfo?,
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column {
                Text(
                    text = info?.name ?: code,
                    color = DesignTokens.Colors.Text.primary,
                    fontSize = DesignTokens.FontSize.base,
                    fontWeight = FontWeight.Medium,
                )
                info?.nativeName?.let { native ->
                    Text(
                        text = native,
                        color = DesignTokens.Colors.Text.secondary,
                        fontSize = DesignTokens.FontSize.sm,
                    )
                }
            }

            Row(
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (code == "he") {
                    Icon(
                        imageVector = Icons.Default.AutoAwesome,
                        contentDescription = bayitString("subtitles.aiModesAvailable"),
                        tint = DesignTokens.Colors.Primary.light,
                        modifier = Modifier.height(16.dp),
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
}
