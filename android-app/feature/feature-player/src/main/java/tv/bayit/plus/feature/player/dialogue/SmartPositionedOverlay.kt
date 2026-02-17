package tv.bayit.plus.feature.player.dialogue

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Wraps content in a full-size box positioned according to [AvatarPlacement.position].
 *
 * Maps backend position strings (top_left, top_right, bottom_left, bottom_right)
 * to Compose [Alignment] values. Falls back to [Alignment.BottomEnd] when
 * placement is null or unrecognized.
 */
@Composable
fun SmartPositionedOverlay(
    placement: AvatarPlacement?,
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit,
) {
    val alignment = mapPositionToAlignment(placement?.position)

    Box(
        modifier = modifier
            .fillMaxSize()
            .padding(DesignTokens.Spacing.base),
        contentAlignment = alignment,
        content = content,
    )
}

private fun mapPositionToAlignment(position: String?): Alignment {
    return when (position) {
        POSITION_TOP_LEFT -> Alignment.TopStart
        POSITION_TOP_RIGHT -> Alignment.TopEnd
        POSITION_BOTTOM_LEFT -> Alignment.BottomStart
        POSITION_BOTTOM_RIGHT -> Alignment.BottomEnd
        else -> Alignment.BottomEnd
    }
}

private const val POSITION_TOP_LEFT = "top_left"
private const val POSITION_TOP_RIGHT = "top_right"
private const val POSITION_BOTTOM_LEFT = "bottom_left"
private const val POSITION_BOTTOM_RIGHT = "bottom_right"
