package tv.bayit.plus.feature.discover.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.discover.model.FeatureAvailabilityState

@Composable
internal fun DiscoverAvailabilityBadge(
    state: FeatureAvailabilityState,
    modifier: Modifier = Modifier,
) {
    val bgColor = badgeColor(state)
    val shape = RoundedCornerShape(DesignTokens.Radius.sm)

    Text(
        text = bayitString(state.badgeLabelKey),
        style = MaterialTheme.typography.labelSmall,
        color = Color.White,
        modifier = modifier
            .clip(shape)
            .background(bgColor, shape)
            .padding(
                horizontal = DesignTokens.Spacing.sm,
                vertical = DesignTokens.Spacing.xxs,
            ),
    )
}

@Composable
private fun badgeColor(state: FeatureAvailabilityState): Color = when (state) {
    is FeatureAvailabilityState.Ready -> DesignTokens.Colors.Semantic.success
    is FeatureAvailabilityState.SetupNeeded -> DesignTokens.Colors.Semantic.warning
    is FeatureAvailabilityState.PremiumRequired -> DesignTokens.Colors.Primary.light
    is FeatureAvailabilityState.NotAvailable -> DesignTokens.Colors.Text.disabled
    is FeatureAvailabilityState.PlatformOnly -> DesignTokens.Colors.Semantic.info
}
