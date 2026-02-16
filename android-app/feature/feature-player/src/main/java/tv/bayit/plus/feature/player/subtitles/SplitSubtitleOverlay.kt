package tv.bayit.plus.feature.player.subtitles

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import tv.bayit.plus.core.model.SplitSubtitleLayout
import tv.bayit.plus.core.model.SubtitleCue
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Dual/split subtitle overlay supporting two layout modes.
 *
 * - STACKED: Primary on top, secondary below
 * - SIDE_BY_SIDE: Left and right columns
 *
 * Mirrors tvOS implementation for consistent cross-platform experience.
 */
@Composable
fun SplitSubtitleOverlay(
    primaryCue: SubtitleCue?,
    secondaryCue: SubtitleCue?,
    primaryLanguage: String,
    secondaryLanguage: String,
    layout: SplitSubtitleLayout = SplitSubtitleLayout.STACKED,
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
            when (layout) {
                SplitSubtitleLayout.STACKED -> StackedLayout(
                    primaryCue = primaryCue,
                    secondaryCue = secondaryCue,
                    primaryLanguage = primaryLanguage,
                    secondaryLanguage = secondaryLanguage,
                    onWordTap = onWordTap,
                )
                SplitSubtitleLayout.SIDE_BY_SIDE -> SideBySideLayout(
                    primaryCue = primaryCue,
                    secondaryCue = secondaryCue,
                    primaryLanguage = primaryLanguage,
                    secondaryLanguage = secondaryLanguage,
                    onWordTap = onWordTap,
                )
            }
        }
    }
}

@Composable
private fun StackedLayout(
    primaryCue: SubtitleCue?,
    secondaryCue: SubtitleCue?,
    primaryLanguage: String,
    secondaryLanguage: String,
    onWordTap: (String) -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
    ) {
        // Primary subtitle on top
        SubtitlePane(
            cue = primaryCue,
            languageCode = primaryLanguage,
            onWordTap = onWordTap,
            modifier = Modifier.fillMaxWidth(),
        )
        // Secondary subtitle below
        SubtitlePane(
            cue = secondaryCue,
            languageCode = secondaryLanguage,
            onWordTap = onWordTap,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun SideBySideLayout(
    primaryCue: SubtitleCue?,
    secondaryCue: SubtitleCue?,
    primaryLanguage: String,
    secondaryLanguage: String,
    onWordTap: (String) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        // Primary subtitle on left
        SubtitlePane(
            cue = primaryCue,
            languageCode = primaryLanguage,
            onWordTap = onWordTap,
            modifier = Modifier.weight(1f),
        )
        // Secondary subtitle on right
        SubtitlePane(
            cue = secondaryCue,
            languageCode = secondaryLanguage,
            onWordTap = onWordTap,
            modifier = Modifier.weight(1f),
        )
    }
}
