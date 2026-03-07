#if os(tvOS)
    import BayitCore
    import BayitMedia
    import Foundation
    import Observation

    /// Coordinates audio session state across tab navigation for the tvOS app.
    /// Injected via Environment at the app root level to persist audio playback
    /// state when switching between tabs. The mini player bar observes this
    /// coordinator to display current playback info.
    @MainActor
    @Observable
    final class TVAudioSessionCoordinator {
        // MARK: - Observable State

        /// Whether audio is currently playing
        var isPlaying: Bool {
            playbackManager?.isPlaying ?? false
        }

        /// Whether any audio session is active (playing or paused)
        var isActive: Bool {
            playbackManager?.isActive ?? false
        }

        /// Current item metadata
        var currentTitle: String? {
            playbackManager?.title
        }

        var currentSubtitle: String? {
            playbackManager?.subtitle
        }

        var currentArtworkURL: URL? {
            playbackManager?.artworkURL
        }

        var currentContentType: MediaContentType? {
            playbackManager?.activeContentType
        }

        var currentContentId: String? {
            playbackManager?.activeContentId
        }

        // MARK: - Dependencies

        private(set) var playbackManager: TVAudioPlaybackManager?
        private let logger = BayitLogger(category: "TVAudioSession")

        // MARK: - Configuration

        /// Attach the playback manager reference for coordination.
        /// Called once during app startup when the manager is created.
        func configure(playbackManager: TVAudioPlaybackManager) {
            self.playbackManager = playbackManager
            logger.info("Audio session coordinator configured")
        }

        // MARK: - Controls

        /// Toggle play/pause on the current audio session.
        func togglePlayPause() {
            playbackManager?.togglePlayPause()
        }

        /// Skip forward by 30 seconds (for seekable content).
        func skipForward() {
            guard let manager = playbackManager,
                  manager.activeContentType?.isSeekable == true
            else { return }

            let target = manager.mediaPlayer.currentTime + 30
            Task {
                await manager.mediaPlayer.seek(to: min(target, manager.mediaPlayer.duration))
            }
        }

        /// Skip backward by 15 seconds (for seekable content).
        func skipBackward() {
            guard let manager = playbackManager,
                  manager.activeContentType?.isSeekable == true
            else { return }

            let target = max(0, manager.mediaPlayer.currentTime - 15)
            Task {
                await manager.mediaPlayer.seek(to: target)
            }
        }

        /// Stop playback and dismiss the mini player bar.
        func stop() {
            playbackManager?.stop()
            logger.info("Audio session stopped via coordinator")
        }

        /// Current playback progress as a fraction (0.0 to 1.0).
        /// Returns nil for live/non-seekable content.
        var progress: Double? {
            guard let manager = playbackManager,
                  manager.activeContentType?.isSeekable == true,
                  manager.mediaPlayer.duration > 0
            else { return nil }
            return manager.mediaPlayer.currentTime / manager.mediaPlayer.duration
        }

        /// Formatted current time string (e.g., "12:34").
        var currentTimeFormatted: String? {
            guard let manager = playbackManager,
                  manager.mediaPlayer.currentTime > 0
            else { return nil }
            return formatTime(manager.mediaPlayer.currentTime)
        }

        /// Formatted remaining time string (e.g., "-45:21").
        var remainingTimeFormatted: String? {
            guard let manager = playbackManager,
                  manager.activeContentType?.isSeekable == true,
                  manager.mediaPlayer.duration > 0
            else { return nil }
            let remaining = manager.mediaPlayer.duration - manager.mediaPlayer.currentTime
            return "-\(formatTime(remaining))"
        }

        // MARK: - Private

        private func formatTime(_ seconds: Double) -> String {
            let totalSeconds = Int(max(0, seconds))
            let hours = totalSeconds / 3600
            let minutes = (totalSeconds % 3600) / 60
            let secs = totalSeconds % 60
            if hours > 0 {
                return String(format: "%d:%02d:%02d", hours, minutes, secs)
            }
            return String(format: "%d:%02d", minutes, secs)
        }
    }
#endif
