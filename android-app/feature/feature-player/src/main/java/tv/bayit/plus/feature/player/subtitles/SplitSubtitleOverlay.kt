package tv.bayit.plus.feature.player.subtitles

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import tv.bayit.plus.core.model.SubtitleCue
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Dual/split subtitle overlay showing two languages side-by-side.
 *
 * The primary language cue is displayed on the left and the secondary
 * language cue on the right, each in its own pane.
 */
@Composable
fun SplitSubtitleOverlay(
    primaryCue: SubtitleCue?,
    secondaryCue: SubtitleCue?,
    primaryLanguage: String,
    secondaryLanguage: String,
    onWordTap: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(
                horizontal = DesignTokens.Spacing.md,
                vertical = DesignTokens.Spacing.md,
            ),
        contentAlignment = Alignment.BottomCenter,
    ) {
        AnimatedVisibility(
            visible = primaryCue != null || secondaryCue != null,
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
            ) {
                SubtitlePane(
                    cue = primaryCue,
                    languageCode = primaryLanguage,
                    onWordTap = onWordTap,
                    modifier = Modifier.weight(1f),
                )
                SubtitlePane(
                    cue = secondaryCue,
                    languageCode = secondaryLanguage,
                    onWordTap = onWordTap,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}
