import BayitDesignSystem
import BayitMedia
import SwiftUI

/// Transport control buttons and interaction navigation.
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
            await MainActor.run {
                withAnimation(.easeInOut(duration: 0.25)) {
                    state.showControlButtons = false
                }
            }
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
}
