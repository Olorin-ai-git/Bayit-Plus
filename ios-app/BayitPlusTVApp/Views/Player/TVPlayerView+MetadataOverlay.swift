import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// Subtitle overlays, trivia, translation popovers, catch-up prompts,
/// stream loading/error views, and the no-avatar warning banner.
extension TVPlayerView {
    // MARK: - Trivia Overlay

    @ViewBuilder
    var triviaOverlay: some View {
        if state.interactionVM?.activeMoment == nil, let vm = state.triviaVM {
            TVTriviaFactsOverlayView(
                viewModel: vm,
                contentId: contentId,
                currentTime: mediaPlayer.currentTime,
                isSubtitlesActive: state.selectedSubtitleLanguage != nil
                    || state.liveSubtitlesVM?.isEnabled == true,
                currentLanguage: state.selectedAILanguage,
                onDismiss: { vm.dismissFact() }
            )
        }
    }

    // MARK: - Subtitle Overlay (VOD)

    @ViewBuilder
    var subtitleOverlay: some View {
        if !state.splitModeEnabled, !isLive,
           let vm = state.subtitlesVM, vm.activeCue != nil
        {
            VStack {
                Spacer()
                if vm.hebrewMode == .shoresh, !vm.shoreshWords.isEmpty {
                    TVShoreshHighlightView(words: vm.shoreshWords)
                } else {
                    subtitleText(vm.activeText)
                }
            }
            .padding(.bottom, TVDesignTokens.Spacing.xxl)
        }
    }

    func subtitleText(_ text: String) -> some View {
        Text(text)
            .font(.system(size: TVDesignTokens.FontSize.lg))
            .foregroundColor(.white)
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.xs)
            .background(Color.black.opacity(0.6))
            .cornerRadius(TVDesignTokens.Radius.sm)
            .environment(\.layoutDirection, .rightToLeft)
    }

    // MARK: - Live Subtitle Overlay

    @ViewBuilder
    var liveSubtitleOverlay: some View {
        if isLive, let vm = state.liveSubtitlesVM, vm.isEnabled, vm.showOverlay {
            TVLiveSubtitleOverlayView(
                translatedText: vm.activeCueText,
                originalText: vm.originalCueText ?? "",
                isVisible: vm.showOverlay
            )
        }
    }

    // MARK: - Split Subtitle Overlay

    @ViewBuilder
    var splitSubtitleOverlay: some View {
        if state.splitModeEnabled, state.splitLanguages.count == 2 {
            TVSplitSubtitleOverlayView(
                currentTime: mediaPlayer.currentTime,
                primaryCues: state.primarySubtitleCues,
                secondaryCues: state.secondarySubtitleCues,
                primaryLanguage: state.splitLanguages[0],
                secondaryLanguage: state.splitLanguages[1],
                layout: state.splitLayout,
                primaryModeLabel: activeModeLabel(for: state.splitLanguages[0]),
                secondaryModeLabel: activeModeLabel(for: state.splitLanguages[1])
            )
        }
    }

    // MARK: - Translation Overlay

    @ViewBuilder
    var translationOverlay: some View {
        if let vm = state.subtitlesVM, vm.showTranslation,
           let translation = vm.translation
        {
            TVTranslationPopoverView(
                translation: translation,
                onDismiss: { vm.dismissTranslation() }
            )
        }
    }

    // MARK: - Catch-Up Auto-Prompt Overlay

    @ViewBuilder
    var catchUpAutoPromptOverlay: some View {
        if let vm = state.catchUpVM, vm.showAutoPrompt, isLive {
            TVCatchUpAutoPromptView(
                programName: nil,
                creditCost: repos.configuration.catchUpCreditCost,
                creditBalance: vm.creditBalance,
                autoDismissSeconds: repos.configuration.catchUpAutoPromptSeconds,
                onAccept: {
                    Task {
                        await vm.fetchSummary(
                            channelId: channelId ?? contentId,
                            windowMinutes: repos.configuration.catchUpDefaultWindowMinutes,
                            targetLanguage: state.selectedAILanguage
                        )
                    }
                },
                onDecline: {
                    vm.dismissAutoPrompt(channelId: channelId ?? contentId)
                }
            )
        }
    }

    // MARK: - Stream Loading Views

    var streamLoadingView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(2.0)
            Text(localization.t("player.loadingStream"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Background.primary)
        .ignoresSafeArea()
    }

    var preBufferOverlay: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            ProgressView(
                value: mediaPlayer.preBufferProgress
            )
            .progressViewStyle(.linear)
            .tint(DesignTokens.Primary.default)
            .frame(maxWidth: 400)

            Text(localization.t("player.preparingStream"))
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black.opacity(0.7))
        .ignoresSafeArea()
    }

    func streamErrorView(_ message: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)

            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 600)

            GlassButton("Retry", variant: .secondary, size: .large) {
                Task { await resolveAndPlay() }
            }
            .frame(maxWidth: 300)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Background.primary)
        .ignoresSafeArea()
    }

    // MARK: - No Avatar Warning Banner

    var noAvatarWarningBanner: some View {
        VStack {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(DesignTokens.Warning.default)
                Text(localization.t("settings.interactiveMomentsNoAvatar"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
            )
            Spacer()
        }
        .padding(.top, TVDesignTokens.Spacing.xxl)
        .transition(.move(edge: .top).combined(with: .opacity))
        .onAppear {
            Task {
                try? await Task.sleep(for: .seconds(5))
                withAnimation { state.showNoAvatarWarning = false }
            }
        }
    }
}
