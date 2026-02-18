package tv.bayit.plus.feature.player.live.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import tv.bayit.plus.feature.player.live.LiveDubbingUiState
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Overlay displaying live dubbing transcript text with Glass styling.
 */
@Composable
fun LiveDubbingOverlay(
    state: LiveDubbingUiState,
    modifier: Modifier = Modifier,
) {
    AnimatedVisibility(
        visible = state.showOverlay && state.transcriptText.isNotEmpty(),
        enter = fadeIn(),
        exit = fadeOut(),
        modifier = modifier,
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(
                    horizontal = DesignTokens.Spacing.xl,
                    vertical = DesignTokens.Spacing.xxxl,
                ),
            contentAlignment = Alignment.BottomCenter,
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
                if (state.originalText.isNotEmpty()) {
                    Text(
                        text = state.originalText,
                        color = DesignTokens.Colors.Text.muted,
                        fontSize = DesignTokens.FontSize.sm,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
                }
                Text(
                    text = state.transcriptText,
                    color = DesignTokens.Colors.Text.primary,
                    fontSize = DesignTokens.FontSize.md,
                    fontWeight = FontWeight.Medium,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}
