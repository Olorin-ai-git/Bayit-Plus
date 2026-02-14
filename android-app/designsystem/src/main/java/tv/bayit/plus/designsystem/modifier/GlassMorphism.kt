package tv.bayit.plus.designsystem.modifier

import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RenderEffect
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.Shader
import androidx.compose.ui.graphics.ShaderBrush
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
        .then(
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                Modifier.graphicsLayer {
                    renderEffect = RenderEffect.createBlurEffect(
                        blurRadius, blurRadius,
                        Shader.TileMode.CLAMP,
                    ).asComposeRenderEffect()
                }
            } else {
                Modifier
            }
        )
        .clip(shape)
        .background(backgroundColor, shape)
        .border(borderWidth, borderColor, shape)
}
