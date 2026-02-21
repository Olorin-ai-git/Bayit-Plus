#if os(tvOS)
    import BayitDesignSystem
    import BayitMedia
    import SwiftUI

    /// Compact glass-styled bar that appears at the bottom of the tvOS UI when inline
    /// audio is playing. Focus-compatible for Siri Remote navigation.
    ///
    /// Displays artwork thumbnail, title/subtitle, play/pause and stop buttons.
    /// Hides when the fullscreen player is active.
    struct TVMiniAudioPlayerBar: View {
        @Environment(TVAudioPlaybackManager.self) private var audioManager
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @State private var showSleepTimerPicker = false

        var body: some View {
            if audioManager.isActive, coordinator.fullscreenRoute == nil {
                barContent
                    .transition(.asymmetric(
                        insertion: .move(edge: .bottom).combined(with: .opacity),
                        removal: .move(edge: .bottom).combined(with: .opacity)
                    ))
            }
        }

        private var barContent: some View {
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                if audioManager.sleepTimerManager.isActive, !isLiveContent {
                    TVSleepTimerBanner(
                        remainingSeconds: audioManager.sleepTimerManager.remainingSeconds,
                        onExtend: { minutes in audioManager.extendSleepTimer(minutes: minutes) },
                        onCancel: { audioManager.cancelSleepTimer() }
                    )
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                }

                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    artworkThumbnail
                        .frame(width: 80, height: 80)
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))

                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                        Text(audioManager.title ?? "")
                            .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .lineLimit(1)

                        if let subtitle = audioManager.subtitle {
                            Text(subtitle)
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.muted)
                                .lineLimit(1)
                        }
                    }

                    Spacer()

                    if audioManager.isLoading {
                        ProgressView()
                            .tint(DesignTokens.Primary.default)
                            .frame(
                                width: TVDesignTokens.MinSize.focusableWidth,
                                height: TVDesignTokens.MinSize.focusableHeight
                            )
                    } else {
                        if !isLiveContent {
                            sleepTimerButton
                        }
                        playPauseButton
                        stopButton
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(DesignTokens.Glass.bgStrong)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.bottom, TVDesignTokens.Spacing.md)
            .sheet(isPresented: $showSleepTimerPicker) {
                TVSleepTimerPicker(
                    activeDuration: audioManager.sleepTimerManager.selectedDurationMinutes,
                    timerOptions: audioManager.sleepTimerManager.timerOptions,
                    onSelect: { minutes in
                        audioManager.startSleepTimer(minutes: minutes)
                        showSleepTimerPicker = false
                    },
                    onCancel: {
                        if audioManager.sleepTimerManager.isActive {
                            audioManager.cancelSleepTimer()
                        }
                        showSleepTimerPicker = false
                    }
                )
            }
        }

        private var isLiveContent: Bool {
            audioManager.activeContentType == .radio || audioManager.activeContentType == .liveTV
        }

        private var sleepTimerButton: some View {
            Button {
                showSleepTimerPicker = true
            } label: {
                Image(systemName: "moon.zzz.fill")
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(
                        audioManager.sleepTimerManager.isActive
                            ? DesignTokens.Primary.default
                            : DesignTokens.Text.muted
                    )
                    .frame(
                        width: TVDesignTokens.MinSize.focusableWidth,
                        height: TVDesignTokens.MinSize.focusableHeight
                    )
            }
            .buttonStyle(.card)
            .accessibilityLabel("Sleep timer")
        }

        private var playPauseButton: some View {
            Button {
                audioManager.togglePlayPause()
            } label: {
                Image(systemName: audioManager.isPlaying ? "pause.fill" : "play.fill")
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .frame(
                        width: TVDesignTokens.MinSize.focusableWidth,
                        height: TVDesignTokens.MinSize.focusableHeight
                    )
            }
            .buttonStyle(.card)
            .accessibilityLabel(audioManager.isPlaying ? "Pause" : "Play")
        }

        private var stopButton: some View {
            Button {
                audioManager.stop()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .frame(
                        width: TVDesignTokens.MinSize.focusableWidth,
                        height: TVDesignTokens.MinSize.focusableHeight
                    )
            }
            .buttonStyle(.card)
            .accessibilityLabel("Stop audio")
        }

        @ViewBuilder
        private var artworkThumbnail: some View {
            if let url = audioManager.artworkURL {
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure, .empty:
                        artworkPlaceholder
                    @unknown default:
                        artworkPlaceholder
                    }
                }
            } else {
                artworkPlaceholder
            }
        }

        private var artworkPlaceholder: some View {
            ZStack {
                DesignTokens.Glass.bgMedium
                Image(systemName: audioManager.activeContentType == .radio ? "radio" : "headphones")
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
    }
#endif
