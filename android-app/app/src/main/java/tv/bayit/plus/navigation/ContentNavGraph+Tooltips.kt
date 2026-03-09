package tv.bayit.plus.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import tv.bayit.plus.designsystem.component.ArrowDirection
import tv.bayit.plus.feature.onboarding.FeatureTooltipOverlay
import tv.bayit.plus.feature.onboarding.TooltipManager

@EntryPoint
@InstallIn(SingletonComponent::class)
internal interface TooltipEntryPoint {
    fun tooltipManager(): TooltipManager
}

/**
 * Wraps screen content with a one-time [FeatureTooltipOverlay] that shows
 * on first encounter for the given [featureKey]. Resolves [TooltipManager]
 * via Hilt entry point so callers only need to supply the key and message.
 */
@Composable
internal fun WithFeatureTooltip(
    featureKey: String,
    message: String,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val context = LocalContext.current
    val tooltipManager = remember {
        EntryPointAccessors.fromApplication(
            context.applicationContext,
            TooltipEntryPoint::class.java,
        ).tooltipManager()
    }

    Box(modifier = modifier.fillMaxSize()) {
        content()
        FeatureTooltipOverlay(
            tooltipManager = tooltipManager,
            featureKey = featureKey,
            message = message,
            arrowDirection = ArrowDirection.Top,
            modifier = Modifier.align(Alignment.TopCenter),
        )
    }
}
