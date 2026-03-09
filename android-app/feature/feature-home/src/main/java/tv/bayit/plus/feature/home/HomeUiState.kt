package tv.bayit.plus.feature.home

import tv.bayit.plus.core.byoc.models.BYOCContentItem
import tv.bayit.plus.core.byoc.models.BYOCSourceConfig
import tv.bayit.plus.core.model.CityContentResponse
import tv.bayit.plus.core.model.CollectionDetail
import tv.bayit.plus.core.model.CultureTrendingItem
import tv.bayit.plus.core.model.IsraeliBusinessesResponse
import tv.bayit.plus.core.model.IsraelisInCityResponse
import tv.bayit.plus.core.model.LiveChannelItem
import tv.bayit.plus.core.model.RadioStationItem
import tv.bayit.plus.core.model.SectionContentItem
import tv.bayit.plus.core.model.ShabbatInfo
import tv.bayit.plus.core.model.WatchHistoryItem
import java.util.TimeZone

sealed interface HomeUiState {
    data object Loading : HomeUiState

    data class Success(
        val hero: tv.bayit.plus.core.model.HeroContent? = null,
        val spotlight: List<tv.bayit.plus.core.model.SpotlightItem> = emptyList(),
        val categories: List<tv.bayit.plus.core.model.ContentCategory> = emptyList(),
        val liveChannels: List<LiveChannelItem> = emptyList(),
        val radioStations: List<RadioStationItem> = emptyList(),
        val continueWatching: List<WatchHistoryItem> = emptyList(),
        val featuredCollections: List<CollectionDetail> = emptyList(),
        val trendingContent: List<CultureTrendingItem> = emptyList(),
        val youngstersTrending: List<SectionContentItem> = emptyList(),
        val telAvivContent: CityContentResponse? = null,
        val jerusalemContent: CityContentResponse? = null,
        val israelisInCity: IsraelisInCityResponse? = null,
        val israeliBusinesses: IsraeliBusinessesResponse? = null,
        val shabbatInfo: ShabbatInfo? = null,
        val isShabbatBannerDismissed: Boolean = false,
        val locationPermissionNeeded: Boolean = false,
        val locationPermissionPreviouslyDenied: Boolean = false,
        val byocSources: List<BYOCSourceConfig> = emptyList(),
        val byocContent: List<BYOCContentItem> = emptyList(),
        val hasBYOCSources: Boolean = false,
        val isRefreshing: Boolean = false,
        val localTimezone: String = TimeZone.getDefault().id,
        val localLocationLabel: String = timezoneDisplayCity(TimeZone.getDefault().id),
    ) : HomeUiState

    data class Error(
        val message: String,
    ) : HomeUiState
}
