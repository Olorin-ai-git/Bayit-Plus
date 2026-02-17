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
import androidx.compose.ui.Modifier
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.core.model.SpotlightItem
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.vod.components.CollectionBanner
import java.util.Locale

@Composable
internal fun HomeSuccessContent(
    uiState: HomeUiState.Success,
    onSpotlightClick: (SpotlightItem) -> Unit,
    onContentClick: (ContentItem) -> Unit,
    onChannelClick: (String) -> Unit,
    onRadioClick: (String) -> Unit,
    onCollectionClick: (String) -> Unit = {},
    onWatchNowClick: (String) -> Unit = {},
    onYoungstersClick: () -> Unit,
    onJerusalemClick: () -> Unit,
    onTelAvivClick: () -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
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
                    PageHeader(icon = android.R.drawable.ic_menu_view, title = "Home")
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
                            locationLabel = "Time in Israel",
                            timezoneId = "Asia/Jerusalem",
                            isIsraeli = true,
                            modifier = Modifier.weight(1f),
                        )
                        CultureClock(
                            flagText = "🇺🇸",
                            locationLabel = "Time in New York, NY",
                            timezoneId = "America/New_York",
                            isIsraeli = false,
                            modifier = Modifier.weight(1f),
                        )
                    }
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
                        onItemClick = { id, type -> onContentClick(ContentItem(id = id, type = type)) },
                    )
                }
            }

            if (uiState.featuredCollections.isNotEmpty()) {
                item(key = "collections_banner") {
                    CollectionBanner(
                        collections = uiState.featuredCollections,
                        onCollectionClick = onCollectionClick,
                        onWatchNowClick = onWatchNowClick,
                        currentLanguage = Locale.getDefault().language,
                    )
                }
            }

            if (uiState.liveChannels.isNotEmpty()) {
                item(key = "live") {
                    LiveTVRow(channels = uiState.liveChannels, onChannelClick = onChannelClick)
                }
            }

            if (uiState.radioStations.isNotEmpty()) {
                item(key = "radio") {
                    RadioStationsRow(stations = uiState.radioStations, onStationClick = onRadioClick)
                }
            }

            if (uiState.israelisInCity != null) {
                item(key = "israelis") {
                    LocationContentRow(
                        title = "Israelis in Your City",
                        israelisResponse = uiState.israelisInCity,
                        onItemClick = { id, type -> onContentClick(ContentItem(id = id, type = type)) },
                    )
                }
            }

            if (uiState.israeliBusinesses != null) {
                item(key = "businesses") {
                    BusinessLocationRow(
                        businessesResponse = uiState.israeliBusinesses,
                        onItemClick = { id, type -> onContentClick(ContentItem(id = id, type = type)) },
                    )
                }
            }

            if (uiState.trendingContent.isNotEmpty()) {
                item(key = "trending") {
                    TrendingRow(
                        items = uiState.trendingContent,
                        onItemClick = { id, type -> onContentClick(ContentItem(id = id, type = type)) },
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
                        title = "Jerusalem",
                        items = uiState.jerusalemContent.items,
                        onItemClick = { id, type -> onContentClick(ContentItem(id = id, type = type)) },
                        onShowAllClick = onJerusalemClick,
                    )
                }
            }

            if (uiState.telAvivContent?.items?.isNotEmpty() == true) {
                item(key = "telaviv") {
                    CityContentRow(
                        title = "Tel Aviv",
                        items = uiState.telAvivContent.items,
                        onItemClick = { id, type -> onContentClick(ContentItem(id = id, type = type)) },
                        onShowAllClick = onTelAvivClick,
                    )
                }
            }

            items(items = uiState.categories, key = { it.id }) { category ->
                CategoryRow(category = category, onItemClick = onContentClick)
            }
        }
    }
}
