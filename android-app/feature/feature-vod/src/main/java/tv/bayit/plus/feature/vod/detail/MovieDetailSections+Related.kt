package tv.bayit.plus.feature.vod.detail

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.RelatedItem
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

private val RELATED_CARD_WIDTH = 140.dp
private const val RELATED_POSTER_RATIO = 2f / 3f

@Composable
internal fun RelatedContentShelf(
    related: List<RelatedItem>,
    onRelatedClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.padding(top = DesignTokens.Spacing.lg)) {
        Text(
            text = bayitString("vod.detail.related"),
            style = MaterialTheme.typography.titleMedium,
            color = DesignTokens.Colors.Text.primary,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = DesignTokens.Spacing.base),
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        LazyRow(
            contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.base),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            items(items = related, key = { it.id }) { item ->
                RelatedCard(item = item, onClick = { onRelatedClick(item.id) })
            }
        }
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))
    }
}

@Composable
private fun RelatedCard(item: RelatedItem, onClick: () -> Unit, modifier: Modifier = Modifier) {
    GlassCard(modifier = modifier.width(RELATED_CARD_WIDTH)) {
        Column(modifier = Modifier.clickable(onClick = onClick)) {
            CachedAsyncImage(
                url = item.thumbnail,
                contentDescription = item.title,
                modifier = Modifier.fillMaxWidth().aspectRatio(RELATED_POSTER_RATIO),
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            item.title?.let { title ->
                Text(title, style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.Medium, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(horizontal = DesignTokens.Spacing.xs))
            }
            item.year?.let { year ->
                Text(year.toString(), style = MaterialTheme.typography.labelSmall, color = DesignTokens.Colors.Text.muted, modifier = Modifier.padding(horizontal = DesignTokens.Spacing.xs))
            }
        }
    }
}

@Composable
internal fun MovieErrorContent(message: String, onBack: () -> Unit, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
            GlassButton(text = bayitString("common.goBack"), onClick = onBack, isPrimary = false)
        }
    }
}
