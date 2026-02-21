package tv.bayit.plus.feature.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.ContentCategory
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.core.model.SpotlightItem
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassContentCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun SpotlightSection(
    items: List<SpotlightItem>,
    onItemClick: (SpotlightItem) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.padding(horizontal = DesignTokens.Spacing.base)) {
        items.firstOrNull()?.let { item ->
            GlassCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onItemClick(item) },
            ) {
                Column {
                    CachedAsyncImage(
                        url = item.backdrop ?: item.thumbnail,
                        contentDescription = item.title,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp),
                    )
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
                    item.title?.let { title ->
                        Text(
                            text = title,
                            style = MaterialTheme.typography.headlineMedium,
                            color = DesignTokens.Colors.Text.primary,
                        )
                    }
                    item.description?.let { desc ->
                        Text(
                            text = desc,
                            style = MaterialTheme.typography.bodyMedium,
                            color = DesignTokens.Colors.Text.secondary,
                            maxLines = 2,
                        )
                    }
                }
            }
        }
    }
}

@Composable
internal fun ContentShelfSection(
    items: List<ContentItem>,
    onItemClick: (ContentItem) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier) {
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        LazyRow(
            contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.base),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            items(
                items = items,
                key = { it.id },
            ) { item ->
                ContentCard(item = item, onClick = { onItemClick(item) })
            }
        }
    }
}

@Composable
internal fun CategoryRow(
    category: ContentCategory,
    onItemClick: (ContentItem) -> Unit,
    onShowAllClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (category.items.isEmpty()) return

    val localizedName = category.nameKey?.let { bayitString(it) }
        .takeIf { it != category.nameKey }
        ?: category.name

    Column(modifier = modifier) {
        SectionRowHeaderWithAction(
            title = localizedName,
            onShowAllClick = { onShowAllClick(category.id) },
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        LazyRow(
            contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.lg),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            items(
                items = category.items,
                key = { it.id },
            ) { item ->
                val cardAspectRatio = when (item.type) {
                    "podcast", "radio" -> 1f
                    else -> 2f / 3f
                }
                GlassContentCard(
                    imageUrl = item.thumbnail ?: item.backdrop,
                    title = item.title,
                    onClick = { onItemClick(item) },
                    aspectRatio = cardAspectRatio,
                )
            }
        }
    }
}

@Composable
private fun ContentCard(
    item: ContentItem,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassCard(modifier = modifier.width(120.dp)) {
        Column(
            modifier = Modifier.clickable(onClick = onClick),
        ) {
            CachedAsyncImage(
                url = item.thumbnail ?: item.backdrop,
                contentDescription = item.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(2f / 3f),
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            item.title?.let { title ->
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodySmall,
                    color = DesignTokens.Colors.Text.primary,
                    maxLines = 2,
                    modifier = Modifier.padding(horizontal = DesignTokens.Spacing.xs),
                )
            }
        }
    }
}
