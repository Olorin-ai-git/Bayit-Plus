import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// Extension on PlayerView providing the top toolbar with dismiss, metadata,
/// subtitle picker, playback rate, quality, download, interaction, live feature,
/// recording, AirPlay, and PiP buttons.
extension PlayerView {
    // MARK: - Top Bar

    var topBar: some View {
        HStack {
            Button { coordinator.dismissFullscreen() } label: {
                Image(systemName: "chevron.down")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel(localization.t("player.dismissPlayer"))

            VStack(alignment: .leading, spacing: 2) {
                if let title = viewModel.title {
                    Text(title)
                        .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                }
                if let subtitle = viewModel.subtitle {
                    Text(subtitle)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            // Subtitle picker button (VOD only - live uses AI panel)
            if !mediaContentType.isLive && !availableSubtitleLanguages.isEmpty {
                Button {
                    withAnimation(.spring(duration: 0.3)) {
                        showSubtitlePicker.toggle()
                    }
                } label: {
                    Image(systemName: selectedSubtitleLanguage != nil
                        ? "captions.bubble.fill" : "captions.bubble")
                        .font(.system(size: 18))
                        .foregroundStyle(
                            selectedSubtitleLanguage != nil
                                ? DesignTokens.Primary.p400 : .white
                        )
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel(localization.t("player.subtitles"))
                .walkthroughTarget(id: "discover_vocabulary_step2")
                .walkthroughTarget(id: "discover_vocabulary_step3")

                splitSubtitleToggle
            }

            if !mediaContentType.isLive {
                Button {
                    showPlaybackRateMenu = true
                } label: {
                    Text(playbackRateLabel)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel(localization.t("player.playbackSpeed"))

                Button {
                    showQualitySelector = true
                } label: {
                    Image(systemName: "gearshape")
                        .font(.system(size: 18))
                        .foregroundStyle(.white)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel(localization.t("player.qualitySettings"))

                if contentType != .radio && !mediaContentType.isYouTubeSource {
                    playerDownloadButton
                }
            }

            // Previous Interaction button (VOD only, when interactions enabled)
            // Gate on ownerMode for private content types
            if !mediaContentType.isLive, interactionVM != nil, let action = previousInteractionAction,
               appConfiguration.ownerMode || !contentType.isOwnerOnly
            {
                Button { action() } label: {
                    Image(systemName: "backward.end.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(.white)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel(localization.t("player.interaction.previous"))
            }

            // Interact button (VOD only, when interactions or characters enabled)
            // Always enabled for YouTube BYOC (AI uses video transcript)
            // Gate on ownerMode for private content types
            if !mediaContentType.isLive,
               interactionVM != nil || hasInteractiveCharacters || mediaContentType.isYouTubeSource,
               appConfiguration.ownerMode || !contentType.isOwnerOnly
            {
                Button {
                    Task { await startPauseAskInteraction() }
                } label: {
                    Image(systemName: (showDialogueOverlay || showPauseAskOverlay)
                        ? "bubble.left.and.bubble.right.fill"
                        : "bubble.left.and.bubble.right")
                        .font(.system(size: 18))
                        .foregroundStyle(
                            (showDialogueOverlay || showPauseAskOverlay)
                                ? DesignTokens.Primary.p400 : .white
                        )
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel(localization.t("player.pauseAsk.title"))
                .walkthroughTarget(id: "discover_pause_ask_step3")
                .walkthroughTarget(id: "discover_ai_companion_step2")
                .walkthroughTarget(id: "discover_ai_companion_step3")
                .featureTooltip(
                    featureKey: "pause_and_ask",
                    titleKey: "tooltip.pauseAndAsk.title",
                    descriptionKey: "tooltip.pauseAndAsk.description",
                    arrowDirection: .top
                )
            }

            // Next Interaction button (VOD only, when interactions enabled)
            if !mediaContentType.isLive, interactionVM != nil, let action = nextInteractionAction,
               appConfiguration.ownerMode || !contentType.isOwnerOnly
            {
                Button { action() } label: {
                    Image(systemName: "forward.end.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(.white)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel(localization.t("player.interaction.next"))
            }

            liveFeatureButtons

            if mediaContentType.isLive && !mediaContentType.isYouTubeSource {
                recordingButton
            }

            AirPlayView()
                .frame(width: 36, height: 36)

            if PiPController.isSupported {
                Button {
                    isPiPActive.toggle()
                } label: {
                    Image(systemName: isPiPActive ? "pip.exit" : "pip.enter")
                        .font(.system(size: 18))
                        .foregroundStyle(isPiPActive ? DesignTokens.Primary.p400 : .white)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel(
                    isPiPActive
                        ? localization.t("exitPiP")
                        : localization.t("enterPiP")
                )
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
        .padding(.top, DesignTokens.Spacing.sm)
    }
}
