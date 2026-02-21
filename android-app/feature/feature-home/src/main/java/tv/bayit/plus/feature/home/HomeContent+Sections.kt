package tv.bayit.plus.feature.home

import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

internal fun LazyListScope.homeLocationAndCityItems(
    uiState: HomeUiState.Success,
    onContentClick: (ContentItem) -> Unit,
    onIsraelisCityShowAll: () -> Unit,
    onIsraeliBusinessesShowAll: () -> Unit,
    onTrendingShowAll: () -> Unit,
    onYoungstersClick: () -> Unit,
    onJerusalemClick: () -> Unit,
    onTelAvivClick: () -> Unit,
    onOpenUrl: (String) -> Unit,
    onCategoryShowAll: (String) -> Unit,
) {
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
