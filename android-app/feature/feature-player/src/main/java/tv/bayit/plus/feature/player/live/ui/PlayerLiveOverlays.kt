package tv.bayit.plus.feature.player.live.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import tv.bayit.plus.feature.player.live.AIFeaturesPanelState
import tv.bayit.plus.feature.player.live.LiveDubbingUiState
import tv.bayit.plus.feature.player.live.LiveSubtitleUiState
import tv.bayit.plus.feature.player.live.LiveTriviaUiState

/**
 * Combines all live AI feature overlays into a single composable
 */
@Composable
fun PlayerLiveOverlays(
    subtitleState: LiveSubtitleUiState,
    dubbingState: LiveDubbingUiState,
    triviaState: LiveTriviaUiState,
    triviaProgress: Float,
    panelState: AIFeaturesPanelState,
    onTogglePanel: () -> Unit,
    onSubtitlesTap: () -> Unit,
    onDubbingTap: () -> Unit,
    onTriviaTap: () -> Unit,
    onLanguageTap: () -> Unit,
    onDismissTrivia: () -> Unit,
    onTriviaFollowUp: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier.fillMaxSize()
    ) {
        LiveSubtitleOverlay(
            state = subtitleState,
            modifier = Modifier.align(Alignment.BottomCenter)
        )

        LiveDubbingOverlay(
            state = dubbingState,
            modifier = Modifier.align(Alignment.BottomCenter)
        )

        TriviaFactBanner(
            state = triviaState,
            progressFraction = triviaProgress,
            currentLanguage = panelState.selectedLanguage,
            onDismiss = onDismissTrivia,
            onFollowUp = onTriviaFollowUp,
            modifier = Modifier.align(Alignment.TopEnd)
        )

        AIFeaturesPanel(
            state = panelState,
            onToggleExpand = onTogglePanel,
            onSubtitlesTap = onSubtitlesTap,
            onDubbingTap = onDubbingTap,
            onTriviaTap = onTriviaTap,
            onLanguageTap = onLanguageTap,
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}
