package tv.bayit.plus.feature.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.SpotlightItem
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassCarousel
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun HeroCarousel(
    items: List<SpotlightItem>,
    onItemClick: (SpotlightItem) -> Unit,
    onMoreInfoClick: (SpotlightItem) -> Unit = onItemClick,
    modifier: Modifier = Modifier,
) {
    if (items.isEmpty()) return

    Column(modifier = modifier.padding(horizontal = DesignTokens.Spacing.lg)) {
        GlassCarousel(
            pageCount = items.size,
            autoPlay = true,
            showIndicators = true,
        ) { page ->
            val item = items[page]
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Box {
                        CachedAsyncImage(
                            url = item.backdrop ?: item.thumbnail,
                            contentDescription = item.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(220.dp),
                        )
                        if (page == 0) {
                            Text(
                                text = bayitString("common.new"),
                                style = MaterialTheme.typography.labelSmall,
                                color = DesignTokens.Colors.Text.primary,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier
                                    .padding(DesignTokens.Spacing.md)
                                    .align(Alignment.TopStart)
                                    .background(
                                        DesignTokens.Colors.Semantic.warning,
                                        androidx.compose.foundation.shape.RoundedCornerShape(DesignTokens.Radius.sm),
                                    )
                                    .padding(
                                        horizontal = DesignTokens.Spacing.sm,
                                        vertical = DesignTokens.Spacing.xs,
                                    ),
                            )
                        }
                    }
                    Column(modifier = Modifier.padding(DesignTokens.Spacing.md)) {
                        item.title?.let { title ->
                            Text(
                                text = title,
                                style = MaterialTheme.typography.headlineSmall,
                                color = DesignTokens.Colors.Text.primary,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                            )
                        }
                        item.description?.let { desc ->
                            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
                            Text(
                                text = desc,
                                style = MaterialTheme.typography.bodyMedium,
                                color = DesignTokens.Colors.Text.secondary,
                                maxLines = 2,
                            )
                        }
                        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
                        Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                            GlassButton(
                                text = bayitString("common.watchNow"),
                                onClick = { onItemClick(item) },
                                modifier = Modifier.weight(1f),
                                isPrimary = true,
                            )
                            GlassButton(
                                text = bayitString("common.moreInfo"),
                                onClick = { onMoreInfoClick(item) },
                                modifier = Modifier.weight(1f),
                                isPrimary = false,
                            )
                        }
                    }
                }
            }
        }
    }
}
