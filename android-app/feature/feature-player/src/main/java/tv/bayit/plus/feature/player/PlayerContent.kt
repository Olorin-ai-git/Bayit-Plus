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
    onBack: () -> Unit,
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
                selectedSubtitleLanguage = extendedState.selectedSubtitleLanguage,
                isSplitSubtitleMode = extendedState.isSplitSubtitleMode,
                primarySubtitleLanguage = extendedState.primarySubtitleLanguage,
                secondarySubtitleLanguage = extendedState.secondarySubtitleLanguage,
                onToggleControls = onToggleControls,
                onBack = onBack,
                onPlayPause = onPlayPause,
                onSeek = onSeek,
                onSubtitlePickerClick = onShowSubtitlePicker,
                onAIFeaturesClick = if (state.isLiveContent) onToggleAIPanel else null,
                isVodTriviaEnabled = extendedState.isVodTriviaEnabled,
                onVodTriviaToggle = if (!state.isLiveContent) onToggleVodTrivia else null,
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
                                onWordTap = { /* TODO: Add word translation */ },
                            )
                        } else if (extendedState.activeCue != null) {
                            // Regular mode: single subtitle
                            tv.bayit.plus.feature.player.subtitles.SubtitleCueOverlay(
                                activeCue = extendedState.activeCue,
                                hebrewMode = tv.bayit.plus.core.model.SubtitleHebrewMode.STANDARD,
                                translationResult = null,
                                onWordTap = { /* TODO: Add word translation */ },
                                onDismissTranslation = { /* TODO: Add dismiss handler */ },
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
        }

        MetadataSection(title = state.title, description = state.description)
    }
}

@Composable
internal fun MetadataSection(title: String, description: String?) {
    Column(modifier = Modifier.padding(DesignTokens.Spacing.base)) {
        Text(
            text = title,
            style = MaterialTheme.typography.headlineMedium,
            color = DesignTokens.Colors.Text.primary,
        )
        description?.let { desc ->
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            Text(
                text = desc,
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
            )
        }
    }
}

@Composable
internal fun ErrorContent(message: String, onBack: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(DesignTokens.Spacing.xl),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = message,
            color = DesignTokens.Colors.Semantic.error,
            style = MaterialTheme.typography.bodyLarge,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        GlassButton(text = bayitString("player.go_back"), onClick = onBack)
    }
}
