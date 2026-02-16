package tv.bayit.plus.feature.player.subtitles

import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Highlights Hebrew root letters (shoresh) within a word.
 *
 * The shoresh text format uses brackets to indicate root letters:
 * e.g., "[k]a[t][v]" highlights the root k-t-v in the word "katav".
 * Highlighted letters are rendered in the primary accent color and bold.
 */
@Composable
fun ShoreshHighlight(
    shoreshText: String,
    modifier: Modifier = Modifier,
) {
    val annotated = buildAnnotatedString {
        var inBracket = false
        shoreshText.forEach { char ->
            when {
                char == '[' -> inBracket = true
                char == ']' -> inBracket = false
                inBracket -> {
                    withStyle(
                        SpanStyle(
                            color = DesignTokens.Colors.Primary.light,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = DesignTokens.FontSize.lg,
                        ),
                    ) {
                        append(char)
                    }
                }
                else -> {
                    withStyle(
                        SpanStyle(
                            color = DesignTokens.Colors.Text.primary,
                            fontSize = DesignTokens.FontSize.md,
                        ),
                    ) {
                        append(char)
                    }
                }
            }
        }
    }

    Text(
        text = annotated,
        modifier = modifier,
    )
}
