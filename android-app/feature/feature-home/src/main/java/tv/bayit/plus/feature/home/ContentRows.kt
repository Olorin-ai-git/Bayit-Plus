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
