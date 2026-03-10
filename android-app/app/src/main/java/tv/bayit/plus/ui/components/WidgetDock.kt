package tv.bayit.plus.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.WidgetItem
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Minimized widget dock on the left edge of the screen.
 * Shows circular icon buttons for each minimized widget.
 * Matches iOS PiPWidgetManagerView layout and behavior.
 */
@Composable
fun WidgetDock(
    minimizedWidgets: List<WidgetItem>,
    isDockVisible: Boolean,
    onWidgetClick: (String) -> Unit,
    onCloseDock: () -> Unit,
    modifier: Modifier = Modifier,
) {
    AnimatedVisibility(
        visible = isDockVisible && minimizedWidgets.isNotEmpty(),
        enter = slideInHorizontally(
            animationSpec = spring(
                dampingRatio = Spring.DampingRatioMediumBouncy,
                stiffness = Spring.StiffnessLow
            )
        ) + fadeIn(),
        exit = slideOutHorizontally(
            animationSpec = spring(
                dampingRatio = Spring.DampingRatioMediumBouncy,
                stiffness = Spring.StiffnessLow
            )
        ) + fadeOut()
    ) {
        DockContent(
            minimizedWidgets = minimizedWidgets,
            onWidgetClick = onWidgetClick,
            onCloseDock = onCloseDock,
            modifier = modifier
        )
    }
}

@Composable
private fun DockContent(
    minimizedWidgets: List<WidgetItem>,
    onWidgetClick: (String) -> Unit,
    onCloseDock: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier.fillMaxHeight(),
        contentAlignment = Alignment.CenterStart
    ) {
        Column(
            modifier = Modifier
                .padding(start = DesignTokens.Spacing.sm)
                .shadow(
                    elevation = 8.dp,
                    shape = RoundedCornerShape(
                        topStart = 0.dp,
                        topEnd = DesignTokens.Radius.lg,
                        bottomEnd = DesignTokens.Radius.lg,
                        bottomStart = 0.dp
                    )
                )
                .clip(
                    RoundedCornerShape(
                        topStart = 0.dp,
                        topEnd = DesignTokens.Radius.lg,
                        bottomEnd = DesignTokens.Radius.lg,
                        bottomStart = 0.dp
                    )
                )
                .background(Color.Black.copy(alpha = 0.85f))
                .padding(DesignTokens.Spacing.sm),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            minimizedWidgets.forEach { widget ->
                WidgetIconButton(
                    widget = widget,
                    onClick = { onWidgetClick(widget.id) }
                )
            }

            CloseButton(onClick = onCloseDock)
        }
    }
}

@Composable
private fun WidgetIconButton(
    widget: WidgetItem,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .size(48.dp)
            .clip(CircleShape)
            .background(DesignTokens.Colors.Glass.bgStrong)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = widget.title.firstOrNull()?.uppercaseChar()?.toString() ?: "W",
            style = MaterialTheme.typography.titleMedium,
            color = DesignTokens.Colors.Primary.base
        )
    }
}

@Composable
private fun CloseButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .size(24.dp)
            .clip(CircleShape)
            .background(Color.White.copy(alpha = 0.08f))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = Icons.Default.Close,
            contentDescription = bayitString("widgets.hideDock"),
            tint = DesignTokens.Colors.Text.muted,
            modifier = Modifier.size(12.dp)
        )
    }
}
