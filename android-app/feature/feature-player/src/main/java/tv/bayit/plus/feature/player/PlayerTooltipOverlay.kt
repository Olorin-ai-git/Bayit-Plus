package tv.bayit.plus.feature.player

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
import androidx.compose.ui.res.stringResource
import kotlinx.coroutines.launch
import tv.bayit.plus.designsystem.component.ArrowDirection
import tv.bayit.plus.designsystem.component.GlassTooltip
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.onboarding.TooltipManager

private const val LIVE_DUBBING_KEY = "live_dubbing"
private const val VOD_PAUSE_ASK_KEY = "vod_pause_ask"

/**
 * Shows a one-time tooltip for live dubbing when the player
 * first opens on live content.
 */
@Composable
internal fun LiveDubbingTooltipOverlay(
    tooltipManager: TooltipManager,
    isLiveContent: Boolean,
    modifier: Modifier = Modifier,
) {
    if (!isLiveContent) return
    TooltipOverlayImpl(
        tooltipManager = tooltipManager,
        featureKey = LIVE_DUBBING_KEY,
        message = stringResource(
            tv.bayit.plus.feature.onboarding.R.string.tooltip_live_dubbing,
        ),
        modifier = modifier,
    )
}

/**
 * Shows a one-time tooltip for VOD pause-and-ask when the player
 * first pauses on VOD content.
 */
@Composable
internal fun VodPauseAskTooltipOverlay(
    tooltipManager: TooltipManager,
    isPlaying: Boolean,
    isLiveContent: Boolean,
    modifier: Modifier = Modifier,
) {
    if (isLiveContent || isPlaying) return
    TooltipOverlayImpl(
        tooltipManager = tooltipManager,
        featureKey = VOD_PAUSE_ASK_KEY,
        message = stringResource(
            tv.bayit.plus.feature.onboarding.R.string.tooltip_pause_and_ask,
        ),
        modifier = modifier,
    )
}

@Composable
private fun TooltipOverlayImpl(
    tooltipManager: TooltipManager,
    featureKey: String,
    message: String,
    modifier: Modifier = Modifier,
) {
    var visible by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(featureKey) {
        visible = tooltipManager.shouldShow(featureKey)
    }

    if (visible) {
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
                arrowDirection = ArrowDirection.Bottom,
                onDismiss = {
                    visible = false
                    scope.launch { tooltipManager.markShown(featureKey) }
                },
            )
        }
    }
}
