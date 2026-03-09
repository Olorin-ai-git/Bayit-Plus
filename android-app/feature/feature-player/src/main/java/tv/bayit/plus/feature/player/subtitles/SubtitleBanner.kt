package tv.bayit.plus.feature.player.subtitles

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import kotlinx.coroutines.delay
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Transient banner shown when subtitles are automatically added
 * to BYOC content. Auto-dismisses after [AUTO_DISMISS_MS].
 */
@Composable
fun SubtitleBanner(
    message: String?,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    AnimatedVisibility(
        visible = message != null,
        enter = slideInVertically { -it } + fadeIn(),
        exit = slideOutVertically { -it } + fadeOut(),
        modifier = modifier,
    ) {
        message?.let {
            Text(
                text = it,
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.sm,
                fontWeight = FontWeight.Medium,
                modifier = Modifier
                    .glassMorphism(
                        cornerRadius = DesignTokens.Radius.md,
                        backgroundColor = DesignTokens.Colors.Glass.bgStrong,
                    )
                    .padding(
                        horizontal = DesignTokens.Spacing.md,
                        vertical = DesignTokens.Spacing.sm,
                    ),
            )
        }
    }

    if (message != null) {
        LaunchedEffect(message) {
            delay(AUTO_DISMISS_MS)
            onDismiss()
        }
    }
}

private const val AUTO_DISMISS_MS = 4000L
