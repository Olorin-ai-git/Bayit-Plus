import BayitMedia
import Foundation
import Observation

/// ViewModel coordinating media playback, stream loading, and watch history.
///
/// Bridges the app's repository layer with BayitMedia's MediaPlayer,
/// handling stream URL resolution, progress tracking, and content-specific behavior.
@MainActor
@Observable
final class MediaPlayerViewModel {

    // MARK: - Observable State

    private(set) var isLoading = true
    private(set) var errorMessage: String?
    private(set) var title: String?
    private(set) var subtitle: String?
    private(set) var artworkURL: URL?
    private(set) var initialPosition: TimeInterval = 0
    private(set) var availableQualities: [QualityVariant] = []
    private(set) var currentQuality: String?
    private(set) var availableSubtitleLanguages: [String] = []

    let player: MediaPlayer
    let contentId: String
    let contentType: ContentType

    // MARK: - Private

    private let repository: any MediaRepository
    private let contentRepository: any ContentRepository
    private let liveTVRepository: any LiveTVRepository
    private let radioRepository: any RadioRepository
    private let podcastRepository: any PodcastRepository
    nonisolated(unsafe) private var progressTrackingTask: Task<Void, Never>?
    private let progressIntervalSeconds: TimeInterval = 15

    // MARK: - Init

    init(
        contentId: String,
        contentType: ContentType,
        player: MediaPlayer,
        repository: any MediaRepository,
        contentRepository: any ContentRepository,
        liveTVRepository: any LiveTVRepository,
        radioRepository: any RadioRepository,
        podcastRepository: any PodcastRepository
    ) {
        self.contentId = contentId
        self.contentType = contentType
        self.player = player
        self.repository = repository
        self.contentRepository = contentRepository
        self.liveTVRepository = liveTVRepository
        self.radioRepository = radioRepository
        self.podcastRepository = podcastRepository
    }

    deinit {
        progressTrackingTask?.cancel()
    }

    // MARK: - Loading

    /// Load content metadata and stream URL, then begin playback.
    @MainActor
    func load() async {
        isLoading = true
        errorMessage = nil

        do {
            let mediaType = mapContentType(contentType)

            switch contentType {
            case .live, .liveTV:
                let channel = try await liveTVRepository.fetchChannelDetail(id: contentId)
                title = channel.name
                subtitle = channel.currentShow
                if let logoStr = channel.thumbnail ?? channel.logo,
                   let url = URL(string: logoStr) {
                    artworkURL = url
                }

                let stream = try await repository.fetchLiveStream(channelId: contentId)
                currentQuality = stream.quality
                availableQualities = stream.availableQualities ?? []
                let streamURLStr = stream.url ?? channel.streamUrl ?? ""
                guard let url = URL(string: streamURLStr), !streamURLStr.isEmpty else {
                    errorMessage = "Invalid stream URL"
                    isLoading = false
                    return
                }
                player.load(url: url, contentType: mediaType)

            case .radio:
                let station = try await radioRepository.fetchStationDetail(id: contentId)
                title = station.name
                subtitle = station.currentShow
                if let logoStr = station.logo, let url = URL(string: logoStr) {
                    artworkURL = url
                }

                let stream = try await repository.fetchRadioStream(stationId: contentId)
                let streamURLStr = stream.url ?? ""
                guard let url = URL(string: streamURLStr), !streamURLStr.isEmpty else {
                    errorMessage = "Invalid stream URL"
                    isLoading = false
                    return
                }
                player.load(url: url, contentType: mediaType)

            case .podcast:
                let podcastDetail = try await podcastRepository.fetchPodcastDetail(id: contentId)
                title = podcastDetail.episodes?.first?.title ?? podcastDetail.title
                subtitle = podcastDetail.title
                if let coverStr = podcastDetail.cover, let url = URL(string: coverStr) {
                    artworkURL = url
                }

                let audioURLStr = podcastDetail.episodes?.first?.audioUrl
                    ?? podcastDetail.latestEpisode?.audioUrl
                    ?? ""
                guard let url = URL(string: audioURLStr), !audioURLStr.isEmpty else {
                    errorMessage = "No audio URL available for this episode"
                    isLoading = false
                    return
                }
                player.load(url: url, contentType: mediaType)

            default:
                let detail = try await contentRepository.fetchContentDetail(id: contentId)
                title = detail.title
                subtitle = detail.category
                availableSubtitleLanguages = detail.availableSubtitleLanguages ?? []
                if let backdropStr = detail.backdrop, let url = URL(string: backdropStr) {
                    artworkURL = url
                }

                let streamURL = try await resolveStreamURL(detail: detail)
                guard let url = URL(string: streamURL), !streamURL.isEmpty else {
                    errorMessage = "Invalid stream URL"
                    isLoading = false
                    return
                }
                player.load(url: url, contentType: mediaType)
            }

            // Fetch resume position from watch history
            await loadResumePosition()

            isLoading = false

            // Auto-play after loading
            player.play()

            // Seek to resume position if available
            if initialPosition > 0 {
                await player.seek(to: initialPosition)
            }

            // Start periodic progress tracking for non-live content
            if mediaType.isSeekable {
                startProgressTracking()
            }
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }

    // MARK: - Quality

    /// Switch stream quality.
    @MainActor
    func switchQuality(_ quality: String) async {
        guard quality != currentQuality else { return }
        let currentPos = player.currentTime
        currentQuality = quality

        do {
            let stream = try await repository.fetchStream(
                contentId: contentId,
                quality: quality
            )
            guard let urlStr = stream.url, let url = URL(string: urlStr) else { return }

            let mediaType = mapContentType(contentType)
            player.load(url: url, contentType: mediaType)
            player.play()
            await player.seek(to: currentPos)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Cleanup

    /// Stop playback and save final progress.
    @MainActor
    func cleanup() async {
        progressTrackingTask?.cancel()
        progressTrackingTask = nil
        await saveProgress()
        player.stop()
    }

    // MARK: - Private

    private func resolveStreamURL(detail: ContentDetail) async throws -> String {
        switch contentType {
        case .live, .liveTV:
            let stream = try await repository.fetchLiveStream(channelId: contentId)
            currentQuality = stream.quality
            availableQualities = stream.availableQualities ?? []
            return stream.url ?? detail.streamUrl ?? ""

        case .radio:
            let stream = try await repository.fetchRadioStream(stationId: contentId)
            return stream.url ?? ""

        case .movie, .series, .episode, .podcast, .audiobook:
            let stream = try await repository.fetchStream(
                contentId: contentId,
                quality: nil
            )
            currentQuality = stream.quality
            availableQualities = stream.availableQualities ?? []
            return stream.url ?? detail.streamUrl ?? ""
        }
    }

    @MainActor
    private func loadResumePosition() async {
        do {
            let history = try await repository.fetchContinueWatching()
            if let item = history.items.first(where: { $0.id == contentId }) {
                initialPosition = item.position ?? 0
            }
        } catch {
            // Resume position is optional - continue without it
        }
    }

    private func startProgressTracking() {
        progressTrackingTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(self?.progressIntervalSeconds ?? 15))
                guard !Task.isCancelled else { break }
                await self?.saveProgress()
            }
        }
    }

    @MainActor
    private func saveProgress() async {
        guard player.currentTime > 0, player.duration > 0 else { return }

        let request = WatchProgressRequest(
            contentId: contentId,
            contentType: contentType.rawValue,
            position: player.currentTime,
            duration: player.duration
        )

        do {
            _ = try await repository.updateProgress(request: request)
        } catch {
            // Progress save failures are non-critical
        }
    }

    private func mapContentType(_ type: ContentType) -> MediaContentType {
        switch type {
        case .live, .liveTV: return .liveTV
        case .movie, .series, .episode: return .vod
        case .radio: return .radio
        case .podcast: return .podcast
        case .audiobook: return .audiobook
        }
    }
}
