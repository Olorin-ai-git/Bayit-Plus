package tv.bayit.plus.feature.player.live.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandHorizontally
import androidx.compose.animation.shrinkHorizontally
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.ClosedCaption
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconToggleButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import tv.bayit.plus.feature.player.live.AIFeaturesPanelState
import tv.bayit.plus.feature.player.live.LiveAIConfig

/**
 * AI features control panel with language selector and feature toggles
 */
@Composable
fun AIFeaturesPanel(
    state: AIFeaturesPanelState,
    onToggleExpand: () -> Unit,
    onSubtitlesTap: () -> Unit,
    onDubbingTap: () -> Unit,
    onTriviaTap: () -> Unit,
    onLanguageTap: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .background(
                color = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f),
                shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)
            )
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = onLanguageTap,
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer)
            ) {
                Text(
                    text = LiveAIConfig.getLanguageFlag(state.selectedLanguage),
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            IconButton(
                onClick = onToggleExpand,
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = "Toggle AI Panel",
                    tint = if (state.hasAnyActiveFeature) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.onSurface
                    }
                )
            }

            AnimatedVisibility(
                visible = state.isExpanded,
                enter = expandHorizontally(),
                exit = shrinkHorizontally()
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FeatureToggleButton(
                        icon = Icons.Default.ClosedCaption,
                        label = "Live Translate",
                        isEnabled = state.subtitlesState.isEnabled,
                        isConnecting = state.subtitlesState.isConnecting,
                        onClick = onSubtitlesTap
                    )

                    FeatureToggleButton(
                        icon = Icons.Default.GraphicEq,
                        label = "Dubbing",
                        isEnabled = state.dubbingState.isEnabled,
                        isConnecting = state.dubbingState.isConnecting,
                        onClick = onDubbingTap
                    )

                    FeatureToggleButton(
                        icon = Icons.Default.Lightbulb,
                        label = "Trivia",
                        isEnabled = state.triviaState.isEnabled,
                        isConnecting = state.triviaState.isConnecting,
                        onClick = onTriviaTap
                    )
                }
            }
        }
    }
}

@Composable
private fun FeatureToggleButton(
    icon: ImageVector,
    label: String,
    isEnabled: Boolean,
    isConnecting: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    IconToggleButton(
        checked = isEnabled,
        onCheckedChange = { onClick() },
        modifier = modifier.size(36.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = when {
                isConnecting -> MaterialTheme.colorScheme.tertiary
                isEnabled -> MaterialTheme.colorScheme.primary
                else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            }
        )
    }
}
