package tv.bayit.plus.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun GlassLiveControlButton(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    isLive: Boolean = false,
    liveLabel: String = "LIVE",
    contentDescription: String? = label,
) {
    Box(modifier = modifier) {
        Row(
            modifier = Modifier
                .glassMorphism(
                    cornerRadius = DesignTokens.Radius.md,
                    backgroundColor = DesignTokens.Colors.Glass.bg,
                )
                .defaultMinSize(minHeight = DesignTokens.TouchTarget.minimum)
                .clickable(onClick = onClick)
                .padding(
                    horizontal = DesignTokens.Spacing.base,
                    vertical = DesignTokens.Spacing.sm,
                ),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = contentDescription,
                tint = DesignTokens.Colors.Text.primary,
                modifier = Modifier.size(DesignTokens.Spacing.lg),
            )
            Spacer(modifier = Modifier.width(DesignTokens.Spacing.sm))
            Text(
                text = label,
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.base,
                fontWeight = FontWeight.Medium,
            )
        }

        if (isLive) {
            LiveBadge(
                label = liveLabel,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(end = DesignTokens.Spacing.xxs),
            )
        }
    }
}

@Composable
private fun LiveBadge(
    label: String,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(DesignTokens.Radius.sm))
            .background(DesignTokens.Colors.live)
            .padding(
                horizontal = DesignTokens.Spacing.xs,
                vertical = DesignTokens.Spacing.xxs,
            ),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xxs),
    ) {
        Box(
            modifier = Modifier
                .size(DesignTokens.Spacing.xs)
                .clip(CircleShape)
                .background(DesignTokens.Colors.Text.primary),
        )
        Text(
            text = label,
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.xs,
            fontWeight = FontWeight.Bold,
        )
    }
}
