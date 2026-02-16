package tv.bayit.plus.designsystem.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Apply glassmorphism effect with backdrop blur and semi-transparent background
 */
fun Modifier.glassMorphism(
    cornerRadius: Dp = DesignTokens.Radius.lg,
    alpha: Float = 0.9f,
    borderAlpha: Float = 0.25f,
    blurRadius: Dp = 16.dp
): Modifier = this
    .clip(RoundedCornerShape(cornerRadius))
    .background(DesignTokens.Colors.Glass.bg.copy(alpha = alpha))
    .border(
        width = 1.dp,
        color = DesignTokens.Colors.Glass.border.copy(alpha = borderAlpha),
        shape = RoundedCornerShape(cornerRadius)
    )
