package tv.bayit.plus.feature.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.CultureTrendingItem
import tv.bayit.plus.core.model.LiveChannelItem
import tv.bayit.plus.core.model.RadioStationItem
import tv.bayit.plus.core.model.SectionContentItem
import tv.bayit.plus.core.model.WatchHistoryItem
import tv.bayit.plus.designsystem.component.GlassContentCard
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun ContinueWatchingRow(
    items: List<WatchHistoryItem>,
    onItemClick: (String, String) -> Unit,
    modifier: Modifier = Modifier,
) {
    SectionRowHeader(title = "Continue Watching", modifier = modifier)
    Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
    LazyRow(
        contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.lg),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        items(items = items, key = { it.id }) { item ->
            GlassContentCard(
                imageUrl = item.thumbnail,
                title = item.title,
                progress = item.progress?.toFloat(),
                onClick = { onItemClick(item.id, item.type.orEmpty()) },
            )
        }
    }
}

@Composable
internal fun LiveTVRow(
    channels: List<LiveChannelItem>,
    onChannelClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    SectionRowHeader(title = "Live TV", modifier = modifier)
    Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
    LazyRow(
        contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.lg),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        items(items = channels, key = { it.id }) { channel ->
            GlassContentCard(
                imageUrl = channel.logo ?: channel.thumbnail,
                title = channel.name,
                cardWidth = 140.dp,
                onClick = { onChannelClick(channel.id) },
            )
        }
    }
}

@Composable
internal fun RadioStationsRow(
    stations: List<RadioStationItem>,
    onStationClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    SectionRowHeader(title = "Radio Stations", modifier = modifier)
    Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
    LazyRow(
        contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.lg),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        items(items = stations, key = { it.id }) { station ->
            GlassContentCard(
                imageUrl = station.logo,
                title = station.name,
                cardWidth = 140.dp,
                onClick = { onStationClick(station.id) },
            )
        }
    }
}

@Composable
internal fun TrendingRow(
    items: List<CultureTrendingItem>,
    onItemClick: (String, String) -> Unit,
    modifier: Modifier = Modifier,
) {
    SectionRowHeader(title = "What's Hot in Israel", modifier = modifier)
    Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
    LazyRow(
        contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.lg),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        items(items = items, key = { it.id }) { item ->
            GlassContentCard(
                imageUrl = item.thumbnail,
                title = item.title,
                onClick = { onItemClick(item.id, item.type.orEmpty()) },
            )
        }
    }
}

@Composable
internal fun YoungstersSection(
    items: List<SectionContentItem>,
    onItemClick: (String, String) -> Unit,
    onShowAllClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier) {
        SectionRowHeaderWithAction(
            title = "Youngsters",
            onShowAllClick = onShowAllClick,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        LazyRow(
            contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.lg),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            items(items = items, key = { it.id }) { item ->
                GlassContentCard(
                    imageUrl = item.thumbnail,
                    title = item.title,
                    cardWidth = 160.dp,
                    onClick = { onItemClick(item.id, item.type.orEmpty()) },
                )
            }
        }
    }
}

@Composable
internal fun CityContentRow(
    title: String,
    items: List<SectionContentItem>,
    onItemClick: (String, String) -> Unit,
    onShowAllClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier) {
        SectionRowHeaderWithAction(
            title = title,
            onShowAllClick = onShowAllClick,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        LazyRow(
            contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.lg),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            items(items = items, key = { it.id }) { item ->
                GlassContentCard(
                    imageUrl = item.thumbnail,
                    title = item.title,
                    onClick = { onItemClick(item.id, item.type.orEmpty()) },
                )
            }
        }
    }
}
