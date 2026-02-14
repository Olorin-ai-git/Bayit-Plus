package tv.bayit.plus.designsystem.component

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.background
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun GlassChip(
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(DesignTokens.Radius.full)
    Text(
        text = label,
        color = if (isSelected) DesignTokens.Colors.Text.primary else DesignTokens.Colors.Text.secondary,
        fontSize = DesignTokens.FontSize.sm,
        modifier = modifier
            .clip(shape)
            .background(
                if (isSelected) DesignTokens.Colors.Primary.base else DesignTokens.Colors.Glass.bg,
                shape,
            )
            .border(
                DesignTokens.Spacing.xxs,
                if (isSelected) DesignTokens.Colors.Glass.borderFocus else DesignTokens.Colors.Glass.border,
                shape,
            )
            .clickable(onClick = onClick)
            .padding(
                horizontal = DesignTokens.Spacing.md,
                vertical = DesignTokens.Spacing.xs,
            ),
    )
}
