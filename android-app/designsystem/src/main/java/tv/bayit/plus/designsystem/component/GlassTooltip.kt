package tv.bayit.plus.designsystem.component

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.dismiss
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupProperties
import tv.bayit.plus.designsystem.theme.DesignTokens
import androidx.compose.foundation.Canvas

private const val ARROW_WIDTH_FACTOR = 2f
private const val ARROW_ROTATION_START = 180f
private const val ARROW_ROTATION_END = 90f
private const val ARROW_ROTATION_NONE = 0f
private const val ARROW_ROTATION_REVERSE = 270f

enum class ArrowDirection {
    Top,
    Bottom,
    Start,
    End,
}

@Composable
fun GlassTooltip(
    message: String,
    arrowDirection: ArrowDirection,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    offset: IntOffset = IntOffset.Zero,
) {
    Popup(
        alignment = Alignment.TopStart,
        offset = offset,
        onDismissRequest = onDismiss,
        properties = PopupProperties(focusable = true),
    ) {
        TooltipContent(
            message = message,
            arrowDirection = arrowDirection,
            onDismiss = onDismiss,
            modifier = modifier,
        )
    }
}

@Composable
private fun TooltipContent(
    message: String,
    arrowDirection: ArrowDirection,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val semanticsModifier = Modifier.semantics {
        contentDescription = message
        dismiss { onDismiss(); true }
    }

    Column(
        modifier = modifier.then(semanticsModifier),
        horizontalAlignment = when (arrowDirection) {
            ArrowDirection.Top, ArrowDirection.Bottom -> Alignment.CenterHorizontally
            ArrowDirection.Start -> Alignment.Start
            ArrowDirection.End -> Alignment.End
        },
    ) {
        if (arrowDirection == ArrowDirection.Top) {
            TooltipArrow(rotation = ARROW_ROTATION_NONE)
        }

        if (arrowDirection == ArrowDirection.Start) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                TooltipArrow(rotation = ARROW_ROTATION_REVERSE)
                Spacer(modifier = Modifier.width(DesignTokens.Spacing.xxs))
                TooltipBody(message = message, onDismiss = onDismiss)
            }
        } else if (arrowDirection == ArrowDirection.End) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                TooltipBody(message = message, onDismiss = onDismiss)
                Spacer(modifier = Modifier.width(DesignTokens.Spacing.xxs))
                TooltipArrow(rotation = ARROW_ROTATION_END)
            }
        } else {
            TooltipBody(message = message, onDismiss = onDismiss)
        }

        if (arrowDirection == ArrowDirection.Bottom) {
            TooltipArrow(rotation = ARROW_ROTATION_START)
        }
    }
}

@Composable
private fun TooltipBody(
    message: String,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassCard(modifier = modifier) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = message,
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.sm,
                modifier = Modifier.weight(1f),
            )
            Spacer(modifier = Modifier.width(DesignTokens.Spacing.sm))
            IconButton(
                onClick = onDismiss,
                modifier = Modifier.size(DesignTokens.TouchTarget.minimum),
            ) {
                Icon(
                    imageVector = Icons.Filled.Close,
                    contentDescription = "Dismiss tooltip",
                    tint = DesignTokens.Colors.Text.secondary,
                    modifier = Modifier.size(DesignTokens.Spacing.base),
                )
            }
        }
    }
}

@Composable
private fun TooltipArrow(
    rotation: Float,
    modifier: Modifier = Modifier,
) {
    val arrowColor = DesignTokens.Colors.Glass.bg

    Canvas(
        modifier = modifier
            .size(
                width = DesignTokens.Spacing.md,
                height = DesignTokens.Spacing.sm,
            )
            .rotate(rotation),
    ) {
        val path = Path().apply {
            moveTo(size.width / ARROW_WIDTH_FACTOR, 0f)
            lineTo(size.width, size.height)
            lineTo(0f, size.height)
            close()
        }
        drawPath(path = path, color = arrowColor, style = Fill)
    }
}
