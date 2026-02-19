package tv.bayit.plus.feature.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
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
    onRefresh: () -> Unit,
    onDismissShabbatBanner: () -> Unit = {},
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
                            flagText = "🇮🇱",
                            locationLabel = bayitString(
                                "cultureClock.timeIn",
                                mapOf("location" to bayitString("clock.israel")),
                            ),
                            timezoneId = "Asia/Jerusalem",
                            isIsraeli = true,
                            modifier = Modifier.weight(1f),
                        )
                        CultureClock(
                            flagText = "🇺🇸",
                            locationLabel = bayitString(
                                "cultureClock.timeIn",
                                mapOf("location" to "New York, NY"),
                            ),
                            timezoneId = "America/New_York",
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

            if (uiState.spotlight.isNotEmpty()) {
                item(key = "carousel") {
                    HeroCarousel(items = uiState.spotlight, onItemClick = onSpotlightClick)
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

            if (uiState.featuredCollections.isNotEmpty() && !isBannerDismissed) {
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

            if (uiState.liveChannels.isNotEmpty()) {
                item(key = "live") {
                    LiveTVRow(
                        channels = uiState.liveChannels,
                        onChannelClick = onChannelClick,
                        onShowAllClick = onLiveTVShowAll,
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

            if (uiState.israelisInCity != null) {
                item(key = "israelis") {
                    LocationContentRow(
                        title = bayitString("home.nearYou"),
                        israelisResponse = uiState.israelisInCity,
                        onItemClick = { id, type -> onContentClick(ContentItem(id = id, type = type)) },
                        onShowAllClick = onIsraelisCityShowAll,
                    )
                }
            }

            if (uiState.israeliBusinesses != null) {
                item(key = "businesses") {
                    BusinessLocationRow(
                        businessesResponse = uiState.israeliBusinesses,
                        onItemClick = { id, type -> onContentClick(ContentItem(id = id, type = type)) },
                        onShowAllClick = onIsraeliBusinessesShowAll,
                    )
                }
            }

            if (uiState.trendingContent.isNotEmpty()) {
                item(key = "trending") {
                    TrendingRow(
                        items = uiState.trendingContent,
                        onItemClick = { item -> item.url?.let(onOpenUrl) },
                        onShowAllClick = onTrendingShowAll,
                    )
                }
            }

            if (uiState.youngstersTrending.isNotEmpty()) {
                item(key = "youngsters") {
                    YoungstersSection(
                        items = uiState.youngstersTrending,
                        onItemClick = { id, type -> onContentClick(ContentItem(id = id, type = type)) },
                        onShowAllClick = onYoungstersClick,
                    )
                }
            }

            if (uiState.jerusalemContent?.items?.isNotEmpty() == true) {
                item(key = "jerusalem") {
                    CityContentRow(
                        title = bayitString("home.jerusalemConnection"),
                        items = uiState.jerusalemContent.items,
                        onItemClick = { id, type -> onContentClick(ContentItem(id = id, type = type)) },
                        onShowAllClick = onJerusalemClick,
                        backgroundRes = R.drawable.bg_jerusalem,
                    )
                }
            }

            if (uiState.telAvivContent?.items?.isNotEmpty() == true) {
                item(key = "telaviv") {
                    CityContentRow(
                        title = bayitString("home.telAvivConnection"),
                        items = uiState.telAvivContent.items,
                        onItemClick = { id, type -> onContentClick(ContentItem(id = id, type = type)) },
                        onShowAllClick = onTelAvivClick,
                        backgroundRes = R.drawable.bg_telaviv,
                    )
                }
            }

            items(items = uiState.categories, key = { it.id }) { category ->
                CategoryRow(
                    category = category,
                    onItemClick = onContentClick,
                    onShowAllClick = onCategoryShowAll,
                )
            }
        }
    }
}
