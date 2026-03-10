package tv.bayit.plus.feature.discover.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.discover.model.DiscoverCategory
import tv.bayit.plus.feature.discover.model.DiscoverFeature
import tv.bayit.plus.feature.discover.model.FeatureAvailabilityState

/**
 * A horizontal section showing a category header and a scrollable row of [DiscoverFeatureCard] items.
 */
@Composable
internal fun DiscoverCategorySection(
    category: DiscoverCategory,
    features: List<DiscoverFeature>,
    availabilityStates: Map<String, FeatureAvailabilityState>,
    onFeatureClick: (DiscoverFeature) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        Text(
            text = bayitString(category.nameKey),
            style = MaterialTheme.typography.titleMedium,
            color = DesignTokens.Colors.Text.primary,
            modifier = Modifier.padding(horizontal = DesignTokens.Spacing.lg),
        )

        LazyRow(
            contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.lg),
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
