package tv.bayit.plus.feature.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import tv.bayit.plus.core.byoc.BYOCSourceManager
import tv.bayit.plus.core.byoc.models.BYOCContentItem
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.core.model.SpotlightItem
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.i18n.LocalBayitStrings
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.vod.components.CollectionBanner

@Composable
internal fun HomeSuccessContent(
    uiState: HomeUiState.Success,
    onSpotlightClick: (SpotlightItem) -> Unit,
    onSpotlightMoreInfoClick: (SpotlightItem) -> Unit,
    onContentClick: (ContentItem) -> Unit,
    onContinueWatchingItemClick: (String, String, Long) -> Unit,
    onChannelClick: (String) -> Unit,
    onRadioClick: (String) -> Unit,
    onCollectionClick: (String) -> Unit = {},
    onWatchNowClick: (String) -> Unit = {},
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
    onRequestLocationPermission: () -> Unit,
    onOpenLocationSettings: () -> Unit,
    isLocationPermissionPermanentlyDenied: Boolean,
    onConnectBYOCSources: () -> Unit = {},
    onBYOCItemClick: (BYOCContentItem) -> Unit = {},
    onBYOCSourceShowAll: (String) -> Unit = {},
    ownerMode: Boolean = false,
    sourceManager: BYOCSourceManager? = null,
    onRefresh: () -> Unit,
    onDismissShabbatBanner: () -> Unit = {},
    isPlusSubscriber: Boolean = false,
    onNavigateToSubscribe: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var isBannerDismissed by remember { mutableStateOf(false) }
    PullToRefreshBox(
        isRefreshing = uiState.isRefreshing,
        onRefresh = onRefresh,
        modifier = modifier,
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(vertical = DesignTokens.Spacing.md),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xl),
        ) {
            item(key = "header_clocks") {
                Column {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(
                                horizontal = DesignTokens.Spacing.md,
                                vertical = DesignTokens.Spacing.md,
                            ),
                        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
                    ) {
                        CultureClock(
                            flagText = "\uD83C\uDDEE\uD83C\uDDF1",
                            locationLabel = bayitString(
                                "cultureClock.timeIn",
                                mapOf("location" to bayitString("clock.israel")),
                            ),
                            timezoneId = "Asia/Jerusalem",
                            isIsraeli = true,
                            modifier = Modifier.weight(1f),
                        )
                        CultureClock(
                            flagText = timezoneDisplayFlag(uiState.localTimezone),
                            locationLabel = bayitString(
                                "cultureClock.timeIn",
                                mapOf("location" to uiState.localLocationLabel),
                            ),
                            timezoneId = uiState.localTimezone,
                            isIsraeli = false,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }

            if (uiState.shabbatInfo != null && uiState.shabbatInfo.isShabbat && !uiState.isShabbatBannerDismissed) {
                item(key = "shabbat_banner") {
                    ShabbatBanner(
                        shabbatInfo = uiState.shabbatInfo,
                        onDismiss = onDismissShabbatBanner,
                        modifier = Modifier.padding(horizontal = DesignTokens.Spacing.lg),
                    )
                }
            }

            if (!ownerMode) {
                byocHomeItems(uiState, sourceManager, onConnectBYOCSources, onBYOCItemClick, onBYOCSourceShowAll)
            }

            if (uiState.spotlight.isNotEmpty()) {
                item(key = "carousel") {
                    HeroCarousel(
                        items = uiState.spotlight,
                        onItemClick = onSpotlightClick,
                        onMoreInfoClick = onSpotlightMoreInfoClick,
                    )
                }
            }

            if (uiState.continueWatching.isNotEmpty()) {
                item(key = "continue") {
                    ContinueWatchingRow(
                        items = uiState.continueWatching,
                        onItemClick = { item ->
                            onContinueWatchingItemClick(
                                item.id,
                                item.type.orEmpty(),
                                ((item.position ?: 0.0) * 1000).toLong(),
                            )
                        },
                        onShowAllClick = onContinueWatchingShowAll,
                    )
                }
            }

            if (ownerMode && uiState.featuredCollections.isNotEmpty() && !isBannerDismissed) {
                item(key = "collections_banner") {
                    CollectionBanner(
                        collections = uiState.featuredCollections,
                        onCollectionClick = onCollectionClick,
                        onWatchNowClick = onWatchNowClick,
                        currentLanguage = LocalBayitStrings.current.currentLanguage,
                        onDismiss = { isBannerDismissed = true },
                    )
                }
            }

            if (ownerMode) {
                byocHomeItems(uiState, sourceManager, onConnectBYOCSources, onBYOCItemClick, onBYOCSourceShowAll)
            }

            if (uiState.liveChannels.isNotEmpty()) {
                item(key = "live") {
                    LiveTVRow(
                        channels = uiState.liveChannels,
                        onChannelClick = onChannelClick,
                        onShowAllClick = onLiveTVShowAll,
                    )
                }
            }

            if (!isPlusSubscriber) {
                item(key = "plus_feature_dubbing") {
                    PlusFeatureCard(
                        feature = PlusFeature.DUBBING,
                        onNavigateToSubscribe = onNavigateToSubscribe,
                    )
                }
            }

            if (uiState.radioStations.isNotEmpty()) {
                item(key = "radio") {
                    RadioStationsRow(
                        stations = uiState.radioStations,
                        onStationClick = onRadioClick,
                        onShowAllClick = onRadioShowAll,
                    )
                }
            }

            if (uiState.locationPermissionNeeded) {
                item(key = "location_permission") {
                    LocationPermissionCard(
                        isPermanentlyDenied = isLocationPermissionPermanentlyDenied,
                        onRequestPermission = onRequestLocationPermission,
                        onOpenSettings = onOpenLocationSettings,
                        modifier = Modifier.padding(horizontal = DesignTokens.Spacing.lg),
                    )
                }
            }

            homeLocationAndCityItems(
                uiState = uiState,
                onContentClick = onContentClick,
                onIsraelisCityShowAll = onIsraelisCityShowAll,
                onIsraeliBusinessesShowAll = onIsraeliBusinessesShowAll,
                onTrendingShowAll = onTrendingShowAll,
                onYoungstersClick = onYoungstersClick,
                onJerusalemClick = onJerusalemClick,
                onTelAvivClick = onTelAvivClick,
                onOpenUrl = onOpenUrl,
                onCategoryShowAll = onCategoryShowAll,
            )
        }
    }
}
