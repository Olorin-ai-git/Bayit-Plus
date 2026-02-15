package tv.bayit.plus.designsystem.modifier

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.unit.Dp
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun Modifier.glassMorphism(
    cornerRadius: Dp = DesignTokens.Radius.lg,
    backgroundColor: Color = DesignTokens.Colors.Glass.bg,
    borderColor: Color = DesignTokens.Colors.Glass.border,
    borderWidth: Dp = DesignTokens.Spacing.xxs,
    blurRadius: Float = 20f,
): Modifier {
    val shape = RoundedCornerShape(cornerRadius)

    return this
        .clip(shape)
        .background(backgroundColor, shape)
        .border(borderWidth, borderColor, shape)
}
