package tv.bayit.plus.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.WidgetItem
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens
import kotlin.math.roundToInt

/**
 * Floating PiP widget container that can be dragged and repositioned.
 * Matches iOS PiPWidgetContainerView layout with header bar and content area.
 * Supports minimize and close actions.
 */
@Composable
fun PiPWidgetContainer(
    widget: WidgetItem,
    initialPosition: Offset,
    onMinimize: () -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val configuration = LocalConfiguration.current
    val density = LocalDensity.current

    val maxWidth = with(density) { configuration.screenWidthDp.dp.toPx() }
    val maxHeight = with(density) { configuration.screenHeightDp.dp.toPx() }

    var offsetState by remember { mutableStateOf(initialPosition) }
    val widgetWidth = 300.dp
    val widgetHeight = 200.dp

    Box(
        modifier = modifier
            .width(widgetWidth)
            .height(widgetHeight)
            .offset {
                IntOffset(
                    offsetState.x.roundToInt(),
                    offsetState.y.roundToInt()
                )
            }
            .pointerInput(Unit) {
                detectDragGestures { change, dragAmount ->
                    change.consume()
                    val newX = (offsetState.x + dragAmount.x)
                        .coerceIn(0f, maxWidth - widgetWidth.toPx())
                    val newY = (offsetState.y + dragAmount.y)
                        .coerceIn(0f, maxHeight - widgetHeight.toPx())
                    offsetState = Offset(newX, newY)
                }
            }
            .shadow(
                elevation = 8.dp,
                shape = RoundedCornerShape(DesignTokens.Radius.md)
            )
            .clip(RoundedCornerShape(DesignTokens.Radius.md))
    ) {
        GlassCard(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.fillMaxSize()) {
                HeaderBar(
                    title = widget.title,
                    onMinimize = onMinimize,
                    onClose = onClose
                )
                ContentArea(widget = widget)
            }
        }
    }
}

@Composable
private fun HeaderBar(
    title: String,
    onMinimize: () -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(40.dp)
            .background(Color.Black.copy(alpha = 0.7f))
            .padding(horizontal = DesignTokens.Spacing.sm),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            color = DesignTokens.Colors.Text.primary,
            modifier = Modifier.weight(1f)
        )

        Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs)) {
            IconButton(
                onClick = onMinimize,
                modifier = Modifier.size(32.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Remove,
                    contentDescription = "Minimize",
                    tint = DesignTokens.Colors.Text.secondary
                )
            }

            IconButton(
                onClick = onClose,
                modifier = Modifier.size(32.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Close",
                    tint = DesignTokens.Colors.Text.secondary
                )
            }
        }
    }
}

@Composable
private fun ContentArea(
    widget: WidgetItem,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.85f))
            .padding(DesignTokens.Spacing.sm),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = widget.content?.contentType?.displayLabel ?: "Widget Content",
            style = MaterialTheme.typography.bodyMedium,
            color = DesignTokens.Colors.Text.secondary
        )
    }
}
