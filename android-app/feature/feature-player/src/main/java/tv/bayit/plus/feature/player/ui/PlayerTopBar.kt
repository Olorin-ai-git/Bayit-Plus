package tv.bayit.plus.feature.player.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ClosedCaption
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Glassmorphic top bar displayed over the video surface.
 *
 * Shows a back button, the content title, and action buttons for
 * subtitle language selection and AI features (live content only).
 */
@Composable
fun PlayerTopBar(
    title: String,
    isLiveContent: Boolean,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    onSubtitlePickerClick: (() -> Unit)? = null,
    onAIFeaturesClick: (() -> Unit)? = null,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.default,
                backgroundColor = DesignTokens.Colors.Glass.bgMedium,
            )
            .padding(
                horizontal = DesignTokens.Spacing.sm,
                vertical = DesignTokens.Spacing.xs,
            ),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Navigate back",
                tint = DesignTokens.Colors.Text.primary,
                modifier = Modifier.size(24.dp),
            )
        }

        Text(
            text = title,
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.md,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )

        Row(horizontalArrangement = Arrangement.End) {
            onSubtitlePickerClick?.let { onClick ->
                IconButton(onClick = onClick) {
                    Icon(
                        imageVector = Icons.Default.ClosedCaption,
                        contentDescription = "Subtitles",
                        tint = DesignTokens.Colors.Text.primary,
                        modifier = Modifier.size(24.dp),
                    )
                }
            }

            if (isLiveContent) {
                onAIFeaturesClick?.let { onClick ->
                    Spacer(modifier = Modifier.width(DesignTokens.Spacing.xs))
                    IconButton(onClick = onClick) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = "AI Features",
                            tint = DesignTokens.Colors.Primary.light,
                            modifier = Modifier.size(24.dp),
                        )
                    }
                }
            }
        }
    }
}
