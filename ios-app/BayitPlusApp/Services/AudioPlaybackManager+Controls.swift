import BayitCore
import BayitMedia
import Foundation

/// Playback control methods and remote command handling extracted
/// from AudioPlaybackManager to keep the main file under 200 lines.
extension AudioPlaybackManager {
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

    // MARK: - Internal Playback Helpers

    func startPlayback(
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

        // Load resume position for seekable content before starting playback
        if mediaContentType.isSeekable, let contentId = activeContentId {
            let tracker = ProgressTracker(
                repository: mediaRepository,
                player: mediaPlayer,
                contentId: contentId,
                contentType: contentType
            )
            progressTracker = tracker
            await tracker.loadResumePosition()

            mediaPlayer.play()
            if tracker.initialPosition > 0 {
                await mediaPlayer.seek(to: tracker.initialPosition)
                logger.info("Resumed audio from saved position", context: [
                    "contentId": contentId,
                    "position": String(format: "%.1f", tracker.initialPosition),
                ])
            }
            tracker.startTracking()
        } else {
            mediaPlayer.play()
        }

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
            "contentType": contentType.rawValue,
        ])
    }

    func updateNowPlayingPosition() {
        nowPlayingService.updatePosition(
            currentTime: mediaPlayer.currentTime,
            rate: mediaPlayer.rate
        )
    }

    func resetState() {
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

extension ContentType {
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
