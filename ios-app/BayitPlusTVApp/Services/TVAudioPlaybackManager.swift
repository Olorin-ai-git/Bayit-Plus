#if os(tvOS)
    import BayitCore
    import BayitMedia
    import Foundation
    import Observation

    /// Manages inline audio playback for tvOS audio-only content (podcasts, radio).
    ///
    /// Wraps the shared `MediaPlayer` and resolves streams from repositories directly,
    /// matching tvOS's existing pattern of using `MediaContentType` without iOS's
    /// `ContentType` mapping layer. Owns `NowPlayingService` + `RemoteCommandService`
    /// for Siri Remote and Control Center controls.
    @MainActor
    @Observable
    final class TVAudioPlaybackManager {
        // MARK: - Observable State

        var isActive = false
        var isLoading = false
        var title: String?
        var subtitle: String?
        var artworkURL: URL?
        var activeContentId: String?
        var activeContentType: MediaContentType?

        var isPlaying: Bool {
            mediaPlayer.state == .playing || mediaPlayer.state == .buffering
        }

        // MARK: - Sleep Timer

        private(set) var sleepTimerManager = TVSleepTimerManager()

        // MARK: - Dependencies

        let mediaPlayer: MediaPlayer
        let mediaRepository: any MediaRepository
        let radioRepository: any RadioRepository
        let podcastRepository: any PodcastRepository
        let nowPlayingService: NowPlayingService
        let remoteCommandService: RemoteCommandService
        let logger = BayitLogger(category: "TVAudioPlayback")

        // MARK: - Init

        init(
            mediaPlayer: MediaPlayer,
            mediaRepository: any MediaRepository,
            radioRepository: any RadioRepository,
            podcastRepository: any PodcastRepository
        ) {
            self.mediaPlayer = mediaPlayer
            self.mediaRepository = mediaRepository
            self.radioRepository = radioRepository
            self.podcastRepository = podcastRepository
            nowPlayingService = NowPlayingService()
            remoteCommandService = RemoteCommandService()
        }

        // MARK: - Playback Controls

        /// Resolve stream from the appropriate repository and begin inline playback.
        func play(contentId: String, contentType: MediaContentType) {
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
                    switch contentType {
                    case .radio:
                        try await resolveAndPlayRadio(stationId: contentId)
                    case .podcast:
                        try await resolveAndPlayPodcast(showId: contentId)
                    default:
                        logger.warning(
                            "Unsupported content type for inline audio",
                            context: ["contentType": contentType.rawValue]
                        )
                        resetState()
                    }
                } catch {
                    logger.error("Failed to resolve stream", error: error, context: [
                        "contentId": contentId,
                        "contentType": contentType.rawValue,
                    ])
                    resetState()
                }
            }
        }

        /// Play a direct URL when the stream URL is already known (e.g., podcast episode).
        func playDirectURL(
            url: URL,
            title: String,
            subtitle: String?,
            artworkURL: URL?,
            contentId: String,
            contentType: MediaContentType
        ) {
            if activeContentId == contentId, isActive {
                togglePlayPause()
                return
            }

            isLoading = true
            activeContentId = contentId
            activeContentType = contentType
            isActive = true

            Task {
                await beginPlayback(
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
            logger.info("TV audio playback stopped")
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
    }
#endif
