package tv.bayit.plus.feature.onboarding

import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun FeatureTourRoute(
    onComplete: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: FeatureTourViewModel = hiltViewModel(),
) {
    val currentIndex by viewModel.currentIndex.collectAsStateWithLifecycle()
    val completionStatus by viewModel.completionStatus.collectAsStateWithLifecycle()
    val showPersonalization by viewModel.showPersonalization.collectAsStateWithLifecycle()

    LaunchedEffect(completionStatus) {
        if (completionStatus == "completed" || completionStatus == "skipped") {
            onComplete()
        }
    }

    if (showPersonalization) {
        PersonalizationStepComposable(
            onDone = { languages, genres, hasChildren ->
                viewModel.completeTourWithPreferences(languages, genres, hasChildren)
            },
        )
    } else {
        FeatureTourScreen(
            cards = viewModel.cards,
            currentIndex = currentIndex,
            onPageChanged = viewModel::setPageIndex,
            onTryItNow = { featureKey -> viewModel.onDemoTapped(featureKey) },
            onSkip = viewModel::skipTour,
            onGetStarted = viewModel::showPersonalizationStep,
            modifier = modifier,
        )
    }
}

@Composable
internal fun FeatureTourScreen(
    cards: List<FeatureCard>,
    currentIndex: Int,
    onPageChanged: (Int) -> Unit,
    onTryItNow: (String) -> Unit,
    onSkip: () -> Unit,
    onGetStarted: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val pagerState = rememberPagerState(
        initialPage = currentIndex,
        pageCount = { cards.size },
    )
    val coroutineScope = rememberCoroutineScope()
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(pagerState) {
        snapshotFlow { pagerState.currentPage }.collect { page ->
            onPageChanged(page)
        }
    }

    LaunchedEffect(currentIndex) {
        if (pagerState.currentPage != currentIndex) {
            pagerState.animateScrollToPage(currentIndex)
        }
    }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .focusRequester(focusRequester)
            .focusable()
            .onKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown) return@onKeyEvent false
                when (event.key) {
                    Key.DirectionRight -> {
                        val next = (pagerState.currentPage + 1).coerceAtMost(cards.lastIndex)
                        coroutineScope.launch { pagerState.animateScrollToPage(next) }
                        true
                    }
                    Key.DirectionLeft -> {
                        val prev = (pagerState.currentPage - 1).coerceAtLeast(0)
                        coroutineScope.launch { pagerState.animateScrollToPage(prev) }
                        true
                    }
                    Key.Enter, Key.DirectionCenter -> {
                        val card = cards.getOrNull(pagerState.currentPage)
                        if (pagerState.currentPage == cards.lastIndex) {
                            onGetStarted()
                        } else if (card != null) {
                            onTryItNow(card.featureKey)
                        }
                        true
                    }
                    Key.Back, Key.Escape -> {
                        onSkip()
                        true
                    }
                    else -> false
                }
            },
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize(),
        ) { page ->
            val card = cards[page]
            FeatureCardComposable(
                card = card,
                videoUri = null,
                onTryItNow = { onTryItNow(card.featureKey) },
            )
        }

        val skipA11y = stringResource(R.string.a11y_skip_tour_button)
        GlassButton(
            text = stringResource(R.string.tour_skip),
            onClick = onSkip,
            isPrimary = false,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(DesignTokens.Spacing.base)
                .semantics { contentDescription = skipA11y },
        )

        TourProgressBar(
            totalCards = cards.size,
            currentIndex = pagerState.currentPage,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = DesignTokens.Spacing.xxxxl),
        )

        if (pagerState.currentPage == cards.lastIndex) {
            val getStartedA11y = stringResource(R.string.a11y_get_started_button)
            GlassButton(
                text = stringResource(R.string.tour_get_started),
                onClick = onGetStarted,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(
                        horizontal = DesignTokens.Spacing.xl,
                        vertical = DesignTokens.Spacing.sm,
                    )
                    .semantics { contentDescription = getStartedA11y },
            )
        }
    }
}
