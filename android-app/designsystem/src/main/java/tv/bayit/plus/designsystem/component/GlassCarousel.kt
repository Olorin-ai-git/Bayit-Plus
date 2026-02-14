package tv.bayit.plus.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.Dp
import kotlinx.coroutines.delay
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val CAROUSEL_AUTO_PLAY_INTERVAL_MS = 4000L

@Composable
fun GlassCarousel(
    pageCount: Int,
    modifier: Modifier = Modifier,
    autoPlay: Boolean = false,
    autoPlayIntervalMs: Long = CAROUSEL_AUTO_PLAY_INTERVAL_MS,
    showIndicators: Boolean = true,
    pageSpacing: Dp = DesignTokens.Spacing.sm,
    pagerState: PagerState = rememberPagerState(pageCount = { pageCount }),
    pageContent: @Composable (page: Int) -> Unit,
) {
    if (pageCount <= 0) return

    if (autoPlay && pageCount > 1) {
        LaunchedEffect(pagerState, autoPlayIntervalMs) {
            while (true) {
                delay(autoPlayIntervalMs)
                val nextPage = (pagerState.currentPage + 1) % pageCount
                pagerState.animateScrollToPage(nextPage)
            }
        }
    }

    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxWidth(),
            pageSpacing = pageSpacing,
        ) { page ->
            pageContent(page)
        }

        if (showIndicators && pageCount > 1) {
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            CarouselDots(
                pageCount = pageCount,
                currentPage = pagerState.currentPage,
            )
        }
    }
}

@Composable
private fun CarouselDots(
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
