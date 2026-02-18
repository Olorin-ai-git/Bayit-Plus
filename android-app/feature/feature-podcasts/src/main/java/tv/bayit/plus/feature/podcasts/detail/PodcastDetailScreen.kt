package tv.bayit.plus.feature.podcasts.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.media.AudioPlaybackState
import tv.bayit.plus.core.model.PodcastEpisodeItem
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassModal
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SleepTimerBanner
import tv.bayit.plus.designsystem.component.SleepTimerPickerSheet
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun PodcastDetailRoute(
    onNavigateToPlayer: (String, String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: PodcastDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val audioState by viewModel.audioState.collectAsStateWithLifecycle()
    val sleepTimerState by viewModel.sleepTimerState.collectAsStateWithLifecycle()
    var showSleepTimerPicker by remember { mutableStateOf(false) }

    PodcastDetailScreen(
        uiState = uiState,
        audioState = audioState,
        sleepTimerState = sleepTimerState,
        showSleepTimerPicker = showSleepTimerPicker,
        onToggleLatest = viewModel::toggleLatestPlayback,
        onToggleEpisode = viewModel::toggleEpisodePlayback,
        onBack = onNavigateBack,
        onRetry = viewModel::retry,
        onRefresh = viewModel::refresh,
        onShowSleepTimerPicker = { showSleepTimerPicker = true },
        onDismissSleepTimerPicker = { showSleepTimerPicker = false },
        onStartSleepTimer = viewModel::startSleepTimer,
        onExtendSleepTimer = viewModel::extendSleepTimer,
        onCancelSleepTimer = {
            viewModel.cancelSleepTimer()
            showSleepTimerPicker = false
        },
        modifier = modifier,
    )
}

@Composable
internal fun PodcastDetailScreen(
    uiState: PodcastDetailUiState,
    audioState: AudioPlaybackState,
    sleepTimerState: PodcastSleepTimerState,
    showSleepTimerPicker: Boolean,
    onToggleLatest: () -> Unit,
    onToggleEpisode: (PodcastEpisodeItem) -> Unit,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    onRefresh: () -> Unit,
    onShowSleepTimerPicker: () -> Unit,
    onDismissSleepTimerPicker: () -> Unit,
    onStartSleepTimer: (Int) -> Unit,
    onExtendSleepTimer: (Int) -> Unit,
    onCancelSleepTimer: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(DesignTokens.Colors.Background.primary),
    ) {
        when (uiState) {
            is PodcastDetailUiState.Loading -> GlassLoadingIndicator()
            is PodcastDetailUiState.Error -> PodcastErrorContent(uiState.message, onBack, onRetry)
            is PodcastDetailUiState.Success -> PodcastSuccessContent(
                state = uiState,
                audioState = audioState,
                sleepTimerState = sleepTimerState,
                showSleepTimerPicker = showSleepTimerPicker,
                onToggleLatest = onToggleLatest,
                onToggleEpisode = onToggleEpisode,
                onBack = onBack,
                onRefresh = onRefresh,
                onShowSleepTimerPicker = onShowSleepTimerPicker,
                onDismissSleepTimerPicker = onDismissSleepTimerPicker,
                onStartSleepTimer = onStartSleepTimer,
                onExtendSleepTimer = onExtendSleepTimer,
                onCancelSleepTimer = onCancelSleepTimer,
            )
        }
    }
}

@Composable
private fun PodcastSuccessContent(
    state: PodcastDetailUiState.Success,
    audioState: AudioPlaybackState,
    sleepTimerState: PodcastSleepTimerState,
    showSleepTimerPicker: Boolean,
    onToggleLatest: () -> Unit,
    onToggleEpisode: (PodcastEpisodeItem) -> Unit,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onShowSleepTimerPicker: () -> Unit,
    onDismissSleepTimerPicker: () -> Unit,
    onStartSleepTimer: (Int) -> Unit,
    onExtendSleepTimer: (Int) -> Unit,
    onCancelSleepTimer: () -> Unit,
) {
    val isShowPlaying = audioState.isActive &&
        audioState.contentId == state.showId &&
        audioState.isPlaying

    Box(modifier = Modifier.fillMaxSize()) {
        PullToRefreshBox(
            isRefreshing = state.isRefreshing,
            onRefresh = onRefresh,
            modifier = Modifier.fillMaxSize(),
        ) {
            LazyColumn(modifier = Modifier.fillMaxSize()) {
                item { PodcastHeroSection(state, onBack) }
                item { PodcastMetadataSection(state) }
                item {
                    PodcastPlaySection(
                        isPlaying = isShowPlaying,
                        onToggle = onToggleLatest,
                        onShowSleepTimerPicker = onShowSleepTimerPicker,
                    )
                }
                if (state.isLoadingEpisodes) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(DesignTokens.Spacing.xxxxl),
                            contentAlignment = Alignment.Center,
                        ) {
                            GlassSpinner(size = SpinnerSize.MEDIUM)
                        }
                    }
                } else {
                    items(items = state.episodes, key = { it.id }) { episode ->
                        val isEpisodePlaying = audioState.isActive &&
                            audioState.contentId == episode.id &&
                            audioState.isPlaying
                        PodcastEpisodeRow(
                            episode = episode,
                            isPlaying = isEpisodePlaying,
                            onTogglePlayback = { onToggleEpisode(episode) },
                        )
                    }
                }
            }
        }

        SleepTimerBanner(
            isVisible = sleepTimerState.isActive,
            remainingSeconds = sleepTimerState.remainingSeconds,
            onExtend = onExtendSleepTimer,
            onCancel = onCancelSleepTimer,
            modifier = Modifier.align(Alignment.TopCenter),
        )
    }

    if (showSleepTimerPicker) {
        GlassModal(onDismissRequest = onDismissSleepTimerPicker) {
            SleepTimerPickerSheet(
                activeDurationMinutes = sleepTimerState.durationMinutes,
                onSelect = { minutes ->
                    onStartSleepTimer(minutes)
                    onDismissSleepTimerPicker()
                },
                onCancel = {
                    onCancelSleepTimer()
                    onDismissSleepTimerPicker()
                },
            )
        }
    }
}
