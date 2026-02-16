package tv.bayit.plus.feature.player.subtitles

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import tv.bayit.plus.core.model.SubtitleCue
import tv.bayit.plus.core.model.SubtitleLanguages
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * A single pane in the split subtitle view.
 *
 * Displays a language badge and the subtitle cue text with
 * word-level tap support.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SubtitlePane(
    cue: SubtitleCue?,
    languageCode: String,
    onWordTap: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val languageInfo = SubtitleLanguages.info(languageCode)
    val isRTL = languageInfo?.isRTL ?: false
    val layoutDirection = if (isRTL) LayoutDirection.Rtl else LayoutDirection.Ltr

    CompositionLocalProvider(LocalLayoutDirection provides layoutDirection) {
        Column(
            modifier = modifier
                .glassMorphism(
                    cornerRadius = DesignTokens.Radius.md,
                    backgroundColor = DesignTokens.Colors.Glass.bgStrong,
                )
                .padding(DesignTokens.Spacing.sm),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = SubtitleLanguages.badge(languageCode),
                color = DesignTokens.Colors.Primary.light,
                fontSize = DesignTokens.FontSize.xs,
                fontWeight = FontWeight.Bold,
            )

            cue?.let { activeCue ->
                val words = activeCue.words
                if (!words.isNullOrEmpty()) {
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs, Alignment.CenterHorizontally),
                        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xxs, Alignment.CenterVertically),
                    ) {
                        words.forEach { word ->
                            word.word?.let { text ->
                                WordButton(
                                    text = text,
                                    isHebrew = word.isHebrew ?: false,
                                    onClick = { onWordTap(text) },
                                )
                            }
                        }
                    }
                } else {
                    activeCue.text?.let { text ->
                        SubtitleTextFallback(text = text)
                    }
                }
            }
        }
    }
}
