package tv.bayit.plus.feature.tv.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.tv.material3.Carousel
import androidx.tv.material3.CarouselDefaults
import androidx.tv.material3.CarouselState
import androidx.tv.material3.Text
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassTVButton
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.tv.design.TVDesignTokens

@Composable
fun TVHeroCarousel(
    items: List<ContentItem>,
    onItemClick: (ContentItem) -> Unit,
    modifier: Modifier = Modifier,
) {
    val carouselState = remember { CarouselState() }
    val watchNowLabel = bayitString("watch_now")

    Carousel(
        itemCount = items.size,
        modifier = modifier
            .fillMaxWidth()
            .height(TVDesignTokens.Hero.height),
        carouselState = carouselState,
        autoScrollDurationMillis = TVDesignTokens.Hero.autoAdvanceIntervalMs,
        carouselIndicator = {
            CarouselDefaults.IndicatorRow(
                itemCount = items.size,
                activeItemIndex = carouselState.activeItemIndex,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = TVDesignTokens.Hero.indicatorPadding),
            )
        },
    ) { index ->
        val item = items[index]
        HeroSlide(
            item = item,
            watchNowLabel = watchNowLabel,
            onWatchNow = { onItemClick(item) },
        )
    }
}

@Composable
private fun HeroSlide(
    item: ContentItem,
    watchNowLabel: String,
    onWatchNow: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier.fillMaxSize()) {
        CachedAsyncImage(
            url = item.thumbnail.orEmpty(),
            contentDescription = item.title.orEmpty(),
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
        )

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            DesignTokens.Colors.Glass.bgStrong,
                        ),
                    ),
                ),
        )

        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(TVDesignTokens.Hero.contentPadding),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            Text(
                text = item.title.orEmpty(),
                color = DesignTokens.Colors.Text.primary,
                fontSize = TVDesignTokens.Hero.titleSize,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = item.description.orEmpty(),
                color = DesignTokens.Colors.Text.secondary,
                fontSize = TVDesignTokens.FontSize.bodyLarge,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.fillMaxWidth(0.6f),
            )
            Row(modifier = Modifier.padding(top = DesignTokens.Spacing.sm)) {
                GlassTVButton(
                    text = watchNowLabel,
                    onClick = onWatchNow,
                )
            }
        }
    }
}
