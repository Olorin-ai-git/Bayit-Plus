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
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.discover.model.DiscoverFeature
import tv.bayit.plus.feature.discover.model.FeatureAvailabilityState

private val CARD_WIDTH = 160.dp
private val ICON_SIZE = 28.dp

/**
 * Compact glass card representing a single [DiscoverFeature] in the horizontal category row.
 */
@Composable
internal fun DiscoverFeatureCard(
    feature: DiscoverFeature,
    availability: FeatureAvailabilityState,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .width(CARD_WIDTH)
            .glassMorphism(cornerRadius = DesignTokens.Radius.md)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(DesignTokens.Spacing.md),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            Icon(
                imageVector = discoverIcon(feature.iconName),
                contentDescription = null,
                tint = DesignTokens.Colors.Primary.light,
                modifier = Modifier.size(ICON_SIZE),
            )
            Text(
                text = bayitString(feature.nameKey),
                style = MaterialTheme.typography.labelLarge,
                color = DesignTokens.Colors.Text.primary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
        }

        DiscoverAvailabilityBadge(state = availability)
    }
}
