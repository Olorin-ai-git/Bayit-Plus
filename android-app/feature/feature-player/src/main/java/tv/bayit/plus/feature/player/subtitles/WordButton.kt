package tv.bayit.plus.feature.player.subtitles

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDirection
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * A single tappable word within a subtitle cue.
 *
 * Supports both LTR and RTL text rendering. Tapping triggers a
 * translation request via the parent composable's callback.
 * Enforces minimum 48dp touch target for accessibility compliance.
 */
@Composable
fun WordButton(
    text: String,
    isHebrew: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val translateLabel = bayitString("player.subtitles.translateWord", mapOf("word" to text))

    Box(
        modifier = modifier
            .defaultMinSize(
                minWidth = DesignTokens.TouchTarget.minimum,
                minHeight = DesignTokens.TouchTarget.minimum,
            )
            .semantics {
                role = Role.Button
                contentDescription = translateLabel
            }
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.md,
            fontWeight = FontWeight.Normal,
            style = androidx.compose.ui.text.TextStyle(
                textDirection = if (isHebrew) TextDirection.Rtl else TextDirection.Ltr,
            ),
        )
    }
}

/**
 * Fallback text renderer for subtitle cues that lack word-level data.
 */
@Composable
fun SubtitleTextFallback(
    text: String,
    modifier: Modifier = Modifier,
) {
    Text(
        text = text,
        color = DesignTokens.Colors.Text.primary,
        fontSize = DesignTokens.FontSize.md,
        modifier = modifier,
    )
}
