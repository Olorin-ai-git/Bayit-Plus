package tv.bayit.plus.feature.livetv

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import tv.bayit.plus.core.model.LiveChannelItem
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun CategoryFilterRow(
    categories: List<String>,
    selectedCategory: String?,
    onCategorySelected: (String?) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.base),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        modifier = modifier.padding(vertical = DesignTokens.Spacing.sm),
    ) {
        item(key = "all") {
            GlassChip(
                label = bayitString("common.all"),
                isSelected = selectedCategory == null,
                onClick = { onCategorySelected(null) },
            )
        }
        items(items = categories, key = { it }) { category ->
            GlassChip(
                label = category,
                isSelected = selectedCategory == category,
                onClick = { onCategorySelected(category) },
            )
        }
    }
}

@Composable
internal fun ChannelGridItem(
    channel: LiveChannelItem,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassCard(modifier = modifier.clickable(onClick = onClick)) {
        Column {
            Box {
                CachedAsyncImage(
                    url = channel.logo ?: channel.thumbnail,
                    contentDescription = channel.name,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(1f),
                )
                LiveIndicator(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(DesignTokens.Spacing.xs),
                )
            }
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            channel.name?.let { name ->
                Text(
                    text = name,
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            channel.currentShow?.let { show ->
                Text(
                    text = show,
                    style = MaterialTheme.typography.bodySmall,
                    color = DesignTokens.Colors.Text.secondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun LiveIndicator(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(DesignTokens.Radius.sm))
            .background(DesignTokens.Colors.live)
            .padding(horizontal = DesignTokens.Spacing.xs, vertical = DesignTokens.Spacing.xxs),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xxs),
    ) {
        Box(
            modifier = Modifier
                .width(DesignTokens.Spacing.xs)
                .height(DesignTokens.Spacing.xs)
                .clip(RoundedCornerShape(DesignTokens.Radius.full))
                .background(DesignTokens.Colors.Text.primary),
        )
        Text(
            text = bayitString("common.live"),
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.xs,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
internal fun LiveTVErrorSection(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
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
