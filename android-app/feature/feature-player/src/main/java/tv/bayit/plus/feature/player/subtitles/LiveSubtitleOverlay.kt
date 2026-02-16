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
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.core.model.LiveSubtitleMessage
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Single-language live subtitle overlay for real-time translation display.
 */
@Composable
fun LiveSubtitleOverlay(
    currentSubtitle: LiveSubtitleMessage?,
    previousSubtitle: LiveSubtitleMessage?,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(
                horizontal = DesignTokens.Spacing.xl,
                vertical = DesignTokens.Spacing.xxxl,
            ),
        contentAlignment = Alignment.BottomCenter,
    ) {
        AnimatedVisibility(
            visible = currentSubtitle != null,
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            Column(
                modifier = Modifier
                    .glassMorphism(
                        cornerRadius = DesignTokens.Radius.md,
                        backgroundColor = DesignTokens.Colors.Glass.bgStrong,
                    )
                    .padding(DesignTokens.Spacing.md),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                previousSubtitle?.translatedText?.let { text ->
                    Text(
                        text = text,
                        color = DesignTokens.Colors.Text.muted,
                        fontSize = DesignTokens.FontSize.sm,
                    )
                }
                currentSubtitle?.translatedText?.let { text ->
                    Text(
                        text = text,
                        color = DesignTokens.Colors.Text.primary,
                        fontSize = DesignTokens.FontSize.md,
                        fontWeight = FontWeight.Medium,
                    )
                }
            }
        }
    }
}

/**
 * Dual-language live subtitle overlay showing original and translated text
 * side by side for the split subtitle mode.
 */
@Composable
fun LiveSplitSubtitleOverlay(
    currentSubtitle: LiveSubtitleMessage?,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(
                horizontal = DesignTokens.Spacing.md,
                vertical = DesignTokens.Spacing.xxxl,
            ),
        contentAlignment = Alignment.BottomCenter,
    ) {
        AnimatedVisibility(
            visible = currentSubtitle != null,
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            currentSubtitle?.let { message ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                ) {
                    message.text?.let { original ->
                        LiveSubtitlePane(
                            text = original,
                            languageLabel = message.originalLanguage?.uppercase().orEmpty(),
                            modifier = Modifier.weight(1f),
                        )
                    }
                    message.translatedText?.let { translated ->
                        LiveSubtitlePane(
                            text = translated,
                            languageLabel = message.targetLanguage?.uppercase().orEmpty(),
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun LiveSubtitlePane(
    text: String,
    languageLabel: String,
    modifier: Modifier = Modifier,
) {
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
            text = languageLabel,
            color = DesignTokens.Colors.Primary.light,
            fontSize = DesignTokens.FontSize.xs,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = text,
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.sm,
        )
    }
}
