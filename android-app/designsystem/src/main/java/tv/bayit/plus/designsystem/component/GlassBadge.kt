package tv.bayit.plus.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun GlassBadge(
    count: Int,
    modifier: Modifier = Modifier,
) {
    if (count <= 0) return
    Box(
        modifier = modifier
            .defaultMinSize(minWidth = DesignTokens.Spacing.lg, minHeight = DesignTokens.Spacing.lg)
            .clip(CircleShape)
            .background(DesignTokens.Colors.Semantic.error, CircleShape)
            .padding(horizontal = DesignTokens.Spacing.xs),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = if (count > 99) "99+" else count.toString(),
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.xs,
            fontWeight = FontWeight.Bold,
        )
    }
}
