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

    private(set) var isActive = false
    private(set) var isLoading = false
    private(set) var title: String?
    private(set) var subtitle: String?
    private(set) var artworkURL: URL?
    private(set) var activeContentId: String?
    private(set) var activeContentType: ContentType?

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

    // MARK: - Dependencies

    private let mediaPlayer: MediaPlayer
    private let streamResolver: StreamResolver
    private let nowPlayingService: NowPlayingService
    private let remoteCommandService: RemoteCommandService
    private let logger = BayitLogger(category: "AudioPlayback")

    // MARK: - Init

    init(mediaPlayer: MediaPlayer, streamResolver: StreamResolver) {
        self.mediaPlayer = mediaPlayer
        self.streamResolver = streamResolver
        self.nowPlayingService = NowPlayingService()
        self.remoteCommandService = RemoteCommandService()
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
                    "contentType": contentType.rawValue
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
        mediaPlayer.stop()
        nowPlayingService.clear()
        remoteCommandService.unregister()
        resetState()
        logger.info("Audio playback stopped")
    }

    // MARK: - Sleep Timer Controls

    func startSleepTimer(minutes: Int) {
        let originalVolume = mediaPlayer.avPlayer.volume
        sleepTimerManager.start(
            durationMinutes: minutes,
            fadeOutAction: { [weak self] volume in
                self?.mediaPlayer.avPlayer.volume = volume
            },
            completionAction: { [weak self] in
                self?.mediaPlayer.pause()
                self?.mediaPlayer.avPlayer.volume = originalVolume
            }
        )
    }

    func extendSleepTimer(minutes: Int) {
        sleepTimerManager.extend(additionalMinutes: minutes)
    }

    func cancelSleepTimer() {
        sleepTimerManager.cancel()
    }

    /// Restart playback from the beginning.
    func restart() {
        Task {
            await mediaPlayer.seek(to: 0)
            updateNowPlayingPosition()
        }
    }

    /// Skip forward by specified seconds (default 30s).
    func skipForward(seconds: TimeInterval = 30) {
        Task {
            await mediaPlayer.skipForward(seconds: seconds)
            updateNowPlayingPosition()
        }
    }

    /// Skip backward by specified seconds (default 30s).
    func skipBackward(seconds: TimeInterval = 30) {
        Task {
            await mediaPlayer.skipBackward(seconds: seconds)
            updateNowPlayingPosition()
        }
    }

    // MARK: - Private

    private func startPlayback(
        url: URL,
        title: String,
        subtitle: String?,
        artworkURL: URL?,
        contentType: ContentType
    ) async {
        self.title = title
        self.subtitle = subtitle
        self.artworkURL = artworkURL

        let mediaContentType = contentType.mediaContentType
        mediaPlayer.load(url: url, contentType: mediaContentType)
        mediaPlayer.play()

        isLoading = false

        // Set up Now Playing info
        let metadata = NowPlayingMetadata(
            title: title,
            artist: subtitle,
            artworkURL: artworkURL,
            contentType: mediaContentType,
            isLiveStream: mediaContentType.isLive
        )
        nowPlayingService.update(
            metadata: metadata,
            currentTime: mediaPlayer.currentTime,
            duration: mediaPlayer.duration,
            rate: mediaPlayer.rate
        )

        // Register remote commands
        remoteCommandService.delegate = self
        remoteCommandService.register()
        remoteCommandService.configureForContentType(mediaContentType)

        logger.info("Audio playback started", context: [
            "title": title,
            "contentType": contentType.rawValue
        ])
    }

    private func updateNowPlayingPosition() {
        nowPlayingService.updatePosition(
            currentTime: mediaPlayer.currentTime,
            rate: mediaPlayer.rate
        )
    }

    private func resetState() {
        isActive = false
        isLoading = false
        title = nil
        subtitle = nil
        artworkURL = nil
        activeContentId = nil
        activeContentType = nil
    }
}

// MARK: - RemoteCommandDelegate

extension AudioPlaybackManager: RemoteCommandDelegate {

    func remoteCommandPlay() {
        mediaPlayer.play()
        updateNowPlayingPosition()
    }

    func remoteCommandPause() {
        mediaPlayer.pause()
        updateNowPlayingPosition()
    }

    func remoteCommandTogglePlayPause() {
        togglePlayPause()
    }

    func remoteCommandSkipForward(interval: TimeInterval) {
        Task {
            await mediaPlayer.skipForward(seconds: interval)
            updateNowPlayingPosition()
        }
    }

    func remoteCommandSkipBackward(interval: TimeInterval) {
        Task {
            await mediaPlayer.skipBackward(seconds: interval)
            updateNowPlayingPosition()
        }
    }

    func remoteCommandSeek(to time: TimeInterval) {
        Task {
            await mediaPlayer.seek(to: time)
            updateNowPlayingPosition()
        }
    }
}

// MARK: - ContentType Mapping

private extension ContentType {
    var mediaContentType: MediaContentType {
        switch self {
        case .radio:
            return .radio
        case .podcast:
            return .podcast
        case .audiobook:
            return .audiobook
        case .live, .liveTV:
            return .liveTV
        case .movie, .series, .episode:
            return .vod
        }
    }
}

