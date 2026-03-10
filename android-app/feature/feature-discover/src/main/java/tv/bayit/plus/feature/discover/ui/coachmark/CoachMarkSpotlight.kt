package tv.bayit.plus.feature.discover.ui.coachmark

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.ClipOp
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.clipPath
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun CoachMarkSpotlight(
    targetRect: Rect,
    cornerRadius: Float = DesignTokens.Radius.md.value,
    modifier: Modifier = Modifier,
) {
    val overlayColor = Color.Black.copy(alpha = OVERLAY_OPACITY)
    val padding = SPOTLIGHT_PADDING

    Canvas(modifier = modifier.fillMaxSize()) {
        val paddedRect = Rect(
            left = targetRect.left - padding,
            top = targetRect.top - padding,
            right = targetRect.right + padding,
            bottom = targetRect.bottom + padding,
        )

        val cutoutPath = Path().apply {
            addRoundRect(
                RoundRect(
                    rect = paddedRect,
                    cornerRadius = CornerRadius(cornerRadius + padding),
                ),
            )
        }

        clipPath(cutoutPath, clipOp = ClipOp.Difference) {
            drawRect(
                color = overlayColor,
                topLeft = Offset.Zero,
                size = Size(size.width, size.height),
            )
        }
    }
}

private const val OVERLAY_OPACITY = 0.92f
private const val SPOTLIGHT_PADDING = 8f
