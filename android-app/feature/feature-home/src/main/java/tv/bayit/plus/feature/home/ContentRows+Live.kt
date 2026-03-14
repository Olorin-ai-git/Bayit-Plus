package tv.bayit.plus.feature.home

import androidx.annotation.DrawableRes
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
import tv.bayit.plus.core.model.SectionContentItem
import tv.bayit.plus.designsystem.component.GlassContentCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun LiveTVRow(
    channels: List<LiveChannelItem>,
    onChannelClick: (String) -> Unit,
    onShowAllClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier) {
        SectionRowHeaderWithAction(title = bayitString("home.liveTV"), onShowAllClick = onShowAllClick)
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        LazyRow(
            contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.lg),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            items(items = channels, key = { it.id }) { channel ->
                GlassContentCard(
                    imageUrl = channel.logo ?: channel.thumbnail,
                    title = channel.name,
                    subtitle = channel.currentShow,
                    cardWidth = 140.dp,
                    badge = bayitString("common.live"),
                    onClick = { onChannelClick(channel.id) },
                )
            }
        }
    }
}

@Composable
internal fun TrendingRow(
    items: List<CultureTrendingItem>,
    onItemClick: (CultureTrendingItem) -> Unit,
    onShowAllClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    PanoramicSection(
        backgroundRes = R.drawable.bg_masada,
        title = bayitString("home.trendingInIsrael"),
        onShowAll = onShowAllClick,
        modifier = modifier,
    ) {
        LazyRow(
            contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.lg),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            items(items = items, key = { it.id }) { item ->
                GlassOverlayCard(
                    title = item.title.orEmpty(),
                    subtitle = item.categoryLabel?.he ?: item.category,
                    summary = item.summary,
                    onClick = { onItemClick(item) },
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
    @DrawableRes backgroundRes: Int? = null,
    modifier: Modifier = Modifier,
) {
    val bgRes = backgroundRes ?: R.drawable.bg_jerusalem

    PanoramicSection(
        backgroundRes = bgRes,
        title = title,
        onShowAll = onShowAllClick,
        modifier = modifier,
    ) {
        LazyRow(
            contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.lg),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            items(items = items, key = { it.id }) { item ->
                GlassOverlayCard(
                    title = item.title.orEmpty(),
                    onClick = { onItemClick(item.id, item.type.orEmpty()) },
                )
            }
        }
    }
}
