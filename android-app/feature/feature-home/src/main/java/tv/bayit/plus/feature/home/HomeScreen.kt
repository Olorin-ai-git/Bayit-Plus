package tv.bayit.plus.feature.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.core.model.SpotlightItem
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun HomeScreen(
    uiState: HomeUiState,
    onSpotlightClick: (SpotlightItem) -> Unit,
    onSpotlightMoreInfoClick: (SpotlightItem) -> Unit,
    onContentClick: (ContentItem) -> Unit,
    onContinueWatchingItemClick: (String, String, Long) -> Unit,
    onCollectionClick: (String) -> Unit,
    onWatchNowClick: (String) -> Unit,
    onChannelClick: (String) -> Unit,
    onRadioClick: (String) -> Unit,
    onYoungstersClick: () -> Unit,
    onJerusalemClick: () -> Unit,
    onTelAvivClick: () -> Unit,
    onContinueWatchingShowAll: () -> Unit,
    onLiveTVShowAll: () -> Unit,
    onRadioShowAll: () -> Unit,
    onTrendingShowAll: () -> Unit,
    onCategoryShowAll: (String) -> Unit,
    onIsraelisCityShowAll: () -> Unit,
    onIsraeliBusinessesShowAll: () -> Unit,
    onOpenUrl: (String) -> Unit,
    isLocationPermissionPermanentlyDenied: Boolean,
    onRequestLocationPermission: () -> Unit,
    onOpenLocationSettings: () -> Unit,
    onRefresh: () -> Unit,
    onDismissShabbatBanner: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is HomeUiState.Loading -> GlassLoadingIndicator(modifier = modifier)
        is HomeUiState.Success -> HomeSuccessContent(
            uiState = uiState,
            onSpotlightClick = onSpotlightClick,
            onSpotlightMoreInfoClick = onSpotlightMoreInfoClick,
            onContentClick = onContentClick,
            onContinueWatchingItemClick = onContinueWatchingItemClick,
            onCollectionClick = onCollectionClick,
            onWatchNowClick = onWatchNowClick,
            onChannelClick = onChannelClick,
            onRadioClick = onRadioClick,
            onYoungstersClick = onYoungstersClick,
            onJerusalemClick = onJerusalemClick,
            onTelAvivClick = onTelAvivClick,
            onContinueWatchingShowAll = onContinueWatchingShowAll,
            onLiveTVShowAll = onLiveTVShowAll,
            onRadioShowAll = onRadioShowAll,
            onTrendingShowAll = onTrendingShowAll,
            onCategoryShowAll = onCategoryShowAll,
            onIsraelisCityShowAll = onIsraelisCityShowAll,
            onIsraeliBusinessesShowAll = onIsraeliBusinessesShowAll,
            onOpenUrl = onOpenUrl,
            isLocationPermissionPermanentlyDenied = isLocationPermissionPermanentlyDenied,
            onRequestLocationPermission = onRequestLocationPermission,
            onOpenLocationSettings = onOpenLocationSettings,
            onRefresh = onRefresh,
            onDismissShabbatBanner = onDismissShabbatBanner,
            modifier = modifier,
        )
        is HomeUiState.Error -> ErrorSection(
            message = uiState.message,
            onRetry = onRefresh,
            modifier = modifier,
        )
    }
}

@Composable
private fun ErrorSection(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.Colors.Semantic.error,
            )
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}
