package tv.bayit.plus.feature.discover.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.discover.model.FeatureAvailabilityState

/**
 * Small colored dot + label indicating feature availability.
 */
@Composable
internal fun DiscoverAvailabilityBadge(
    state: FeatureAvailabilityState,
    modifier: Modifier = Modifier,
) {
    val (dotColor, labelKey) = when (state) {
        is FeatureAvailabilityState.Ready ->
            DesignTokens.Colors.Semantic.success to "discover.availability.ready"

        is FeatureAvailabilityState.SetupNeeded ->
            DesignTokens.Colors.Semantic.warning to "discover.availability.setupNeeded"

        is FeatureAvailabilityState.PremiumRequired ->
            DesignTokens.Colors.Semantic.warning to "discover.availability.premiumRequired"

        is FeatureAvailabilityState.NotAvailable ->
            DesignTokens.Colors.Text.muted to "discover.availability.notAvailable"

        is FeatureAvailabilityState.PlatformOnly ->
            DesignTokens.Colors.Text.muted to "discover.availability.notAvailable"
    }

    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
    ) {
        AvailabilityDot(color = dotColor)
        Text(
            text = bayitString(labelKey),
            style = MaterialTheme.typography.labelSmall,
            color = DesignTokens.Colors.Text.secondary,
        )
    }
}

@Composable
private fun AvailabilityDot(color: Color) {
    Box(
        modifier = Modifier
            .size(DesignTokens.Spacing.sm)
            .clip(CircleShape)
            .background(color),
    )
}
