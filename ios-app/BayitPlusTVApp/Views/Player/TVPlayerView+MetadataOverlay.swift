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
                subtitleContent(vm: vm)
            }
            .padding(.bottom, TVDesignTokens.Spacing.xxl)
        }
    }

    @ViewBuilder
    private func subtitleContent(vm: InteractiveSubtitlesViewModel) -> some View {
        if let interactiveVM = state.interactiveSubtitleVM, interactiveVM.isEnabled {
            TVInteractiveSubtitleView(
                viewModel: interactiveVM,
                subtitleText: vm.activeText,
                onPauseAdvancement: { mediaPlayer.avPlayer.pause() },
                onResumeAdvancement: { mediaPlayer.avPlayer.play() }
            )
        } else if vm.hebrewMode == .shoresh, !vm.shoreshWords.isEmpty {
            TVShoreshHighlightView(words: vm.shoreshWords)
        } else {
            subtitleText(vm.activeText)
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
                isVisible: vm.showOverlay,
                layout: state.splitModeEnabled ? state.splitLayout : .stacked,
                targetLang: vm.selectedLanguage,
                sourceLang: vm.sourceLang
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
}
