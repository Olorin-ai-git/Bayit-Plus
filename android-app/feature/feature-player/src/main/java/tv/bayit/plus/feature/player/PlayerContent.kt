package tv.bayit.plus.feature.player

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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import tv.bayit.plus.core.media.PlayerState
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.player.live.AIFeaturesPanelState
import tv.bayit.plus.feature.player.live.LiveDubbingUiState
import tv.bayit.plus.feature.player.live.LiveSubtitleUiState
import tv.bayit.plus.feature.player.live.LiveTriviaUiState
import tv.bayit.plus.feature.player.live.ui.PlayerLiveOverlays
import tv.bayit.plus.feature.player.trivia.TriviaFactsOverlay
import tv.bayit.plus.feature.player.ui.OmriOverlay
import tv.bayit.plus.feature.player.ui.PlayerOverlay

@Composable
internal fun ReadyContent(
    state: PlayerUiState.Ready,
    playerState: PlayerState,
    isControlsVisible: Boolean,
    positionMs: Long,
    durationMs: Long,
    subtitleState: LiveSubtitleUiState,
    dubbingState: LiveDubbingUiState,
    triviaState: LiveTriviaUiState,
    triviaProgress: Float,
    aiPanelState: AIFeaturesPanelState,
    extendedState: tv.bayit.plus.feature.player.PlayerExtendedState,
    onToggleControls: () -> Unit,
    onPlayPause: () -> Unit,
    onSeek: (Float) -> Unit,
    onToggleAIPanel: () -> Unit,
    onToggleSubtitles: () -> Unit,
    onToggleDubbing: () -> Unit,
    onToggleTrivia: () -> Unit,
    onShowLanguagePicker: () -> Unit,
    onShowSubtitlePicker: () -> Unit,
    onDismissTrivia: () -> Unit,
    onTriviaFollowUp: () -> Unit,
    onToggleVodTrivia: () -> Unit,
    onHideOmriOverlay: () -> Unit,
    onSkipBackward: () -> Unit,
    onSkipForward: () -> Unit,
    onRestart: () -> Unit,
    onVolumeChange: (Float) -> Unit,
    onSpeedChange: (Float) -> Unit,
    onBack: () -> Unit,
    onToggleFullscreen: () -> Unit,
    onWordTap: (String) -> Unit = {},
    onDismissTranslation: () -> Unit = {},
    onInteract: (() -> Unit)? = null,
    onPreviousInteraction: (() -> Unit)? = null,
    onNextInteraction: (() -> Unit)? = null,
    hasInteractiveMoments: Boolean = false,
    isCastAvailable: Boolean = false,
    isCastConnected: Boolean = false,
    onCastClick: () -> Unit = {},
) {
    Column(modifier = Modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .background(Color.Black),
        ) {
            state.exoPlayer?.let { player ->
                AndroidView(
                    factory = { context ->
                        PlayerView(context).apply {
                            this.player = player
                            useController = false
                            resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                        }
                    },
                    modifier = Modifier.fillMaxSize(),
                )
            }

            PlayerOverlay(
                title = state.title,
                isControlsVisible = isControlsVisible,
                playerState = playerState,
                isPlaying = playerState is PlayerState.Playing,
                currentPositionMs = positionMs,
                totalDurationMs = durationMs,
                isLiveContent = state.isLiveContent,
                volume = extendedState.volume,
                playbackSpeed = extendedState.playbackSpeed,
                isFullscreen = extendedState.isFullscreen,
                selectedSubtitleLanguage = extendedState.selectedSubtitleLanguage,
                isSplitSubtitleMode = extendedState.isSplitSubtitleMode,
                primarySubtitleLanguage = extendedState.primarySubtitleLanguage,
                secondarySubtitleLanguage = extendedState.secondarySubtitleLanguage,
                onToggleControls = onToggleControls,
                onBack = onBack,
                onPlayPause = onPlayPause,
                onSeek = onSeek,
                onSkipBackward = onSkipBackward,
                onSkipForward = onSkipForward,
                onRestart = onRestart,
                onVolumeChange = onVolumeChange,
                onSpeedChange = onSpeedChange,
                onToggleFullscreen = onToggleFullscreen,
                onSubtitlePickerClick = onShowSubtitlePicker,
                onAIFeaturesClick = if (state.isLiveContent) onToggleAIPanel else null,
                isVodTriviaEnabled = extendedState.isVodTriviaEnabled,
                onVodTriviaToggle = if (!state.isLiveContent) onToggleVodTrivia else null,
                onInteract = if (!state.isLiveContent) onInteract else null,
                onPreviousInteraction = if (!state.isLiveContent) onPreviousInteraction else null,
                onNextInteraction = if (!state.isLiveContent) onNextInteraction else null,
                hasInteractiveMoments = !state.isLiveContent && hasInteractiveMoments,
                isCastAvailable = isCastAvailable,
                isCastConnected = isCastConnected,
                onCastClick = onCastClick,
                subtitleOverlay = {
                    if (!state.isLiveContent && extendedState.isSubtitlesEnabled) {
                        if (extendedState.isSplitSubtitleMode) {
                            // Split mode: show both primary and secondary subtitles
                            tv.bayit.plus.feature.player.subtitles.SplitSubtitleOverlay(
                                primaryCue = extendedState.activePrimaryCue,
                                secondaryCue = extendedState.activeSecondaryCue,
                                primaryLanguage = extendedState.primarySubtitleLanguage.orEmpty(),
                                secondaryLanguage = extendedState.secondarySubtitleLanguage.orEmpty(),
                                layout = extendedState.splitSubtitleLayout,
                                onWordTap = onWordTap,
                            )
                        } else if (extendedState.activeCue != null) {
                            // Regular mode: single subtitle
                            tv.bayit.plus.feature.player.subtitles.SubtitleCueOverlay(
                                activeCue = extendedState.activeCue,
                                hebrewMode = extendedState.hebrewMode,
                                englishMode = extendedState.englishMode,
                                translationResult = extendedState.translationResult,
                                onWordTap = onWordTap,
                                onDismissTranslation = onDismissTranslation,
                            )
                        }
                    }
                },
                triviaOverlay = if (!state.isLiveContent && extendedState.isVodTriviaEnabled) {
                    {
                        TriviaFactsOverlay(
                            activeFact = extendedState.vodTriviaFact,
                            language = extendedState.vodTriviaLanguage,
                            onDismiss = onDismissTrivia,
                            onFollowUp = onTriviaFollowUp,
                        )
                    }
                } else {
                    null
                },
            )

            if (state.isLiveContent) {
                PlayerLiveOverlays(
                    subtitleState = subtitleState,
                    dubbingState = dubbingState,
                    triviaState = triviaState,
                    triviaProgress = triviaProgress,
                    panelState = aiPanelState,
                    onTogglePanel = onToggleAIPanel,
                    onSubtitlesTap = onToggleSubtitles,
                    onDubbingTap = onToggleDubbing,
                    onTriviaTap = onToggleTrivia,
                    onLanguageTap = onShowLanguagePicker,
                    onDismissTrivia = onDismissTrivia,
                    onTriviaFollowUp = onTriviaFollowUp
                )
            }

            if (!state.isLiveContent && extendedState.showOmriOverlay) {
                OmriOverlay(onHide = onHideOmriOverlay)
            }
        }

        if (!extendedState.isFullscreen) {
            MetadataSection(title = state.title, description = state.description)
        }
    }
}

// MetadataSection and ErrorContent are in PlayerContent+Extras.kt
