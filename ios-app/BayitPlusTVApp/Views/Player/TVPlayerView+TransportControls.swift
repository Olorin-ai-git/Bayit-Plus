import BayitDesignSystem
import BayitMedia
import SwiftUI

/// Transport control buttons, progress bar, and interaction navigation.
extension TVPlayerView {
    // MARK: - Playback Controls Overlay

    var playbackControlsOverlay: some View {
        TVPlaybackControlsOverlay(
            isPlaying: mediaPlayer.state == .playing,
            hasChapters: state.hasChapters,
            onPlayPause: { mediaPlayer.togglePlayPause() },
            onSkipBackward30: { Task { await mediaPlayer.skipBackward(seconds: 30) } },
            onSkipForward30: { Task { await mediaPlayer.skipForward(seconds: 30) } },
            onPreviousChapter: { skipToPreviousChapter() },
            onNextChapter: { skipToNextChapter() },
            onInteraction: { resetOverlayTimer() }
        )
    }

    // MARK: - Overlay Timer

    func resetOverlayTimer() {
        state.overlayHideTask?.cancel()
        state.showControlButtons = true
        guard !state.isDockFocused else { return }
        state.overlayHideTask = Task {
            try? await Task.sleep(for: .seconds(4))
            guard !Task.isCancelled else { return }
            guard !state.isDockFocused else { return }
            await MainActor.run { state.showControlButtons = false }
        }
    }

    // MARK: - Start Over

    func startOver() {
        Task {
            // HLS streams may have a non-zero seekable start time.
            // Seek to the actual start of the seekable range rather
            // than CMTime.zero which can fall outside it and silently fail.
            let startSeconds: TimeInterval
            if let range = mediaPlayer.avPlayer.currentItem?
                .seekableTimeRanges.first?.timeRangeValue
            {
                startSeconds = range.start.seconds
            } else {
                startSeconds = 0
            }
            await mediaPlayer.seek(to: startSeconds)
            mediaPlayer.play()
        }
    }

    // MARK: - Interaction Navigation

    var sortedMoments: [InteractiveMoment] {
        state.interactionVM?.moments.sorted { $0.timestamp < $1.timestamp } ?? []
    }

    var previousInteractionAction: (() -> Void)? {
        guard let moment = sortedMoments.last(where: {
            $0.timestamp < mediaPlayer.currentTime - interactionRewindThreshold
        }) else { return nil }
        return { [self] in
            let target = max(0, moment.timestamp - interactionSeekOffset)
            resetOverlayTimer()
            state.seekPreviewPosition = target
            Task {
                await mediaPlayer.seek(to: target)
                state.seekPreviewPosition = nil
            }
        }
    }

    var nextInteractionAction: (() -> Void)? {
        let currentTime = mediaPlayer.currentTime
        let sorted = sortedMoments
        guard let moment = sorted.first(where: {
            $0.timestamp > currentTime
        }) else { return nil }
        return { [self] in
            let target = max(0, moment.timestamp - interactionSeekOffset)
            resetOverlayTimer()
            state.seekPreviewPosition = target
            Task {
                await mediaPlayer.seek(to: target)
                state.seekPreviewPosition = nil
            }
        }
    }

    // MARK: - Progress Bar

    var playerProgressBar: some View {
        VStack(spacing: TVDesignTokens.Spacing.xs) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.white.opacity(0.2))
                        .frame(height: 6)

                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.white.opacity(0.3))
                        .frame(
                            width: geo.size.width * bufferedFraction,
                            height: 6
                        )

                    RoundedRectangle(cornerRadius: 3)
                        .fill(DesignTokens.Primary.p400)
                        .frame(
                            width: geo.size.width * (state.seekPreviewPosition != nil
                                ? state.seekPreviewPosition! / max(mediaPlayer.duration, 1)
                                : progressFraction),
                            height: 6
                        )

                    if state.seekPreviewPosition != nil {
                        Circle()
                            .fill(DesignTokens.Primary.p300)
                            .frame(width: 12, height: 12)
                            .offset(x: geo.size.width * (state.seekPreviewPosition! / max(mediaPlayer.duration, 1)) - 6)
                    }
                }
            }
            .frame(height: 6)
            .focusable()
            .focusEffectDisabled()
            .onMoveCommand { direction in
                switch direction {
                case .left:
                    let current = state.seekPreviewPosition ?? mediaPlayer.currentTime
                    state.seekPreviewPosition = max(0, current - 10)
                case .right:
                    let current = state.seekPreviewPosition ?? mediaPlayer.currentTime
                    state.seekPreviewPosition = min(mediaPlayer.duration, current + 10)
                default:
                    break
                }
            }
            .onPlayPauseCommand {
                if let pos = state.seekPreviewPosition {
                    Task {
                        await mediaPlayer.seek(to: pos)
                        state.seekPreviewPosition = nil
                    }
                }
            }
            .onExitCommand {
                state.seekPreviewPosition = nil
            }

            HStack {
                Text(formatTime(mediaPlayer.currentTime))
                    .font(.system(size: TVDesignTokens.FontSize.sm).monospacedDigit())
                    .foregroundStyle(DesignTokens.Text.secondary)

                Spacer()

                if mediaPlayer.duration > 0 {
                    Text("-\(formatTime(mediaPlayer.duration - mediaPlayer.currentTime))")
                        .font(.system(size: TVDesignTokens.FontSize.sm).monospacedDigit())
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .focusSection()
    }

    // MARK: - Progress Helpers

    var progressFraction: CGFloat {
        guard mediaPlayer.duration > 0 else { return 0 }
        return min(CGFloat(mediaPlayer.currentTime / mediaPlayer.duration), 1.0)
    }

    var bufferedFraction: CGFloat {
        guard mediaPlayer.duration > 0 else { return 0 }
        return min(CGFloat(mediaPlayer.bufferedTime / mediaPlayer.duration), 1.0)
    }

    func formatTime(_ seconds: TimeInterval) -> String {
        guard seconds.isFinite, seconds >= 0 else { return "00:00" }
        let total = Int(seconds)
        let h = total / 3600
        let m = (total % 3600) / 60
        let s = total % 60
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, s)
        }
        return String(format: "%02d:%02d", m, s)
    }
}
