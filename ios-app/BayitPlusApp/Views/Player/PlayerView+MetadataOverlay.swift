import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// Extension on PlayerView providing subtitle picker overlay, loading/error
/// overlays, subtitle language helpers, subtitle selection handling,
/// live overlay inset, and now-playing metadata updates.
extension PlayerView {
    // MARK: - Subtitle Picker Overlay

    var subtitlePickerOverlay: some View {
        ZStack {
            Color.black.opacity(0.6)
                .ignoresSafeArea()
                .onTapGesture {
                    withAnimation(.spring(duration: 0.3)) {
                        showSubtitlePicker = false
                    }
                }

            VStack {
                Spacer()
                SubtitleLanguagePickerView(
                    availableLanguages: availableSubtitleLanguages,
                    aiLanguages: aiSubtitleLanguages,
                    selectedLanguage: selectedSubtitleLanguage,
                    contentId: contentId,
                    repository: repositories.subtitle,
                    onSelect: { language in
                        handleSubtitleSelection(language)
                        withAnimation(.spring(duration: 0.3)) {
                            showSubtitlePicker = false
                        }
                    },
                    onRefresh: {
                        Task { await viewModel.load() }
                    },
                    onDismiss: {
                        withAnimation(.spring(duration: 0.3)) {
                            showSubtitlePicker = false
                        }
                    },
                    onSplitTap: {
                        withAnimation(.spring(duration: 0.3)) {
                            showSubtitlePicker = false
                        }
                        showSplitLanguagePicker = true
                    },
                    isSplitEnabled: splitModeEnabled,
                    currentHebrewMode: subtitlesVM?.hebrewMode ?? .standard,
                    currentEnglishMode: subtitlesVM?.englishMode ?? .standard,
                    hasNikud: subtitlesVM?.hasNikud ?? false,
                    hasShoresh: subtitlesVM?.hasShoresh ?? false,
                    hasHeblish: subtitlesVM?.hasHeblish ?? false,
                    hasEngrew: false,
                    onHebrewModeSelect: { mode in
                        Task {
                            await subtitlesVM?.setHebrewMode(mode, contentId: contentId, language: selectedSubtitleLanguage)
                        }
                    },
                    onEnglishModeSelect: { mode in
                        Task {
                            await subtitlesVM?.setEnglishMode(mode, contentId: contentId, language: selectedSubtitleLanguage)
                        }
                    }
                )
                .containerRelativeFrame(.vertical) { height, _ in height * 0.7 }
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .transition(.opacity)
    }

    // MARK: - Loading Overlay

    var loadingOverlay: some View {
        ProgressView()
            .scaleEffect(1.5)
            .tint(.white)
            .accessibilityLabel(localization.t("player.loadingMedia"))
    }

    // MARK: - Error Overlay

    func errorOverlay(_ message: String) -> some View {
        VStack(spacing: DesignTokens.Spacing.base) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundStyle(DesignTokens.ErrorColor.default)

            Text(message)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            GlassButton(localization.t("player.dismiss"), variant: .ghost) {
                coordinator.dismissFullscreen()
            }
        }
        .padding(DesignTokens.Spacing.xl)
    }

    // MARK: - Live Overlay Inset

    /// Bottom inset for live subtitle/dubbing overlays.
    /// Clears the AI panel height + spacing + player controls + bottom padding.
    var liveOverlayBottomInset: CGFloat {
        let aiPanelHeight: CGFloat = UIDevice.current.userInterfaceIdiom == .pad ? 56 : 48
        let aiPanelBottomPadding = DesignTokens.Spacing.sm
        let playerControlsHeight: CGFloat = UIDevice.current.userInterfaceIdiom == .pad ? 80 : 64
        let controlsBottomPadding = DesignTokens.Spacing.xxl
        return aiPanelHeight + aiPanelBottomPadding + playerControlsHeight + controlsBottomPadding
    }

    // MARK: - Subtitle Languages

    var availableSubtitleLanguages: [String] {
        viewModel.availableSubtitleLanguages
    }

    var aiSubtitleLanguages: Set<String> {
        var aiLangs = Set<String>()
        if availableSubtitleLanguages.contains("he") {
            aiLangs.insert("he")
        }
        if availableSubtitleLanguages.contains("en") {
            aiLangs.insert("en")
        }
        return aiLangs
    }

    // MARK: - Subtitle Selection

    func handleSubtitleSelection(_ language: String?) {
        if mediaContentType.isLive {
            if let language {
                liveSubtitlesVM?.selectLanguage(language, channelId: contentId)
                if liveSubtitlesVM?.isEnabled != true {
                    liveSubtitlesVM?.toggleSubtitles(channelId: contentId)
                }
            } else if liveSubtitlesVM?.isEnabled == true {
                liveSubtitlesVM?.toggleSubtitles(channelId: contentId)
            }
            selectedSubtitleLanguage = language
            return
        }

        selectedSubtitleLanguage = language
        subtitleLoadTask?.cancel()
        if let language {
            if subtitlesVM == nil {
                subtitlesVM = InteractiveSubtitlesViewModel(
                    repository: repositories.subtitle,
                    offlineCache: repositories.offlineCache,
                    shoreshParser: DefaultShoreshParser()
                )
            }
            subtitleLoadTask = Task {
                await subtitlesVM?.loadCues(contentId: contentId, language: language)
            }
        } else {
            subtitlesVM = nil
        }
    }

    // MARK: - Now Playing

    func updateNowPlaying() {
        guard let title = viewModel.title else { return }
        let metadata = NowPlayingMetadata(
            title: title,
            artist: viewModel.subtitle,
            artworkURL: viewModel.artworkURL,
            duration: viewModel.player.duration,
            contentType: mediaContentType,
            isLiveStream: mediaContentType.isLive
        )
        nowPlayingService.update(
            metadata: metadata,
            currentTime: viewModel.player.currentTime,
            duration: viewModel.player.duration,
            rate: viewModel.player.rate
        )
    }
}
