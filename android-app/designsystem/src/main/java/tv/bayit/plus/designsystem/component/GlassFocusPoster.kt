package tv.bayit.plus.designsystem.component

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.Dp
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val FOCUS_SCALE = 1.08f
private const val DEFAULT_SCALE = 1f
private const val ANIMATION_DURATION_MS = 200

@Composable
fun GlassFocusPoster(
    imageUrl: String?,
    contentDescription: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    posterWidth: Dp = DesignTokens.Spacing.xxxxl * 3,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    val scale by animateFloatAsState(
        targetValue = if (isFocused) FOCUS_SCALE else DEFAULT_SCALE,
        animationSpec = tween(durationMillis = ANIMATION_DURATION_MS),
        label = "poster_scale",
    )

    val elevation by animateDpAsState(
        targetValue = if (isFocused) DesignTokens.Spacing.md else DesignTokens.Spacing.xxs,
        animationSpec = tween(durationMillis = ANIMATION_DURATION_MS),
        label = "poster_elevation",
    )

    val shape = RoundedCornerShape(DesignTokens.Radius.md)

    Box(
        modifier = modifier
            .width(posterWidth)
            .aspectRatio(2f / 3f)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .shadow(
                elevation = elevation,
                shape = shape,
                ambientColor = DesignTokens.Colors.Glass.purpleGlow,
                spotColor = DesignTokens.Colors.Glass.purpleGlow,
            )
            .clip(shape)
            .then(
                if (isFocused) {
                    Modifier.border(
                        width = DesignTokens.Spacing.xxs,
                        color = DesignTokens.Colors.Glass.borderFocus,
                        shape = shape,
                    )
                } else {
                    Modifier
                }
            )
            .focusable(interactionSource = interactionSource)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick,
            ),
    ) {
        CachedAsyncImage(
            url = imageUrl,
            contentDescription = contentDescription,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
        )
    }
}
