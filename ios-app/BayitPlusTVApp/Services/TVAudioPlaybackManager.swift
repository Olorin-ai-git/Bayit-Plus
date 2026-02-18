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

    private(set) var isActive = false
    private(set) var isLoading = false
    private(set) var title: String?
    private(set) var subtitle: String?
    private(set) var artworkURL: URL?
    private(set) var activeContentId: String?
    private(set) var activeContentType: MediaContentType?

    var isPlaying: Bool {
        mediaPlayer.state == .playing || mediaPlayer.state == .buffering
    }

    // MARK: - Sleep Timer

    private(set) var sleepTimerManager = TVSleepTimerManager()

    // MARK: - Dependencies

    private let mediaPlayer: MediaPlayer
    private let mediaRepository: any MediaRepository
    private let radioRepository: any RadioRepository
    private let podcastRepository: any PodcastRepository
    private let nowPlayingService: NowPlayingService
    private let remoteCommandService: RemoteCommandService
    private let logger = BayitLogger(category: "TVAudioPlayback")

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
        self.nowPlayingService = NowPlayingService()
        self.remoteCommandService = RemoteCommandService()
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

    // MARK: - Stream Resolution

    private func resolveAndPlayRadio(stationId: String) async throws {
        let detail = try await radioRepository.fetchStationDetail(id: stationId)
        let stream = try await mediaRepository.fetchRadioStream(stationId: stationId)

        guard let urlString = stream.url, let streamURL = URL(string: urlString) else {
            logger.error("Radio stream URL is nil", context: ["stationId": stationId])
            resetState()
            return
        }

        let artworkURL: URL? = detail.logo.flatMap { URL(string: $0) }

        await beginPlayback(
            url: streamURL,
            title: detail.name ?? stationId,
            subtitle: detail.currentShow,
            artworkURL: artworkURL,
            contentType: .radio
        )
    }

    private func resolveAndPlayPodcast(showId: String) async throws {
        let detail = try await podcastRepository.fetchPodcastDetail(id: showId)

        // Try latest episode audioUrl first, then fetch episodes list
        if let audioUrlStr = detail.latestEpisode?.audioUrl,
           let audioURL = URL(string: audioUrlStr)
        {
            let artworkURL: URL? = detail.cover.flatMap { URL(string: $0) }
            await beginPlayback(
                url: audioURL,
                title: detail.title ?? showId,
                subtitle: detail.author,
                artworkURL: artworkURL,
                contentType: .podcast
            )
            return
        }

        // Fallback: fetch first episode
        let episodesResponse = try await podcastRepository.fetchEpisodes(
            showId: showId,
            page: 1,
            limit: 1
        )

        guard let episode = episodesResponse.episodes.first,
              let audioUrlStr = episode.audioUrl,
              let audioURL = URL(string: audioUrlStr)
        else {
            logger.warning("No playable episode found", context: ["showId": showId])
            resetState()
            return
        }

        let artworkURL: URL? = (episode.thumbnail ?? detail.cover).flatMap { URL(string: $0) }

        await beginPlayback(
            url: audioURL,
            title: episode.title ?? detail.title ?? showId,
            subtitle: detail.author,
            artworkURL: artworkURL,
            contentType: .podcast
        )
    }

    // MARK: - Private

    private func beginPlayback(
        url: URL,
        title: String,
        subtitle: String?,
        artworkURL: URL?,
        contentType: MediaContentType
    ) async {
        self.title = title
        self.subtitle = subtitle
        self.artworkURL = artworkURL

        mediaPlayer.load(url: url, contentType: contentType)
        mediaPlayer.play()

        isLoading = false

        let metadata = NowPlayingMetadata(
            title: title,
            artist: subtitle,
            artworkURL: artworkURL,
            contentType: contentType,
            isLiveStream: contentType.isLive
        )
        nowPlayingService.update(
            metadata: metadata,
            currentTime: mediaPlayer.currentTime,
            duration: mediaPlayer.duration,
            rate: mediaPlayer.rate
        )

        remoteCommandService.delegate = self
        remoteCommandService.register()
        remoteCommandService.configureForContentType(contentType)

        logger.info("TV audio playback started", context: [
            "title": title,
            "contentType": contentType.rawValue,
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

extension TVAudioPlaybackManager: RemoteCommandDelegate {

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
#endif
