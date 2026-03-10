package tv.bayit.plus.feature.discover.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.discover.DiscoverUiState

@Composable
internal fun DiscoverScreen(
    uiState: DiscoverUiState,
    onFeatureClick: (tv.bayit.plus.feature.discover.model.DiscoverFeature) -> Unit,
    onDismissDetail: () -> Unit,
    onStartWalkthrough: (tv.bayit.plus.feature.discover.model.DiscoverFeature) -> Unit,
    onNavigateToPlayer: (String, String) -> Unit,
    onNavigateToZehAni: () -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize()) {
        if (uiState.isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.align(Alignment.Center),
                color = DesignTokens.Colors.Primary.light,
            )
        } else {
            DiscoverContent(
                uiState = uiState,
                onFeatureClick = onFeatureClick,
            )
        }

        uiState.selectedFeature?.let { feature ->
            DiscoverFeatureDetailSheet(
                feature = feature,
                availability = uiState.availabilityFor(feature.id),
                config = uiState.configFor(feature.id),
                onDismiss = onDismissDetail,
                onStartWalkthrough = onStartWalkthrough,
                onNavigateToPlayer = onNavigateToPlayer,
                onNavigateToZehAni = onNavigateToZehAni,
            )
        }
    }
}

@Composable
private fun DiscoverContent(
    uiState: DiscoverUiState,
    onFeatureClick: (tv.bayit.plus.feature.discover.model.DiscoverFeature) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(vertical = DesignTokens.Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xl),
    ) {
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = DesignTokens.Spacing.lg),
            ) {
                Text(
                    text = bayitString("discover.title"),
                    style = MaterialTheme.typography.headlineLarge,
                    color = DesignTokens.Colors.Text.primary,
                )
                Text(
                    text = bayitString("discover.subtitle"),
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.secondary,
                    modifier = Modifier.padding(top = DesignTokens.Spacing.xs),
                )
            }
        }

        items(uiState.categories, key = { it.id }) { category ->
            DiscoverCategorySection(
                category = category,
                features = uiState.featuresForCategory(category),
                availabilityStates = uiState.availabilityStates,
                onFeatureClick = onFeatureClick,
            )
        }
    }
}
