package tv.bayit.plus.feature.onboarding

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import kotlinx.coroutines.launch
import tv.bayit.plus.designsystem.component.ArrowDirection
import tv.bayit.plus.designsystem.component.GlassTooltip
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Shows a one-time [GlassTooltip] for a given feature key on first encounter.
 *
 * Queries [TooltipManager.shouldShow] on composition and, if the tooltip has
 * not been shown before (and tips are not globally disabled), displays it
 * anchored to the top of the content.
 *
 * Once dismissed, the tooltip is marked as shown and will not appear again.
 */
@Composable
fun FeatureTooltipOverlay(
    tooltipManager: TooltipManager,
    featureKey: String,
    message: String,
    modifier: Modifier = Modifier,
    arrowDirection: ArrowDirection = ArrowDirection.Top,
) {
    var showTooltip by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(featureKey) {
        showTooltip = tooltipManager.shouldShow(featureKey)
    }

    if (showTooltip) {
        Box(
            modifier = modifier
                .fillMaxWidth()
                .padding(
                    horizontal = DesignTokens.Spacing.base,
                    vertical = DesignTokens.Spacing.sm,
                ),
            contentAlignment = Alignment.TopCenter,
        ) {
            GlassTooltip(
                message = message,
                arrowDirection = arrowDirection,
                onDismiss = {
                    showTooltip = false
                    scope.launch { tooltipManager.markShown(featureKey) }
                },
            )
        }
    }
}
