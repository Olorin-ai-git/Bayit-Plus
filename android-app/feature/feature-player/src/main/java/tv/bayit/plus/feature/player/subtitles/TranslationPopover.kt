package tv.bayit.plus.feature.player.subtitles

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.TranslationResult
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Glassmorphic popover displaying a translation result above the subtitle cue.
 *
 * Shows the original word, translation, transliteration, part of speech,
 * and an optional example sentence.
 */
@Composable
fun TranslationPopover(
    result: TranslationResult,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.md,
                backgroundColor = DesignTokens.Colors.Glass.purpleStrong,
            )
            .padding(DesignTokens.Spacing.md),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                result.word?.let { word ->
                    Text(
                        text = word,
                        color = DesignTokens.Colors.Text.primary,
                        fontSize = DesignTokens.FontSize.lg,
                        fontWeight = FontWeight.Bold,
                    )
                }
                result.translation?.let { translation ->
                    Text(
                        text = translation,
                        color = DesignTokens.Colors.Primary.light,
                        fontSize = DesignTokens.FontSize.md,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }

            IconButton(onClick = onDismiss) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Dismiss",
                    tint = DesignTokens.Colors.Text.secondary,
                    modifier = Modifier.width(20.dp).height(20.dp),
                )
            }
        }

        result.transliteration?.let { transliteration ->
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = transliteration,
                color = DesignTokens.Colors.Text.secondary,
                fontSize = DesignTokens.FontSize.sm,
                fontStyle = FontStyle.Italic,
            )
        }

        result.partOfSpeech?.let { pos ->
            Text(
                text = pos,
                color = DesignTokens.Colors.Text.muted,
                fontSize = DesignTokens.FontSize.xs,
            )
        }

        result.example?.let { example ->
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            Text(
                text = example,
                color = DesignTokens.Colors.Text.secondary,
                fontSize = DesignTokens.FontSize.sm,
            )
            result.exampleTranslation?.let { exTrans ->
                Text(
                    text = exTrans,
                    color = DesignTokens.Colors.Text.muted,
                    fontSize = DesignTokens.FontSize.sm,
                    fontStyle = FontStyle.Italic,
                )
            }
        }
    }
}
