package tv.bayit.plus.feature.player.dubbing

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
import tv.bayit.plus.core.model.LiveDubbingMessage
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Live dubbing text overlay showing original and translated text.
 *
 * Positioned at the bottom of the player, above the controls. Shows
 * the original language text (dimmed) and the translated text (primary).
 */
@Composable
fun LiveDubbingOverlay(
    currentMessage: LiveDubbingMessage?,
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
            visible = currentMessage != null,
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            currentMessage?.let { message ->
                Column(
                    modifier = Modifier
                        .glassMorphism(
                            cornerRadius = DesignTokens.Radius.md,
                            backgroundColor = DesignTokens.Colors.Glass.bgStrong,
                        )
                        .padding(DesignTokens.Spacing.md),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    message.originalText?.let { original ->
                        Text(
                            text = original,
                            color = DesignTokens.Colors.Text.muted,
                            fontSize = DesignTokens.FontSize.sm,
                        )
                    }

                    message.translatedText?.let { translated ->
                        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
                        Text(
                            text = translated,
                            color = DesignTokens.Colors.Text.primary,
                            fontSize = DesignTokens.FontSize.md,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }
            }
        }
    }
}

/**
 * Bilingual dubbing overlay showing both languages side by side.
 */
@Composable
fun BilingualDubbingOverlay(
    currentMessage: LiveDubbingMessage?,
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
            visible = currentMessage != null,
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            currentMessage?.let { message ->
                Column(
                    modifier = Modifier
                        .glassMorphism(
                            cornerRadius = DesignTokens.Radius.md,
                            backgroundColor = DesignTokens.Colors.Glass.bgStrong,
                        )
                        .padding(DesignTokens.Spacing.md),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    message.originalText?.let { text ->
                        Text(
                            text = "[${message.sourceLanguage?.uppercase().orEmpty()}] $text",
                            color = DesignTokens.Colors.Text.secondary,
                            fontSize = DesignTokens.FontSize.sm,
                        )
                    }
                    message.translatedText?.let { text ->
                        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
                        Text(
                            text = "[${message.targetLanguage?.uppercase().orEmpty()}] $text",
                            color = DesignTokens.Colors.Primary.light,
                            fontSize = DesignTokens.FontSize.md,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            }
        }
    }
}
