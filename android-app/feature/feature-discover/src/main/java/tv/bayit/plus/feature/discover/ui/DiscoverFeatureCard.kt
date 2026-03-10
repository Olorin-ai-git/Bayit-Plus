package tv.bayit.plus.feature.discover.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.discover.model.DiscoverFeature
import tv.bayit.plus.feature.discover.model.FeatureAvailabilityState

@Composable
internal fun DiscoverFeatureCard(
    feature: DiscoverFeature,
    availability: FeatureAvailabilityState,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassCard(
        modifier = modifier
            .width(CARD_WIDTH)
            .clickable(onClick = onClick),
    ) {
        Column(
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
            ) {
                Icon(
                    imageVector = discoverIcon(feature.iconName),
                    contentDescription = bayitString(feature.nameKey),
                    tint = DesignTokens.Colors.Primary.light,
                    modifier = Modifier.size(ICON_SIZE),
                )
                Text(
                    text = bayitString(feature.nameKey),
                    style = MaterialTheme.typography.titleSmall,
                    color = DesignTokens.Colors.Text.primary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
            }

            Text(
                text = bayitString(feature.taglineKey),
                style = MaterialTheme.typography.bodySmall,
                color = DesignTokens.Colors.Text.secondary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )

            DiscoverAvailabilityBadge(
                state = availability,
                modifier = Modifier.padding(top = DesignTokens.Spacing.xxs),
            )
        }
    }
}

private val CARD_WIDTH = 200.dp
private val ICON_SIZE = 24.dp
