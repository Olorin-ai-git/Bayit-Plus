package tv.bayit.plus.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import tv.bayit.plus.designsystem.theme.DesignTokens

data class HeroItem(
    val id: String,
    val title: String?,
    val description: String?,
    val backdropUrl: String?,
)

private const val AUTO_SCROLL_INTERVAL_MS = 5000L

@Composable
fun GlassHeroCarousel(
    items: List<HeroItem>,
    onPlayClick: (HeroItem) -> Unit,
    playLabel: String,
    modifier: Modifier = Modifier,
    autoScroll: Boolean = true,
) {
    if (items.isEmpty()) return
    val pagerState = rememberPagerState(pageCount = { items.size })

    if (autoScroll && items.size > 1) {
        LaunchedEffect(pagerState) {
            while (true) {
                delay(AUTO_SCROLL_INTERVAL_MS)
                val nextPage = (pagerState.currentPage + 1) % items.size
                pagerState.animateScrollToPage(nextPage)
            }
        }
    }

    Column(modifier = modifier) {
        Box(modifier = Modifier.fillMaxWidth().height(240.dp)) {
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.fillMaxSize(),
            ) { page ->
                val item = items[page]
                HeroPage(item = item, playLabel = playLabel, onPlayClick = { onPlayClick(item) })
            }
        }
        if (items.size > 1) {
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            PageIndicatorDots(
                pageCount = items.size,
                currentPage = pagerState.currentPage,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun HeroPage(
    item: HeroItem,
    playLabel: String,
    onPlayClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier.fillMaxSize()) {
        CachedAsyncImage(
            url = item.backdropUrl,
            contentDescription = item.title,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, DesignTokens.Colors.Glass.bgStrong),
                    ),
                ),
        )
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
        ) {
            item.title?.let { title ->
                Text(
                    text = title,
                    color = DesignTokens.Colors.Text.primary,
                    fontSize = DesignTokens.FontSize.xxl,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            item.description?.let { desc ->
                Text(
                    text = desc,
                    color = DesignTokens.Colors.Text.secondary,
                    fontSize = DesignTokens.FontSize.base,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxs))
            HeroPlayButton(label = playLabel, onClick = onPlayClick)
        }
    }
}

@Composable
private fun HeroPlayButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Button(
        onClick = onClick,
        modifier = modifier.height(DesignTokens.TouchTarget.minimum),
        shape = RoundedCornerShape(DesignTokens.Radius.default),
        colors = ButtonDefaults.buttonColors(
            containerColor = DesignTokens.Colors.Primary.base,
            contentColor = DesignTokens.Colors.Text.primary,
        ),
    ) {
        Icon(
            imageVector = Icons.Default.PlayArrow,
            contentDescription = null,
            modifier = Modifier.size(20.dp),
        )
        Spacer(modifier = Modifier.width(DesignTokens.Spacing.xs))
        Text(text = label)
    }
}

@Composable
internal fun PageIndicatorDots(
    pageCount: Int,
    currentPage: Int,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        repeat(pageCount) { index ->
            val isActive = index == currentPage
            Box(
                modifier = Modifier
                    .padding(horizontal = DesignTokens.Spacing.xxs)
                    .size(if (isActive) DesignTokens.Spacing.sm else DesignTokens.Spacing.xs)
                    .clip(CircleShape)
                    .background(
                        if (isActive) DesignTokens.Colors.Primary.light
                        else DesignTokens.Colors.Text.muted,
                    ),
            )
        }
    }
}
