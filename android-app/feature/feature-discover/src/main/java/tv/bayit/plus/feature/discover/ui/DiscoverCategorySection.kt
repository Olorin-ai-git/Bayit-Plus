package tv.bayit.plus.feature.discover.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.discover.model.DiscoverCategory
import tv.bayit.plus.feature.discover.model.DiscoverFeature
import tv.bayit.plus.feature.discover.model.FeatureAvailabilityState

@Composable
internal fun DiscoverCategorySection(
    category: DiscoverCategory,
    features: List<DiscoverFeature>,
    availabilityStates: Map<String, FeatureAvailabilityState>,
    onFeatureClick: (DiscoverFeature) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = DesignTokens.Spacing.lg),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            Icon(
                imageVector = discoverIcon(category.iconName),
                contentDescription = null,
                tint = DesignTokens.Colors.Primary.light,
                modifier = Modifier.size(20.dp),
            )
            Text(
                text = bayitString(category.nameKey),
                style = MaterialTheme.typography.titleMedium,
                color = DesignTokens.Colors.Text.primary,
            )
        }

        LazyRow(
            contentPadding = PaddingValues(
                horizontal = DesignTokens.Spacing.lg,
                vertical = DesignTokens.Spacing.md,
            ),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            items(features, key = { it.id }) { feature ->
                DiscoverFeatureCard(
                    feature = feature,
                    availability = availabilityStates[feature.id]
                        ?: FeatureAvailabilityState.Ready,
                    onClick = { onFeatureClick(feature) },
                )
            }
        }
    }
}
