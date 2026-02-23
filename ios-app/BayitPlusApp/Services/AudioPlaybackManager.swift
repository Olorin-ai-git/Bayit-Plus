import BayitCore
import BayitMedia
import Foundation
import Observation

/// Manages background audio playback for audio-only content (podcasts, radio).
///
/// Wraps the shared `MediaPlayer` and `StreamResolver`, and owns
/// `NowPlayingService` + `RemoteCommandService` for lock screen controls.
/// Injected into the SwiftUI environment so any view can trigger inline playback.
@MainActor
@Observable
final class AudioPlaybackManager {
    // MARK: - Observable State

    var isActive = false
    var isLoading = false
    var title: String?
    var subtitle: String?
    var artworkURL: URL?
    var activeContentId: String?
    var activeContentType: ContentType?

    var isPlaying: Bool {
        mediaPlayer.state == .playing || mediaPlayer.state == .buffering
    }

    var currentTime: TimeInterval {
        mediaPlayer.currentTime
    }

    var duration: TimeInterval {
        mediaPlayer.duration
    }

    // MARK: - Sleep Timer

    private(set) var sleepTimerManager = SleepTimerManager()

    // MARK: - Progress Tracking

    internal(set) var progressTracker: ProgressTracker?

    // MARK: - Dependencies (internal for extension access)

    let mediaPlayer: MediaPlayer
    let streamResolver: StreamResolver
    let mediaRepository: any MediaRepository
    let nowPlayingService: NowPlayingService
    let remoteCommandService: RemoteCommandService
    let logger = BayitLogger(category: "AudioPlayback")

    // MARK: - Init

    init(
        mediaPlayer: MediaPlayer,
        streamResolver: StreamResolver,
        mediaRepository: any MediaRepository
    ) {
        self.mediaPlayer = mediaPlayer
        self.streamResolver = streamResolver
        self.mediaRepository = mediaRepository
        nowPlayingService = NowPlayingService()
        remoteCommandService = RemoteCommandService()
    }

    // MARK: - Playback Controls

    /// Resolve stream via `StreamResolver`, load into `MediaPlayer`, and begin playback.
    func play(contentId: String, contentType: ContentType) {
        // If same content is already playing, just toggle
        if activeContentId == contentId, isActive {
            togglePlayPause()
            return
        }

        isLoading = true
        activeContentId = contentId
        activeContentType = contentType
        isActive = true

        Task {
            do {
                let resolved = try await streamResolver.resolveStream(
                    contentId: contentId,
                    contentType: contentType
                )
                await startPlayback(
                    url: resolved.url,
                    title: resolved.title,
                    subtitle: resolved.subtitle,
                    artworkURL: resolved.artworkURL,
                    contentType: contentType
                )
            } catch {
                logger.error("Failed to resolve stream", error: error, context: [
                    "contentId": contentId,
                    "contentType": contentType.rawValue,
                ])
                resetState()
            }
        }
    }

    /// Play a direct URL when the stream URL is already known (e.g., episode with `audioUrl`).
    func playDirectURL(
        url: URL,
        title: String,
        subtitle: String?,
        artworkURL: URL?,
        contentId: String,
        contentType: ContentType
    ) {
        // If same content is already playing, just toggle
        if activeContentId == contentId, isActive {
            togglePlayPause()
            return
        }

        isLoading = true
        activeContentId = contentId
        activeContentType = contentType
        isActive = true

        Task {
            await startPlayback(
                url: url,
                title: title,
                subtitle: subtitle,
                artworkURL: artworkURL,
                contentType: contentType
            )
        }
    }

    /// Toggle between play and pause.
    func togglePlayPause() {
        mediaPlayer.togglePlayPause()
        updateNowPlayingPosition()
    }

    /// Stop playback, clear Now Playing, and reset state.
    func stop() {
        sleepTimerManager.cancel()
        let tracker = progressTracker
        progressTracker = nil
        Task { await tracker?.stopTracking() }
        mediaPlayer.stop()
        nowPlayingService.clear()
        remoteCommandService.unregister()
        resetState()
        logger.info("Audio playback stopped")
    }
}
