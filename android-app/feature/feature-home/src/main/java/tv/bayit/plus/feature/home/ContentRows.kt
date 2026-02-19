package tv.bayit.plus.feature.home

import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.CultureTrendingItem
import tv.bayit.plus.core.model.LiveChannelItem
import tv.bayit.plus.core.model.RadioStationItem
import tv.bayit.plus.core.model.SectionContentItem
import tv.bayit.plus.core.model.WatchHistoryItem
import tv.bayit.plus.designsystem.component.GlassContentCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun ContinueWatchingRow(
    items: List<WatchHistoryItem>,
    onItemClick: (WatchHistoryItem) -> Unit,
    onShowAllClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier) {
        SectionRowHeaderWithAction(title = bayitString("home.continueWatching"), onShowAllClick = onShowAllClick)
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
                    onClick = { onItemClick(item) },
                )
            }
        }
    }
}

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
                    badge = "LIVE",
                    onClick = { onChannelClick(channel.id) },
                )
            }
        }
    }
}

@Composable
internal fun RadioStationsRow(
    stations: List<RadioStationItem>,
    onStationClick: (String) -> Unit,
    onShowAllClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier) {
        SectionRowHeaderWithAction(title = bayitString("radio.title"), onShowAllClick = onShowAllClick)
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        LazyRow(
            contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.lg),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            items(items = stations, key = { it.id }) { station ->
                GlassContentCard(
                    imageUrl = station.logo,
                    title = station.name,
                    subtitle = station.currentSong ?: station.currentShow,
                    cardWidth = 140.dp,
                    aspectRatio = 1f,
                    onClick = { onStationClick(station.id) },
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
internal fun YoungstersSection(
    items: List<SectionContentItem>,
    onItemClick: (String, String) -> Unit,
    onShowAllClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier) {
        SectionRowHeaderWithAction(
            title = bayitString("youngsters.title"),
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

/** Panoramic background section with gradient overlay, matching iOS CityContentRow design. */
@Composable
private fun PanoramicSection(
    @DrawableRes backgroundRes: Int,
    title: String,
    modifier: Modifier = Modifier,
    onShowAll: (() -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    val shape = RoundedCornerShape(DesignTokens.Radius.lg)

    Box(
        modifier = modifier
            .padding(horizontal = DesignTokens.Spacing.md)
            .fillMaxWidth()
            .height(340.dp)
            .clip(shape),
    ) {
        Image(
            painter = painterResource(backgroundRes),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colorStops = arrayOf(
                            0f to Color.Black.copy(alpha = 0.55f),
                            0.35f to Color.Black.copy(alpha = 0.25f),
                            0.65f to Color.Black.copy(alpha = 0.45f),
                            1f to Color.Black.copy(alpha = 0.8f),
                        ),
                    ),
                ),
        )

        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            SectionRowHeaderWithAction(
                title = title,
                onShowAllClick = onShowAll ?: {},
                modifier = Modifier.padding(top = DesignTokens.Spacing.lg),
            )

            content()

            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        }
    }
}

/** Glass card overlaid on panoramic background, matching iOS cityGlassCard style. */
@Composable
private fun GlassOverlayCard(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    summary: String? = null,
    onClick: () -> Unit = {},
) {
    Box(
        modifier = modifier
            .width(200.dp)
            .height(160.dp)
            .clip(RoundedCornerShape(DesignTokens.Radius.md))
            .background(Color.White.copy(alpha = 0.08f))
            .clickable(onClick = onClick)
            .padding(DesignTokens.Spacing.md),
    ) {
        Column(verticalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxSize()) {
            Column {
                if (subtitle != null) {
                    Text(
                        text = subtitle.uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        color = DesignTokens.Colors.Primary.p400,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                    )
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
                }

                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            if (summary != null) {
                Text(
                    text = summary,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.7f),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}
