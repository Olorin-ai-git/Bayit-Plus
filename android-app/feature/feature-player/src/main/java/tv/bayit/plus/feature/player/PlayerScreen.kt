package tv.bayit.plus.feature.player

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.media3.ui.PlayerView
import tv.bayit.plus.core.media.PlayerState
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.player.live.ui.AILanguagePicker
import tv.bayit.plus.feature.player.live.ui.PlayerLiveOverlays
import tv.bayit.plus.feature.player.sleeptimer.SleepTimerBanner
import tv.bayit.plus.feature.player.sleeptimer.SleepTimerPickerSheet
import tv.bayit.plus.feature.player.ui.PlayerOverlay

/**
 * Navigation entry-point for the Player screen.
 *
 * Owns the [PlayerViewModel] lifecycle through Hilt, triggers content
 * loading via [DisposableEffect], and saves progress on back navigation.
 */
@Composable
fun PlayerRoute(
    contentId: String,
    contentType: String,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: PlayerViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val playerState by viewModel.playerState.collectAsStateWithLifecycle()
    val isControlsVisible by viewModel.isControlsVisible.collectAsStateWithLifecycle()
    val positionMs by viewModel.playbackPositionMs.collectAsStateWithLifecycle()
    val durationMs by viewModel.totalDurationMs.collectAsStateWithLifecycle()
    val subtitleState by viewModel.subtitleState.collectAsStateWithLifecycle()
    val dubbingState by viewModel.dubbingState.collectAsStateWithLifecycle()
    val triviaState by viewModel.triviaState.collectAsStateWithLifecycle()
    val triviaProgress by viewModel.triviaProgress.collectAsStateWithLifecycle()
    val aiPanelState by viewModel.aiPanelState.collectAsStateWithLifecycle()
    val extendedState by viewModel.extendedState.collectAsStateWithLifecycle()

    var showLanguagePicker by remember { mutableStateOf(false) }
    var showSubtitlePicker by remember { mutableStateOf(false) }
    var showSplitSubtitlePicker by remember { mutableStateOf(false) }
    var showOpenSubtitles by remember { mutableStateOf(false) }
    var showSleepTimerPicker by remember { mutableStateOf(false) }

    DisposableEffect(contentId) {
        viewModel.loadContent(contentId, contentType)
        onDispose { viewModel.release() }
    }

    BackHandler {
        viewModel.saveProgress()
        onNavigateBack()
    }

    PlayerScreen(
        uiState = uiState,
        playerState = playerState,
        isControlsVisible = isControlsVisible,
        positionMs = positionMs,
        durationMs = durationMs,
        subtitleState = subtitleState,
        dubbingState = dubbingState,
        triviaState = triviaState,
        triviaProgress = triviaProgress,
        aiPanelState = aiPanelState,
        extendedState = extendedState,
        showLanguagePicker = showLanguagePicker,
        showSubtitlePicker = showSubtitlePicker,
        showSplitSubtitlePicker = showSplitSubtitlePicker,
        showOpenSubtitles = showOpenSubtitles,
        onShowLanguagePicker = { showLanguagePicker = true },
        onHideLanguagePicker = { showLanguagePicker = false },
        onShowSubtitlePicker = { showSubtitlePicker = true },
        onHideSubtitlePicker = { showSubtitlePicker = false },
        onToggleControls = viewModel::toggleControls,
        onPlayPause = viewModel::togglePlayPause,
        onSeek = viewModel::seekToFraction,
        onToggleAIPanel = viewModel::toggleAIPanel,
        onToggleSubtitles = viewModel::toggleLiveSubtitles,
        onToggleDubbing = viewModel::toggleLiveDubbing,
        onToggleTrivia = viewModel::toggleLiveTrivia,
        onSelectLanguage = viewModel::selectAILanguage,
        onSelectSubtitleLanguage = viewModel::selectSubtitleLanguage,
        onToggleSplitMode = {
            if (!extendedState.isSplitSubtitleMode) {
                showSplitSubtitlePicker = true
                showSubtitlePicker = false
            } else {
                viewModel.toggleSplitSubtitleMode()
            }
        },
        onShowOpenSubtitles = {
            showOpenSubtitles = true
            showSubtitlePicker = false
        },
        onHideSplitSubtitlePicker = { showSplitSubtitlePicker = false },
        onHideOpenSubtitles = { showOpenSubtitles = false },
        onSelectPrimaryLanguage = viewModel::selectPrimarySubtitleLanguage,
        onSelectSecondaryLanguage = viewModel::selectSecondarySubtitleLanguage,
        onSelectSplitLayout = viewModel::selectSplitSubtitleLayout,
        onFetchExternalSubtitles = viewModel::fetchExternalSubtitles,
        onSelectExternalSubtitle = viewModel::selectExternalSubtitle,
        onDismissTrivia = {
            viewModel.dismissTriviaFact()
            viewModel.dismissVodTrivia()
        },
        onTriviaFollowUp = {
            viewModel.requestTriviaFollowUp()
            viewModel.requestVodTriviaFollowUp()
        },
        onToggleVodTrivia = viewModel::toggleVodTrivia,
        onHideOmriOverlay = viewModel::hideOmriOverlay,
        onSkipBackward = viewModel::seekBackward,
        onSkipForward = viewModel::seekForward,
        onRestart = viewModel::restartContent,
        onVolumeChange = viewModel::setVolume,
        onSpeedChange = viewModel::setPlaybackSpeed,
        showSleepTimerPicker = showSleepTimerPicker,
        onShowSleepTimerPicker = { showSleepTimerPicker = true },
        onHideSleepTimerPicker = { showSleepTimerPicker = false },
        onStartSleepTimer = { minutes ->
            viewModel.startSleepTimer(minutes)
            showSleepTimerPicker = false
        },
        onExtendSleepTimer = viewModel::extendSleepTimer,
        onCancelSleepTimer = viewModel::cancelSleepTimer,
        onBack = {
            viewModel.saveProgress()
            onNavigateBack()
        },
        modifier = modifier,
    )
}

@Composable
private fun PlayerScreen(
    uiState: PlayerUiState,
    playerState: PlayerState,
    isControlsVisible: Boolean,
    positionMs: Long,
    durationMs: Long,
    subtitleState: tv.bayit.plus.feature.player.live.LiveSubtitleUiState,
    dubbingState: tv.bayit.plus.feature.player.live.LiveDubbingUiState,
    triviaState: tv.bayit.plus.feature.player.live.LiveTriviaUiState,
    triviaProgress: Float,
    aiPanelState: tv.bayit.plus.feature.player.live.AIFeaturesPanelState,
    extendedState: PlayerExtendedState,
    showLanguagePicker: Boolean,
    showSubtitlePicker: Boolean,
    showSplitSubtitlePicker: Boolean,
    showOpenSubtitles: Boolean,
    onShowLanguagePicker: () -> Unit,
    onHideLanguagePicker: () -> Unit,
    onShowSubtitlePicker: () -> Unit,
    onHideSubtitlePicker: () -> Unit,
    onToggleControls: () -> Unit,
    onPlayPause: () -> Unit,
    onSeek: (Float) -> Unit,
    onToggleAIPanel: () -> Unit,
    onToggleSubtitles: () -> Unit,
    onToggleDubbing: () -> Unit,
    onToggleTrivia: () -> Unit,
    onSelectLanguage: (String) -> Unit,
    onSelectSubtitleLanguage: (String) -> Unit,
    onToggleSplitMode: () -> Unit,
    onShowOpenSubtitles: () -> Unit,
    onHideSplitSubtitlePicker: () -> Unit,
    onHideOpenSubtitles: () -> Unit,
    onSelectPrimaryLanguage: (String) -> Unit,
    onSelectSecondaryLanguage: (String) -> Unit,
    onSelectSplitLayout: (tv.bayit.plus.core.model.SplitSubtitleLayout) -> Unit,
    onFetchExternalSubtitles: () -> Unit,
    onSelectExternalSubtitle: (tv.bayit.plus.core.model.ImportedTrack) -> Unit,
    onDismissTrivia: () -> Unit,
    onTriviaFollowUp: () -> Unit,
    onToggleVodTrivia: () -> Unit,
    onHideOmriOverlay: () -> Unit,
    onSkipBackward: () -> Unit,
    onSkipForward: () -> Unit,
    onRestart: () -> Unit,
    onVolumeChange: (Float) -> Unit,
    onSpeedChange: (Float) -> Unit,
    showSleepTimerPicker: Boolean,
    onShowSleepTimerPicker: () -> Unit,
    onHideSleepTimerPicker: () -> Unit,
    onStartSleepTimer: (Int) -> Unit,
    onExtendSleepTimer: (Int) -> Unit,
    onCancelSleepTimer: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(DesignTokens.Colors.Background.primary),
    ) {
        when (uiState) {
            is PlayerUiState.Loading -> GlassLoadingIndicator()
            is PlayerUiState.Ready -> {
                ReadyContent(
                    state = uiState,
                    playerState = playerState,
                    isControlsVisible = isControlsVisible,
                    positionMs = positionMs,
                    durationMs = durationMs,
                    subtitleState = subtitleState,
                    dubbingState = dubbingState,
                    triviaState = triviaState,
                    triviaProgress = triviaProgress,
                    aiPanelState = aiPanelState,
                    extendedState = extendedState,
                    onToggleControls = onToggleControls,
                    onPlayPause = onPlayPause,
                    onSeek = onSeek,
                    onToggleAIPanel = onToggleAIPanel,
                    onToggleSubtitles = onToggleSubtitles,
                    onToggleDubbing = onToggleDubbing,
                    onToggleTrivia = onToggleTrivia,
                    onShowLanguagePicker = onShowLanguagePicker,
                    onShowSubtitlePicker = onShowSubtitlePicker,
                    onDismissTrivia = onDismissTrivia,
                    onTriviaFollowUp = onTriviaFollowUp,
                    onToggleVodTrivia = onToggleVodTrivia,
                    onHideOmriOverlay = onHideOmriOverlay,
                    onSkipBackward = onSkipBackward,
                    onSkipForward = onSkipForward,
                    onRestart = onRestart,
                    onVolumeChange = onVolumeChange,
                    onSpeedChange = onSpeedChange,
                    onBack = onBack,
                )

                if (!uiState.isLiveContent) {
                    SleepTimerBanner(
                        isVisible = extendedState.isSleepTimerActive,
                        remainingSeconds = extendedState.sleepTimerRemainingSeconds,
                        onExtend = onExtendSleepTimer,
                        onCancel = onCancelSleepTimer,
                        modifier = Modifier.align(Alignment.TopCenter).padding(top = DesignTokens.Spacing.xl),
                    )
                }

                if (showSleepTimerPicker) {
                    SleepTimerPickerSheet(
                        activeDurationMinutes = extendedState.sleepTimerDurationMinutes,
                        onSelect = onStartSleepTimer,
                        onCancel = onHideSleepTimerPicker,
                    )
                }

                if (showLanguagePicker) {
                    AILanguagePicker(
                        selectedLanguage = aiPanelState.selectedLanguage,
                        onLanguageSelected = { lang ->
                            onSelectLanguage(lang)
                            onHideLanguagePicker()
                        },
                        onDismiss = onHideLanguagePicker
                    )
                }

                if (showSubtitlePicker) {
                    tv.bayit.plus.feature.player.subtitles.SubtitleLanguagePicker(
                        selectedLanguage = extendedState.selectedSubtitleLanguage.orEmpty(),
                        availableLanguages = extendedState.availableSubtitleLanguages,
                        isSplitMode = extendedState.isSplitSubtitleMode,
                        onLanguageSelected = { lang ->
                            onSelectSubtitleLanguage(lang)
                            onHideSubtitlePicker()
                        },
                        onSplitToggle = onToggleSplitMode,
                        onOpenSubtitlesClick = onShowOpenSubtitles,
                        onDismiss = onHideSubtitlePicker,
                    )
                }

                if (showSplitSubtitlePicker) {
                    tv.bayit.plus.feature.player.subtitles.SplitSubtitleLanguagePicker(
                        primaryLanguage = extendedState.primarySubtitleLanguage.orEmpty(),
                        secondaryLanguage = extendedState.secondarySubtitleLanguage.orEmpty(),
                        availableLanguages = extendedState.availableSubtitleLanguages,
                        layout = extendedState.splitSubtitleLayout,
                        onPrimarySelected = onSelectPrimaryLanguage,
                        onSecondarySelected = onSelectSecondaryLanguage,
                        onLayoutSelected = onSelectSplitLayout,
                        onDismiss = onHideSplitSubtitlePicker,
                    )
                }

                if (showOpenSubtitles) {
                    tv.bayit.plus.feature.player.subtitles.OpenSubtitlesDownload(
                        tracks = extendedState.externalSubtitleTracks,
                        isLoading = extendedState.isLoadingExternalSubtitles,
                        onFetchExternal = onFetchExternalSubtitles,
                        onTrackSelected = { track ->
                            onSelectExternalSubtitle(track)
                            onHideOpenSubtitles()
                        },
                        onDismiss = onHideOpenSubtitles,
                    )
                }
            }
            is PlayerUiState.Error -> ErrorContent(uiState.message, onBack)
        }
    }
}

