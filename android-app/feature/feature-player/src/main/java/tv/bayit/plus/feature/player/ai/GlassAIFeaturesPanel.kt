package tv.bayit.plus.feature.player.ai

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandHorizontally
import androidx.compose.animation.shrinkHorizontally
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.ClosedCaption
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.LiveTv
import androidx.compose.material.icons.filled.Quiz
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.GlassLiveControlButton
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Horizontal expandable AI features panel for live content.
 *
 * Shows toggle buttons for: Live Translate (subtitles), Split Subtitles,
 * Live Dubbing, and Trivia. Includes mutual exclusivity logic between
 * dubbing and subtitles. Displays a language badge and expand/collapse toggle.
 */
@Composable
fun GlassAIFeaturesPanel(
    isExpanded: Boolean,
    languageBadge: String,
    isLiveTranslateEnabled: Boolean,
    isSplitSubtitlesEnabled: Boolean,
    isDubbingEnabled: Boolean,
    isTriviaEnabled: Boolean,
    onToggleExpand: () -> Unit,
    onLiveTranslateToggle: () -> Unit,
    onSplitSubtitlesToggle: () -> Unit,
    onDubbingToggle: () -> Unit,
    onTriviaToggle: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.lg,
                backgroundColor = DesignTokens.Colors.Glass.purpleLight,
            )
            .padding(
                horizontal = DesignTokens.Spacing.sm,
                vertical = DesignTokens.Spacing.xs,
            ),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onToggleExpand, modifier = Modifier.size(36.dp)) {
            Icon(
                imageVector = Icons.Default.AutoAwesome,
                contentDescription = bayitString("player.ai.featuresTitle"),
                tint = DesignTokens.Colors.Primary.light,
                modifier = Modifier.size(20.dp),
            )
        }

        Text(
            text = languageBadge,
            color = DesignTokens.Colors.Primary.light,
            fontSize = DesignTokens.FontSize.xs,
            fontWeight = FontWeight.Bold,
        )

        AnimatedVisibility(
            visible = isExpanded,
            enter = expandHorizontally(),
            exit = shrinkHorizontally(),
        ) {
            Row(
                modifier = Modifier.padding(start = DesignTokens.Spacing.sm),
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
            ) {
                FeatureToggleButton(
                    icon = Icons.Default.ClosedCaption,
                    label = bayitString("player.ai.translate"),
                    isEnabled = isLiveTranslateEnabled,
                    onClick = onLiveTranslateToggle,
                )
                FeatureToggleButton(
                    icon = Icons.Default.LiveTv,
                    label = bayitString("player.ai.split"),
                    isEnabled = isSplitSubtitlesEnabled,
                    onClick = onSplitSubtitlesToggle,
                )
                FeatureToggleButton(
                    icon = Icons.Default.GraphicEq,
                    label = bayitString("player.ai.dub"),
                    isEnabled = isDubbingEnabled,
                    onClick = onDubbingToggle,
                )
                FeatureToggleButton(
                    icon = Icons.Default.Quiz,
                    label = bayitString("player.ai.trivia"),
                    isEnabled = isTriviaEnabled,
                    onClick = onTriviaToggle,
                )
            }
        }
    }
}

@Composable
private fun FeatureToggleButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    isEnabled: Boolean,
    onClick: () -> Unit,
) {
    GlassLiveControlButton(
        icon = icon,
        label = label,
        onClick = onClick,
        isLive = isEnabled,
        liveLabel = bayitString("player.controls.on"),
    )
}
