package tv.bayit.plus.feature.vod.favorites

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.FavoriteItem
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

private val POSTER_WIDTH = 100.dp

@Composable
internal fun FavoritesScreen(
    uiState: FavoritesUiState,
    onItemClick: (FavoriteItem) -> Unit,
    onRemove: (FavoriteItem) -> Unit,
    onNavigateBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("vod.favorites.title"),
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = bayitString("common.back"),
                        tint = DesignTokens.Colors.Text.primary,
                    )
                }
            },
        )
        when (uiState) {
            is FavoritesUiState.Loading -> GlassLoadingIndicator()
            is FavoritesUiState.Empty -> FavoritesEmptyContent()
            is FavoritesUiState.Success -> FavoritesListContent(
                items = uiState.items,
                onItemClick = onItemClick,
                onRemove = onRemove,
            )
            is FavoritesUiState.Error -> FavoritesErrorContent(
                message = uiState.message,
                onRetry = onRetry,
            )
        }
    }
}

@Composable
private fun FavoritesListContent(
    items: List<FavoriteItem>,
    onItemClick: (FavoriteItem) -> Unit,
    onRemove: (FavoriteItem) -> Unit,
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.sm)) }
        items(items = items, key = { it.id }) { item ->
            FavoriteListItem(item = item, onClick = { onItemClick(item) }, onRemove = { onRemove(item) })
        }
        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}

@Composable
private fun FavoriteListItem(
    item: FavoriteItem,
    onClick: () -> Unit,
    onRemove: () -> Unit,
) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            CachedAsyncImage(
                url = item.thumbnail,
                contentDescription = item.title,
                modifier = Modifier.width(POSTER_WIDTH).aspectRatio(2f / 3f),
            )
            Spacer(Modifier.width(DesignTokens.Spacing.md))
            Column(modifier = Modifier.weight(1f)) {
                item.title?.let { title ->
                    Text(
                        text = title,
                        style = MaterialTheme.typography.bodyLarge,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Spacer(Modifier.height(DesignTokens.Spacing.xs))
                item.type?.let { type ->
                    GlassChip(label = type, isSelected = false, onClick = {})
                }
                Spacer(Modifier.height(DesignTokens.Spacing.xs))
                item.duration?.let { duration ->
                    Text(
                        text = duration,
                        style = MaterialTheme.typography.labelSmall,
                        color = DesignTokens.Colors.Text.muted,
                    )
                }
            }
            GlassButton(text = bayitString("vod.favorites.remove"), onClick = onRemove, isPrimary = false)
        }
    }
}

@Composable
private fun FavoritesEmptyContent() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            Text(
                text = bayitString("vod.favorites.emptyTitle"),
                style = MaterialTheme.typography.titleMedium,
                color = DesignTokens.Colors.Text.primary,
            )
            Text(
                text = bayitString("vod.favorites.emptySubtitle"),
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
            )
        }
    }
}

@Composable
private fun FavoritesErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.Colors.Semantic.error,
            )
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}
