package tv.bayit.plus.feature.search

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun FilterChipRow(
    selectedFilter: SearchFilter?,
    onFilterClick: (SearchFilter) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.base),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        modifier = modifier.padding(vertical = DesignTokens.Spacing.xs),
    ) {
        items(items = SearchFilter.entries.toList(), key = { it.name }) { filter ->
            GlassChip(
                label = filter.label,
                isSelected = selectedFilter == filter,
                onClick = { onFilterClick(filter) },
            )
        }
    }
}

@Composable
internal fun SuggestionsSection(
    suggestions: List<String>,
    onSuggestionClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.padding(horizontal = DesignTokens.Spacing.base)) {
        suggestions.forEach { suggestion ->
            Text(
                text = suggestion,
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onSuggestionClick(suggestion) }
                    .padding(vertical = DesignTokens.Spacing.sm),
            )
        }
    }
}

@Composable
internal fun SearchResultsGrid(
    results: List<ContentItem>,
    onContentClick: (ContentItem) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        contentPadding = PaddingValues(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        modifier = modifier.fillMaxSize(),
    ) {
        items(items = results, key = { it.id }) { item ->
            SearchResultItem(item = item, onClick = { onContentClick(item) })
        }
    }
}

@Composable
internal fun SearchResultItem(
    item: ContentItem,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassCard(modifier = modifier.clickable(onClick = onClick)) {
        Column {
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
                    fontWeight = FontWeight.Medium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            item.type?.let { type ->
                Text(
                    text = type.replaceFirstChar { it.uppercaseChar() },
                    style = MaterialTheme.typography.labelSmall,
                    color = DesignTokens.Colors.Text.muted,
                )
            }
        }
    }
}

@Composable
internal fun PopularSearchesSection(
    popularSearches: List<String>,
    onSuggestionClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.padding(DesignTokens.Spacing.base)) {
        Text(
            text = bayitString("search.popularSearches"),
            style = MaterialTheme.typography.titleMedium,
            color = DesignTokens.Colors.Text.primary,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        LazyRow(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
            items(items = popularSearches, key = { it }) { search ->
                GlassChip(
                    label = search,
                    isSelected = false,
                    onClick = { onSuggestionClick(search) },
                )
            }
        }
    }
}
